from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator

User = get_user_model()


class Food(models.Model):
    """Food items with nutrition information"""
    name = models.CharField(max_length=200)
    brand = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    
    # Nutrition per 100g
    calories = models.FloatField(validators=[MinValueValidator(0)])
    protein = models.FloatField(validators=[MinValueValidator(0)], help_text="grams per 100g")
    carbs = models.FloatField(validators=[MinValueValidator(0)], help_text="grams per 100g")
    fat = models.FloatField(validators=[MinValueValidator(0)], help_text="grams per 100g")
    fiber = models.FloatField(default=0, validators=[MinValueValidator(0)], help_text="grams per 100g")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.brand})" if self.brand else self.name


class Meal(models.Model):
    """Meal entry for a specific day"""
    MEAL_TYPES = [
        ('breakfast', 'Breakfast'),
        ('lunch', 'Lunch'),
        ('dinner', 'Dinner'),
        ('snack', 'Snack'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meals')
    food = models.ForeignKey(Food, on_delete=models.CASCADE, related_name='meals')
    date = models.DateField()
    meal_type = models.CharField(max_length=20, choices=MEAL_TYPES)
    quantity = models.FloatField(validators=[MinValueValidator(0.1)], help_text="Quantity in grams")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', 'meal_type']
        indexes = [
            models.Index(fields=['user', 'date']),
        ]
    
    @property
    def total_calories(self):
        return (self.food.calories * self.quantity) / 100
    
    @property
    def total_protein(self):
        return (self.food.protein * self.quantity) / 100
    
    @property
    def total_carbs(self):
        return (self.food.carbs * self.quantity) / 100
    
    @property
    def total_fat(self):
        return (self.food.fat * self.quantity) / 100
    
    def __str__(self):
        return f"{self.user.username} - {self.food.name} ({self.date})"


class NutritionGoal(models.Model):
    """User's daily nutrition goals"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='nutrition_goal')
    daily_calories = models.FloatField(validators=[MinValueValidator(0)])
    daily_protein = models.FloatField(validators=[MinValueValidator(0)], help_text="grams")
    daily_carbs = models.FloatField(validators=[MinValueValidator(0)], help_text="grams")
    daily_fat = models.FloatField(validators=[MinValueValidator(0)], help_text="grams")
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username}'s nutrition goals"


class WeightEntry(models.Model):
    """Weight tracking entry for user"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weight_entries')
    weight = models.FloatField(validators=[MinValueValidator(0)], help_text="Weight in kg")
    date = models.DateField()
    notes = models.TextField(blank=True, help_text="Optional notes about this weight entry")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', '-created_at']
        unique_together = ['user', 'date']  # One entry per user per day
        indexes = [
            models.Index(fields=['user', 'date']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.weight}kg ({self.date})"


class Notification(models.Model):
    """User notifications"""
    NOTIFICATION_TYPES = [
        ('reminder', 'Reminder'),
        ('warning', 'Warning'),
        ('info', 'Information'),
        ('achievement', 'Achievement'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='info')
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"

