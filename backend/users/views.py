from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from .serializers import UserRegistrationSerializer, UserSerializer
from api.models import NutritionGoal
from api.utils import (
    calculate_daily_calories,
    calculate_macros,
    calculate_age_from_birthdate
)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """User registration endpoint"""
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """User login endpoint"""
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    """Get current user profile"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update current user profile and auto-calculate nutrition goals"""
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        user = serializer.save()
        
        # Auto-calculate nutrition goals if all required fields are present
        if (user.weight and user.height and user.date_of_birth and 
            user.gender and user.activity_level and user.goal):
            
            age = calculate_age_from_birthdate(user.date_of_birth)
            if age:
                daily_calories = calculate_daily_calories(
                    weight=user.weight,
                    height=user.height,
                    age=age,
                    gender=user.gender,
                    activity_level=user.activity_level,
                    goal=user.goal
                )
                
                macros = calculate_macros(daily_calories, user.goal)
                
                # Create or update nutrition goals
                nutrition_goal, created = NutritionGoal.objects.get_or_create(
                    user=user,
                    defaults={
                        'daily_calories': daily_calories,
                        'daily_protein': macros['protein'],
                        'daily_carbs': macros['carbs'],
                        'daily_fat': macros['fat'],
                    }
                )
                
                if not created:
                    # Update existing goals
                    nutrition_goal.daily_calories = daily_calories
                    nutrition_goal.daily_protein = macros['protein']
                    nutrition_goal.daily_carbs = macros['carbs']
                    nutrition_goal.daily_fat = macros['fat']
                    nutrition_goal.save()
        
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

