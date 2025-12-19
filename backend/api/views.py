from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import date, timedelta
from collections import defaultdict
from .models import Food, Meal, NutritionGoal, WeightEntry, Notification, MealReminderSettings, WaterIntake, WaterSettings, Recipe, RecipeIngredient
from .serializers import (
    FoodSerializer, MealSerializer, NutritionGoalSerializer,
    WeightEntrySerializer, NotificationSerializer, MealReminderSettingsSerializer,
    WaterIntakeSerializer, WaterSettingsSerializer, RecipeSerializer, RecipeIngredientSerializer
)
from .notification_service import check_and_create_daily_notifications
from .utils import (
    calculate_bmr, calculate_tdee, calculate_daily_calories,
    calculate_macros, calculate_age_from_birthdate
)
from .usda_importer import USDADataImporter


class FoodViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing food database"""
    queryset = Food.objects.all()
    serializer_class = FoodSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Food.objects.all()
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(brand__icontains=search))
        return queryset


class MealViewSet(viewsets.ModelViewSet):
    """ViewSet for meal entries"""
    serializer_class = MealSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Meal.objects.filter(user=user).select_related('food', 'recipe').prefetch_related('recipe__ingredients__food')
        
        # Filter by date if provided
        date_param = self.request.query_params.get('date', None)
        if date_param:
            try:
                # Convert string date to date object for proper filtering
                if isinstance(date_param, str):
                    date_obj = date.fromisoformat(date_param)
                else:
                    date_obj = date_param
                queryset = queryset.filter(date=date_obj)
            except (ValueError, TypeError):
                # If date parsing fails, ignore the filter
                pass
        
        return queryset.order_by('-date', 'meal_type')
    
    def perform_create(self, serializer):
        try:
            meal = serializer.save(user=self.request.user)
            # Check and create notifications after meal is added
            # Wrap in try-except to prevent meal creation from failing if notifications fail
            try:
                check_and_create_daily_notifications(self.request.user)
            except Exception as e:
                # Log error but don't fail meal creation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error creating notifications: {e}", exc_info=True)
        except Exception as e:
            # Log the actual error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating meal: {e}", exc_info=True)
            raise


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_summary(request):
    """Get daily nutrition summary for a specific date"""
    date_param = request.query_params.get('date', str(date.today()))
    
    # Convert string date to date object for proper filtering
    try:
        if isinstance(date_param, str):
            date_obj = date.fromisoformat(date_param)
        else:
            date_obj = date_param
    except (ValueError, TypeError):
        date_obj = date.today()
        date_param = str(date_obj)
    
    # Optimize query with prefetch for recipe ingredients
    meals = Meal.objects.filter(user=request.user, date=date_obj).select_related('food', 'recipe').prefetch_related('recipe__ingredients__food')
    
    # Calculate totals using aggregation for better performance
    from django.db.models import Sum, Case, When, F, FloatField
    
    # Calculate totals for food-based meals
    food_totals = meals.filter(food__isnull=False).aggregate(
        calories=Sum(F('food__calories') * F('quantity') / 100, output_field=FloatField()),
        protein=Sum(F('food__protein') * F('quantity') / 100, output_field=FloatField()),
        carbs=Sum(F('food__carbs') * F('quantity') / 100, output_field=FloatField()),
        fat=Sum(F('food__fat') * F('quantity') / 100, output_field=FloatField()),
    )
    
    # Calculate totals for recipe-based meals manually (more complex)
    total_calories = float(food_totals['calories'] or 0)
    total_protein = float(food_totals['protein'] or 0)
    total_carbs = float(food_totals['carbs'] or 0)
    total_fat = float(food_totals['fat'] or 0)
    
    # Add recipe totals
    recipe_meals = meals.filter(recipe__isnull=False)
    for meal in recipe_meals:
        total_calories += meal.total_calories
        total_protein += meal.total_protein
        total_carbs += meal.total_carbs
        total_fat += meal.total_fat
    
    # Get user's goals (cache this if possible)
    try:
        goals = NutritionGoal.objects.get(user=request.user)
        goal_data = {
            'daily_calories': float(goals.daily_calories),
            'daily_protein': float(goals.daily_protein),
            'daily_carbs': float(goals.daily_carbs),
            'daily_fat': float(goals.daily_fat),
        }
    except NutritionGoal.DoesNotExist:
        goal_data = None
    
    # Ensure totals are floats
    return Response({
        'date': date_param,
        'totals': {
            'calories': float(total_calories),
            'protein': float(total_protein),
            'carbs': float(total_carbs),
            'fat': float(total_fat),
        },
        'goals': goal_data,
        'meals': MealSerializer(meals, many=True).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def statistics(request):
    """Get nutrition statistics and weight tracking over time"""
    days = int(request.query_params.get('days', 7))
    end_date = date.today()
    start_date = end_date - timedelta(days=days-1)
    
    # Get nutrition statistics - optimize with prefetch for recipe ingredients
    meals = Meal.objects.filter(
        user=request.user,
        date__gte=start_date,
        date__lte=end_date
    ).select_related('food', 'recipe').prefetch_related('recipe__ingredients__food').order_by('date')
    
    # Group by date and calculate totals manually
    daily_totals = defaultdict(lambda: {
        'total_calories': 0.0,
        'total_protein': 0.0,
        'total_carbs': 0.0,
        'total_fat': 0.0
    })
    
    for meal in meals:
        day_key = str(meal.date)
        daily_totals[day_key]['total_calories'] += meal.total_calories
        daily_totals[day_key]['total_protein'] += meal.total_protein
        daily_totals[day_key]['total_carbs'] += meal.total_carbs
        daily_totals[day_key]['total_fat'] += meal.total_fat
    
    # Convert to list format
    nutrition_data = [
        {
            'date': day_date,
            'total_calories': float(totals['total_calories']),
            'total_protein': float(totals['total_protein']),
            'total_carbs': float(totals['total_carbs']),
            'total_fat': float(totals['total_fat']),
        }
        for day_date, totals in sorted(daily_totals.items())
    ]
    
    # Get weight entries
    weight_entries = WeightEntry.objects.filter(
        user=request.user,
        date__gte=start_date,
        date__lte=end_date
    ).order_by('date')
    
    # Convert to dictionaries for easier frontend consumption
    weight_data = [
        {
            'date': str(entry.date),
            'weight': float(entry.weight),
            'notes': entry.notes
        }
        for entry in weight_entries
    ]
    
    return Response({
        'nutrition': nutrition_data,
        'weight': weight_data,
        'date_range': {
            'start': str(start_date),
            'end': str(end_date),
            'days': days
        }
    })


class NutritionGoalViewSet(viewsets.ModelViewSet):
    """ViewSet for nutrition goals"""
    serializer_class = NutritionGoalSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return NutritionGoal.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get', 'put', 'patch'])
    def my_goals(self, request):
        """Get or update current user's goals"""
        try:
            goals = NutritionGoal.objects.get(user=request.user)
            if request.method == 'GET':
                serializer = self.get_serializer(goals)
                return Response(serializer.data)
            else:
                serializer = self.get_serializer(goals, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(serializer.data)
        except NutritionGoal.DoesNotExist:
            if request.method == 'GET':
                return Response({'message': 'No goals set'}, status=status.HTTP_404_NOT_FOUND)
            else:
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                serializer.save(user=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)


class WeightEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for weight entries"""
    serializer_class = WeightEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = WeightEntry.objects.filter(user=user)
        
        # Filter by date range if provided
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        if start_date:
            try:
                queryset = queryset.filter(date__gte=date.fromisoformat(start_date))
            except ValueError:
                pass
        
        if end_date:
            try:
                queryset = queryset.filter(date__lte=date.fromisoformat(end_date))
            except ValueError:
                pass
        
        return queryset.order_by('-date', '-created_at')
    
    def perform_create(self, serializer):
        """Create or update weight entry for the date"""
        user = self.request.user
        entry_date = serializer.validated_data.get('date')
        
        # Check if entry already exists for this date
        try:
            existing_entry = WeightEntry.objects.get(user=user, date=entry_date)
            # Update existing entry instead of creating new one
            serializer.instance = existing_entry
            serializer.save(user=user)
        except WeightEntry.DoesNotExist:
            # Create new entry
            serializer.save(user=user)


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for notifications"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Notification.objects.filter(user=user)
        
        # Filter by read status if provided
        is_read = self.request.query_params.get('is_read', None)
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'all notifications marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})


class MealReminderSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for meal reminder settings"""
    serializer_class = MealReminderSettingsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return MealReminderSettings.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get', 'put', 'patch'])
    def my_settings(self, request):
        """Get or update current user's reminder settings"""
        settings_obj, created = MealReminderSettings.objects.get_or_create(
            user=request.user,
            defaults={
                'reminders_enabled': True,
                'breakfast_time': '08:00',
                'lunch_time': '13:00',
                'dinner_time': '19:00',
                'snack_time': '15:00',
                'active_days': '0,1,2,3,4,5,6',
                'browser_notifications': True,
                'sound_enabled': False,
            }
        )
        
        if request.method == 'GET':
            serializer = self.get_serializer(settings_obj)
            return Response(serializer.data)
        
        elif request.method in ['PUT', 'PATCH']:
            serializer = self.get_serializer(settings_obj, data=request.data, partial=request.method == 'PATCH')
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WaterIntakeViewSet(viewsets.ModelViewSet):
    """ViewSet for water intake tracking"""
    serializer_class = WaterIntakeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        date = self.request.query_params.get('date', None)
        queryset = WaterIntake.objects.filter(user=user)
        
        if date:
            try:
                date_obj = date.fromisoformat(date)
                queryset = queryset.filter(date=date_obj)
            except ValueError:
                pass
        
        return queryset.order_by('-date', '-created_at')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get', 'post', 'put'])
    def today(self, request):
        """Get or update water intake for a specific date (defaults to today)"""
        # Get date from query params or use today
        date_str = request.query_params.get('date', None)
        if date_str:
            try:
                target_date = date.fromisoformat(date_str)
            except ValueError:
                target_date = date.today()
        else:
            target_date = date.today()
        
        water_intake, created = WaterIntake.objects.get_or_create(
            user=request.user,
            date=target_date,
            defaults={'amount_ml': 0}
        )
        
        if request.method == 'GET':
            serializer = WaterIntakeSerializer(water_intake)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # Add water (increment)
            add_amount = float(request.data.get('amount_ml', 0))
            water_intake.amount_ml += add_amount
            water_intake.save()
            serializer = WaterIntakeSerializer(water_intake)
            return Response(serializer.data)
        
        elif request.method == 'PUT':
            # Set water amount
            serializer = WaterIntakeSerializer(water_intake, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WaterSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for water settings"""
    serializer_class = WaterSettingsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return WaterSettings.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get', 'put', 'patch'])
    def my_settings(self, request):
        """Get or update current user's water settings"""
        settings_obj, created = WaterSettings.objects.get_or_create(
            user=request.user,
            defaults={
                'widget_enabled': True,
                'unit': 'fl_oz',
                'daily_goal_ml': 2000,
            }
        )
        
        if request.method == 'GET':
            serializer = self.get_serializer(settings_obj)
            return Response(serializer.data)
        
        elif request.method in ['PUT', 'PATCH']:
            # Convert goal from user's preferred unit to ml if provided
            data = request.data.copy()
            if 'daily_goal_display' in data and 'unit' in data:
                goal_display = float(data.get('daily_goal_display', settings_obj.daily_goal_display))
                unit = data.get('unit', settings_obj.unit)
                
                if unit == 'ml':
                    data['daily_goal_ml'] = goal_display
                elif unit == 'fl_oz':
                    data['daily_goal_ml'] = goal_display * 29.5735
                elif unit == 'cups':
                    data['daily_goal_ml'] = goal_display * 236.588
                
                # Remove daily_goal_display as it's a read-only field
                data.pop('daily_goal_display', None)
            
            serializer = self.get_serializer(settings_obj, data=data, partial=request.method == 'PATCH')
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_notifications(request):
    """Manually trigger notification check for current user"""
    notifications = check_and_create_daily_notifications(request.user)
    return Response({
        'notifications_created': len(notifications),
        'notifications': NotificationSerializer(notifications, many=True).data
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def calculate_nutrition(request):
    """
    Calculate BMR, TDEE, and daily nutrition goals
    Can use current user profile or provided parameters
    """
    user = request.user
    
    if request.method == 'POST':
        # Use provided parameters
        weight = float(request.data.get('weight', user.weight or 70))
        height = float(request.data.get('height', user.height or 170))
        age = int(request.data.get('age', calculate_age_from_birthdate(user.date_of_birth) or 25))
        gender = request.data.get('gender', user.gender or 'M')
        activity_level = request.data.get('activity_level', user.activity_level or 'moderate')
        goal = request.data.get('goal', user.goal or 'maintenance')
    else:
        # Use user profile data
        if not (user.weight and user.height and user.date_of_birth and user.gender):
            return Response(
                {'error': 'User profile is incomplete. Please provide weight, height, date_of_birth, and gender.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        weight = user.weight
        height = user.height
        age = calculate_age_from_birthdate(user.date_of_birth)
        if not age:
            return Response(
                {'error': 'Could not calculate age from birthdate.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        gender = user.gender
        activity_level = user.activity_level
        goal = user.goal or 'maintenance'
    
    # Calculate values
    bmr = calculate_bmr(weight, height, age, gender)
    tdee = calculate_tdee(bmr, activity_level)
    daily_calories = calculate_daily_calories(weight, height, age, gender, activity_level, goal)
    macros = calculate_macros(daily_calories, goal)
    
    return Response({
        'bmr': bmr,
        'tdee': tdee,
        'daily_calories': daily_calories,
        'macros': macros,
        'parameters': {
            'weight': weight,
            'height': height,
            'age': age,
            'gender': gender,
            'activity_level': activity_level,
            'goal': goal,
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unified_food_search(request):
    """Unified search for foods - searches local database (including imported USDA foods), recipes, and supports categories"""
    query = request.query_params.get('query', '').strip()
    limit = int(request.query_params.get('limit', 20))
    include_usda_api = request.query_params.get('include_usda_api', 'false').lower() == 'true'  # Default to false, use local DB
    category = request.query_params.get('category', 'all')  # all, favorites, common_foods, beverages, supplements, brands, restaurants, custom, recipes
    
    if not query or len(query) < 2:
        return Response({
            'saved_foods': [],
            'usda_foods': [],
            'recipes': [],
            'total_saved': 0,
            'total_usda': 0,
            'total_recipes': 0,
        })
    
    results = {
        'saved_foods': [],
        'usda_foods': [],
        'recipes': [],
        'total_saved': 0,
        'total_usda': 0,
        'total_recipes': 0,
    }
    
    # Search recipes if category is 'recipes' or 'all'
    if category in ['recipes', 'all', 'custom']:
        try:
            recipe_filter = Q(name__icontains=query) | Q(description__icontains=query)
            recipes_query = Recipe.objects.filter(user=request.user).filter(recipe_filter).prefetch_related('ingredients__food')
            recipes_query = recipes_query.distinct().order_by('name')
            recipes = list(recipes_query[:limit])
            
            for recipe in recipes:
                recipe_data = RecipeSerializer(recipe).data
                recipe_data['is_recipe'] = True
                recipe_data['type'] = 'recipe'
                results['recipes'].append(recipe_data)
            
            recipe_count_filter = Q(name__icontains=query) | Q(description__icontains=query)
            results['total_recipes'] = Recipe.objects.filter(user=request.user).filter(recipe_count_filter).distinct().count()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error searching recipes: {e}")
    
    # Search all foods in local database (including imported USDA foods)
    if category != 'recipes':
        try:
            # Build food query based on category
            food_query = Q(name__icontains=query) | Q(brand__icontains=query) | Q(description__icontains=query)
            
            # Apply category filters
            if category == 'brands':
                # Only foods with brands
                food_query &= Q(brand__isnull=False) & ~Q(brand='')
            elif category == 'common_foods':
                # Common foods (manual entries, not USDA)
                food_query &= Q(data_source='manual')
            elif category == 'beverages':
                # Beverages - simple keyword matching
                food_query &= (Q(name__icontains='drink') | Q(name__icontains='juice') | Q(name__icontains='water') | 
                              Q(name__icontains='coffee') | Q(name__icontains='tea') | Q(name__icontains='soda') |
                              Q(description__icontains='beverage') | Q(description__icontains='drink'))
            elif category == 'supplements':
                # Supplements - keyword matching
                food_query &= (Q(name__icontains='supplement') | Q(name__icontains='vitamin') | 
                              Q(description__icontains='supplement'))
            elif category == 'restaurants':
                # Restaurant foods - could be marked in description or name
                food_query &= (Q(name__icontains='restaurant') | Q(description__icontains='restaurant'))
            elif category == 'custom':
                # Custom foods (manual entries)
                food_query &= Q(data_source='manual')
            
            # Search all foods - both manually added and imported from USDA
            # Use distinct to avoid duplicates and order by relevance
            all_foods = Food.objects.filter(food_query).distinct().order_by('name')[:limit * 2]  # Get more to separate saved vs USDA
            
            # Separate saved foods (manual) and USDA imported foods
            saved_foods = []
            usda_foods = []
            
            for food in all_foods:
                food_data = FoodSerializer(food).data
                food_data['type'] = 'food'
                if food.data_source == 'usda':
                    # Mark as USDA and add fdc_id for compatibility
                    food_data['is_usda'] = True
                    food_data['fdc_id'] = food.usda_fdc_id
                    food_data['is_saved'] = True  # Already in our DB - no need to save again
                    usda_foods.append(food_data)
                else:
                    food_data['is_saved'] = True
                    saved_foods.append(food_data)
            
            # Limit results
            results['saved_foods'] = saved_foods[:limit]
            results['usda_foods'] = usda_foods[:limit]
            
            # Optimize count queries - use the same base query
            base_count_query = Q(name__icontains=query) | Q(brand__icontains=query) | Q(description__icontains=query)
            if category != 'all':
                base_count_query &= food_query
            
            # Only count if we need to (lazy evaluation)
            if len(saved_foods) >= limit or len(usda_foods) >= limit:
                results['total_saved'] = Food.objects.filter(
                    base_count_query,
                    data_source__in=['manual', 'openfoodfacts', 'nutritionix']
                ).distinct().count()
                results['total_usda'] = Food.objects.filter(
                    base_count_query,
                    data_source='usda'
                ).distinct().count()
            else:
                # If we got all results, use the actual counts
                results['total_saved'] = len(saved_foods)
                results['total_usda'] = len(usda_foods)
            
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Local DB search for '{query}': found {len(saved_foods)} saved, {len(usda_foods)} USDA foods")
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error searching foods: {e}")
    
    # Optionally search USDA API if requested (for new foods not yet imported)
    if include_usda_api:
        try:
            importer = USDADataImporter()
            search_results = importer.search_foods(query, page_size=min(limit, 10), page_number=1, use_cache=True)
            
            # Only add foods that are not already in our database
            error_msg = search_results.get('error')
            if not error_msg:
                foods_to_parse = search_results.get('foods', [])[:limit]
                existing_fdc_ids = set(
                    Food.objects.filter(usda_fdc_id__isnull=False)
                    .values_list('usda_fdc_id', flat=True)
                )
                
                for food in foods_to_parse:
                    fdc_id = food.get('fdcId')
                    if fdc_id and fdc_id not in existing_fdc_ids:
                        try:
                            parsed = importer.parse_food_data(food)
                            if parsed:
                                parsed['fdc_id'] = fdc_id
                                parsed['is_usda'] = True
                                parsed['is_saved'] = False  # Not yet saved
                                results['usda_foods'].append(parsed)
                        except Exception as e:
                            continue
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"USDA API search failed (using local DB only): {e}")
    
    return Response(results)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usda_search(request):
    """Search for foods in USDA FoodData Central database (legacy endpoint)"""
    query = request.query_params.get('query', '')
    page_size = int(request.query_params.get('page_size', 50))
    page_number = int(request.query_params.get('page_number', 1))
    
    if not query:
        return Response(
            {'error': 'Query parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        importer = USDADataImporter()
        search_results = importer.search_foods(query, page_size=page_size, page_number=page_number)
        
        # Parse each food result
        parsed_foods = []
        for food in search_results.get('foods', []):
            parsed = importer.parse_food_data(food)
            if parsed:
                # Add FDC ID for saving
                parsed['fdc_id'] = food.get('fdcId')
                parsed_foods.append(parsed)
        
        return Response({
            'foods': parsed_foods,
            'total_hits': search_results.get('totalHits', 0),
            'current_page': page_number,
            'page_size': page_size,
        })
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error searching USDA: {e}", exc_info=True)
        return Response(
            {'error': 'Failed to search USDA database'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_food_from_url(request):
    """Import food from URL (supports various food database URLs)"""
    url = request.data.get('url', '').strip()
    
    if not url:
        return Response(
            {'error': 'URL is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        import requests
        from bs4 import BeautifulSoup
        import re
        
        # Fetch the URL
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Try to extract food information
        # This is a basic implementation - can be extended for specific sites
        food_data = {
            'name': '',
            'brand': '',
            'description': '',
            'calories': 0,
            'protein': 0,
            'carbs': 0,
            'fat': 0,
            'data_source': 'manual',
        }
        
        # Try to find nutrition facts table or similar
        # Look for common patterns
        text = soup.get_text()
        
        # Try to extract name from title or h1
        title_tag = soup.find('title') or soup.find('h1')
        if title_tag:
            food_data['name'] = title_tag.get_text().strip()[:200]
        
        # Try to find nutrition values using regex patterns
        # Calories
        cal_match = re.search(r'(\d+)\s*(?:калорий|calories|kcal|ккал)', text, re.IGNORECASE)
        if cal_match:
            food_data['calories'] = float(cal_match.group(1))
        
        # Protein
        protein_match = re.search(r'белк[а-я]*[:\s]+(\d+[.,]?\d*)', text, re.IGNORECASE) or \
                        re.search(r'protein[:\s]+(\d+[.,]?\d*)', text, re.IGNORECASE)
        if protein_match:
            food_data['protein'] = float(protein_match.group(1).replace(',', '.'))
        
        # Carbs
        carbs_match = re.search(r'углевод[а-я]*[:\s]+(\d+[.,]?\d*)', text, re.IGNORECASE) or \
                     re.search(r'carb[а-я]*[:\s]+(\d+[.,]?\d*)', text, re.IGNORECASE)
        if carbs_match:
            food_data['carbs'] = float(carbs_match.group(1).replace(',', '.'))
        
        # Fat
        fat_match = re.search(r'жир[а-я]*[:\s]+(\d+[.,]?\d*)', text, re.IGNORECASE) or \
                   re.search(r'fat[:\s]+(\d+[.,]?\d*)', text, re.IGNORECASE)
        if fat_match:
            food_data['fat'] = float(fat_match.group(1).replace(',', '.'))
        
        # If we couldn't extract enough data, return error
        if not food_data['name'] or (food_data['calories'] == 0 and food_data['protein'] == 0):
            return Response(
                {'error': 'Could not extract food information from URL. Please enter manually.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create food
        food = Food.objects.create(**food_data)
        
        return Response({
            'message': 'Food imported successfully',
            'food': FoodSerializer(food).data
        }, status=status.HTTP_201_CREATED)
        
    except requests.RequestException as e:
        return Response(
            {'error': f'Failed to fetch URL: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error importing food from URL: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to import food: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def usda_save_food(request):
    """Save a USDA food to the database"""
    fdc_id = request.data.get('fdc_id')
    
    if not fdc_id:
        return Response(
            {'error': 'fdc_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Check if food already exists
        existing_food = Food.objects.filter(usda_fdc_id=fdc_id).first()
        if existing_food:
            return Response({
                'message': 'Food already exists in database',
                'food': FoodSerializer(existing_food).data
            }, status=status.HTTP_200_OK)
        
        # Try to get food data from parsed search results first (faster)
        # If not available, fetch from USDA API
        importer = USDADataImporter()
        food_data = None
        
        # Try to get from cache or search results if we have the data
        # For now, always fetch details to ensure we have complete data
        food_data = importer.get_food_details(fdc_id)
        
        if not food_data:
            return Response(
                {'error': 'Food not found in USDA database'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Parse food data
        parsed_data = importer.parse_food_data(food_data)
        if not parsed_data:
            return Response(
                {'error': 'Failed to parse food data'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create food in database
        food = Food.objects.create(**parsed_data)
        
        return Response({
            'message': 'Food saved successfully',
            'food': FoodSerializer(food).data
        }, status=status.HTTP_201_CREATED)
        
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error saving USDA food: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to save food: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nutrition_report_pdf(request):
    """Generate PDF nutrition report for a date range"""
    from .pdf_generator import generate_nutrition_report
    
    start_date_str = request.query_params.get('start_date', None)
    end_date_str = request.query_params.get('end_date', None)
    
    # Default to last 7 days if not specified
    if not start_date_str or not end_date_str:
        end_date = date.today()
        start_date = end_date - timedelta(days=7)
    else:
        try:
            start_date = date.fromisoformat(start_date_str)
            end_date = date.fromisoformat(end_date_str)
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Validate date range
    if start_date > end_date:
        return Response(
            {'error': 'Start date must be before end date'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Limit to 90 days max
    if (end_date - start_date).days > 90:
        return Response(
            {'error': 'Date range cannot exceed 90 days'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        return generate_nutrition_report(request.user, start_date, end_date)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error generating PDF report: {e}", exc_info=True)
        return Response(
            {'error': 'Failed to generate PDF report'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class RecipeViewSet(viewsets.ModelViewSet):
    """ViewSet for custom recipes"""
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Recipe.objects.filter(user=self.request.user).prefetch_related('ingredients__food')
    
    def perform_create(self, serializer):
        recipe = serializer.save(user=self.request.user)
        # Handle ingredients if provided
        ingredients_data = self.request.data.get('ingredients', [])
        for ingredient_data in ingredients_data:
            RecipeIngredient.objects.create(
                recipe=recipe,
                food_id=ingredient_data.get('food_id'),
                quantity=ingredient_data.get('quantity', 0)
            )
    
    def perform_update(self, serializer):
        recipe = serializer.save()
        # Handle ingredients update if provided
        if 'ingredients' in self.request.data:
            # Delete existing ingredients
            RecipeIngredient.objects.filter(recipe=recipe).delete()
            # Create new ingredients
            ingredients_data = self.request.data.get('ingredients', [])
            for ingredient_data in ingredients_data:
                RecipeIngredient.objects.create(
                    recipe=recipe,
                    food_id=ingredient_data.get('food_id'),
                    quantity=ingredient_data.get('quantity', 0)
                )
    
    @action(detail=True, methods=['post', 'put', 'patch', 'delete'])
    def ingredients(self, request, pk=None):
        """Manage recipe ingredients"""
        recipe = self.get_object()
        
        if request.method == 'POST':
            # Add ingredient
            serializer = RecipeIngredientSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(recipe=recipe)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method in ['PUT', 'PATCH']:
            # Update ingredient
            ingredient_id = request.data.get('id')
            if not ingredient_id:
                return Response({'error': 'Ingredient ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                ingredient = RecipeIngredient.objects.get(id=ingredient_id, recipe=recipe)
                serializer = RecipeIngredientSerializer(ingredient, data=request.data, partial=request.method == 'PATCH')
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            except RecipeIngredient.DoesNotExist:
                return Response({'error': 'Ingredient not found'}, status=status.HTTP_404_NOT_FOUND)
        
        elif request.method == 'DELETE':
            # Delete ingredient
            ingredient_id = request.data.get('id')
            if not ingredient_id:
                return Response({'error': 'Ingredient ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                ingredient = RecipeIngredient.objects.get(id=ingredient_id, recipe=recipe)
                ingredient.delete()
                return Response({'message': 'Ingredient deleted'}, status=status.HTTP_204_NO_CONTENT)
            except RecipeIngredient.DoesNotExist:
                return Response({'error': 'Ingredient not found'}, status=status.HTTP_404_NOT_FOUND)

