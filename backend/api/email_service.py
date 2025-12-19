"""
Email notification service for meal reminders
"""
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from datetime import datetime, time
from .models import MealReminderSettings, Meal


def send_meal_reminder_email(user, meal_type, meal_time):
    """
    Send email reminder for a meal
    
    Args:
        user: User object
        meal_type: Type of meal (breakfast, lunch, dinner, snack)
        meal_time: Time for the meal (time object)
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Check if user has email notifications enabled
        try:
            reminder_settings = user.meal_reminder_settings
            if not reminder_settings.email_notifications:
                return False
            if not user.email:
                return False
        except MealReminderSettings.DoesNotExist:
            return False
        
        # Meal type labels
        meal_labels = {
            'breakfast': 'Завтрак',
            'lunch': 'Обед',
            'dinner': 'Ужин',
            'snack': 'Перекус',
        }
        
        meal_label = meal_labels.get(meal_type, meal_type)
        
        # Check if user has already logged this meal today
        from datetime import date
        today = date.today()
        meals_today = Meal.objects.filter(user=user, date=today, meal_type=meal_type)
        has_logged = meals_today.exists()
        
        # Prepare email content
        subject = f'Напоминание: {meal_label}'
        
        # Simple HTML email
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1976D2;">Напоминание о приеме пищи</h2>
                <p>Здравствуйте, {user.get_full_name() or user.username}!</p>
                <p>Напоминаем вам о времени <strong>{meal_label.lower()}</strong> в {meal_time.strftime('%H:%M')}.</p>
                """
        
        if has_logged:
            html_message += """
                <p style="color: #4CAF50; font-weight: bold;">✓ Вы уже добавили этот прием пищи сегодня. Отлично!</p>
            """
        else:
            html_message += """
                <p>Не забудьте добавить прием пищи в ваш дневник питания.</p>
            """
        
        html_message += f"""
                <p style="margin-top: 30px;">
                    <a href="http://localhost:3000/diary" 
                       style="background-color: #1976D2; color: white; padding: 10px 20px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Открыть дневник питания
                    </a>
                </p>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">
                    Вы получили это письмо, потому что включили email-уведомления в настройках.
                    Вы можете отключить их в любое время в настройках приложения.
                </p>
            </div>
        </body>
        </html>
        """
        
        plain_message = strip_tags(html_message)
        
        # Send email
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@fooddiary.com')
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        return True
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending meal reminder email to {user.email}: {e}", exc_info=True)
        return False


def send_daily_summary_email(user):
    """
    Send daily nutrition summary email
    
    Args:
        user: User object
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Check if user has email notifications enabled
        try:
            reminder_settings = user.meal_reminder_settings
            if not reminder_settings.email_notifications:
                return False
            if not user.email:
                return False
        except MealReminderSettings.DoesNotExist:
            return False
        
        from datetime import date
        from .models import NutritionGoal
        
        today = date.today()
        meals_today = Meal.objects.filter(user=user, date=today).select_related('food')
        
        # Calculate totals
        total_calories = sum(meal.total_calories for meal in meals_today)
        total_protein = sum(meal.total_protein for meal in meals_today)
        total_carbs = sum(meal.total_carbs for meal in meals_today)
        total_fat = sum(meal.total_fat for meal in meals_today)
        
        # Get goals
        try:
            goals = user.nutrition_goal
            goal_calories = goals.daily_calories
            goal_protein = goals.daily_protein
            goal_carbs = goals.daily_carbs
            goal_fat = goals.daily_fat
        except NutritionGoal.DoesNotExist:
            goal_calories = goal_protein = goal_carbs = goal_fat = None
        
        # Prepare email
        subject = f'Итоги дня: {today.strftime("%d.%m.%Y")}'
        
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1976D2;">Итоги дня</h2>
                <p>Здравствуйте, {user.get_full_name() or user.username}!</p>
                <p>Вот ваша статистика питания за {today.strftime('%d.%m.%Y')}:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background-color: #1976D2; color: white;">
                        <th style="padding: 10px; text-align: left;">Показатель</th>
                        <th style="padding: 10px; text-align: right;">Получено</th>
                        <th style="padding: 10px; text-align: right;">Цель</th>
                    </tr>
                    <tr style="background-color: #f5f5f5;">
                        <td style="padding: 10px;">Калории</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold;">{total_calories:.0f} ккал</td>
                        <td style="padding: 10px; text-align: right;">{goal_calories:.0f} ккал</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px;">Белки</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold;">{total_protein:.1f} г</td>
                        <td style="padding: 10px; text-align: right;">{goal_protein:.1f} г</td>
                    </tr>
                    <tr style="background-color: #f5f5f5;">
                        <td style="padding: 10px;">Углеводы</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold;">{total_carbs:.1f} г</td>
                        <td style="padding: 10px; text-align: right;">{goal_carbs:.1f} г</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px;">Жиры</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold;">{total_fat:.1f} г</td>
                        <td style="padding: 10px; text-align: right;">{goal_fat:.1f} г</td>
                    </tr>
                </table>
                
                <p style="margin-top: 30px;">
                    <a href="http://localhost:3000/diary" 
                       style="background-color: #1976D2; color: white; padding: 10px 20px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Открыть дневник питания
                    </a>
                </p>
            </div>
        </body>
        </html>
        """
        
        plain_message = strip_tags(html_message)
        
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@fooddiary.com')
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        return True
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending daily summary email to {user.email}: {e}", exc_info=True)
        return False

