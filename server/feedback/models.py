from django.db import models

# Model for app name
class App(models.Model):
    track_id = models.CharField(max_length=50, unique=True)
    app_name = models.CharField(max_length=255)
    developer_name = models.CharField(max_length=255, blank=True, null=True)
    icon_url = models.URLField(blank=True, null=True)
    genre = models.CharField(max_length=100, blank=True, null=True)
    average_rating = models.FloatField(blank=True, null=True)
    rating_count = models.IntegerField(blank=True, null=True)
    tracked = models.BooleanField(default=False)
    last_fetched = models.DateTimeField(auto_now=True)
    current_version_rating = models.FloatField(default=0.0)
    current_version_rating_count = models.IntegerField(default=0)
    initial_release_date = models.DateTimeField(null=True, blank=True)
    current_version_release_date = models.DateTimeField(null=True, blank=True)
    content_advisory_rating = models.CharField(max_length=50, blank=True)
    version = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return self.app_name
    
# Model for reviews
class Review(models.Model):
    app = models.ForeignKey(App, on_delete=models.CASCADE, related_name="reviews")
    review_id = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=255, blank=True, null=True)
    content = models.TextField(blank=True, null=True)
    rating = models.IntegerField()
    author = models.CharField(max_length=255, blank=True, null=True)
    date = models.DateTimeField(blank=True, null=True)
    version = models.CharField(max_length=50, blank=True, null=True)
    
    def __str__(self):
        return f"{self.app.app_name} - {self.tile}"