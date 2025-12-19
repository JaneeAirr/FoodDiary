import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Alert,
  Tabs,
  Tab,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import api from '../services/api';
import { useAuth } from '../store/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MealReminderSettings from '../components/MealReminderSettings';
import WaterSettings from '../components/WaterSettings';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [profileData, setProfileData] = useState({
    display_name: user?.username || '',
    show_display_name: false,
    dietary_preference: 'none',
    theme_preference: 'system',
    height: '',
    weight: '',
    gender: '',
    date_of_birth: '',
    goal: '',
    activity_level: 'moderate',
  });
  const [goalsData, setGoalsData] = useState({
    daily_calories: '',
    daily_protein: '',
    daily_carbs: '',
    daily_fat: '',
  });
  const [nutritionData, setNutritionData] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    fetchGoals();
    fetchProfile();
    calculateNutrition();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/auth/profile/');
      if (response.data) {
        setProfileData({
          display_name: response.data.display_name || response.data.username || '',
          show_display_name: response.data.show_display_name || false,
          dietary_preference: response.data.dietary_preference || 'none',
          theme_preference: response.data.theme_preference || 'system',
          height: response.data.height || '',
          weight: response.data.weight || '',
          gender: response.data.gender || '',
          date_of_birth: response.data.date_of_birth || '',
          goal: response.data.goal || '',
          activity_level: response.data.activity_level || 'moderate',
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await api.get('/api/goals/my_goals/');
      if (response.data && !response.data.message) {
        setGoalsData({
          daily_calories: response.data.daily_calories || '',
          daily_protein: response.data.daily_protein || '',
          daily_carbs: response.data.daily_carbs || '',
          daily_fat: response.data.daily_fat || '',
        });
      }
    } catch (error) {
      // Goals not set yet, that's okay
    }
  };

  const handleProfileChange = (field, value) => {
    setProfileData({ ...profileData, [field]: value });
  };

  const calculateNutrition = async () => {
    try {
      const response = await api.get('/api/calculate-nutrition/');
      setNutritionData(response.data);
      // Auto-fill goals if not set
      if (!goalsData.daily_calories && response.data.daily_calories) {
        setGoalsData({
          daily_calories: response.data.daily_calories,
          daily_protein: response.data.macros.protein,
          daily_carbs: response.data.macros.carbs,
          daily_fat: response.data.macros.fat,
        });
      }
    } catch (error) {
      console.error('Failed to calculate nutrition:', error);
    }
  };

  const handleGoalsChange = (e) => {
    setGoalsData({ ...goalsData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    setMessage('');
    try {
      await api.put('/api/auth/profile/update/', profileData);
      setMessage('Profile updated successfully! Goals will be recalculated automatically.');
      fetchProfile();
      calculateNutrition(); // Recalculate after profile update
      
      // Trigger theme change event immediately
      const themePreference = profileData.theme_preference;
      localStorage.setItem('themePreference', themePreference);
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: themePreference }));
    } catch (error) {
      console.error('Profile save error:', error);
      setMessage('Failed to update profile');
    }
  };

  const handleSaveGoals = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const goalsPayload = {
        daily_calories: parseFloat(goalsData.daily_calories) || 0,
        daily_protein: parseFloat(goalsData.daily_protein) || 0,
        daily_carbs: parseFloat(goalsData.daily_carbs) || 0,
        daily_fat: parseFloat(goalsData.daily_fat) || 0,
      };
      
      await api.put('/api/goals/my_goals/', goalsPayload);
      setMessage('Goals updated successfully!');
      fetchGoals();
    } catch (error) {
      console.error('Goals save error:', error);
      if (error.response?.status === 404) {
        try {
          const goalsPayload = {
            daily_calories: parseFloat(goalsData.daily_calories) || 0,
            daily_protein: parseFloat(goalsData.daily_protein) || 0,
            daily_carbs: parseFloat(goalsData.daily_carbs) || 0,
            daily_fat: parseFloat(goalsData.daily_fat) || 0,
          };
          await api.post('/api/goals/', goalsPayload);
          setMessage('Goals created successfully!');
          fetchGoals();
        } catch (createError) {
          console.error('Create goals error:', createError);
          setMessage('Failed to save goals: ' + (createError.response?.data?.detail || createError.message));
        }
      } else {
        const errorMsg = error.response?.data?.detail || error.response?.data || 'Failed to update goals';
        setMessage(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, width: '100%', maxWidth: '100%', mx: 'auto', overflow: 'hidden', px: { xs: 1, sm: 2 }, boxSizing: 'border-box' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <SettingsIcon sx={{ mr: { xs: 0, sm: 2 }, color: 'primary.main', fontSize: 32 }} />
        <Box>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 700, 
              fontSize: { xs: '1.75rem', md: '2.5rem' },
              background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 1,
            }}
          >
            Settings & Goals
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your profile information, nutritional targets, and app preferences.
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: 3,
            '& .MuiTab-root': {
              color: 'text.secondary',
              minWidth: { xs: 80, sm: 120 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              fontWeight: 500,
              '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 600,
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'primary.main',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab label="Profile" icon={<SettingsIcon />} iconPosition="start" />
          <Tab label="Goals" iconPosition="start" />
          <Tab label="Calculations" iconPosition="start" />
          <Tab label="Reminders" icon={<NotificationsIcon />} iconPosition="start" />
          <Tab label="Water" icon={<LocalDrinkIcon />} iconPosition="start" />
          <Tab label="Account" icon={<LogoutIcon />} iconPosition="start" />
        </Tabs>

        {message && (
          <Alert
            severity={message.includes('success') ? 'success' : 'error'}
            sx={{ mb: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box', wordBreak: 'break-word' }}
            onClose={() => setMessage('')}
          >
            {message}
          </Alert>
        )}

        {tabValue === 0 && (
          <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 4,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
              }}
            >
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
                  mr: { xs: 0, sm: 3 },
                  fontSize: 40,
                  fontWeight: 700,
                  boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)',
                }}
              >
                {profileData.display_name.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="body2" color="textSecondary">
                Profile picture feature coming soon
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Основная информация для расчета БЖУ
            </Typography>
            <Alert severity="info" sx={{ mb: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box', wordBreak: 'break-word' }}>
              Заполните эти данные для автоматического расчета ваших целей по калориям и БЖУ. 
              Все расчеты выполняются на сервере по формуле Харриса-Бенедикта.
            </Alert>

            <Grid container spacing={3} sx={{ mb: 3, width: '100%', maxWidth: '100%', margin: 0, boxSizing: 'border-box' }}>
              <Grid item xs={12} sm={6} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <TextField
                  fullWidth
                  label="Рост (см)"
                  type="number"
                  value={profileData.height}
                  onChange={(e) => handleProfileChange('height', e.target.value)}
                  inputProps={{ min: 100, max: 250, step: 0.1 }}
                  helperText="Ваш рост в сантиметрах"
                  sx={{ width: '100%', maxWidth: '100%' }}
                />
              </Grid>
              <Grid item xs={12} sm={6} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <TextField
                  fullWidth
                  label="Вес (кг)"
                  type="number"
                  value={profileData.weight}
                  onChange={(e) => handleProfileChange('weight', e.target.value)}
                  inputProps={{ min: 30, max: 300, step: 0.1 }}
                  helperText="Ваш текущий вес в килограммах"
                  sx={{ width: '100%', maxWidth: '100%' }}
                />
              </Grid>
              <Grid item xs={12} sm={6} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <FormControl fullWidth sx={{ width: '100%', maxWidth: '100%' }}>
                  <InputLabel>Пол</InputLabel>
                  <Select
                    value={profileData.gender}
                    label="Пол"
                    onChange={(e) => handleProfileChange('gender', e.target.value)}
                  >
                    <MenuItem value="M">Мужской</MenuItem>
                    <MenuItem value="F">Женский</MenuItem>
                    <MenuItem value="Other">Другой</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <TextField
                  fullWidth
                  label="Дата рождения"
                  type="date"
                  value={profileData.date_of_birth}
                  onChange={(e) => handleProfileChange('date_of_birth', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText="Необходимо для расчета возраста"
                  sx={{ width: '100%', maxWidth: '100%' }}
                />
              </Grid>
              <Grid item xs={12} sm={6} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <FormControl fullWidth sx={{ width: '100%', maxWidth: '100%' }}>
                  <InputLabel>Цель</InputLabel>
                  <Select
                    value={profileData.goal}
                    label="Цель"
                    onChange={(e) => handleProfileChange('goal', e.target.value)}
                  >
                    <MenuItem value="weight_loss">Похудение</MenuItem>
                    <MenuItem value="weight_gain">Набор веса</MenuItem>
                    <MenuItem value="maintenance">Поддержание веса</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <FormControl fullWidth sx={{ width: '100%', maxWidth: '100%' }}>
                  <InputLabel>Уровень активности</InputLabel>
                  <Select
                    value={profileData.activity_level}
                    label="Уровень активности"
                    onChange={(e) => handleProfileChange('activity_level', e.target.value)}
                  >
                    <MenuItem value="sedentary">Малоподвижный</MenuItem>
                    <MenuItem value="light">Легкая активность (1-3 дня/неделю)</MenuItem>
                    <MenuItem value="moderate">Умеренная активность (3-5 дней/неделю)</MenuItem>
                    <MenuItem value="active">Высокая активность (6-7 дней/неделю)</MenuItem>
                    <MenuItem value="very_active">Очень высокая активность</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mb: 3, mt: 4 }}>
              Дополнительные настройки
            </Typography>

            <Grid container spacing={3} sx={{ mb: 3, width: '100%', maxWidth: '100%', margin: 0, boxSizing: 'border-box' }}>
              <Grid item xs={12} md={8} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <TextField
                  fullWidth
                  label="Display Name"
                  value={profileData.display_name}
                  onChange={(e) => handleProfileChange('display_name', e.target.value)}
                  sx={{ mb: 2, width: '100%', maxWidth: '100%' }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={profileData.show_display_name}
                      onChange={(e) => handleProfileChange('show_display_name', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Show Display Name on MunchLine"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -1, wordBreak: 'break-word' }}>
                  You will appear as 'Anonymous User' on the MunchLine.
                </Typography>
              </Grid>
            </Grid>

            <Box sx={{ mb: 3, width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, wordBreak: 'break-word' }}>
                Dietary Preference
              </Typography>
              <Box sx={{ overflowX: 'auto', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <ToggleButtonGroup
                  value={profileData.dietary_preference}
                  exclusive
                  onChange={(e, value) => value && handleProfileChange('dietary_preference', value)}
                  sx={{
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    '& .MuiToggleButton-root': {
                      color: 'text.secondary',
                      borderColor: 'divider',
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      padding: { xs: '6px 8px', sm: '8px 16px' },
                      borderRadius: '8px',
                      '&.Mui-selected': {
                        backgroundColor: 'primary.main',
                        color: '#fff',
                        borderColor: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                      },
                    },
                  }}
                >
                  <ToggleButton value="none">None</ToggleButton>
                  <ToggleButton value="vegetarian">Vegetarian</ToggleButton>
                  <ToggleButton value="vegan">Vegan</ToggleButton>
                  <ToggleButton value="gluten_free">Gluten Free</ToggleButton>
                  <ToggleButton value="keto">Keto</ToggleButton>
                  <ToggleButton value="paleo">Paleo</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>

            <Box sx={{ mb: 3, width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, wordBreak: 'break-word' }}>
                Theme Preference
              </Typography>
              <ToggleButtonGroup
                value={profileData.theme_preference}
                exclusive
                onChange={(e, value) => value && handleProfileChange('theme_preference', value)}
                sx={{
                  flexWrap: { xs: 'wrap', sm: 'nowrap' },
                  '& .MuiToggleButton-root': {
                    color: 'text.secondary',
                    borderColor: 'divider',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    padding: { xs: '6px 8px', sm: '8px 16px' },
                    borderRadius: '8px',
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: '#fff',
                      borderColor: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  },
                }}
              >
                <ToggleButton value="light">Light</ToggleButton>
                <ToggleButton value="dark">Dark</ToggleButton>
                <ToggleButton value="system">System</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
              <Button variant="outlined">
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveProfile}
              >
                Save Changes
              </Button>
            </Box>
          </Box>
        )}

        {tabValue === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Your nutrition goals are automatically calculated based on your profile (weight, height, age, gender, activity level, and goal).
              You can manually adjust them here. These goals are used throughout the app to track your progress.
            </Alert>
            <form onSubmit={handleSaveGoals}>
              <Grid container spacing={3} sx={{ width: '100%', maxWidth: '100%', margin: 0, boxSizing: 'border-box' }}>
                <Grid item xs={12} sm={6} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <TextField
                    fullWidth
                    label="Daily Calories"
                    name="daily_calories"
                    type="number"
                    value={goalsData.daily_calories}
                    onChange={handleGoalsChange}
                    inputProps={{ min: 0 }}
                    helperText="Your daily calorie target"
                  />
                </Grid>
                <Grid item xs={12} sm={6} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <TextField
                    fullWidth
                    label="Daily Protein (g)"
                    name="daily_protein"
                    type="number"
                    value={goalsData.daily_protein}
                    onChange={handleGoalsChange}
                    inputProps={{ min: 0 }}
                    helperText="Recommended protein intake"
                    sx={{ width: '100%', maxWidth: '100%' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <TextField
                    fullWidth
                    label="Daily Carbs (g)"
                    name="daily_carbs"
                    type="number"
                    value={goalsData.daily_carbs}
                    onChange={handleGoalsChange}
                    inputProps={{ min: 0 }}
                    helperText="Recommended carbohydrate intake"
                    sx={{ width: '100%', maxWidth: '100%' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <TextField
                    fullWidth
                    label="Daily Fat (g)"
                    name="daily_fat"
                    type="number"
                    value={goalsData.daily_fat}
                    onChange={handleGoalsChange}
                    inputProps={{ min: 0 }}
                    helperText="Recommended fat intake"
                    sx={{ width: '100%', maxWidth: '100%' }}
                  />
                </Grid>
                <Grid item xs={12} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', width: '100%', maxWidth: '100%' }}>
                    <Button
                      variant="outlined"
                      onClick={calculateNutrition}
                    >
                      Recalculate from Profile
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                    >
                      Save Goals
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </Box>
        )}

        {tabValue === 2 && (
          <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
            <Typography variant="h6" gutterBottom sx={{ wordBreak: 'break-word' }}>
              Nutrition Calculations
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3, wordBreak: 'break-word' }}>
              These values are calculated based on your profile information using the Harris-Benedict equation.
            </Typography>
            {nutritionData ? (
              <Grid container spacing={3} sx={{ width: '100%', maxWidth: '100%', margin: 0, boxSizing: 'border-box' }}>
                <Grid item xs={12} sm={6} md={3} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <Card 
                    sx={{ 
                      width: '100%', 
                      maxWidth: '100%', 
                      boxSizing: 'border-box',
                      background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0.03) 100%)',
                    }}
                  >
                    <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <Typography 
                        color="text.secondary" 
                        gutterBottom 
                        sx={{ 
                          wordBreak: 'break-word',
                          fontWeight: 600,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          fontSize: '0.75rem',
                        }}
                      >
                        BMR
                      </Typography>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          wordBreak: 'break-word',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {nutritionData.bmr?.toFixed(0) || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word', mt: 1 }}>
                        Calories/day
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <Card 
                    sx={{ 
                      width: '100%', 
                      maxWidth: '100%', 
                      boxSizing: 'border-box',
                      background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.08) 0%, rgba(33, 150, 243, 0.03) 100%)',
                    }}
                  >
                    <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <Typography 
                        color="text.secondary" 
                        gutterBottom 
                        sx={{ 
                          wordBreak: 'break-word',
                          fontWeight: 600,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          fontSize: '0.75rem',
                        }}
                      >
                        TDEE
                      </Typography>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          wordBreak: 'break-word',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {nutritionData.tdee?.toFixed(0) || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word', mt: 1 }}>
                        Calories/day
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <Card 
                    sx={{ 
                      width: '100%', 
                      maxWidth: '100%', 
                      boxSizing: 'border-box',
                      background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.08) 0%, rgba(255, 152, 0, 0.03) 100%)',
                    }}
                  >
                    <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <Typography 
                        color="text.secondary" 
                        gutterBottom 
                        sx={{ 
                          wordBreak: 'break-word',
                          fontWeight: 600,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          fontSize: '0.75rem',
                        }}
                      >
                        Daily Calories
                      </Typography>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          wordBreak: 'break-word',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {nutritionData.daily_calories?.toFixed(0) || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word', mt: 1 }}>
                        Based on goal
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <Card 
                    sx={{ 
                      width: '100%', 
                      maxWidth: '100%', 
                      boxSizing: 'border-box',
                      background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.08) 0%, rgba(156, 39, 176, 0.03) 100%)',
                    }}
                  >
                    <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <Typography 
                        color="text.secondary" 
                        gutterBottom 
                        sx={{ 
                          wordBreak: 'break-word',
                          fontWeight: 600,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          fontSize: '0.75rem',
                        }}
                      >
                        Macros
                      </Typography>
                      <Typography variant="body2" sx={{ wordBreak: 'break-word', fontWeight: 600, color: '#4CAF50' }}>
                        P: {nutritionData.macros?.protein?.toFixed(0) || 'N/A'}g
                      </Typography>
                      <Typography variant="body2" sx={{ wordBreak: 'break-word', fontWeight: 600, color: '#9C27B0' }}>
                        C: {nutritionData.macros?.carbs?.toFixed(0) || 'N/A'}g
                      </Typography>
                      <Typography variant="body2" sx={{ wordBreak: 'break-word', fontWeight: 600, color: '#FFC107' }}>
                        F: {nutritionData.macros?.fat?.toFixed(0) || 'N/A'}g
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Alert severity="warning">
                Please complete your profile (weight, height, date of birth, gender, activity level, and goal) to see calculations.
              </Alert>
            )}
          </Box>
        )}

        {tabValue === 3 && (
          <MealReminderSettings />
        )}

        {tabValue === 4 && (
          <WaterSettings />
        )}

        {tabValue === 5 && (
          <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
            <Typography variant="h6" gutterBottom sx={{ wordBreak: 'break-word' }}>
              Account Actions
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={() => {
                logout();
                navigate('/login');
              }}
              sx={{ mt: 2 }}
            >
              Logout
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Profile;

