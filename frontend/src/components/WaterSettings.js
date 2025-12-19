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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import api from '../services/api';

const WaterSettings = () => {
  const [settings, setSettings] = useState({
    widget_enabled: true,
    unit: 'fl_oz',
    daily_goal_ml: 2000,
    daily_goal_display: 67.6, // Default in fl_oz
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
      const response = await api.get('/api/water-settings/my_settings/');
      if (response.data) {
        const data = response.data;
        // Convert goal to display unit
        let goalDisplay = data.daily_goal_ml;
        if (data.unit === 'fl_oz') {
          goalDisplay = data.daily_goal_ml / 29.5735;
        } else if (data.unit === 'cups') {
          goalDisplay = data.daily_goal_ml / 236.588;
        }
        
        setSettings({
          widget_enabled: data.widget_enabled ?? true,
          unit: data.unit || 'fl_oz',
          daily_goal_ml: data.daily_goal_ml || 2000,
          daily_goal_display: goalDisplay,
        });
      }
    } catch (error) {
      console.error('Failed to fetch water settings:', error);
      // Use defaults if settings don't exist
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [field]: value };
      
      // If unit changed, convert goal to new unit
      if (field === 'unit') {
        const currentGoal = prev.daily_goal_ml;
        if (value === 'ml') {
          newSettings.daily_goal_display = currentGoal;
        } else if (value === 'fl_oz') {
          newSettings.daily_goal_display = currentGoal / 29.5735;
        } else if (value === 'cups') {
          newSettings.daily_goal_display = currentGoal / 236.588;
        }
      }
      
      // If goal changed, update ml value
      if (field === 'daily_goal_display') {
        const unit = newSettings.unit || prev.unit;
        if (unit === 'ml') {
          newSettings.daily_goal_ml = value;
        } else if (unit === 'fl_oz') {
          newSettings.daily_goal_ml = value * 29.5735;
        } else if (unit === 'cups') {
          newSettings.daily_goal_ml = value * 236.588;
        }
      }
      
      return newSettings;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        widget_enabled: settings.widget_enabled,
        unit: settings.unit,
        daily_goal_display: settings.daily_goal_display,
      };
      
      const response = await api.put('/api/water-settings/my_settings/', payload);
      if (response.status === 200) {
        setMessage('Settings saved successfully!');
        // Update local state with server response
        const data = response.data;
        let goalDisplay = data.daily_goal_ml;
        if (data.unit === 'fl_oz') {
          goalDisplay = data.daily_goal_ml / 29.5735;
        } else if (data.unit === 'cups') {
          goalDisplay = data.daily_goal_ml / 236.588;
        }
        
        setSettings(prev => ({
          ...prev,
          ...data,
          daily_goal_display: goalDisplay,
        }));
        
        // Trigger update event for other components
        window.dispatchEvent(new CustomEvent('waterSettingsUpdated', { detail: data }));
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
        Water Settings
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
                onChange={async (e) => {
                  const newValue = e.target.checked;
                  handleChange('widget_enabled', newValue);
                  // Auto-save widget_enabled immediately
                  try {
                    const payload = {
                      widget_enabled: newValue,
                      unit: settings.unit,
                      daily_goal_display: settings.daily_goal_display,
                    };
                    const response = await api.put('/api/water-settings/my_settings/', payload);
                    if (response.status === 200) {
                      // Trigger update event for other components
                      window.dispatchEvent(new CustomEvent('waterSettingsUpdated', { detail: response.data }));
                    }
                  } catch (error) {
                    console.error('Failed to save widget_enabled:', error);
                    // Revert the change on error
                    handleChange('widget_enabled', !newValue);
                  }
                }}
              />
            }
            label="Show Water Widget on Dashboard"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            Enable or disable the water tracking widget on your dashboard.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
            Display Preferences
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Unit of Measurement</InputLabel>
            <Select
              value={settings.unit}
              label="Unit of Measurement"
              onChange={(e) => handleChange('unit', e.target.value)}
            >
              <MenuItem value="ml">Milliliters (ml)</MenuItem>
              <MenuItem value="fl_oz">Fluid Ounces (fl oz)</MenuItem>
              <MenuItem value="cups">Cups</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose how water intake is displayed throughout the application.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
            Daily Goal
          </Typography>
          
          <TextField
            fullWidth
            type="number"
            label={`Daily Water Goal (${settings.unit === 'ml' ? 'ml' : settings.unit === 'fl_oz' ? 'fl oz' : 'cups'})`}
            value={settings.daily_goal_display}
            onChange={(e) => handleChange('daily_goal_display', parseFloat(e.target.value) || 0)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: 0, step: 0.1 }}
            sx={{ mb: 2 }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Set your daily water intake goal. Recommended: 8 cups (64 fl oz / ~1900 ml) per day.
          </Typography>
        </CardContent>
      </Card>

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

export default WaterSettings;

