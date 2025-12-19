import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Button,
  LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import api, { clearCache } from '../services/api';
import CustomCalendar from '../components/CustomCalendar';
import WaterTracker from '../components/WaterTracker';

// Wrapper component to conditionally render WaterTracker based on settings
const WaterTrackerWrapper = ({ date, onUpdate }) => {
  const [widgetEnabled, setWidgetEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchWaterSettings = useCallback(async () => {
    try {
      const response = await api.get('/api/water-settings/my_settings/');
      if (response.data) {
        setWidgetEnabled(response.data.widget_enabled !== false);
      }
    } catch (error) {
      console.error('Failed to fetch water settings:', error);
      // Default to enabled if settings don't exist
      setWidgetEnabled(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWaterSettings();
    
    // Listen for settings updates
    const handleSettingsUpdate = (event) => {
      if (event.detail && event.detail.widget_enabled !== undefined) {
        setWidgetEnabled(event.detail.widget_enabled !== false);
      } else {
        // Refresh settings if detail is not provided
        fetchWaterSettings();
      }
    };
    
    window.addEventListener('waterSettingsUpdated', handleSettingsUpdate);
    
    // Also refresh when window gains focus (user might have changed settings in another tab)
    const handleFocus = () => {
      fetchWaterSettings();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('waterSettingsUpdated', handleSettingsUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchWaterSettings]);

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (!widgetEnabled) {
    return null; // Don't render widget if disabled
  }

  return <WaterTracker date={date} onUpdate={onUpdate} />;
};

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const location = useLocation();
  const hasFetchedRef = useRef(false);

  const fetchDailySummary = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching summary for date:', selectedDate);
      const response = await api.get(`/api/daily-summary/?date=${selectedDate}`);
      console.log('Dashboard API response:', response.data);
      console.log('Meals count:', response.data?.meals?.length || 0);
      console.log('Meals data:', JSON.stringify(response.data?.meals, null, 2));
      console.log('Totals:', response.data?.totals);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      console.error('Error details:', error.response?.data);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDailySummary();
    hasFetchedRef.current = true;
  }, [fetchDailySummary]);

  // Refresh when navigating to this page
  useEffect(() => {
    if (hasFetchedRef.current && location.pathname === '/dashboard') {
      fetchDailySummary();
    }
  }, [location.pathname, fetchDailySummary]);

  // Listen for updates from Diary and Weight pages
  useEffect(() => {
    const handleDiaryUpdate = () => {
      clearCache();
      fetchDailySummary();
    };
    
    const handleWeightUpdate = () => {
      clearCache();
      fetchDailySummary();
    };

    window.addEventListener('diaryUpdated', handleDiaryUpdate);
    window.addEventListener('weightUpdated', handleWeightUpdate);

    return () => {
      window.removeEventListener('diaryUpdated', handleDiaryUpdate);
      window.removeEventListener('weightUpdated', handleWeightUpdate);
    };
  }, [fetchDailySummary]);

  // Refresh when window gains focus (user returns to tab) - with debounce
  useEffect(() => {
    let timeoutId;
    const handleFocus = () => {
      if (hasFetchedRef.current) {
        // Debounce to avoid multiple rapid refreshes
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fetchDailySummary();
        }, 500);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearTimeout(timeoutId);
    };
  }, [fetchDailySummary]);

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const totals = summary?.totals || { 
    calories: 0, 
    protein: 0, 
    carbs: 0, 
    fat: 0 
  };
  
  // Ensure all values are numbers
  const safeTotals = {
    calories: Number(totals.calories) || 0,
    protein: Number(totals.protein) || 0,
    carbs: Number(totals.carbs) || 0,
    fat: Number(totals.fat) || 0
  };
  const goals = summary?.goals;

  const getProgress = (current, goal) => {
    if (!goal || goal === 0) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, md: 4 }, mb: 4, width: '100%', maxWidth: '100%', mx: 'auto', overflow: 'hidden', px: { xs: 1, sm: 2 }, boxSizing: 'border-box' }}>
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          sx={{ 
            fontSize: { xs: '1.75rem', md: '2.5rem' },
            fontWeight: 700,
            background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 1,
          }}
        >
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Track your daily nutrition and progress
        </Typography>
      </Box>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <CustomCalendar
            selectedDate={selectedDate}
            onDateChange={(date) => {
              console.log('Date changed to:', date);
              setSelectedDate(date);
            }}
            highlightDates={[]}
          />
        </Grid>
        <Grid item xs={12} md={8}>
          <WaterTracker
            date={selectedDate}
            onUpdate={fetchDailySummary}
          />
        </Grid>
      </Grid>
      
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: 'wrap',
        }}
      >
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchDailySummary}
          disabled={loading}
          sx={{
            borderRadius: '12px',
            px: 3,
            py: 1.5,
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
            },
          }}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ width: '100%', maxWidth: '100%', margin: 0, boxSizing: 'border-box' }}>
        {/* AI Survey Banner */}
        {(!goals || !summary?.goals) && (
          <Grid item xs={12} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                color: '#fff',
                mb: 3,
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '200px',
                  height: '200px',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                },
              }}
            >
              <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, fontSize: '1.25rem' }}>
                      🧠 Пройдите опрос для персонализированного питания!
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.95 }}>
                      Заполните профиль (рост, вес, гендер, возраст, цель) и получите персональные рекомендации по БЖУ от ИИ
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    sx={{
                      backgroundColor: '#fff',
                      color: '#FF9800',
                      fontWeight: 600,
                      px: 3,
                      '&:hover': { 
                        backgroundColor: '#f5f5f5',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      },
                      transition: 'all 0.2s',
                    }}
                    onClick={() => window.location.href = '/profile'}
                  >
                    Заполнить профиль
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={3} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <Card 
            sx={{ 
              width: '100%', 
              maxWidth: '100%', 
              boxSizing: 'border-box',
              background: safeTotals.calories > (goals?.daily_calories || 0) 
                ? 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(244, 67, 54, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0.03) 100%)',
              border: safeTotals.calories > (goals?.daily_calories || 0) ? '2px solid' : 'none',
              borderColor: safeTotals.calories > (goals?.daily_calories || 0) ? 'error.main' : 'transparent',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}>
              <Typography 
                color="text.secondary" 
                gutterBottom 
                variant="subtitle2"
                sx={{ 
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                }}
              >
                КАЛОРИИ
              </Typography>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 700, 
                  background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  mb: 1,
                }}
              >
                {safeTotals.calories.toFixed(0)}
              </Typography>
              {goals ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                    Цель: {goals.daily_calories.toFixed(0)} ккал
                  </Typography>
                  <Box 
                    sx={{ 
                      mt: 2, 
                      width: '100%', 
                      height: 10, 
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${Math.min(getProgress(safeTotals.calories, goals.daily_calories), 100)}%`,
                        background: getProgress(safeTotals.calories, goals.daily_calories) > 100 
                          ? 'linear-gradient(90deg, #F44336 0%, #E53935 100%)'
                          : 'linear-gradient(90deg, #FF9800 0%, #F57C00 100%)',
                        borderRadius: '10px',
                        transition: 'width 0.5s ease',
                        boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)',
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontWeight: 500 }}>
                    {getProgress(safeTotals.calories, goals.daily_calories).toFixed(0)}% от цели
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Заполните профиль для установки цели
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <Card 
            sx={{ 
              width: '100%', 
              maxWidth: '100%', 
              boxSizing: 'border-box',
              background: safeTotals.protein < (goals?.daily_protein || 0) * 0.7
                ? 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(244, 67, 54, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0.03) 100%)',
              border: safeTotals.protein < (goals?.daily_protein || 0) * 0.7 ? '2px solid' : 'none',
              borderColor: safeTotals.protein < (goals?.daily_protein || 0) * 0.7 ? 'error.main' : 'transparent',
            }}
          >
            <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <Typography 
                color="text.secondary" 
                gutterBottom 
                variant="subtitle2"
                sx={{ 
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                }}
              >
                БЕЛКИ
              </Typography>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 700, 
                  background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  mb: 1,
                }}
              >
                {safeTotals.protein.toFixed(1)}г
              </Typography>
              {goals ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                    Цель: {goals.daily_protein.toFixed(0)}г
                  </Typography>
                  <Box 
                    sx={{ 
                      mt: 2, 
                      width: '100%', 
                      height: 10, 
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${Math.min(getProgress(safeTotals.protein, goals.daily_protein), 100)}%`,
                        background: 'linear-gradient(90deg, #4CAF50 0%, #66BB6A 100%)',
                        borderRadius: '10px',
                        transition: 'width 0.5s ease',
                        boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontWeight: 500 }}>
                    {getProgress(safeTotals.protein, goals.daily_protein).toFixed(0)}% от цели
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Заполните профиль для установки цели
                </Typography>
              )}
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
                variant="subtitle2"
                sx={{ 
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                }}
              >
                УГЛЕВОДЫ
              </Typography>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 700, 
                  background: 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  mb: 1,
                }}
              >
                {safeTotals.carbs.toFixed(1)}г
              </Typography>
              {goals ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                    Цель: {goals.daily_carbs.toFixed(0)}г
                  </Typography>
                  <Box 
                    sx={{ 
                      mt: 2, 
                      width: '100%', 
                      height: 10, 
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${Math.min(getProgress(safeTotals.carbs, goals.daily_carbs), 100)}%`,
                        background: 'linear-gradient(90deg, #9C27B0 0%, #BA68C8 100%)',
                        borderRadius: '10px',
                        transition: 'width 0.5s ease',
                        boxShadow: '0 2px 8px rgba(156, 39, 176, 0.3)',
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontWeight: 500 }}>
                    {getProgress(safeTotals.carbs, goals.daily_carbs).toFixed(0)}% от цели
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Заполните профиль для установки цели
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <Card 
            sx={{ 
              width: '100%', 
              maxWidth: '100%', 
              boxSizing: 'border-box',
              background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.08) 0%, rgba(255, 193, 7, 0.03) 100%)',
            }}
          >
            <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <Typography 
                color="text.secondary" 
                gutterBottom 
                variant="subtitle2"
                sx={{ 
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                }}
              >
                ЖИРЫ
              </Typography>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 700, 
                  background: 'linear-gradient(135deg, #FFC107 0%, #FFD54F 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  mb: 1,
                }}
              >
                {safeTotals.fat.toFixed(1)}г
              </Typography>
              {goals ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                    Цель: {goals.daily_fat.toFixed(0)}г
                  </Typography>
                  <Box 
                    sx={{ 
                      mt: 2, 
                      width: '100%', 
                      height: 10, 
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${Math.min(getProgress(safeTotals.fat, goals.daily_fat), 100)}%`,
                        background: 'linear-gradient(90deg, #FFC107 0%, #FFD54F 100%)',
                        borderRadius: '10px',
                        transition: 'width 0.5s ease',
                        boxShadow: '0 2px 8px rgba(255, 193, 7, 0.3)',
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontWeight: 500 }}>
                    {getProgress(safeTotals.fat, goals.daily_fat).toFixed(0)}% от цели
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Заполните профиль для установки цели
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <Card sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  wordBreak: 'break-word',
                  fontWeight: 600,
                  mb: 3,
                }}
              >
                Today's Meals
              </Typography>
              {summary?.meals && Array.isArray(summary.meals) && summary.meals.length > 0 ? (
                <Box sx={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {summary.meals.map((meal) => {
                    const foodName = meal.food?.name || meal.food_name || 'Unknown Food';
                    const mealType = meal.meal_type || 'Meal';
                    const mealTypeLabels = {
                      breakfast: '🌅 Завтрак',
                      lunch: '🍽️ Обед',
                      dinner: '🌙 Ужин',
                      snack: '🍎 Перекус',
                    };
                    return (
                      <Card
                        key={meal.id || Math.random()}
                        sx={{
                          p: 2.5,
                          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(76, 175, 80, 0.02) 100%)',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: '12px',
                          width: '100%',
                          maxWidth: '100%',
                          boxSizing: 'border-box',
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'translateX(4px)',
                            borderColor: 'primary.main',
                            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.15)',
                          },
                        }}
                      >
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            wordBreak: 'break-word',
                            fontWeight: 600,
                            mb: 1,
                          }}
                        >
                          {mealTypeLabels[mealType] || mealType} - {foodName}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {meal.quantity || 0}g
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#FF9800', fontWeight: 600 }}>
                            {meal.total_calories?.toFixed(0) || 0} кал
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#4CAF50', fontWeight: 600 }}>
                            Б: {meal.total_protein?.toFixed(1) || 0}г
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#9C27B0', fontWeight: 600 }}>
                            У: {meal.total_carbs?.toFixed(1) || 0}г
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#FFC107', fontWeight: 600 }}>
                            Ж: {meal.total_fat?.toFixed(1) || 0}г
                          </Typography>
                          {meal.food?.fiber && meal.food.fiber > 0 && (
                            <Typography variant="body2" sx={{ color: '#607D8B', fontWeight: 500 }}>
                              Клетчатка: {((meal.food.fiber * (meal.quantity || 0)) / 100).toFixed(1)}г
                            </Typography>
                          )}
                        </Box>
                      </Card>
                    );
                  })}
                </Box>
              ) : (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 6,
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 1, opacity: 0.7 }}>
                    {summary?.meals === undefined ? 'Loading meals...' : 'No meals logged for this date'}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.5 }}>
                    Add your first meal to start tracking!
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;

