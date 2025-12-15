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
import api from '../services/api';
import { useAuth } from '../store/AuthContext';

const Profile = () => {
  const { user } = useAuth();
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
      
      // Force page refresh to apply theme if needed
      setTimeout(() => {
        window.location.reload();
      }, 500);
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ mr: 2, color: '#ff6b35', fontSize: 32 }} />
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Settings & Goals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your profile information, nutritional targets, and app preferences.
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ p: 3, backgroundColor: '#1e1e1e' }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: 3,
            '& .MuiTab-root': {
              color: 'rgba(255, 255, 255, 0.7)',
              '&.Mui-selected': {
                color: '#ff6b35',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#ff6b35',
            },
          }}
        >
          <Tab label="Profile" />
          <Tab label="Nutrition Goals" />
          <Tab label="Calculations" />
        </Tabs>

        {message && (
          <Alert
            severity={message.includes('success') ? 'success' : 'error'}
            sx={{ mb: 3 }}
            onClose={() => setMessage('')}
          >
            {message}
          </Alert>
        )}

        {tabValue === 0 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: '#ff6b35',
                  mr: 3,
                  fontSize: 32,
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
            <Alert severity="info" sx={{ mb: 3 }}>
              Заполните эти данные для автоматического расчета ваших целей по калориям и БЖУ. 
              Все расчеты выполняются на сервере по формуле Харриса-Бенедикта.
            </Alert>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Рост (см)"
                  type="number"
                  value={profileData.height}
                  onChange={(e) => handleProfileChange('height', e.target.value)}
                  inputProps={{ min: 100, max: 250, step: 0.1 }}
                  helperText="Ваш рост в сантиметрах"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Вес (кг)"
                  type="number"
                  value={profileData.weight}
                  onChange={(e) => handleProfileChange('weight', e.target.value)}
                  inputProps={{ min: 30, max: 300, step: 0.1 }}
                  helperText="Ваш текущий вес в килограммах"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
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
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Дата рождения"
                  type="date"
                  value={profileData.date_of_birth}
                  onChange={(e) => handleProfileChange('date_of_birth', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText="Необходимо для расчета возраста"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
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
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
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

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Display Name"
                  value={profileData.display_name}
                  onChange={(e) => handleProfileChange('display_name', e.target.value)}
                  sx={{ mb: 2 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={profileData.show_display_name}
                      onChange={(e) => handleProfileChange('show_display_name', e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#ff6b35',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#ff6b35',
                        },
                      }}
                    />
                  }
                  label="Show Display Name on MunchLine"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                  You will appear as 'Anonymous User' on the MunchLine.
                </Typography>
              </Grid>
            </Grid>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Dietary Preference
              </Typography>
              <ToggleButtonGroup
                value={profileData.dietary_preference}
                exclusive
                onChange={(e, value) => value && handleProfileChange('dietary_preference', value)}
                sx={{
                  '& .MuiToggleButton-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    '&.Mui-selected': {
                      backgroundColor: '#ff6b35',
                      color: '#fff',
                      borderColor: '#ff6b35',
                      '&:hover': {
                        backgroundColor: '#ff6b35',
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

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Theme Preference
              </Typography>
              <ToggleButtonGroup
                value={profileData.theme_preference}
                exclusive
                onChange={(e, value) => value && handleProfileChange('theme_preference', value)}
                sx={{
                  '& .MuiToggleButton-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    '&.Mui-selected': {
                      backgroundColor: '#ff6b35',
                      color: '#fff',
                      borderColor: '#ff6b35',
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
              <Button variant="outlined" sx={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveProfile}
                sx={{
                  backgroundColor: '#ff6b35',
                  '&:hover': {
                    backgroundColor: '#e55a2b',
                  },
                }}
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
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Daily Protein (g)"
                    name="daily_protein"
                    type="number"
                    value={goalsData.daily_protein}
                    onChange={handleGoalsChange}
                    inputProps={{ min: 0 }}
                    helperText="Recommended protein intake"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Daily Carbs (g)"
                    name="daily_carbs"
                    type="number"
                    value={goalsData.daily_carbs}
                    onChange={handleGoalsChange}
                    inputProps={{ min: 0 }}
                    helperText="Recommended carbohydrate intake"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Daily Fat (g)"
                    name="daily_fat"
                    type="number"
                    value={goalsData.daily_fat}
                    onChange={handleGoalsChange}
                    inputProps={{ min: 0 }}
                    helperText="Recommended fat intake"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={calculateNutrition}
                      sx={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}
                    >
                      Recalculate from Profile
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      sx={{
                        backgroundColor: '#ff6b35',
                        '&:hover': {
                          backgroundColor: '#e55a2b',
                        },
                      }}
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
          <Box>
            <Typography variant="h6" gutterBottom>
              Nutrition Calculations
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              These values are calculated based on your profile information using the Harris-Benedict equation.
            </Typography>
            {nutritionData ? (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        BMR
                      </Typography>
                      <Typography variant="h5">
                        {nutritionData.bmr?.toFixed(0) || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Calories/day
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        TDEE
                      </Typography>
                      <Typography variant="h5">
                        {nutritionData.tdee?.toFixed(0) || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Calories/day
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Daily Calories
                      </Typography>
                      <Typography variant="h5">
                        {nutritionData.daily_calories?.toFixed(0) || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Based on goal
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Macros
                      </Typography>
                      <Typography variant="body2">
                        P: {nutritionData.macros?.protein?.toFixed(0) || 'N/A'}g
                      </Typography>
                      <Typography variant="body2">
                        C: {nutritionData.macros?.carbs?.toFixed(0) || 'N/A'}g
                      </Typography>
                      <Typography variant="body2">
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
      </Paper>
    </Container>
  );
};

export default Profile;

