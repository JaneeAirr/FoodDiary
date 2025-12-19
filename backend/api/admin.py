from django.contrib import admin
from .models import Food, Meal, NutritionGoal, WeightEntry, Notification, MealReminderSettings, Recipe, RecipeIngredient


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

