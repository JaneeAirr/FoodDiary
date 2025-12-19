import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  InputAdornment,
  Autocomplete,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import api, { clearCache } from '../services/api';

const Diary = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [meals, setMeals] = useState([]);
  const [foods, setFoods] = useState([]);
  
  // Get date from URL params, localStorage, or default to today
  const getInitialDate = () => {
    const urlDate = searchParams.get('date');
    if (urlDate) return urlDate;
    const storedDate = localStorage.getItem('selectedDate');
    if (storedDate) return storedDate;
    return new Date().toISOString().split('T')[0];
  };
  
  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [open, setOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [foodSearchTerm, setFoodSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState({ saved: [], usda: [], recipes: [], error: null, total_usda: 0 });
  const [searching, setSearching] = useState(false);
  const [savingUsdaFood, setSavingUsdaFood] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dailySummary, setDailySummary] = useState(null);
  const [expandedMeals, setExpandedMeals] = useState({
    uncategorized: true,
    breakfast: true,
    lunch: true,
    dinner: true,
    snack: true,
  });
  const [formData, setFormData] = useState({
    food_id: '',
    recipe_id: '',
    meal_type: 'breakfast',
    quantity: '',
    notes: '',
  });
  const [createRecipeDialogOpen, setCreateRecipeDialogOpen] = useState(false);
  const [createFoodDialogOpen, setCreateFoodDialogOpen] = useState(false);
  const [recipeForm, setRecipeForm] = useState({
    name: '',
    description: '',
    servings: 1,
    ingredients: [],
  });
  const [foodForm, setFoodForm] = useState({
    name: '',
    brand: '',
    description: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [ingredientForm, setIngredientForm] = useState({
    food_id: '',
    quantity: '',
  });

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'favorites', label: 'Favorites' },
    { value: 'common_foods', label: 'Common Foods' },
    { value: 'beverages', label: 'Beverages' },
    { value: 'supplements', label: 'Supplements' },
    { value: 'brands', label: 'Brands' },
    { value: 'restaurants', label: 'Restaurants' },
    { value: 'custom', label: 'Custom' },
    { value: 'recipes', label: 'Recipes' },
  ];

  // Sync date with URL params and localStorage on mount
  useEffect(() => {
    const urlDate = searchParams.get('date');
    if (urlDate && urlDate !== selectedDate) {
      setSelectedDate(urlDate);
      localStorage.setItem('selectedDate', urlDate);
    } else if (!urlDate) {
      // If no date in URL, use stored date or current date
      const storedDate = localStorage.getItem('selectedDate');
      if (storedDate && storedDate !== selectedDate) {
        setSelectedDate(storedDate);
        setSearchParams({ date: storedDate });
      } else if (selectedDate) {
        setSearchParams({ date: selectedDate });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Update URL and localStorage when date changes
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    setSearchParams({ date: newDate });
    localStorage.setItem('selectedDate', newDate);
  };

  useEffect(() => {
    // Parallelize all requests for faster loading
    Promise.all([
      fetchMeals(),
      fetchFoods(),
      fetchDailySummary()
    ]).catch(error => {
      console.error('Failed to fetch initial data:', error);
    });
  }, [selectedDate]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'foodSaved') {
        fetchFoods();
        window.localStorage.removeItem('foodSaved');
      } else if (e.key === 'selectedDate' && e.newValue && e.newValue !== selectedDate) {
        // Sync date from other tabs/components
        setSelectedDate(e.newValue);
        setSearchParams({ date: e.newValue });
      }
    };

    // Listen for storage events (from other tabs)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check localStorage periodically for same-tab updates
    const interval = setInterval(() => {
      if (window.localStorage.getItem('foodSaved')) {
        fetchFoods();
        window.localStorage.removeItem('foodSaved');
      }
      // Check if date changed in localStorage (from Dashboard in same tab)
      const storedDate = localStorage.getItem('selectedDate');
      if (storedDate && storedDate !== selectedDate) {
        setSelectedDate(storedDate);
        setSearchParams({ date: storedDate });
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [selectedDate, setSearchParams]);

  const fetchMeals = async () => {
    try {
      const response = await api.get(`/api/meals/?date=${selectedDate}`);
      const mealsData = response.data.results || response.data || [];
      setMeals(Array.isArray(mealsData) ? mealsData : []);
    } catch (error) {
      console.error('Failed to fetch meals:', error);
      setMeals([]);
    }
  };

  const fetchDailySummary = async () => {
    try {
      const response = await api.get(`/api/daily-summary/?date=${selectedDate}`);
      setDailySummary(response.data);
    } catch (error) {
      console.error('Failed to fetch daily summary:', error);
      setDailySummary(null);
    }
  };

  const fetchFoods = async () => {
    try {
      const response = await api.get('/api/foods/');
      const foodsData = response.data.results || response.data || [];
      setFoods(Array.isArray(foodsData) ? foodsData : []);
    } catch (error) {
      console.error('Failed to fetch foods:', error);
    }
  };

  const searchFoods = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults({ saved: [], usda: [], recipes: [], error: null });
      return;
    }

    setSearching(true);
    try {
      const response = await api.get('/api/foods/search/', {
        params: {
          query: query,
          limit: 30,
          include_usda_api: false,
          category: selectedCategory,
        },
      });
      
      setSearchResults({
        saved: response.data.saved_foods || [],
        usda: response.data.usda_foods || [],
        recipes: response.data.recipes || [],
        error: response.data.usda_error || null,
        total_usda: response.data.total_usda || 0,
      });
    } catch (error) {
      console.error('Failed to search foods:', error);
      setSearchResults({ 
        saved: [], 
        usda: [], 
        recipes: [],
        error: error.response?.data?.error || 'Ошибка поиска',
      });
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (formData.food_id && foodSearchTerm.length < 2) {
      return;
    }
    
    const timeoutId = setTimeout(() => {
      if (foodSearchTerm && foodSearchTerm.length >= 2) {
        searchFoods(foodSearchTerm);
      } else if (!formData.food_id && !formData.recipe_id) {
        setSearchResults({ saved: [], usda: [], recipes: [], error: null, total_usda: 0 });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [foodSearchTerm, formData.food_id, formData.recipe_id, selectedCategory]);

  const saveAndSelectUsdaFood = async (usdaFood) => {
    if (!usdaFood.fdc_id) {
      alert('Ошибка: отсутствует ID продукта');
      return;
    }

    setSavingUsdaFood(usdaFood.fdc_id);
    try {
      const response = await api.post('/api/usda/save/', {
        fdc_id: usdaFood.fdc_id,
      });

      if (response.data && response.data.food) {
        const savedFood = response.data.food;
        setFoods(prev => [savedFood, ...prev]);
        setFormData({ ...formData, food_id: savedFood.id, recipe_id: '' });
        setSearchResults(prev => ({
          ...prev,
          saved: [savedFood, ...prev.saved],
        }));
        setSavingUsdaFood(null);
        fetchFoods();
      }
    } catch (error) {
      console.error('Failed to save USDA food:', error);
      if (error.response?.status === 200 && error.response?.data?.food) {
        const savedFood = error.response.data.food;
        setFormData({ ...formData, food_id: savedFood.id, recipe_id: '' });
        setSavingUsdaFood(null);
        fetchFoods();
      } else {
        const errorMsg = error.response?.data?.error || error.message || 'Неизвестная ошибка';
        alert(`Ошибка сохранения продукта: ${errorMsg}`);
      }
      setSavingUsdaFood(null);
    }
  };

  const handleAddIngredient = () => {
    if (!ingredientForm.food_id || !ingredientForm.quantity) {
      return;
    }
    const food = foods.find(f => f.id === parseInt(ingredientForm.food_id));
    if (!food) return;
    setRecipeForm({
      ...recipeForm,
      ingredients: [
        ...recipeForm.ingredients,
        {
          food_id: parseInt(ingredientForm.food_id),
          food: food,
          quantity: parseFloat(ingredientForm.quantity),
        },
      ],
    });
    setIngredientForm({ food_id: '', quantity: '' });
  };

  const handleRemoveIngredient = (index) => {
    setRecipeForm({
      ...recipeForm,
      ingredients: recipeForm.ingredients.filter((_, i) => i !== index),
    });
  };

  const handleSaveRecipe = async () => {
    if (!recipeForm.name || recipeForm.ingredients.length === 0) {
      alert('Заполните название и добавьте хотя бы один ингредиент');
      return;
    }

    try {
      const recipeData = {
        name: recipeForm.name,
        description: recipeForm.description,
        servings: parseFloat(recipeForm.servings),
        ingredients: recipeForm.ingredients.map(ing => ({
          food_id: ing.food_id || ing.food?.id,
          quantity: parseFloat(ing.quantity),
        })),
      };
      const response = await api.post('/api/recipes/', recipeData);
      const newRecipe = response.data;
      
      // Select the newly created recipe
      setFormData({ ...formData, recipe_id: newRecipe.id, food_id: '' });
      setCreateRecipeDialogOpen(false);
      setRecipeForm({ name: '', description: '', servings: 1, ingredients: [] });
      setIngredientForm({ food_id: '', quantity: '' });
      
      // Refresh search to show new recipe
      if (foodSearchTerm.length >= 2) {
        searchFoods(foodSearchTerm);
      }
    } catch (error) {
      console.error('Failed to save recipe:', error);
      alert('Ошибка сохранения рецепта: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSaveFood = async () => {
    if (!foodForm.name || foodForm.calories === 0) {
      alert('Заполните название и калории');
      return;
    }

    try {
      const foodData = {
        name: foodForm.name,
        brand: foodForm.brand,
        description: foodForm.description,
        calories: parseFloat(foodForm.calories),
        protein: parseFloat(foodForm.protein || 0),
        carbs: parseFloat(foodForm.carbs || 0),
        fat: parseFloat(foodForm.fat || 0),
        data_source: 'manual',
      };
      const response = await api.post('/api/foods/', foodData);
      const newFood = response.data;
      
      // Select the newly created food
      setFormData({ ...formData, food_id: newFood.id, recipe_id: '' });
      setCreateFoodDialogOpen(false);
      setFoodForm({ name: '', brand: '', description: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
      
      // Refresh foods list
      fetchFoods();
      
      // Refresh search to show new food
      if (foodSearchTerm.length >= 2) {
        searchFoods(foodSearchTerm);
      }
    } catch (error) {
      console.error('Failed to save food:', error);
      alert('Ошибка сохранения продукта: ' + (error.response?.data?.error || error.message));
    }
  };

  const allFoods = useMemo(() => {
    const saved = searchResults.saved.map(f => ({ ...f, is_saved: true, type: 'food' }));
    const usda = searchResults.usda.map(f => ({ 
      ...f, 
      is_usda: true, 
      is_saved: f.is_saved !== false,
      type: 'food'
    }));
    const recipes = searchResults.recipes.map(r => ({ ...r, is_recipe: true, type: 'recipe' }));
    const combined = [...saved, ...usda, ...recipes];
    
    if (formData.food_id) {
      const selectedFood = foods.find(f => f.id === formData.food_id);
      if (selectedFood && !combined.find(f => f.id === selectedFood.id)) {
        const foodData = {
          ...selectedFood,
          is_saved: true,
          is_usda: selectedFood.data_source === 'usda',
          type: 'food'
        };
        combined.unshift(foodData);
      }
    }
    
    return combined;
  }, [searchResults.saved, searchResults.usda, searchResults.recipes, formData.food_id, foods]);

  const handleOpen = (meal = null) => {
    if (meal) {
      setEditingMeal(meal);
      if (meal.recipe) {
        setFormData({
          food_id: '',
          recipe_id: meal.recipe.id,
          meal_type: meal.meal_type,
          quantity: meal.quantity,
          notes: meal.notes || '',
        });
        setFoodSearchTerm(meal.recipe.name || '');
        setSearchResults({
          saved: [],
          usda: [],
          recipes: [meal.recipe],
          error: null,
          total_usda: 0,
        });
      } else {
        setFormData({
          food_id: meal.food?.id || '',
          recipe_id: '',
          meal_type: meal.meal_type,
          quantity: meal.quantity,
          notes: meal.notes || '',
        });
        setFoodSearchTerm(meal.food?.name || '');
        setSearchResults({
          saved: meal.food && meal.food.data_source !== 'usda' ? [meal.food] : [],
          usda: meal.food && meal.food.data_source === 'usda' ? [meal.food] : [],
          recipes: [],
          error: null,
          total_usda: 0,
        });
      }
    } else {
      setEditingMeal(null);
      setFormData({
        food_id: '',
        recipe_id: '',
        meal_type: 'breakfast',
        quantity: '',
        notes: '',
      });
      setFoodSearchTerm('');
      setSearchResults({ saved: [], usda: [], recipes: [], error: null, total_usda: 0 });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingMeal(null);
    setFoodSearchTerm('');
    setSearchResults({ saved: [], usda: [], recipes: [] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        date: selectedDate,
        quantity: parseFloat(formData.quantity),
      };
      
      if (editingMeal) {
        await api.put(`/api/meals/${editingMeal.id}/`, data);
      } else {
        await api.post('/api/meals/', data);
      }
      
      // Clear cache and refresh data
      clearCache();
      await Promise.all([fetchMeals(), fetchDailySummary()]);
      
      // Notify Dashboard to refresh
      window.dispatchEvent(new CustomEvent('diaryUpdated'));
      
      handleClose();
    } catch (error) {
      console.error('Failed to save meal:', error);
      alert('Failed to save meal: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this meal?')) {
      try {
        await api.delete(`/api/meals/${id}/`);
        
        // Clear cache and refresh data
        clearCache();
        await Promise.all([fetchMeals(), fetchDailySummary()]);
        
        // Notify Dashboard to refresh
        window.dispatchEvent(new CustomEvent('diaryUpdated'));
      } catch (error) {
        console.error('Failed to delete meal:', error);
      }
    }
  };

  const toggleMealExpanded = (mealType) => {
    setExpandedMeals(prev => ({
      ...prev,
      [mealType]: !prev[mealType],
    }));
  };

  const mealsArray = Array.isArray(meals) ? meals : [];
  const mealsByType = {
    uncategorized: mealsArray.filter(m => !m.meal_type || m.meal_type === ''),
    breakfast: mealsArray.filter(m => m.meal_type === 'breakfast'),
    lunch: mealsArray.filter(m => m.meal_type === 'lunch'),
    dinner: mealsArray.filter(m => m.meal_type === 'dinner'),
    snack: mealsArray.filter(m => m.meal_type === 'snack'),
  };

  const totals = dailySummary?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const goals = dailySummary?.goals || { daily_calories: 2133, daily_protein: 52, daily_carbs: 240, daily_fat: 65 };
  
  const caloriesPercent = goals.daily_calories > 0 ? (totals.calories / goals.daily_calories) * 100 : 0;
  const proteinPercent = goals.daily_protein > 0 ? (totals.protein / goals.daily_protein) * 100 : 0;
  const carbsPercent = goals.daily_carbs > 0 ? (totals.carbs / goals.daily_carbs) * 100 : 0;
  const fatPercent = goals.daily_fat > 0 ? (totals.fat / goals.daily_fat) * 100 : 0;

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4, width: '100%', maxWidth: '100%', mx: 'auto', px: { xs: 1, sm: 2 } }}>
      {/* Date Selector */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Food Diary
        </Typography>
        <TextField
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ ml: 'auto' }}
        />
      </Box>
      <Grid container spacing={2}>
        {/* Left Panel - Activity Log */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Activity Log
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {['uncategorized', 'breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => {
              const mealTypeLabel = {
                uncategorized: 'Uncategorized',
                breakfast: 'Breakfast',
                lunch: 'Lunch',
                dinner: 'Dinner',
                snack: 'Snacks',
              }[mealType];
              
              const mealList = mealsByType[mealType] || [];
              
              return (
                <Box key={mealType} sx={{ mb: 1 }}>
                  <Box
                    onClick={() => toggleMealExpanded(mealType)}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      py: 0.5,
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                      borderRadius: 1,
                      px: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {mealTypeLabel}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {mealList.length > 0 && (
                        <Chip label={mealList.length} size="small" sx={{ height: 20 }} />
                      )}
                      {expandedMeals[mealType] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </Box>
                  </Box>
                  <Collapse in={expandedMeals[mealType]}>
                    <List dense>
                      {mealList.length > 0 ? (
                        mealList.map((meal) => (
                          <ListItem key={meal.id} sx={{ px: 1, py: 0.5 }}>
                            <ListItemText
                              primary={meal.name || meal.food?.name || meal.recipe?.name || 'Unknown'}
                              secondary={`${meal.quantity || 0}${meal.recipe ? ' порций' : 'g'} • ${meal.total_calories?.toFixed(0) || 0} cal`}
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                            <ListItemSecondaryAction>
                              <IconButton size="small" onClick={() => handleOpen(meal)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDelete(meal.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))
                      ) : (
                        <ListItem>
                          <ListItemText
                            primary="No items"
                            primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Collapse>
                </Box>
              );
            })}
          </Paper>
          
          {/* Add Food Widget */}
          <Paper sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpen()}
              sx={{
                backgroundColor: '#4CAF50',
                '&:hover': { backgroundColor: '#45a049' },
              }}
            >
              Add Food
            </Button>
          </Paper>
        </Grid>

        {/* Center Panel - Energy Summary & Targets */}
        <Grid item xs={12} md={9}>
          <Grid container spacing={2}>
            {/* Energy Summary */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Energy Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#666' }}>
                        {totals.calories.toFixed(0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Consumed
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#9C27B0' }}>
                        {goals.daily_calories.toFixed(0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Expenditure
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#999' }}>
                        {Math.max(0, goals.daily_calories - totals.calories).toFixed(0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Remaining
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Targets */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Targets
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">Energy</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {totals.calories.toFixed(1)} / {goals.daily_calories.toFixed(0)} kcal ({caloriesPercent.toFixed(0)}%)
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min(100, caloriesPercent)} sx={{ height: 8, borderRadius: 1 }} />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">Protein</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {totals.protein.toFixed(1)} / {goals.daily_protein.toFixed(1)} g ({proteinPercent.toFixed(0)}%)
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min(100, proteinPercent)} sx={{ height: 8, borderRadius: 1, backgroundColor: '#e0e0e0', '& .MuiLinearProgress-bar': { backgroundColor: '#4CAF50' } }} />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">Net Carbs</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {totals.carbs.toFixed(1)} / {goals.daily_carbs.toFixed(1)} g ({carbsPercent.toFixed(0)}%)
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min(100, carbsPercent)} sx={{ height: 8, borderRadius: 1, backgroundColor: '#e0e0e0', '& .MuiLinearProgress-bar': { backgroundColor: '#9C27B0' } }} />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">Fat</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {totals.fat.toFixed(1)} / {goals.daily_fat.toFixed(1)} g ({fatPercent.toFixed(0)}%)
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min(100, fatPercent)} sx={{ height: 8, borderRadius: 1, backgroundColor: '#e0e0e0', '& .MuiLinearProgress-bar': { backgroundColor: '#FFC107' } }} />
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Grid>

      </Grid>

      {/* Food Selection Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Add Food to Diary</Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Search Bar */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search all foods & recipes..."
              value={foodSearchTerm}
              onChange={(e) => setFoodSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small">
                      <FilterListIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Category Tabs */}
          <Tabs
            value={selectedCategory}
            onChange={(e, newValue) => setSelectedCategory(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            {categories.map((cat) => (
              <Tab key={cat.value} label={cat.label} value={cat.value} />
            ))}
          </Tabs>

          {/* Search Results */}
          {searching && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          )}
          
          {!searching && foodSearchTerm.length >= 2 && (
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {allFoods.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    No results found
                  </Typography>
                  {selectedCategory === 'recipes' && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Рецепт не найден. Создайте новый рецепт на странице "База продуктов".
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          handleClose();
                          window.location.href = '/foods?tab=recipes&create=true';
                        }}
                        sx={{ mt: 1 }}
                      >
                        Создать новый рецепт
                      </Button>
                    </Box>
                  )}
                </Box>
              ) : (
                <List>
                  {allFoods.map((item) => (
                    <ListItem
                      key={item.id || item.fdc_id}
                      button
                      onClick={() => {
                        if (item.type === 'recipe') {
                          setFormData({ ...formData, recipe_id: item.id, food_id: '' });
                        } else {
                          if (!item.is_saved && item.is_usda && item.fdc_id) {
                            saveAndSelectUsdaFood(item);
                          } else {
                            setFormData({ ...formData, food_id: item.id, recipe_id: '' });
                          }
                        }
                      }}
                      selected={formData.food_id === item.id || formData.recipe_id === item.id}
                    >
                      <ListItemText
                        primary={item.name}
                        secondary={
                          item.type === 'recipe'
                            ? `Recipe • ${item.calories_per_serving?.toFixed(0) || 0} cal/serving`
                            : `${item.brand || ''} • ${item.calories?.toFixed(0) || 0} cal/100g`
                        }
                      />
                      {item.is_recipe && (
                        <Chip label="Recipe" size="small" sx={{ ml: 1 }} />
                      )}
                      {item.is_usda && (
                        <Chip label="USDA" size="small" color="success" sx={{ ml: 1 }} />
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}

          {foodSearchTerm.length < 2 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              Enter at least 2 characters to search
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Meal Form */}
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
          <Button onClick={handleSubmit} variant="contained" disabled={(!formData.food_id && !formData.recipe_id) || !formData.quantity}>
            {editingMeal ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Recipe Dialog */}
      <Dialog open={createRecipeDialogOpen} onClose={() => setCreateRecipeDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Создать рецепт</Typography>
            <IconButton onClick={() => setCreateRecipeDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название рецепта"
            value={recipeForm.name}
            onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Описание (необязательно)"
            value={recipeForm.description}
            onChange={(e) => setRecipeForm({ ...recipeForm, description: e.target.value })}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Количество порций"
            type="number"
            value={recipeForm.servings}
            onChange={(e) => setRecipeForm({ ...recipeForm, servings: e.target.value })}
            margin="normal"
            required
            inputProps={{ min: 0.1, step: 0.1 }}
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" sx={{ mb: 2 }}>
            Ингредиенты
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Продукт</InputLabel>
              <Select
                value={ingredientForm.food_id}
                onChange={(e) => setIngredientForm({ ...ingredientForm, food_id: e.target.value })}
                label="Продукт"
              >
                {foods.map((food) => (
                  <MenuItem key={food.id} value={food.id}>
                    {food.name} ({food.calories?.toFixed(0) || 0} cal/100g)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Количество (г)"
              type="number"
              value={ingredientForm.quantity}
              onChange={(e) => setIngredientForm({ ...ingredientForm, quantity: e.target.value })}
              inputProps={{ min: 0.1, step: 0.1 }}
              sx={{ width: 150 }}
            />
            <Button variant="contained" onClick={handleAddIngredient} startIcon={<AddIcon />}>
              Добавить
            </Button>
          </Box>

          <List>
            {recipeForm.ingredients.map((ing, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={ing.food?.name || 'Unknown'}
                  secondary={`${ing.quantity}g`}
                />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => handleRemoveIngredient(index)} size="small">
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRecipeDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSaveRecipe} variant="contained" disabled={!recipeForm.name || recipeForm.ingredients.length === 0}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Food Dialog */}
      <Dialog open={createFoodDialogOpen} onClose={() => setCreateFoodDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Создать продукт</Typography>
            <IconButton onClick={() => setCreateFoodDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название продукта"
            value={foodForm.name}
            onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Бренд (необязательно)"
            value={foodForm.brand}
            onChange={(e) => setFoodForm({ ...foodForm, brand: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Описание (необязательно)"
            value={foodForm.description}
            onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
            margin="normal"
            multiline
            rows={2}
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Калории (на 100г)"
                type="number"
                value={foodForm.calories}
                onChange={(e) => setFoodForm({ ...foodForm, calories: e.target.value })}
                margin="normal"
                required
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Белки (г на 100г)"
                type="number"
                value={foodForm.protein}
                onChange={(e) => setFoodForm({ ...foodForm, protein: e.target.value })}
                margin="normal"
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Углеводы (г на 100г)"
                type="number"
                value={foodForm.carbs}
                onChange={(e) => setFoodForm({ ...foodForm, carbs: e.target.value })}
                margin="normal"
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Жиры (г на 100г)"
                type="number"
                value={foodForm.fat}
                onChange={(e) => setFoodForm({ ...foodForm, fat: e.target.value })}
                margin="normal"
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFoodDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSaveFood} variant="contained" disabled={!foodForm.name || foodForm.calories === 0}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Diary;
