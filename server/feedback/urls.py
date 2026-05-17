from django.urls import path
from .views import SearchAppView, FetchReviewsView, AnalyticsView
# Added AnlyticsView to the imports

urlpatterns = [
    path("search/", SearchAppView.as_view(), name="search-app"),
    path("reviews/", FetchReviewsView.as_view(), name="fetch-reviews"),
    
    # NEW route
    path('analytics/', AnalyticsView.as_view(), name='app_analytics'),
]