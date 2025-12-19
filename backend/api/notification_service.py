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
    Also checks if user missed scheduled meal times
    """
    from datetime import datetime, time
    today = date.today()
    notifications_created = []
    
    # Check if user has added meals today
    # Use select_related to avoid N+1 queries
    meals_today = Meal.objects.filter(user=user, date=today).select_related('food', 'recipe')
    
    # Check meal reminders - see if user missed scheduled meals
    try:
        reminder_settings = user.meal_reminder_settings
        if reminder_settings.reminders_enabled:
            now = datetime.now()
            current_time = now.time()
            
            # Check each meal time
            meal_times = {
                'breakfast': reminder_settings.breakfast_time,
                'lunch': reminder_settings.lunch_time,
                'dinner': reminder_settings.dinner_time,
                'snack': reminder_settings.snack_time,
            }
            
            meal_names = {
                'breakfast': 'Завтрак',
                'lunch': 'Обед',
                'dinner': 'Ужин',
                'snack': 'Перекус',
            }
            
            for meal_type, meal_time in meal_times.items():
                if not meal_time:
                    continue
                
                # Check if meal time has passed (more than 30 minutes ago)
                meal_datetime = datetime.combine(today, meal_time)
                time_diff = (now - meal_datetime).total_seconds() / 60  # minutes
                
                # If meal time passed more than 30 minutes ago and no meal was logged
                if 30 <= time_diff <= 120:  # Between 30 minutes and 2 hours after meal time
                    meals_of_type = meals_today.filter(meal_type=meal_type)
                    if meals_of_type.count() == 0:
                        # User missed this meal
                        notification = create_notification(
                            user=user,
                            notification_type='reminder',
                            title=f'Пропущен {meal_names[meal_type]}',
                            message=f'Вы пропустили {meal_names[meal_type].lower()} в {meal_time.strftime("%H:%M")}. Не забудьте добавить прием пищи!'
                        )
                        notifications_created.append(notification)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error checking meal reminders: {e}", exc_info=True)
    
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
        # Calculate total calories manually since total_calories is a property
        total_calories = sum(meal.total_calories for meal in meals_today)
        
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
        # Calculate total protein manually since total_protein is a property
        total_protein = sum(meal.total_protein for meal in meals_today)
        
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
