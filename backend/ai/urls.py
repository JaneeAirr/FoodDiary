from django.urls import path
from . import views

urlpatterns = [
    path('analyze-behavior/', views.analyze_behavior, name='analyze-behavior'),
    path('recommendations/', views.get_recommendations, name='recommendations'),
    path('parse-meal-text/', views.parse_meal_text, name='parse-meal-text'),
    path('generate-meal-plan/', views.generate_meal_plan, name='generate-meal-plan'),
    path('chat/', views.chat_with_ai, name='chat'),
]

