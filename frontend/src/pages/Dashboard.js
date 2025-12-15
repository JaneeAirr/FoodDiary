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
import api from '../services/api';

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

  // Refresh when window gains focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      if (hasFetchedRef.current) {
        fetchDailySummary();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            console.log('Date changed to:', e.target.value);
            setSelectedDate(e.target.value);
          }}
          style={{ padding: '8px', fontSize: '16px', backgroundColor: '#1e1e1e', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '4px' }}
        />
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchDailySummary}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* AI Survey Banner */}
        {(!goals || !summary?.goals) && (
          <Grid item xs={12}>
            <Card sx={{ backgroundColor: '#ff6b35', color: '#fff', mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                      🧠 Пройдите опрос для персонализированного питания!
                    </Typography>
                    <Typography variant="body2">
                      Заполните профиль (рост, вес, гендер, возраст, цель) и получите персональные рекомендации по БЖУ от ИИ
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    sx={{
                      backgroundColor: '#fff',
                      color: '#ff6b35',
                      '&:hover': { backgroundColor: '#f5f5f5' },
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
        <Grid item xs={12} md={3}>
          <Card sx={{ border: '2px solid', borderColor: safeTotals.calories > (goals?.daily_calories || 0) ? '#ff6b35' : 'transparent' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="subtitle2">
                КАЛОРИИ
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#ff6b35' }}>
                {safeTotals.calories.toFixed(0)}
              </Typography>
              {goals ? (
                <>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Цель: {goals.daily_calories.toFixed(0)} ккал
                  </Typography>
                  <Box sx={{ mt: 1, width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                    <Box
                      sx={{
                        height: '100%',
                        width: `${Math.min(getProgress(safeTotals.calories, goals.daily_calories), 100)}%`,
                        backgroundColor: getProgress(safeTotals.calories, goals.daily_calories) > 100 ? '#f44336' : '#ff6b35',
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {getProgress(safeTotals.calories, goals.daily_calories).toFixed(0)}% от цели
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Заполните профиль для установки цели
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ border: '2px solid', borderColor: safeTotals.protein < (goals?.daily_protein || 0) * 0.7 ? '#f44336' : 'transparent' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="subtitle2">
                БЕЛКИ
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#82ca9d' }}>
                {safeTotals.protein.toFixed(1)}г
              </Typography>
              {goals ? (
                <>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Цель: {goals.daily_protein.toFixed(0)}г
                  </Typography>
                  <Box sx={{ mt: 1, width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                    <Box
                      sx={{
                        height: '100%',
                        width: `${Math.min(getProgress(safeTotals.protein, goals.daily_protein), 100)}%`,
                        backgroundColor: '#82ca9d',
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {getProgress(safeTotals.protein, goals.daily_protein).toFixed(0)}% от цели
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Заполните профиль для установки цели
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="subtitle2">
                УГЛЕВОДЫ
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#8884d8' }}>
                {safeTotals.carbs.toFixed(1)}г
              </Typography>
              {goals ? (
                <>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Цель: {goals.daily_carbs.toFixed(0)}г
                  </Typography>
                  <Box sx={{ mt: 1, width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                    <Box
                      sx={{
                        height: '100%',
                        width: `${Math.min(getProgress(safeTotals.carbs, goals.daily_carbs), 100)}%`,
                        backgroundColor: '#8884d8',
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {getProgress(safeTotals.carbs, goals.daily_carbs).toFixed(0)}% от цели
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Заполните профиль для установки цели
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="subtitle2">
                ЖИРЫ
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#ffc658' }}>
                {safeTotals.fat.toFixed(1)}г
              </Typography>
              {goals ? (
                <>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Цель: {goals.daily_fat.toFixed(0)}г
                  </Typography>
                  <Box sx={{ mt: 1, width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                    <Box
                      sx={{
                        height: '100%',
                        width: `${Math.min(getProgress(safeTotals.fat, goals.daily_fat), 100)}%`,
                        backgroundColor: '#ffc658',
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {getProgress(safeTotals.fat, goals.daily_fat).toFixed(0)}% от цели
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Заполните профиль для установки цели
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Today's Meals
            </Typography>
            {summary?.meals && summary.meals.length > 0 ? (
              <Box>
                {summary.meals.map((meal) => (
                  <Box key={meal.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="subtitle1">
                      {meal.meal_type} - {meal.food.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {meal.quantity}g | {meal.total_calories.toFixed(0)} cal | 
                      P: {meal.total_protein.toFixed(1)}g | 
                      C: {meal.total_carbs.toFixed(1)}g | 
                      F: {meal.total_fat.toFixed(1)}g
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="textSecondary">No meals logged for this date</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;

