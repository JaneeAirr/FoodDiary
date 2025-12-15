/**
 * Meal Reminder Service
 * Checks for scheduled meal times and shows browser notifications
 */

class ReminderService {
  constructor() {
    this.checkInterval = null;
    this.lastCheckedTimes = {};
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      return;
    }

    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkReminders();
    }, 60000);

    // Also check immediately
    this.checkReminders();
    this.isRunning = true;
    console.log('Reminder service started');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('Reminder service stopped');
  }

  async checkReminders() {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        return;
      }

      const response = await fetch(`${apiUrl}/api/meal-reminders/my_settings/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const settings = await response.json();

      if (!settings.reminders_enabled || !settings.browser_notifications) {
        return;
      }

      // Check notification permission
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
      }

      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      // Convert to Monday=0 format
      const dayIndex = currentDay === 0 ? 6 : currentDay - 1;

      const activeDays = settings.active_days.split(',').map((d) => parseInt(d.trim()));
      
      if (!activeDays.includes(dayIndex)) {
        return; // Not an active day
      }

      // Check each meal time
      const meals = [
        { name: 'Breakfast', time: settings.breakfast_time?.slice(0, 5) || '08:00' },
        { name: 'Lunch', time: settings.lunch_time?.slice(0, 5) || '13:00' },
        { name: 'Dinner', time: settings.dinner_time?.slice(0, 5) || '19:00' },
        { name: 'Snack', time: settings.snack_time?.slice(0, 5) || '15:00' },
      ];

      for (const meal of meals) {
        if (!meal.time) continue;

        const mealKey = `${meal.name}_${meal.time}`;
        const lastChecked = this.lastCheckedTimes[mealKey];

        // Check if it's time for this meal (within the current minute)
        if (currentTime === meal.time) {
          // Only show notification if we haven't shown it for this meal today
          const today = now.toDateString();
          if (!lastChecked || lastChecked.date !== today) {
            this.showNotification(meal.name, settings.sound_enabled);
            this.lastCheckedTimes[mealKey] = { date: today, time: currentTime };
          }
        }
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  }

  showNotification(mealName, playSound = false) {
    if (!('Notification' in window)) {
      return;
    }

    const notification = new Notification(`Time for ${mealName}!`, {
      body: `Don't forget to log your ${mealName.toLowerCase()} in your food diary.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `meal-reminder-${mealName}`,
      requireInteraction: false,
    });

    if (playSound) {
      // Play a subtle notification sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZURAJR6Hh8sFvJgUwgM/y2Yk3CBxou+3nn00QDE+n4/C2YxwGOJLX8sx5LAUkd8fw3ZBACg==');
      audio.play().catch(() => {
        // Ignore audio play errors
      });
    }

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    // Handle click to focus window
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}

// Export singleton instance
const reminderService = new ReminderService();
export default reminderService;
