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
router.register(r'water', views.WaterIntakeViewSet, basename='water')
router.register(r'water-settings', views.WaterSettingsViewSet, basename='water-settings')
router.register(r'recipes', views.RecipeViewSet, basename='recipe')

urlpatterns = [
    # Put specific paths BEFORE router to avoid conflicts
    path('foods/search/', views.unified_food_search, name='unified-food-search'),
    path('foods/import-url/', views.import_food_from_url, name='import-food-from-url'),
    path('usda/search/', views.usda_search, name='usda-search'),
    path('usda/save/', views.usda_save_food, name='usda-save-food'),
    path('daily-summary/', views.daily_summary, name='daily-summary'),
    path('statistics/', views.statistics, name='statistics'),
    path('check-notifications/', views.check_notifications, name='check-notifications'),
    path('calculate-nutrition/', views.calculate_nutrition, name='calculate-nutrition'),
    path('nutrition-report-pdf/', views.nutrition_report_pdf, name='nutrition-report-pdf'),
    path('', include(router.urls)),
]

