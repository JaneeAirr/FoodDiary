from rest_framework import serializers
from datetime import date
from .models import Food, Meal, NutritionGoal, WeightEntry, Notification, MealReminderSettings, WaterIntake, WaterSettings, Recipe, RecipeIngredient, FastingSession, FastingSettings
from users.serializers import UserSerializer


class FoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Food
        fields = '__all__'


class RecipeIngredientSerializer(serializers.ModelSerializer):
    food = FoodSerializer(read_only=True)
    food_id = serializers.PrimaryKeyRelatedField(queryset=Food.objects.all(), source='food', write_only=True)
    total_calories = serializers.ReadOnlyField()
    total_protein = serializers.ReadOnlyField()
    total_carbs = serializers.ReadOnlyField()
    total_fat = serializers.ReadOnlyField()
    
    class Meta:
        model = RecipeIngredient
        fields = '__all__'
        read_only_fields = ('recipe',)


class RecipeSerializer(serializers.ModelSerializer):
    ingredients = RecipeIngredientSerializer(many=True, read_only=True)
    total_calories = serializers.ReadOnlyField()
    total_protein = serializers.ReadOnlyField()
    total_carbs = serializers.ReadOnlyField()
    total_fat = serializers.ReadOnlyField()
    calories_per_serving = serializers.ReadOnlyField()
    protein_per_serving = serializers.ReadOnlyField()
    carbs_per_serving = serializers.ReadOnlyField()
    fat_per_serving = serializers.ReadOnlyField()
    
    class Meta:
        model = Recipe
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')


class MealSerializer(serializers.ModelSerializer):
    food = FoodSerializer(read_only=True)
    food_id = serializers.PrimaryKeyRelatedField(
        queryset=Food.objects.all(), 
        source='food', 
        write_only=True, 
        required=False,
        allow_null=True
    )
    recipe = serializers.SerializerMethodField()
    recipe_id = serializers.PrimaryKeyRelatedField(
        queryset=Recipe.objects.all(),
        source='recipe',
        write_only=True,
        required=False,
        allow_null=True
    )
    name = serializers.ReadOnlyField()
    total_calories = serializers.ReadOnlyField()
    total_protein = serializers.ReadOnlyField()
    total_carbs = serializers.ReadOnlyField()
    total_fat = serializers.ReadOnlyField()
    
    class Meta:
        model = Meal
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')
    
    def get_recipe(self, obj):
        if obj.recipe:
            return RecipeSerializer(obj.recipe).data
        return None
    
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
        # Ensure either food_id or recipe_id is provided
        food_id = attrs.get('food') or self.initial_data.get('food_id')
        recipe_id = attrs.get('recipe') or self.initial_data.get('recipe_id')
        
        if not food_id and not recipe_id:
            raise serializers.ValidationError({"food_id": "Either food_id or recipe_id is required."})
        if food_id and recipe_id:
            raise serializers.ValidationError("Cannot provide both food_id and recipe_id.")
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


class WaterIntakeSerializer(serializers.ModelSerializer):
    amount_fl_oz = serializers.ReadOnlyField()
    
    class Meta:
        model = WaterIntake
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
    
    def validate_amount_ml(self, value):
        """Ensure amount is non-negative"""
        if value is not None and value < 0:
            raise serializers.ValidationError("Water amount must be non-negative.")
        return value


class WaterSettingsSerializer(serializers.ModelSerializer):
    daily_goal_display = serializers.ReadOnlyField()
    
    class Meta:
        model = WaterSettings
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')


class FastingSessionSerializer(serializers.ModelSerializer):
    duration_minutes = serializers.ReadOnlyField()
    
    class Meta:
        model = FastingSession
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at', 'duration_minutes')
    
    def validate(self, data):
        """Validate that end_time is after start_time"""
        if data.get('end_time') and data.get('start_time'):
            if data['end_time'] <= data['start_time']:
                raise serializers.ValidationError("End time must be after start time.")
        return data


class FastingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = FastingSettings
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')

