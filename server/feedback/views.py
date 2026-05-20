import json
import requests
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.cache import cache
from .models import App, Review


#Review Analystics Imports 
from django.utils.dateparse import parse_datetime
import concurrent.futures
import statistics
from django.utils import timezone
from datetime import timedelta
from django.db.models import Avg
from django.utils.dateparse import parse_datetime
from django.utils.timezone import now

# Fetch app names
class SearchAppView(View):
    """
    GET /api/search/?name=<app name>
    Calls iTunes Search API and returns a list of matching apps.
    Cached for 10 minutes per search term (this was done because Apple bans Ip's if too many requests sent?).
    """
    # used to tell cache how long to store it
    CACHE_TIMEOUT = 60 * 10
    
    # method called when it receives an HTTP GET request
    def get(self, request):
        app_name = request.GET.get("name", "").strip() # strips URL query string to look like {"name": "Spotify"}
        if not app_name:
            return JsonResponse({"error": "Missing 'name' query parameter"}, status=400)
        
        # Check cache first, checks if already searched item recently
        cache_key = f"search_{app_name.lower().replace(' ', '_')}"
        cached = cache.get(cache_key)
        if cached:
            return JsonResponse({**cached, "cached": True})
        #iTunes API params
        params = {
            "term": app_name,
            "entity": "software",
            "media": "software",
            "limit": 10,
            "country": "us",
        }
        # API call
        try:
            response = requests.get(
                "https://itunes.apple.com/search", params=params, timeout=10
            )
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as e:
            return JsonResponse({"error": f"iTunes API error: {str(e)}"}, status=502)
        # List comprehension, loops and builds a list at same time
        results = [
            {
                "appName": item.get("trackName"),
                "trackId": item.get("trackId"),
                "developerName": item.get("artistName"),
                "iconUrl": item.get("artworkUrl60"),
                "genre": item.get("primaryGenreName"),
                "averageRating": item.get("averageUserRating"),
                "ratingCount": item.get("userRatingCount"),

                "currentVersionRating": item.get("averageUserRatingForCurrentVersion", 0),
                "currentVersionRatingCount": item.get("userRatingCountForCurrentVersion", 0),
                
                
                "initialReleaseDate": item.get("releaseDate", ""),              
                "currentVersionReleaseDate": item.get("currentVersionReleaseDate", ""), 
                
                
                "contentAdvisoryRating": item.get("contentAdvisoryRating", ""),
                "version": item.get("version", ""),                           
                "description": item.get("description", "")

            }
            for item in data.get("results", [])
        ]
        # Storing and returning
        payload = {"apps": results, "count": len(results)}
 
        # Store in cache
        cache.set(cache_key, payload, self.CACHE_TIMEOUT)
 
        return JsonResponse({**payload, "cached": False})

@method_decorator(csrf_exempt, name='dispatch')
class AppsListView(View):
    """
    GET /api/apps/  returns saved tracked apps.
    POST /api/apps/ saves an app to the tracked list.
    """

    def get(self, request):
        saved_apps = App.objects.filter(tracked=True).order_by('app_name')
        apps = [
            {
                "appName": item.app_name,
                "trackId": item.track_id,
                "developerName": item.developer_name,
                "iconUrl": item.icon_url,
                "genre": item.genre,
                "averageRating": item.average_rating,
                "ratingCount": item.rating_count,
                "currentVersionRating": item.current_version_rating,
                "currentVersionRatingCount": item.current_version_rating_count,
                "version": item.version,
                "initialReleaseDate": item.initial_release_date.isoformat() if item.initial_release_date else None,
                "currentVersionReleaseDate": item.current_version_release_date,
                "contentAdvisoryRating": item.content_advisory_rating, 
                "description": item.description,
            }
            for item in saved_apps
        ]
        return JsonResponse({"apps": apps, "count": len(apps)})

    def post(self, request):
        try:
            payload = json.loads(request.body.decode('utf-8') or '{}')
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON payload"}, status=400)

        track_id = payload.get("trackId")
        app_name = payload.get("appName")
        if not track_id or not app_name:
            return JsonResponse({"error": "trackId and appName are required"}, status=400)
        
        init_release = parse_datetime(payload.get("initialReleaseDate", ""))
        ver_release = parse_datetime(payload.get("currentVersionReleaseDate", ""))

        app, created = App.objects.update_or_create(
            track_id=str(track_id),
            defaults={
                "app_name": app_name,
                "developer_name": payload.get("developerName"),
                "icon_url": payload.get("iconUrl"),
                "genre": payload.get("genre"),
                "average_rating": payload.get("averageRating"),
                "rating_count": payload.get("ratingCount"),
                "current_version_rating": payload.get("currentVersionRating", 0),
                "current_version_rating_count": payload.get("currentVersionRatingCount", 0),
                "initial_release_date": init_release,
                "current_version_release_date": ver_release,
                "content_advisory_rating": payload.get("contentAdvisoryRating", ""),
                "version": payload.get("version", ""),
                "description": payload.get("description", ""),
                "tracked": True,
            },
        )

        return JsonResponse({
            "saved": True,
            "created": created,
            "app": {
                "appName": app.app_name,
                "trackId": app.track_id,
                "developerName": app.developer_name,
                "iconUrl": app.icon_url,
                "genre": app.genre,
                "averageRating": app.average_rating,
                "ratingCount": app.rating_count,
                "currentVersionRating": app.current_version_rating,
                "currentVersionRatingCount": app.current_version_rating_count,
                "initialReleaseDate": app.initial_release_date.isoformat() if app.initial_release_date else None,
                "currentVersionReleaseDate": app.current_version_release_date,
                "contentAdvisoryRating": app.content_advisory_rating,
                "version": app.version,
                "description": app.description,
            },
        })

# Fetch app reviews    
class FetchReviewsView(View):
    """
    GET /api/reviews/?trackId=<id>&page=<1-10>&country=<us>
    Fetches customer reviews for a given app from the iTunes RSS feed.
    Cached for 1 hour per trackId+page+country to avoid Apple IP ban. s.
    """
    # Review search need longer time to protect from IP ban
    CACHE_TIMEOUT = 60 * 60
    # Makes request look like it's coming from a real browser - without it Apple will return empty result
    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }
    
    def fetch_single_page(self, track_id, page_num, country):
        url = f"https://itunes.apple.com/{country}/rss/customerreviews/page={page_num}/id={track_id}/sortby=mostrecent/json"
        try:
            response = requests.get(url, headers=self.HEADERS, timeout=5)
            response.raise_for_status()
            data = response.json()
            entries = data.get("feed", {}).get("entry", [])
            
            # Skip the first entry (app metadata), return only human reviews
            if len(entries) > 1:
                return entries[1:]
            return []
        except Exception as e:
            # If a single page fails (e.g., Apple blocks page 8), we just return empty
            # and salvage the rest of the pages!
            return []
        
    
    def get(self, request):
        track_id = request.GET.get("trackId", "").strip()
        page = request.GET.get("page", "1").strip()
        country = request.GET.get("country", "us").strip().lower()

        if not track_id:
            return JsonResponse({"error": "Missing 'trackId' query parameter"}, status=400)

        # Check cache first
        cache_key = f"reviews_{track_id}_{country}"
        cached = cache.get(cache_key)
        if cached:
            return JsonResponse({**cached, "cached": True})

        # Try multiple sort orders and pages
        all_raw_entries = []
        
       
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            # Tell the executor to run 'fetch_single_page' for numbers 1 through 10
            futures = [
                executor.submit(self.fetch_single_page, track_id, page_num, country) 
                for page_num in range(1, 11)
            ]
            
            # As each thread finishes, combine the results into our master list
            for future in concurrent.futures.as_completed(futures):
                all_raw_entries.extend(future.result())

        reviews = [] 
        for entry in all_raw_entries:
            reviews.append({
                "id": entry.get("id", {}).get("label"),
                "title": entry.get("title", {}).get("label", "No Title"),
                "content": entry.get("content", {}).get("label", ""),
                "rating": entry.get("im:rating", {}).get("label", "0"),
                "author": entry.get("author", {}).get("name", {}).get("label", "Anonymous"),
                "date": entry.get("updated", {}).get("label"),
                "version": entry.get("im:version", {}).get("label", "Unknown"),
            })

        
        # Computes average rating - Used for Graph in app details page 
        ratings = [int(r["rating"]) for r in reviews if r.get("rating", "").isdigit()]
        avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

        payload = {
            "trackId": track_id,
            "page": int(page),
            "reviewCount": len(reviews),
            "averageRating": avg_rating,
            "reviews": reviews,
        }

        # Store in cache
        cache.set(cache_key, payload, self.CACHE_TIMEOUT)
        print(f"DEBUG: Fetched {len(reviews)} reviews for trackId {track_id}")
        # Save reviews to database
        try: 
            
            app = App.objects.get(track_id=track_id)
            print(f"Found app: {app.app_name}, saving {len(reviews)} reviews")
            for r in reviews:
                print(f"DEBUG: Saving review: {r.get('id')}")
                
                # Check for errors in the save process
                try:
                    Review.objects.get_or_create(
                        review_id=r["id"],
                        defaults={
                            "app": app,
                            "title": r["title"],
                            "content": r["content"],
                            "rating": r["rating"],
                            "version": r["version"],
                            "date": r["date"],
                        }
                    )
                except Exception as e:
                    print(f"DEBUG: Error saving review {r.get('id')}: {e}")
        except App.DoesNotExist:
            print(f"DEBUG: App with trackId {track_id} not found in DB! Cannot save reviews.")
            pass

        return JsonResponse({**payload, "cached": False})
    
class AnalyticsView(View):
    def get(self, request):
        track_id = request.GET.get("trackId", "").strip()
        print(f"--- DEBUG: AnalyticsView hit! Received track_id: '{track_id}' (Type: {type(track_id)}) ---")
        if not track_id:
            return JsonResponse({"error": "Missing 'trackId' parameter"}, status=400)
        print(f"DEBUG: Checking App existence for {track_id}")
        app_exists = App.objects.filter(track_id=track_id).exists()
        print(f"DEBUG: App exists: {app_exists}")

        total_reviews = Review.objects.filter(app__track_id=track_id).count()
        print(f"DEBUG: Total reviews found in DB: {total_reviews}")

        # 1. Fetch data and determine the time range
        app_reviews_all_time = Review.objects.filter(app__track_id=track_id)
        if not app_reviews_all_time.exists():
            return JsonResponse({"error": "No reviews found"}, status=404)

        latest_review = app_reviews_all_time.latest('date')
        oldest_review = app_reviews_all_time.earliest('date')
        
        # Calculate total spread of our data in days
        total_days_spread = (timezone.now() - oldest_review.date).days
        
        # 2. DATA SCIENCE LOGIC: Auto-switch granularity
        # If data covers less than 3 weeks, show Daily. Otherwise, show Weekly.
        if total_days_spread < 21:
            granularity = 1
            label_prefix = "Day"
            window_days = 12 # Look back 12 days
        else:
            granularity = 7
            label_prefix = "Wk"
            window_days = 84 # Look back 12 weeks (84 days)

        end_date = latest_review.date
        start_date = end_date - timedelta(days=window_days)

        # 3. Setup Baseline Metrics
        overall_avg = app_reviews_all_time.aggregate(Avg('rating'))['rating__avg'] or 0.0
        overall_avg = round(float(overall_avg), 2)
        
        recent_reviews = app_reviews_all_time.filter(date__gte=start_date)

        # 4. Create Dynamic Buckets
        buckets = []
        for i in range(12):
            buckets.append({
                "label": f"{label_prefix} {i+1}",
                "count": 0,
                "ratings": []
            })

        # 5. Sort reviews into the dynamic buckets
        for review in recent_reviews:
            days_old = (end_date - review.date).days
            
            # Use 'granularity' (1 or 7) to determine which bucket it hits
            index_ago = days_old // granularity
            bucket_index = 11 - index_ago 
            
            if 0 <= bucket_index <= 11:
                buckets[bucket_index]["count"] += 1
                try:
                    buckets[bucket_index]["ratings"].append(float(review.rating))
                except: pass

        # 6. Final Calculations (Z-Score & Fragility)
        weekly_counts = [b["count"] for b in buckets]
        mean_reviews = statistics.mean(weekly_counts)
        std_dev = statistics.stdev(weekly_counts) if len(weekly_counts) > 1 else 0
        viral_threshold = mean_reviews + (2 * std_dev)

        formatted_data = []
        for b in buckets:
            moving_avg = statistics.mean(b["ratings"]) if b["ratings"] else overall_avg
            
            # Flag Fragility: Viral spike but quality drops significantly
            is_fragile = b["count"] > viral_threshold and moving_avg < (overall_avg - 0.5)

            formatted_data.append({
                "week": b["label"], # We keep the key 'week' so your frontend code doesn't break
                "reviews": b["count"],
                "threshold": round(viral_threshold, 1),
                "movingAvg": round(moving_avg, 2),
                "overallAvg": overall_avg,
                "versionFragility": is_fragile,
                "isDaily": total_days_spread < 21 # Tell frontend if this is a daily or weekly view
            })

        return JsonResponse({"data": formatted_data})

# class AnalyticsView(View):
#     """
#     GET /api/analytics/?trackId=<id>
#     Calculates Breakout Velocity and Version Fragility over a 12-week or day period.
#     """
#     def get(self, request):
#         track_id = request.GET.get("trackId", "").strip()
        
#         # Immediate fallback if no ID is provided
#         if not track_id:
#             return JsonResponse({"data": []}, status=200)

#         # Have a weird issue with 500 server errors happenning so wrapped entire logic in Try
#         try:
#             # Fetch data and determine the time range
#             app_reviews_all_time = Review.objects.filter(app__track_id=track_id, date__isnull=False)
#             if not app_reviews_all_time.exists():
#                 return JsonResponse({"data": []}, status=200)

#             latest_review = app_reviews_all_time.latest('date')
#             end_date = latest_review.date
#             oldest_review = app_reviews_all_time.earliest('date')
#             days_since_latest = (now().date() - end_date.date()).days
#             if days_since_latest > 30:
#                 print(f"WARNING: Data for {track_id} is stale! Latest review is {days_since_latest} days old.")

#             # Calculate total spread of our data in days
#             total_days_spread =  (now().date() - end_date.date()).days #(latest_review.date - oldest_review.date).days
            
#             # Zoom into Graph data 
#             if total_days_spread < 21:
#                 granularity = 1
#                 label_prefix = "Day"
#                 window_days = 12 
#             else:
#                 granularity = 7
#                 label_prefix = "Wk" 
#                 window_days = 84 

#             end_date = latest_review.date 
#             start_date = end_date - timedelta(days=window_days)

#             # Setup Baseline Metrics safely
#             overall_avg = app_reviews_all_time.aggregate(Avg('rating'))['rating__avg'] or 0.0
#             overall_avg = round(float(overall_avg), 2)
            
#             recent_reviews = app_reviews_all_time.filter(date__gte=start_date)
#             if not recent_reviews.exists():
#                 recent_reviews = app_reviews_all_time.order_by('-date')[:500] 
#                 # Use these to re-calculate your end_date so the graphs populate
#                 if recent_reviews.exists():
#                     end_date = recent_reviews.latest('date').date

#             # Create Buckets cleanly
#             buckets = [
#                 {"label": f"{label_prefix} {i+1}", "count": 0, "ratings": []} 
#                 for i in range(12)
#             ]
#             print("hello worlds_______________________________________-")
#             print(f"DEBUG: Mean={mean_reviews}, StdDev={std_dev}, Threshold={viral_threshold}")
#             # Sort reviews into the buckets
#             for review in recent_reviews:
#                 days_old = (end_date - review.date).days
                
#                 index_ago = days_old // granularity
#                 bucket_index = 11 - index_ago 
                
#                 # Protect against IndexError if dates calculate weirdly
#                 if 0 <= bucket_index <= 11:
#                     buckets[bucket_index]["count"] += 1
#                     try:
#                         buckets[bucket_index]["ratings"].append(float(review.rating))
#                     except (ValueError, TypeError): 
#                         pass

#             # Final Calculations (Z-Score & Fragility)
#             weekly_counts = [b["count"] for b in buckets]
            
#             # Safe math fallbacks
#             mean_reviews = statistics.mean(weekly_counts) if weekly_counts else 0
#             std_dev = statistics.stdev(weekly_counts) if len(weekly_counts) > 1 else 0
#             viral_threshold = mean_reviews + (2 * std_dev)

#             formatted_data = []
#             for b in buckets:
#                 moving_avg = statistics.mean(b["ratings"]) if b["ratings"] else overall_avg
                
#                 # Flag Fragility (wrapped in bool() for safe JSON serialization)
#                 is_fragile = bool(b["count"] > viral_threshold and moving_avg < (overall_avg - 0.5))

#                 formatted_data.append({
#                     "week": b["label"], 
#                     "reviews": b["count"], 
#                     "threshold": round(viral_threshold, 1),
#                     "movingAvg": round(moving_avg, 2),
#                     "overallAvg": overall_avg,
#                     "versionFragility": is_fragile,
#                     "isDaily": total_days_spread < 21 
#                 })

#             # Success response
#             return JsonResponse({"data": formatted_data}, status=200)

#         except Exception as e:
            
#             # If any math, date, or query error happens above we print it and catch it here 

#             print(f"CRITICAL GRAPH ERROR on App {track_id}: {str(e)}")
#             return JsonResponse({"data": []}, status=200)
        

    # Using track id to query our database of reviews, not Apple API -
    # This allows us to do more analysis without worrying about IP bans or rate limits.
        
        # track_id = request.GET.get("trackId", "").strip()
        # if not track_id:
        #     return JsonResponse({"data": []}, status=200) # Even though this should return a 400 err this preventns app from crashing

        # # Fetch data and determine the time range
        # app_reviews_all_time = Review.objects.filter(app__track_id=track_id)
        # if not app_reviews_all_time.exists():
        #     return JsonResponse({"data": []}, status=200)

        # latest_review = app_reviews_all_time.latest('date')
        # oldest_review = app_reviews_all_time.earliest('date')
        
        # # Calculate total spread of our data in days
        # total_days_spread = (latest_review.date - oldest_review.date).days
        
        # # Zoom into Graph data - Solution for popular apps with tons of reviews only showing few spikes
        # # If data covers less than 3 weeks, show Daily. Otherwise, show Weekly.
        # if total_days_spread < 21:
        #     granularity = 1
        #     label_prefix = "Day" # Label for Graph Buckets
        #     window_days = 12 # Look back 12 days
        # else:
        #     granularity = 7
        #     label_prefix = "Wk" # Label for Graph Buckets
        #     window_days = 84 # Look back 12 weeks (84 days)

        # end_date = latest_review.date 
        # start_date = end_date - timedelta(days=window_days)

        # # Setup Baseline Metrics
        # overall_avg = app_reviews_all_time.aggregate(Avg('rating'))['rating__avg'] or 0.0
        # overall_avg = round(float(overall_avg), 2)
        
        # recent_reviews = app_reviews_all_time.filter(date__gte=start_date)

        # # Create Buckets
        # buckets = []
        # for i in range(12):
        #     buckets.append({
        #         "label": f"{label_prefix} {i+1}",
        #         "count": 0,
        #         "ratings": []
        #     })

        # # Sort reviews into the buckets
        # for review in recent_reviews:
        #     days_old = (end_date - review.date).days
            
        #     # Use 'granularity' (1 or 7) to determine which bucket it hits
        #     index_ago = days_old // granularity
        #     bucket_index = 11 - index_ago 
            
        #     if 0 <= bucket_index <= 11:
        #         buckets[bucket_index]["count"] += 1
        #         try:
        #             buckets[bucket_index]["ratings"].append(float(review.rating))
        #         except: pass

        # # Final Calculations (Z-Score & Fragility)
        # weekly_counts = [b["count"] for b in buckets]
        # mean_reviews = statistics.mean(weekly_counts)
        # std_dev = statistics.stdev(weekly_counts) if len(weekly_counts) > 1 else 0
        # viral_threshold = mean_reviews + (2 * std_dev)

        # formatted_data = []
        # for b in buckets:
        #     moving_avg = statistics.mean(b["ratings"]) if b["ratings"] else overall_avg
            
        #     # Flag Fragility: Viral spike but quality drops significantly
        #     is_fragile = b["count"] > viral_threshold and moving_avg < (overall_avg - 0.5)

        #     formatted_data.append({
        #         "week": b["label"], # This label is week or day depending on granularity but I just call it week 
        #         "reviews": b["count"], 
        #         "threshold": round(viral_threshold, 1),
        #         "movingAvg": round(moving_avg, 2),
        #         "overallAvg": overall_avg,
        #         "versionFragility": is_fragile,
        #         "isDaily": total_days_spread < 21 # Telling frontend if this is a daily or weekly 
        #     })

        # return JsonResponse({"data": formatted_data})


        # def get(self, request):
        # track_id = request.GET.get("trackId", "").strip()
        # page = request.GET.get("page", "1").strip()
        # country = request.GET.get("country", "us").strip().lower()

        # if not track_id:
        #     return JsonResponse({"error": "Missing 'trackId' query parameter"}, status=400)

        # # Check cache first
        # cache_key = f"reviews_{track_id}_{page}_{country}"
        # cached = cache.get(cache_key)
        # if cached:
        #     return JsonResponse({**cached, "cached": True})

        # # Try multiple sort orders and pages

        # reviews = [] 
        # sort_orders = ["mostrecent"] 

        # for sort in sort_orders:
        #     for pg in range(1, 11): # Loop through all 10 pages
        #         url = f"https://itunes.apple.com/rss/customerreviews/page={pg}/id={track_id}/sortby={sort}/json"
        #         try:
        #             response = requests.get(url, headers=self.HEADERS, timeout=10)
        #             response.raise_for_status()
        #             data = response.json()
        #             entries = data.get("feed", {}).get("entry", [])
                    
        #             if len(entries) > 1:
        #                 review_entries = entries[1:] 
        #                 for entry in review_entries:
        #                     # Append each individual review to our master list
        #                     reviews.append({
        #                         "id": entry.get("id", {}).get("label"),
        #                         "title": entry.get("title", {}).get("label"),
        #                         "content": entry.get("content", {}).get("label"),
        #                         "rating": entry.get("im:rating", {}).get("label"),
        #                         "author": entry.get("author", {}).get("name", {}).get("label"),
        #                         "date": entry.get("updated", {}).get("label"),
        #                         "version": entry.get("im:version", {}).get("label"),
        #                     })
        #             else:
        #                 # Page comes back empty --> we reached the end of the available reviews
        #                 break 
        #         except requests.RequestException:
        #             # Skip to next sort or finish if Apple blocks a page
        #             break 
        # # Computes average rating - Used for Graph in app details page 
        # ratings = [int(r["rating"]) for r in reviews if r.get("rating", "").isdigit()]
        # avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

        # payload = {
        #     "trackId": track_id,
        #     "page": int(page),
        #     "reviewCount": len(reviews),
        #     "averageRating": avg_rating,
        #     "reviews": reviews,
        # }

        # # Store in cache
        # cache.set(cache_key, payload, self.CACHE_TIMEOUT)
        
        # # Save reviews to database
        # try: 
        #     app = App.objects.get(track_id=track_id)
        #     for r in reviews:
        #         parsed_date = parse_datetime(r["date"]) if r["date"] else None
        #         safe_date = parsed_date if parsed_date else now()

                
        #         Review.objects.get_or_create(
        #             review_id=r["id"],
        #             defaults={
        #                 "app": app,
        #                 "title": r["title"],
        #                 "content": r["content"],
        #                 "rating": r["rating"],
        #                 "version": r["version"],
        #                 "date": safe_date,
        #             }
        #         )
        # except App.DoesNotExist:
        #     pass

        # return JsonResponse({**payload, "cached": False})
        