"""
AI API endpoints
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import date, timedelta
from api.models import Meal
from api.utils import calculate_age_from_birthdate
from users.models import User, PsychFoodProfile
from .services import ai_service


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_behavior(request):
    """Analyze user's eating behavior using AI"""
    try:
        # Get last 7 days of meals
        end_date = date.today()
        start_date = end_date - timedelta(days=7)
        
        meals = Meal.objects.filter(
            user=request.user,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date', 'meal_type')
        
        meals_data = []
        for meal in meals:
            meals_data.append({
                'date': str(meal.date),
                'meal_type': meal.meal_type,
                'food': meal.food.name,
                'quantity': meal.quantity,
                'calories': meal.total_calories,
                'protein': meal.total_protein,
                'carbs': meal.total_carbs,
                'fat': meal.total_fat,
            })
        
        # Get user's nutrition goals for comparison
        try:
            goals = request.user.nutrition_goal
            goal_calories = goals.daily_calories
            goal_protein = goals.daily_protein
        except:
            goal_calories = None
            goal_protein = None
        
        # Build comprehensive user profile
        user_profile = {
            'goal': request.user.goal or 'maintenance',
            'activity_level': request.user.activity_level,
            'weight': request.user.weight,
            'height': request.user.height,
            'gender': request.user.gender,
            'age': calculate_age_from_birthdate(request.user.date_of_birth) if request.user.date_of_birth else None,
            'goal_calories': goal_calories,
            'goal_protein': goal_protein,
        }
        
        analysis = ai_service.analyze_behavior(meals_data, user_profile)
        
        return Response(analysis)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_recommendations(request):
    """Get AI-powered nutrition recommendations"""
    try:
        today = date.today()
        meals = Meal.objects.filter(user=request.user, date=today)
        
        current_nutrition = {
            'calories': sum(m.total_calories for m in meals) or 0,
            'protein': sum(m.total_protein for m in meals) or 0,
            'carbs': sum(m.total_carbs for m in meals) or 0,
            'fat': sum(m.total_fat for m in meals) or 0,
        }
        
        try:
            goals = request.user.nutrition_goal
            user_data = {
                'goal': request.user.goal or 'maintenance',
                'daily_calories': goals.daily_calories,
                'daily_protein': goals.daily_protein,
                'daily_carbs': goals.daily_carbs,
                'daily_fat': goals.daily_fat,
            }
        except:
            user_data = {
                'goal': request.user.goal or 'maintenance',
                'daily_calories': 2000,
                'daily_protein': 150,
                'daily_carbs': 200,
                'daily_fat': 65,
            }
        
        recommendations = ai_service.get_recommendations(user_data, current_nutrition)
        
        return Response({'recommendations': recommendations})
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parse_meal_text(request):
    """Parse meal from natural language text"""
    try:
        text = request.data.get('text', '')
        if not text:
            return Response(
                {'error': 'Text is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        parsed = ai_service.parse_meal_text(text)
        return Response(parsed)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_meal_plan(request):
    """Generate personalized meal plan for multiple days with specific products"""
    try:
        # Get user's goals
        try:
            goals = request.user.nutrition_goal
            default_calories = goals.daily_calories
            default_protein = goals.daily_protein
            default_carbs = goals.daily_carbs
            default_fat = goals.daily_fat
        except:
            default_calories = 2000
            default_protein = 150
            default_carbs = 200
            default_fat = 65
        
        # Get available foods from database
        from api.models import Food
        available_foods = list(Food.objects.values_list('name', flat=True)[:100])
        
        days = int(request.data.get('days', 7))
        
        requirements = {
            'calories': request.data.get('calories', default_calories),
            'protein': request.data.get('protein', default_protein),
            'carbs': request.data.get('carbs', default_carbs),
            'fat': request.data.get('fat', default_fat),
            'dietary_preference': request.user.dietary_preference or 'none',
            'budget': request.data.get('budget', 'medium'),
            'cooking_time': request.data.get('cooking_time', 'medium'),
            'available_foods': available_foods,
        }
        
        meal_plan = ai_service.generate_meal_plan(requirements, days=days)
        return Response(meal_plan)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_with_ai(request):
    """Chat with AI nutrition assistant (works 24/7 with fallback)"""
    try:
        user_message = request.data.get('message', '')
        if not user_message:
            return Response(
                {'error': 'Message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        conversation_history = request.data.get('history', [])
        
        # Build user profile
        try:
            goals = request.user.nutrition_goal
            goal_calories = goals.daily_calories
            goal_protein = goals.daily_protein
        except:
            goal_calories = None
            goal_protein = None
        
        user_profile = {
            'goal': request.user.goal or 'maintenance',
            'activity_level': request.user.activity_level,
            'weight': request.user.weight,
            'height': request.user.height,
            'gender': request.user.gender,
            'age': calculate_age_from_birthdate(request.user.date_of_birth) if request.user.date_of_birth else None,
            'goal_calories': goal_calories,
            'goal_protein': goal_protein,
            'dietary_preference': request.user.dietary_preference or 'none',
        }
        
        # Chat always works (with fallback if OpenAI unavailable)
        ai_response = ai_service.chat_with_ai(user_message, conversation_history, user_profile)
        
        return Response({
            'response': ai_response,
            'role': 'assistant'
        })
    except Exception as e:
        # Even if there's an error, try to return a helpful fallback response
        import traceback
        traceback.print_exc()
        
        # Return a fallback response instead of error
        fallback_response = "Извините, произошла техническая ошибка. Попробуйте переформулировать вопрос или обратитесь позже."
        
        return Response({
            'response': fallback_response,
            'role': 'assistant'
        }, status=status.HTTP_200_OK)  # Return 200 to keep chat working

