import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Card,
  CardContent,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
} from '@mui/material';
import api from '../services/api';

const FastingSettings = () => {
  const [settings, setSettings] = useState({
    widget_enabled: true,
    protocol: '16:8',
    custom_fasting_hours: 16,
    eating_window_start: '12:00',
    notifications_enabled: true,
    notify_fast_start: true,
    notify_fast_end: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/fasting-settings/my_settings/');
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch fasting settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await api.put('/api/fasting-settings/my_settings/', settings);
      if (response.status === 200) {
        setMessage('Settings saved successfully!');
        setSettings(response.data);
        // Trigger update event for other components
        window.dispatchEvent(new CustomEvent('fastingSettingsUpdated', { detail: response.data }));
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('Failed to save settings.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 1, sm: 2 } }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, fontSize: { xs: '1.8rem', md: '2.125rem' } }}>
        Fasting Settings
      </Typography>

      {message && (
        <Alert severity={message.includes('successfully') ? 'success' : 'error'} sx={{ mb: 3 }}>
          {message}
        </Alert>
      )}

      <Card sx={{ mb: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
            Widget Settings
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.widget_enabled}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  handleChange('widget_enabled', newValue);
                  // Auto-save widget_enabled immediately
                  api.put('/api/fasting-settings/my_settings/', { ...settings, widget_enabled: newValue })
                    .then((response) => {
                      window.dispatchEvent(new CustomEvent('fastingSettingsUpdated', { detail: response.data }));
                    })
                    .catch((error) => {
                      console.error('Failed to save widget_enabled:', error);
                      handleChange('widget_enabled', !newValue);
                    });
                }}
              />
            }
            label="Show Fasting Widget on Dashboard"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            Enable or disable the fasting tracking widget on your dashboard.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
            Fasting Protocol
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Fasting Protocol</InputLabel>
            <Select
              value={settings.protocol}
              label="Fasting Protocol"
              onChange={(e) => handleChange('protocol', e.target.value)}
            >
              <MenuItem value="16:8">16:8 (16 hours fast, 8 hours eating)</MenuItem>
              <MenuItem value="18:6">18:6 (18 hours fast, 6 hours eating)</MenuItem>
              <MenuItem value="20:4">20:4 (20 hours fast, 4 hours eating)</MenuItem>
              <MenuItem value="24:0">24:0 (24 hours fast)</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>

          {settings.protocol === 'custom' && (
            <TextField
              fullWidth
              type="number"
              label="Custom Fasting Hours"
              value={settings.custom_fasting_hours}
              onChange={(e) => handleChange('custom_fasting_hours', parseInt(e.target.value) || 16)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: 1, max: 48 }}
              sx={{ mb: 2 }}
            />
          )}

          <TextField
            fullWidth
            type="time"
            label="Eating Window Start Time"
            value={settings.eating_window_start}
            onChange={(e) => handleChange('eating_window_start', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose your preferred intermittent fasting protocol. The timer will track your progress toward your goal.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
            Notifications
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.notifications_enabled}
                onChange={(e) => handleChange('notifications_enabled', e.target.checked)}
              />
            }
            label="Enable Notifications"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            Receive notifications about your fasting periods.
          </Typography>

          {settings.notifications_enabled && (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notify_fast_start}
                    onChange={(e) => handleChange('notify_fast_start', e.target.checked)}
                  />
                }
                label="Notify when fasting starts"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                Get notified when you start a fasting period.
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notify_fast_end}
                    onChange={(e) => handleChange('notify_fast_end', e.target.checked)}
                  />
                }
                label="Notify when fasting ends"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                Get notified when you reach your fasting goal.
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      <Button
        variant="contained"
        onClick={handleSave}
        disabled={saving}
        sx={{
          backgroundColor: '#9C27B0',
          '&:hover': {
            backgroundColor: '#7B1FA2',
          },
        }}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </Box>
  );
};

export default FastingSettings;

