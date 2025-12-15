from django.contrib.auth.models import AbstractUser
from django.db import models
import json


class User(AbstractUser):
    """Custom User model with additional fields"""
    email = models.EmailField(unique=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=[
            ('M', 'Male'),
            ('F', 'Female'),
            ('Other', 'Other'),
        ],
        null=True,
        blank=True
    )
    height = models.FloatField(null=True, blank=True, help_text="Height in cm")
    weight = models.FloatField(null=True, blank=True, help_text="Weight in kg")
    goal = models.CharField(
        max_length=20,
        choices=[
            ('weight_loss', 'Weight Loss'),
            ('weight_gain', 'Weight Gain'),
            ('maintenance', 'Maintenance'),
        ],
        null=True,
        blank=True
    )
    activity_level = models.CharField(
        max_length=20,
        choices=[
            ('sedentary', 'Sedentary'),
            ('light', 'Lightly Active'),
            ('moderate', 'Moderately Active'),
            ('active', 'Very Active'),
            ('very_active', 'Extremely Active'),
        ],
        default='moderate'
    )
    allergies = models.JSONField(default=list, blank=True, help_text="List of allergies")
    dietary_restrictions = models.JSONField(default=list, blank=True, help_text="Dietary restrictions")
    display_name = models.CharField(max_length=150, blank=True)
    show_display_name = models.BooleanField(default=False)
    dietary_preference = models.CharField(
        max_length=20,
        choices=[
            ('none', 'None'),
            ('vegetarian', 'Vegetarian'),
            ('vegan', 'Vegan'),
            ('gluten_free', 'Gluten Free'),
            ('keto', 'Keto'),
            ('paleo', 'Paleo'),
        ],
        default='none'
    )
    theme_preference = models.CharField(
        max_length=10,
        choices=[
            ('light', 'Light'),
            ('dark', 'Dark'),
            ('system', 'System'),
        ],
        default='dark'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username


class PsychFoodProfile(models.Model):
    """Psycho-food profile for AI analysis"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='psych_profile')
    evening_overeating = models.BooleanField(default=False)
    sweet_stress = models.BooleanField(default=False)
    irregular_eating = models.BooleanField(default=False)
    ai_analysis = models.TextField(blank=True, help_text="AI analysis result")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s psych profile"

