import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  Divider,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import api from '../services/api';

const AI = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [mealPlan, setMealPlan] = useState(null);
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [mealPlanDays, setMealPlanDays] = useState(7);

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/api/ai/analyze-behavior/');
      setAnalysis(response.data);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze behavior. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/api/ai/recommendations/');
      setRecommendations(response.data.recommendations || []);
    } catch (err) {
      console.error('Recommendations error:', err);
      setError('Failed to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMealPlan = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/api/ai/generate-meal-plan/', {
        days: mealPlanDays
      });
      setMealPlan(response.data);
    } catch (err) {
      console.error('Meal plan error:', err);
      setError('Failed to generate meal plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    
    // Add user message to chat
    const newUserMessage = { role: 'user', content: userMessage };
    setChatMessages(prev => [...prev, newUserMessage]);
    setChatLoading(true);

    try {
      // Build conversation history
      const history = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await api.post('/api/ai/chat/', {
        message: userMessage,
        history: history
      });

      // Add AI response to chat
      const aiMessage = { role: 'assistant', content: response.data.response };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = { role: 'assistant', content: 'Извините, произошла ошибка. Попробуйте позже.' };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, width: '100%', maxWidth: '100%', mx: 'auto', overflow: 'hidden', px: { xs: 1, sm: 2 }, boxSizing: 'border-box' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
        }}
      >
        <PsychologyIcon sx={{ fontSize: 40, color: '#ff6b35' }} />
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2.125rem' } }}>
          AI Nutrition Assistant
        </Typography>
      </Box>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
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
              color: 'rgba(255, 255, 255, 0.7)',
              minWidth: { xs: 80, sm: 120 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              '&.Mui-selected': {
                color: '#ff6b35',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#ff6b35',
            },
          }}
        >
          <Tab icon={<PsychologyIcon />} iconPosition="start" label="Analysis" sx={{ minWidth: { xs: 60, sm: 100 } }} />
          <Tab icon={<LightbulbIcon />} iconPosition="start" label="Tips" sx={{ minWidth: { xs: 60, sm: 100 } }} />
          <Tab icon={<RestaurantMenuIcon />} iconPosition="start" label="Plan" sx={{ minWidth: { xs: 60, sm: 100 } }} />
          <Tab icon={<ChatIcon />} iconPosition="start" label="Chat" sx={{ minWidth: { xs: 60, sm: 100 } }} />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {tabValue === 0 && (
          <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
            <Typography variant="h6" gutterBottom>
              Analyze Your Eating Behavior
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Get insights about your eating patterns over the last 7 days. The AI will analyze your meals
              and identify patterns, issues, and provide personalized recommendations.
            </Typography>
            <Button
              variant="contained"
              onClick={handleAnalyze}
              disabled={loading}
              sx={{
                backgroundColor: '#ff6b35',
                '&:hover': { backgroundColor: '#e55a2b' },
                mb: 3,
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Analyze Behavior'}
            </Button>

            {analysis && (
              <Box>
                {analysis.summary && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Summary
                    </Typography>
                    {analysis.summary}
                  </Alert>
                )}

                {analysis.patterns && analysis.patterns.length > 0 && (
                  <Card sx={{ mb: 2, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                    <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <Typography variant="h6" gutterBottom sx={{ wordBreak: 'break-word' }}>
                        Positive Patterns
                      </Typography>
                      <List>
                        {analysis.patterns.map((pattern, idx) => (
                          <ListItem key={idx} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                            <ListItemText primary={pattern} sx={{ wordBreak: 'break-word' }} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                )}

                {analysis.issues && analysis.issues.length > 0 && (
                  <Card sx={{ mb: 2, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                    <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <Typography variant="h6" gutterBottom color="error" sx={{ wordBreak: 'break-word' }}>
                        Issues Found
                      </Typography>
                      <List>
                        {analysis.issues.map((issue, idx) => (
                          <ListItem key={idx} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                            <ListItemText primary={issue} sx={{ wordBreak: 'break-word' }} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                )}

                {analysis.recommendations && analysis.recommendations.length > 0 && (
                  <Card sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                    <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <Typography variant="h6" gutterBottom color="primary" sx={{ wordBreak: 'break-word' }}>
                        Recommendations
                      </Typography>
                      <List>
                        {analysis.recommendations.map((rec, idx) => (
                          <ListItem key={idx} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                            <ListItemText primary={rec} sx={{ wordBreak: 'break-word' }} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                )}
              </Box>
            )}
          </Box>
        )}

        {tabValue === 1 && (
          <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
            <Typography variant="h6" gutterBottom>
              Get Daily Recommendations
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Receive personalized nutrition recommendations based on your current day's intake and goals.
            </Typography>
            <Button
              variant="contained"
              onClick={handleGetRecommendations}
              disabled={loading}
              sx={{
                backgroundColor: '#ff6b35',
                '&:hover': { backgroundColor: '#e55a2b' },
                mb: 3,
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Get Recommendations'}
            </Button>

            {recommendations.length > 0 && (
              <Card sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <Typography variant="h6" gutterBottom sx={{ wordBreak: 'break-word' }}>
                    Today's Recommendations
                  </Typography>
                  <List>
                    {recommendations.map((rec, idx) => (
                      <ListItem key={idx} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <Chip icon={<LightbulbIcon />} label={rec} color="primary" variant="outlined" sx={{ maxWidth: '100%', wordBreak: 'break-word' }} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}
          </Box>
        )}

        {tabValue === 2 && (
          <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
            <Typography variant="h6" gutterBottom>
              Generate Personalized Meal Plan
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Получите детальный план питания на несколько дней с конкретными продуктами и количествами.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: { xs: '100%', sm: 120 } }}>
                <InputLabel>Days</InputLabel>
                <Select
                  value={mealPlanDays}
                  label="Days"
                  onChange={(e) => setMealPlanDays(e.target.value)}
                >
                  <MenuItem value={3}>3 days</MenuItem>
                  <MenuItem value={7}>7 days</MenuItem>
                  <MenuItem value={14}>14 days</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleGenerateMealPlan}
                disabled={loading}
                sx={{
                  backgroundColor: '#ff6b35',
                  '&:hover': { backgroundColor: '#e55a2b' },
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Generate Meal Plan'}
              </Button>
            </Box>

            {mealPlan && (
              <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
                {mealPlan.days ? (
                  // Multi-day plan
                  <Grid container spacing={2} sx={{ width: '100%', maxWidth: '100%', margin: 0, boxSizing: 'border-box' }}>
                    {mealPlan.days.map((day, dayIdx) => (
                      <Grid item xs={12} key={dayIdx} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <Card sx={{ mb: 2, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                          <CardContent sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
                            <Typography variant="h6" gutterBottom>
                              День {day.day_number || dayIdx + 1} {day.date && `(${day.date})`}
                            </Typography>
                            <Grid container spacing={2} sx={{ width: '100%', maxWidth: '100%', margin: 0, boxSizing: 'border-box' }}>
                              {['breakfast', 'lunch', 'dinner', 'snacks'].map((mealType) => {
                                const meal = day[mealType];
                                if (!meal || !meal.foods || meal.foods.length === 0) return null;
                                return (
                                  <Grid item xs={12} sm={6} md={3} key={mealType} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                                    <Paper sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.05)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                                      <Typography variant="subtitle1" sx={{ textTransform: 'capitalize', mb: 1, fontWeight: 'bold' }}>
                                        {mealType === 'breakfast' ? 'Завтрак' : mealType === 'lunch' ? 'Обед' : mealType === 'dinner' ? 'Ужин' : 'Перекусы'}
                                      </Typography>
                                      <List dense>
                                        {meal.foods.map((food, idx) => (
                                          <ListItem key={idx} sx={{ py: 0.5 }}>
                                            <ListItemText
                                              primary={food.name}
                                              secondary={`${food.quantity_grams || food.quantity || 0}г`}
                                            />
                                          </ListItem>
                                        ))}
                                      </List>
                                      {meal.total && (
                                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                                          {meal.total.calories || 0} ккал | Б: {meal.total.protein || 0}г | У: {meal.total.carbs || 0}г | Ж: {meal.total.fat || 0}г
                                        </Typography>
                                      )}
                                    </Paper>
                                  </Grid>
                                );
                              })}
                            </Grid>
                            {day.day_total && (
                              <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255,107,53,0.1)', borderRadius: 1, width: '100%', maxWidth: '100%', boxSizing: 'border-box', wordBreak: 'break-word' }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Итого за день:
                                </Typography>
                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                  {day.day_total.calories || 0} ккал | Белки: {day.day_total.protein || 0}г | Углеводы: {day.day_total.carbs || 0}г | Жиры: {day.day_total.fat || 0}г
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                    {mealPlan.summary && (
                      <Grid item xs={12} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <Card sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                          <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                            <Typography variant="h6" gutterBottom sx={{ wordBreak: 'break-word' }}>
                              Средние значения за период
                            </Typography>
                            <Typography sx={{ wordBreak: 'break-word' }}>
                              Калории: {mealPlan.summary.avg_daily_calories || 0} | Белки: {mealPlan.summary.avg_daily_protein || 0}г |
                              Углеводы: {mealPlan.summary.avg_daily_carbs || 0}г | Жиры: {mealPlan.summary.avg_daily_fat || 0}г
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                  </Grid>
                ) : (
                  // Single day plan (old format)
                  <Grid container spacing={2} sx={{ width: '100%', maxWidth: '100%', margin: 0, boxSizing: 'border-box' }}>
                    {['breakfast', 'lunch', 'dinner', 'snacks'].map((mealType) => {
                      const meal = mealPlan[mealType];
                      if (!meal) return null;
                      return (
                        <Grid item xs={12} md={6} key={mealType} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                          <Card sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                            <CardContent sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                              <Typography variant="h6" sx={{ textTransform: 'capitalize' }} gutterBottom>
                                {mealType}
                              </Typography>
                              {meal.foods && (
                                <List>
                                  {meal.foods.map((food, idx) => (
                                    <ListItem key={idx}>
                                      <ListItemText
                                        primary={food.name}
                                        secondary={food.quantity ? `${food.quantity}g` : ''}
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              )}
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="body2">
                                  Calories: {meal.calories || 0} | Protein: {meal.protein || 0}g | Carbs:{' '}
                                  {meal.carbs || 0}g | Fat: {meal.fat || 0}g
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                    {mealPlan.total && (
                      <Grid item xs={12}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Total Daily Nutrition
                            </Typography>
                            <Typography>
                              Calories: {mealPlan.total.calories || 0} | Protein: {mealPlan.total.protein || 0}g |
                              Carbs: {mealPlan.total.carbs || 0}g | Fat: {mealPlan.total.fat || 0}g
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Box>
            )}
          </Box>
        )}

        {tabValue === 3 && (
          <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
            <Typography variant="h6" gutterBottom sx={{ wordBreak: 'break-word' }}>
              Чат с AI-диетологом
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3, wordBreak: 'break-word' }}>
              Задайте любой вопрос о питании, получите персональные советы и рекомендации. 
              ИИ знает ваш профиль и цели, поэтому даст точные ответы.
            </Typography>

            <Paper sx={{ height: { xs: '400px', sm: '500px' }, display: 'flex', flexDirection: 'column', mb: 2, width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
              <Box sx={{ flex: 1, overflow: 'auto', p: 2, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                {chatMessages.length === 0 ? (
                  <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      Начните разговор с AI-диетологом!
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                      Примеры вопросов:
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemText primary="Какие продукты мне есть для похудения?" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Сколько белка мне нужно в день?" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Составь план питания на неделю" />
                      </ListItem>
                    </List>
                  </Box>
                ) : (
                  <Box>
                    {chatMessages.map((msg, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          mb: 2,
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: { xs: '85%', sm: '70%' },
                            p: { xs: 1.5, sm: 2 },
                            borderRadius: 2,
                            backgroundColor: msg.role === 'user' ? '#ff6b35' : 'rgba(255,255,255,0.1)',
                            color: msg.role === 'user' ? '#fff' : 'inherit',
                            wordBreak: 'break-word',
                          }}
                        >
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                    {chatLoading && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
              <Divider />
              <Box sx={{ p: 2 }}>
                <form onSubmit={handleSendMessage}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      placeholder="Задайте вопрос AI-диетологу..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={chatLoading}
                      size="small"
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={chatLoading || !chatInput.trim()}
                      sx={{
                        backgroundColor: '#ff6b35',
                        '&:hover': { backgroundColor: '#e55a2b' },
                        minWidth: 'auto',
                      }}
                    >
                      <SendIcon />
                    </Button>
                  </Box>
                </form>
              </Box>
            </Paper>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default AI;
