from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'foods', views.FoodViewSet, basename='food')
router.register(r'meals', views.MealViewSet, basename='meal')
router.register(r'goals', views.NutritionGoalViewSet, basename='goal')
router.register(r'weight', views.WeightEntryViewSet, basename='weight')
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'meal-reminders', views.MealReminderSettingsViewSet, basename='meal-reminder')

urlpatterns = [
    path('', include(router.urls)),
    path('daily-summary/', views.daily_summary, name='daily-summary'),
    path('statistics/', views.statistics, name='statistics'),
    path('check-notifications/', views.check_notifications, name='check-notifications'),
    path('calculate-nutrition/', views.calculate_nutrition, name='calculate-nutrition'),
]

