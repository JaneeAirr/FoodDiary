from django.urls import path
from . import views
from . import google_auth

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('profile/', views.profile, name='profile'),
    path('profile/update/', views.update_profile, name='update_profile'),
    path('google/', google_auth.google_auth, name='google_auth'),
    path('google/callback/', google_auth.google_callback, name='google_callback'),
]

