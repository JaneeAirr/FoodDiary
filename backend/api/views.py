from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import date, timedelta
from .models import Food, Meal, NutritionGoal, WeightEntry, Notification
from .serializers import (
    FoodSerializer, MealSerializer, NutritionGoalSerializer,
    WeightEntrySerializer, NotificationSerializer
)
from .notification_service import check_and_create_daily_notifications
from .utils import (
    calculate_bmr, calculate_tdee, calculate_daily_calories,
    calculate_macros, calculate_age_from_birthdate
)


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
        queryset = Meal.objects.filter(user=user)
        
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
    
    meals = Meal.objects.filter(user=request.user, date=date_obj)
    
    totals = meals.aggregate(
        total_calories=Sum('total_calories'),
        total_protein=Sum('total_protein'),
        total_carbs=Sum('total_carbs'),
        total_fat=Sum('total_fat'),
    )
    
    # Get user's goals
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
    
    # Ensure totals are floats, not None
    return Response({
        'date': date_param,
        'totals': {
            'calories': float(totals['total_calories'] or 0),
            'protein': float(totals['total_protein'] or 0),
            'carbs': float(totals['total_carbs'] or 0),
            'fat': float(totals['total_fat'] or 0),
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
    
    # Get nutrition statistics
    meals = Meal.objects.filter(
        user=request.user,
        date__gte=start_date,
        date__lte=end_date
    ).values('date').annotate(
        total_calories=Sum('total_calories'),
        total_protein=Sum('total_protein'),
        total_carbs=Sum('total_carbs'),
        total_fat=Sum('total_fat'),
    ).order_by('date')
    
    # Get weight entries
    weight_entries = WeightEntry.objects.filter(
        user=request.user,
        date__gte=start_date,
        date__lte=end_date
    ).order_by('date')
    
    # Convert to dictionaries for easier frontend consumption
    nutrition_data = list(meals)
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
        serializer.save(user=self.request.user)


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

