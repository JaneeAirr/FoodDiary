from django.contrib import admin
from .models import Food, Meal, NutritionGoal, WeightEntry, Notification, MealReminderSettings


@admin.register(Food)
class FoodAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand', 'calories', 'protein', 'carbs', 'fat']
    search_fields = ['name', 'brand']
    list_filter = ['created_at']


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ['user', 'food', 'date', 'meal_type', 'quantity', 'total_calories']
    list_filter = ['date', 'meal_type', 'user']
    search_fields = ['user__username', 'food__name']
    date_hierarchy = 'date'


@admin.register(NutritionGoal)
class NutritionGoalAdmin(admin.ModelAdmin):
    list_display = ['user', 'daily_calories', 'daily_protein', 'daily_carbs', 'daily_fat']


@admin.register(WeightEntry)
class WeightEntryAdmin(admin.ModelAdmin):
    list_display = ['user', 'weight', 'date', 'created_at']
    list_filter = ['date', 'user']
    search_fields = ['user__username']
    date_hierarchy = 'date'


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at', 'user']
    search_fields = ['user__username', 'title', 'message']
    date_hierarchy = 'created_at'


@admin.register(MealReminderSettings)
class MealReminderSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'reminders_enabled', 'breakfast_time', 'lunch_time', 'dinner_time', 'browser_notifications']
    list_filter = ['reminders_enabled', 'browser_notifications', 'sound_enabled']
    search_fields = ['user__username']

