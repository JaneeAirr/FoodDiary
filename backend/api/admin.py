from django.contrib import admin
from .models import Food, Meal, NutritionGoal, WeightEntry, Notification, MealReminderSettings, Recipe, RecipeIngredient, FastingSession, FastingSettings


@admin.register(Food)
class FoodAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand', 'calories', 'protein', 'carbs', 'fat']
    search_fields = ['name', 'brand']
    list_filter = ['created_at']


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ['user', 'name', 'date', 'meal_type', 'quantity', 'total_calories']
    list_filter = ['date', 'meal_type', 'user']
    search_fields = ['user__username', 'food__name', 'recipe__name']
    date_hierarchy = 'date'
    
    def name(self, obj):
        return obj.name
    name.short_description = 'Food/Recipe'


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


class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1
    fields = ['food', 'quantity']
    autocomplete_fields = ['food']


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'servings', 'total_calories', 'calories_per_serving', 'created_at']
    list_filter = ['created_at', 'user']
    search_fields = ['name', 'description', 'user__username']
    inlines = [RecipeIngredientInline]
    readonly_fields = ['total_calories', 'total_protein', 'total_carbs', 'total_fat', 
                       'calories_per_serving', 'protein_per_serving', 'carbs_per_serving', 'fat_per_serving']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'name', 'description', 'servings')
        }),
        ('Nutrition (calculated)', {
            'fields': ('total_calories', 'total_protein', 'total_carbs', 'total_fat',
                      'calories_per_serving', 'protein_per_serving', 'carbs_per_serving', 'fat_per_serving'),
            'classes': ('collapse',)
        }),
    )


@admin.register(FastingSession)
class FastingSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'start_time', 'end_time', 'duration_minutes', 'is_active', 'created_at']
    list_filter = ['is_active', 'start_time', 'user']
    search_fields = ['user__username', 'notes']
    date_hierarchy = 'start_time'
    readonly_fields = ['duration_minutes', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Session Information', {
            'fields': ('user', 'start_time', 'end_time', 'is_active', 'duration_minutes')
        }),
        ('Additional Information', {
            'fields': ('notes', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(FastingSettings)
class FastingSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'widget_enabled', 'protocol', 'custom_fasting_hours', 'eating_window_start', 'notifications_enabled']
    list_filter = ['widget_enabled', 'protocol', 'notifications_enabled']
    search_fields = ['user__username']
    readonly_fields = ['created_at', 'updated_at']

