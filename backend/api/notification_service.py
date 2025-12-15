"""
Service for creating notifications for users
"""
from datetime import date
from .models import Notification, Meal, NutritionGoal
from django.db.models import Sum


def create_notification(user, notification_type, title, message):
    """Create a notification for a user"""
    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message
    )


def check_and_create_daily_notifications(user):
    """
    Check user's daily nutrition and create notifications if needed
    Should be called periodically (e.g., via cron job or celery task)
    """
    today = date.today()
    notifications_created = []
    
    # Check if user has added meals today
    # Use select_related to avoid N+1 queries
    meals_today = Meal.objects.filter(user=user, date=today).select_related('food')
    
    # Don't create reminder if meal was just created (count will be at least 1)
    # Only create reminder if no meals existed before
    if meals_today.count() == 0:
        # Reminder to add meals
        notification = create_notification(
            user=user,
            notification_type='reminder',
            title='Не забудьте добавить приемы пищи',
            message='Вы еще не добавили приемы пищи сегодня. Начните отслеживать свое питание!'
        )
        notifications_created.append(notification)
    
    # Check calorie goals
    try:
        goals = user.nutrition_goal
        total_calories = meals_today.aggregate(
            total=Sum('total_calories')
        )['total'] or 0
        
        if total_calories > goals.daily_calories * 1.1:  # 10% over goal
            notification = create_notification(
                user=user,
                notification_type='warning',
                title='Превышение калорий',
                message=f'Вы превысили дневную норму калорий на {total_calories - goals.daily_calories:.0f} ккал. Старайтесь придерживаться своей цели.'
            )
            notifications_created.append(notification)
        elif total_calories > goals.daily_calories * 0.9 and total_calories <= goals.daily_calories:  # Close to goal
            remaining = goals.daily_calories - total_calories
            if remaining > 0:
                notification = create_notification(
                    user=user,
                    notification_type='info',
                    title='Почти достигли цели',
                    message=f'Осталось {remaining:.0f} ккал до дневной нормы. Вы на правильном пути!'
                )
                notifications_created.append(notification)
    except NutritionGoal.DoesNotExist:
        pass
    except Exception as e:
        # Log but don't fail
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error checking calorie goals: {e}", exc_info=True)
    
    # Check protein intake
    try:
        goals = user.nutrition_goal
        total_protein = meals_today.aggregate(
            total=Sum('total_protein')
        )['total'] or 0
        
        if total_protein < goals.daily_protein * 0.7:  # Less than 70% of goal
            notification = create_notification(
                user=user,
                notification_type='warning',
                title='Нехватка белка',
                message=f'Сегодня вы не добрали белок. Норма: {goals.daily_protein:.0f}г, получено: {total_protein:.0f}г. Добавьте белковые продукты в рацион.'
            )
            notifications_created.append(notification)
    except NutritionGoal.DoesNotExist:
        pass
    except Exception as e:
        # Log but don't fail
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error checking protein intake: {e}", exc_info=True)
    
    return notifications_created
