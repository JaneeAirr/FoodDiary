from rest_framework import serializers
from datetime import date
from .models import Food, Meal, NutritionGoal, WeightEntry, Notification, MealReminderSettings
from users.serializers import UserSerializer


class FoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Food
        fields = '__all__'


class MealSerializer(serializers.ModelSerializer):
    food = FoodSerializer(read_only=True)
    food_id = serializers.PrimaryKeyRelatedField(queryset=Food.objects.all(), source='food', write_only=True)
    total_calories = serializers.ReadOnlyField()
    total_protein = serializers.ReadOnlyField()
    total_carbs = serializers.ReadOnlyField()
    total_fat = serializers.ReadOnlyField()
    
    class Meta:
        model = Meal
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')
    
    def validate_date(self, value):
        """Ensure date is properly formatted"""
        if isinstance(value, str):
            try:
                return date.fromisoformat(value)
            except ValueError:
                raise serializers.ValidationError("Invalid date format. Use YYYY-MM-DD.")
        return value
    
    def validate_quantity(self, value):
        """Ensure quantity is positive"""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value
    
    def validate(self, attrs):
        """Additional validation"""
        # Ensure food_id is provided
        if 'food' not in attrs and 'food_id' not in self.initial_data:
            raise serializers.ValidationError({"food_id": "Food is required."})
        return attrs


class NutritionGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutritionGoal
        fields = '__all__'
        read_only_fields = ('user', 'updated_at')


class WeightEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = WeightEntry
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')
    
    def validate_date(self, value):
        """Ensure date is properly formatted"""
        if isinstance(value, str):
            try:
                return date.fromisoformat(value)
            except ValueError:
                raise serializers.ValidationError("Invalid date format. Use YYYY-MM-DD.")
        return value


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('user', 'created_at')


class MealReminderSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealReminderSettings
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')

