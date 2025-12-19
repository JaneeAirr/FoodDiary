import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
} from '@mui/material';
import api from '../services/api';

const MealReminderSettings = () => {
  const [settings, setSettings] = useState({
    reminders_enabled: true,
    breakfast_time: '08:00',
    lunch_time: '13:00',
    dinner_time: '19:00',
    snack_time: '15:00',
    active_days: '0,1,2,3,4,5,6',
    browser_notifications: true,
    sound_enabled: false,
    email_notifications: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [notificationPermission, setNotificationPermission] = useState('default');

  const daysOfWeek = [
    { value: 0, label: 'Mon' },
    { value: 1, label: 'Tue' },
    { value: 2, label: 'Wed' },
    { value: 3, label: 'Thu' },
    { value: 4, label: 'Fri' },
    { value: 5, label: 'Sat' },
    { value: 6, label: 'Sun' },
  ];

  useEffect(() => {
    fetchSettings();
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setMessage('Notification permission granted!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Notification permission denied. Please enable it in your browser settings.');
        setTimeout(() => setMessage(''), 5000);
      }
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/meal-reminders/my_settings/');
      if (response.data) {
        setSettings({
          reminders_enabled: response.data.reminders_enabled ?? true,
          breakfast_time: response.data.breakfast_time?.slice(0, 5) || '08:00',
          lunch_time: response.data.lunch_time?.slice(0, 5) || '13:00',
          dinner_time: response.data.dinner_time?.slice(0, 5) || '19:00',
          snack_time: response.data.snack_time?.slice(0, 5) || '15:00',
          active_days: response.data.active_days || '0,1,2,3,4,5,6',
          browser_notifications: response.data.browser_notifications ?? true,
          sound_enabled: response.data.sound_enabled ?? false,
          email_notifications: response.data.email_notifications ?? false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDay = (dayValue) => {
    const activeDaysList = settings.active_days.split(',').map((d) => d.trim());
    const dayStr = dayValue.toString();
    
    if (activeDaysList.includes(dayStr)) {
      const newDays = activeDaysList.filter((d) => d !== dayStr);
      handleChange('active_days', newDays.length > 0 ? newDays.join(',') : '');
    } else {
      activeDaysList.push(dayStr);
      handleChange('active_days', activeDaysList.join(','));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const dataToSend = {
        ...settings,
        breakfast_time: settings.breakfast_time + ':00',
        lunch_time: settings.lunch_time + ':00',
        dinner_time: settings.dinner_time + ':00',
        snack_time: settings.snack_time + ':00',
      };
      
      const response = await api.put('/api/meal-reminders/my_settings/', dataToSend);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
      
      // Start reminder service if enabled
      if (settings.reminders_enabled && settings.browser_notifications) {
        startReminderService();
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('Failed to save settings. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const startReminderService = () => {
    // This will be called by the main App component to start checking for reminders
    // For now, we'll just log that reminders should be active
    console.log('Reminder service should be started');
  };

  if (loading) {
    return <Typography>Loading settings...</Typography>;
  }

  const activeDaysList = settings.active_days.split(',').map((d) => parseInt(d.trim())).filter((d) => !isNaN(d));

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
      <Typography variant="h6" gutterBottom sx={{ wordBreak: 'break-word', mb: 3 }}>
        Meal Reminder Settings
      </Typography>

      {message && (
        <Alert severity={message.includes('success') ? 'success' : 'error'} sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      <Card sx={{ mb: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <CardContent>
          <FormControlLabel
            control={
              <Switch
                checked={settings.reminders_enabled}
                onChange={(e) => handleChange('reminders_enabled', e.target.checked)}
              />
            }
            label="Enable Meal Reminders"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Receive notifications at your scheduled meal times
          </Typography>
        </CardContent>
      </Card>

      {settings.reminders_enabled && (
        <>
          <Card sx={{ mb: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
                Meal Times
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Breakfast"
                    type="time"
                    value={settings.breakfast_time}
                    onChange={(e) => handleChange('breakfast_time', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Lunch"
                    type="time"
                    value={settings.lunch_time}
                    onChange={(e) => handleChange('lunch_time', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Dinner"
                    type="time"
                    value={settings.dinner_time}
                    onChange={(e) => handleChange('dinner_time', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Snack"
                    type="time"
                    value={settings.snack_time}
                    onChange={(e) => handleChange('snack_time', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
                Active Days
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {daysOfWeek.map((day) => (
                  <Chip
                    key={day.value}
                    label={day.label}
                    onClick={() => toggleDay(day.value)}
                    color={activeDaysList.includes(day.value) ? 'primary' : 'default'}
                    variant={activeDaysList.includes(day.value) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
                Notification Preferences
              </Typography>
              
              {notificationPermission !== 'granted' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Browser notifications are not enabled. Click the button below to enable them.
                  <Button
                    size="small"
                    onClick={requestNotificationPermission}
                    sx={{ mt: 1, display: 'block' }}
                  >
                    Enable Notifications
                  </Button>
                </Alert>
              )}

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.browser_notifications}
                    onChange={(e) => handleChange('browser_notifications', e.target.checked)}
                    disabled={notificationPermission === 'denied'}
                  />
                }
                label="Browser Notifications"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                Receive browser notifications at meal times
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.sound_enabled}
                    onChange={(e) => handleChange('sound_enabled', e.target.checked)}
                  />
                }
                label="Sound Alerts"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                Play sound with notifications
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.email_notifications}
                    onChange={(e) => handleChange('email_notifications', e.target.checked)}
                  />
                }
                label="Email Notifications"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Receive email reminders for meals (requires verified email address)
              </Typography>
              {settings.email_notifications && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Email notifications will be sent to your registered email address at meal times.
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Button
        variant="contained"
        onClick={handleSave}
        disabled={saving}
        sx={{
          backgroundColor: '#ff6b35',
          '&:hover': {
            backgroundColor: '#e55a2b',
          },
        }}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </Box>
  );
};

export default MealReminderSettings;
