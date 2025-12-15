"""
URL configuration for food_diary project.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from django.views.decorators.http import require_http_methods

@require_http_methods(["GET"])
def favicon_view(request):
    """Return empty favicon to prevent 404/500 errors"""
    return HttpResponse("", content_type="image/x-icon")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/', include('api.urls')),
    path('api/ai/', include('ai.urls')),
    path('favicon.ico', favicon_view, name='favicon'),
]

