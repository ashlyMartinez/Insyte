import json
import requests
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.cache import cache
from .models import App, Review


#Review Analystics Imports 
import math
import statistics
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg
from django.utils.dateparse import parse_datetime


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

        app, created = App.objects.update_or_create(
            track_id=str(track_id),
            defaults={
                "app_name": app_name,
                "developer_name": payload.get("developerName"),
                "icon_url": payload.get("iconUrl"),
                "genre": payload.get("genre"),
                "average_rating": payload.get("averageRating"),
                "rating_count": payload.get("ratingCount"),
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
    
    def get(self, request):
        track_id = request.GET.get("trackId", "").strip()
        page = request.GET.get("page", "1").strip()
        country = request.GET.get("country", "us").strip()

        if not track_id:
            return JsonResponse({"error": "Missing 'trackId' query parameter"}, status=400)

        # Check cache first
        cache_key = f"reviews_{track_id}_{page}_{country}"
        cached = cache.get(cache_key)
        if cached:
            return JsonResponse({**cached, "cached": True})

        # Try multiple sort orders and pages
        # sort_orders = ["mostrecent", "mosthelpful"] Original 

        reviews = [] # Change the name to keep track of everything
        sort_orders = ["mostrecent"] # You only really need mostrecent for a time-series graph

        for sort in sort_orders:
            for pg in range(1, 11): # Loop through all 10 pages
                url = f"https://itunes.apple.com/rss/customerreviews/page={pg}/id={track_id}/sortby={sort}/json"
                try:
                    response = requests.get(url, headers=self.HEADERS, timeout=10)
                    response.raise_for_status()
                    data = response.json()
                    entries = data.get("feed", {}).get("entry", [])
                    
                    if len(entries) > 1:
                        review_entries = entries[1:] 
                        for entry in review_entries:
                            # Append each individual review to our master list
                            reviews.append({
                                "id": entry.get("id", {}).get("label"),
                                "title": entry.get("title", {}).get("label"),
                                "content": entry.get("content", {}).get("label"),
                                "rating": entry.get("im:rating", {}).get("label"),
                                "author": entry.get("author", {}).get("name", {}).get("label"),
                                "date": entry.get("updated", {}).get("label"),
                                "version": entry.get("im:version", {}).get("label"),
                            })
                    else:
                        # If a page comes back empty, we've reached the end of the available reviews
                        break 
                except requests.RequestException:
                    break # Skip to next sort or finish if Apple blocks a page
        # Computes average rating
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
        
        # Save reviews to database
        try: 
            app = App.objects.get(track_id=track_id)
            for r in reviews:
                
                Review.objects.get_or_create(
                    review_id=r["id"],
                    defaults={
                        "app": app,
                        "title": r["title"],
                        "content": r["content"],
                        "rating": r["rating"],
                        "version": r["version"],
                        "date": parse_datetime(r["date"]),
                    }
                )
        except App.DoesNotExist:
            pass

        return JsonResponse({**payload, "cached": False})
    

class AnalyticsView(View):
    """
    GET /api/analytics/?trackId=<id>
    Calculates Breakout Velocity and Version Fragility over a 12-week period.
    """
    def get(self, request):
        track_id = request.GET.get("trackId", "").strip()
        if not track_id:
            return JsonResponse({"error": "Missing 'trackId' parameter"}, status=400)

        # 1. Fetch data and determine the time range
        app_reviews_all_time = Review.objects.filter(app__track_id=track_id)
        if not app_reviews_all_time.exists():
            return JsonResponse({"error": "No reviews found"}, status=404)

        latest_review = app_reviews_all_time.latest('date')
        oldest_review = app_reviews_all_time.earliest('date')
        
        # Calculate total spread of our data in days
        total_days_spread = (latest_review.date - oldest_review.date).days
        
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