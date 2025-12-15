import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Box,
  Grid,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import api from '../services/api';

const Diary = () => {
  const [meals, setMeals] = useState([]);
  const [foods, setFoods] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [open, setOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [formData, setFormData] = useState({
    food_id: '',
    meal_type: 'breakfast',
    quantity: '',
    notes: '',
  });

  useEffect(() => {
    fetchMeals();
    fetchFoods();
  }, [selectedDate]);

  const fetchMeals = async () => {
    try {
      console.log('Fetching meals for date:', selectedDate);
      const response = await api.get(`/api/meals/?date=${selectedDate}`);
      console.log('Meals API response:', response.data);
      // Handle paginated response or direct array
      const mealsData = response.data.results || response.data || [];
      console.log('Processed meals data:', mealsData);
      console.log('Meals count:', Array.isArray(mealsData) ? mealsData.length : 0);
      setMeals(Array.isArray(mealsData) ? mealsData : []);
    } catch (error) {
      console.error('Failed to fetch meals:', error);
      console.error('Error details:', error.response?.data);
      setMeals([]); // Set empty array on error
    }
  };

  const fetchFoods = async () => {
    try {
      const response = await api.get('/api/foods/');
      setFoods(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch foods:', error);
    }
  };

  const handleOpen = (meal = null) => {
    if (meal) {
      setEditingMeal(meal);
      setFormData({
        food_id: meal.food.id,
        meal_type: meal.meal_type,
        quantity: meal.quantity,
        notes: meal.notes || '',
      });
    } else {
      setEditingMeal(null);
      setFormData({
        food_id: '',
        meal_type: 'breakfast',
        quantity: '',
        notes: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingMeal(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        date: selectedDate,
        quantity: parseFloat(formData.quantity),
      };
      
      console.log('Saving meal with data:', data);
      console.log('Selected date:', selectedDate);
      
      if (editingMeal) {
        await api.put(`/api/meals/${editingMeal.id}/`, data);
      } else {
        const response = await api.post('/api/meals/', data);
        console.log('Meal created:', response.data);
      }
      fetchMeals();
      handleClose();
    } catch (error) {
      console.error('Failed to save meal:', error);
      console.error('Error details:', error.response?.data);
      alert('Failed to save meal: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this meal?')) {
      try {
        await api.delete(`/api/meals/${id}/`);
        fetchMeals();
      } catch (error) {
        console.error('Failed to delete meal:', error);
      }
    }
  };

  // Ensure meals is always an array before filtering
  const mealsArray = Array.isArray(meals) ? meals : [];
  const mealsByType = {
    breakfast: mealsArray.filter(m => m.meal_type === 'breakfast'),
    lunch: mealsArray.filter(m => m.meal_type === 'lunch'),
    dinner: mealsArray.filter(m => m.meal_type === 'dinner'),
    snack: mealsArray.filter(m => m.meal_type === 'snack'),
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, width: '100%', maxWidth: '100%', mx: 'auto', overflow: 'hidden', px: { xs: 1, sm: 2 }, boxSizing: 'border-box' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2.125rem' } }}>
          Food Diary
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '8px', fontSize: '16px', marginRight: '16px' }}
          />
          <Button variant="contained" onClick={() => handleOpen()}>
            Add Meal
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {['breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => (
          <Grid item xs={12} md={6} key={mealType}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
                {mealType}
              </Typography>
              {mealsByType[mealType].length > 0 ? (
                mealsByType[mealType].map((meal) => (
                  <Card key={meal.id} sx={{ mb: 1 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="subtitle1">{meal.food.name}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {meal.quantity}g | {meal.total_calories.toFixed(0)} cal
                          </Typography>
                        </Box>
                        <Box>
                          <IconButton size="small" onClick={() => handleOpen(meal)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(meal.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Typography color="textSecondary">No meals</Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingMeal ? 'Edit Meal' : 'Add Meal'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              select
              fullWidth
              label="Food"
              value={formData.food_id}
              onChange={(e) => setFormData({ ...formData, food_id: e.target.value })}
              margin="normal"
              required
            >
              {foods.map((food) => (
                <MenuItem key={food.id} value={food.id}>
                  {food.name} ({food.calories} cal/100g)
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Meal Type"
              value={formData.meal_type}
              onChange={(e) => setFormData({ ...formData, meal_type: e.target.value })}
              margin="normal"
              required
            >
              <MenuItem value="breakfast">Breakfast</MenuItem>
              <MenuItem value="lunch">Lunch</MenuItem>
              <MenuItem value="dinner">Dinner</MenuItem>
              <MenuItem value="snack">Snack</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Quantity (grams)"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              margin="normal"
              required
              inputProps={{ min: 0.1, step: 0.1 }}
            />
            <TextField
              fullWidth
              label="Notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingMeal ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default Diary;

