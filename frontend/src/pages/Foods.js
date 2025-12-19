import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Box,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import api from '../services/api';

const Foods = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'recipes' ? 2 : 0;
  const [tabValue, setTabValue] = useState(initialTab);
  const [foods, setFoods] = useState([]);
  const [usdaFoods, setUsdaFoods] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [usdaSearchTerm, setUsdaSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [usdaLoading, setUsdaLoading] = useState(false);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [savingFoodId, setSavingFoodId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [recipeForm, setRecipeForm] = useState({
    name: '',
    description: '',
    servings: 1,
    ingredients: [],
  });
  const [ingredientForm, setIngredientForm] = useState({
    food_id: '',
    quantity: '',
  });
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState('');
  const [ingredientSearchResults, setIngredientSearchResults] = useState({ saved: [], usda: [], recipes: [] });
  const [ingredientSearching, setIngredientSearching] = useState(false);
  const [selectedIngredientFood, setSelectedIngredientFood] = useState(null);
  const [savingIngredientFoodId, setSavingIngredientFoodId] = useState(null);
  const [importUrlDialogOpen, setImportUrlDialogOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (tabValue === 0) {
      fetchFoods();
    } else if (tabValue === 2) {
      fetchRecipes();
    }
  }, [searchTerm, tabValue]);

  // Open recipe dialog if coming from diary page
  useEffect(() => {
    if (tabValue === 2 && searchParams.get('create') === 'true') {
      handleOpenRecipeDialog();
      setSearchParams({ tab: 'recipes' }); // Remove 'create' param
    }
  }, [tabValue]);

  const fetchFoods = async () => {
    setLoading(true);
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const response = await api.get('/api/foods/', { params });
      setFoods(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch foods:', error);
      showSnackbar('Ошибка загрузки продуктов', 'error');
    } finally {
      setLoading(false);
    }
  };

  const searchUsdaFoods = async () => {
    if (!usdaSearchTerm.trim()) {
      showSnackbar('Введите название продукта для поиска', 'warning');
      return;
    }

    setUsdaLoading(true);
    try {
      // Use unified search which searches local database
      const response = await api.get('/api/foods/search/', {
        params: {
          query: usdaSearchTerm,
          limit: 50,
          include_usda_api: false, // Use local database only
        },
      });
      
      // Combine saved and USDA foods from local DB
      const allUsdaFoods = [
        ...(response.data.usda_foods || []),
        ...(response.data.saved_foods || []).filter(f => f.data_source === 'usda' || f.usda_fdc_id),
      ];
      
      // Debug: log first food to check data structure
      if (allUsdaFoods.length > 0) {
        console.log('Sample USDA food data:', allUsdaFoods[0]);
      }
      
      setUsdaFoods(allUsdaFoods);
      if (allUsdaFoods.length === 0) {
        showSnackbar('Продукты не найдены в локальной базе данных. Импортируйте базу USDA для поиска.', 'info');
      } else {
        showSnackbar(`Найдено продуктов: ${allUsdaFoods.length}`, 'success');
      }
    } catch (error) {
      console.error('Failed to search foods:', error);
      showSnackbar('Ошибка поиска в базе данных', 'error');
      setUsdaFoods([]);
    } finally {
      setUsdaLoading(false);
    }
  };

  const saveUsdaFood = async (food) => {
    // If food is already in local DB (is_saved = true), no need to save
    if (food.is_saved || food.saved) {
      showSnackbar('Продукт уже в базе данных', 'info');
      return;
    }

    if (!food.fdc_id) {
      showSnackbar('Ошибка: отсутствует ID продукта', 'error');
      return;
    }

    setSavingFoodId(food.fdc_id);
    try {
      const response = await api.post('/api/usda/save/', {
        fdc_id: food.fdc_id,
      });
      
      if (response.data.food) {
        showSnackbar('Продукт успешно сохранен! Теперь он доступен в дневнике.', 'success');
        // Refresh saved foods list
        if (tabValue === 0) {
          fetchFoods();
        }
        // Mark as saved in USDA results
        setUsdaFoods(prevFoods =>
          prevFoods.map(f =>
            f.fdc_id === food.fdc_id ? { ...f, saved: true, is_saved: true, savedFoodId: response.data.food.id } : f
          )
        );
        // Notify Diary page to refresh foods list
        window.localStorage.setItem('foodSaved', 'true');
      }
    } catch (error) {
      console.error('Failed to save USDA food:', error);
      if (error.response?.status === 200 && error.response?.data?.food) {
        // Food already exists
        showSnackbar('Продукт уже сохранен в базе', 'info');
        setUsdaFoods(prevFoods =>
          prevFoods.map(f =>
            f.fdc_id === food.fdc_id ? { ...f, saved: true, is_saved: true, savedFoodId: error.response.data.food.id } : f
          )
        );
      } else {
        showSnackbar('Ошибка сохранения продукта', 'error');
      }
    } finally {
      setSavingFoodId(null);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const fetchRecipes = async () => {
    setRecipesLoading(true);
    try {
      const response = await api.get('/api/recipes/');
      setRecipes(response.data.results || response.data || []);
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      showSnackbar('Ошибка загрузки рецептов', 'error');
    } finally {
      setRecipesLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 0) {
      fetchFoods();
      setSearchParams({});
    } else if (newValue === 2) {
      fetchRecipes();
      setSearchParams({ tab: 'recipes' });
      // Ensure foods are loaded for recipe creation
      if (foods.length === 0) {
        fetchFoods();
      }
    }
  };

  const handleOpenRecipeDialog = (recipe = null) => {
    if (recipe) {
      setEditingRecipe(recipe);
      setRecipeForm({
        name: recipe.name,
        description: recipe.description || '',
        servings: recipe.servings || 1,
        ingredients: recipe.ingredients || [],
      });
    } else {
      setEditingRecipe(null);
      setRecipeForm({
        name: '',
        description: '',
        servings: 1,
        ingredients: [],
      });
    }
    setIngredientForm({ food_id: '', quantity: '' });
    setIngredientSearchTerm('');
    setIngredientSearchResults({ saved: [], usda: [], recipes: [] });
    setSelectedIngredientFood(null);
    setRecipeDialogOpen(true);
  };

  const handleCloseRecipeDialog = () => {
    setRecipeDialogOpen(false);
    setEditingRecipe(null);
    setRecipeForm({ name: '', description: '', servings: 1, ingredients: [] });
    setIngredientForm({ food_id: '', quantity: '' });
    setIngredientSearchTerm('');
    setIngredientSearchResults({ saved: [], usda: [], recipes: [] });
    setSelectedIngredientFood(null);
  };

  const searchIngredientFoods = async (query) => {
    if (!query || query.length < 2) {
      setIngredientSearchResults({ saved: [], usda: [], recipes: [] });
      return;
    }

    setIngredientSearching(true);
    try {
      const response = await api.get('/api/foods/search/', {
        params: {
          query: query,
          limit: 50,
          include_usda_api: false,
        },
      });
      
      setIngredientSearchResults({
        saved: response.data.saved_foods || [],
        usda: response.data.usda_foods || [],
        recipes: response.data.recipes || [],
      });
    } catch (error) {
      console.error('Failed to search foods:', error);
      setIngredientSearchResults({ saved: [], usda: [], recipes: [] });
    } finally {
      setIngredientSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (ingredientSearchTerm && ingredientSearchTerm.length >= 2) {
        searchIngredientFoods(ingredientSearchTerm);
      } else {
        setIngredientSearchResults({ saved: [], usda: [], recipes: [] });
        setSelectedIngredientFood(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [ingredientSearchTerm]);

  const saveAndSelectIngredientFood = async (usdaFood) => {
    if (!usdaFood.fdc_id) {
      showSnackbar('Ошибка: отсутствует ID продукта', 'error');
      return;
    }

    setSavingIngredientFoodId(usdaFood.fdc_id);
    try {
      const response = await api.post('/api/usda/save/', {
        fdc_id: usdaFood.fdc_id,
      });

      if (response.data && response.data.food) {
        const savedFood = response.data.food;
        setSelectedIngredientFood(savedFood);
        setIngredientForm({ ...ingredientForm, food_id: savedFood.id });
        setIngredientSearchTerm(savedFood.name);
        setSavingIngredientFoodId(null);
        showSnackbar('Продукт сохранен', 'success');
      }
    } catch (error) {
      console.error('Failed to save USDA food:', error);
      if (error.response?.status === 200 && error.response?.data?.food) {
        const savedFood = error.response.data.food;
        setSelectedIngredientFood(savedFood);
        setIngredientForm({ ...ingredientForm, food_id: savedFood.id });
        setIngredientSearchTerm(savedFood.name);
        setSavingIngredientFoodId(null);
      } else {
        const errorMsg = error.response?.data?.error || error.message || 'Неизвестная ошибка';
        showSnackbar(`Ошибка сохранения продукта: ${errorMsg}`, 'error');
      }
      setSavingIngredientFoodId(null);
    }
  };

  const handleSelectIngredientFood = (food) => {
    // If food has an id, it's already saved (either from saved_foods or already saved USDA)
    if (food.id) {
      setSelectedIngredientFood(food);
      setIngredientForm({ ...ingredientForm, food_id: food.id });
      setIngredientSearchTerm(food.name);
    } else if (food.is_usda && food.fdc_id && !food.is_saved) {
      // USDA food not yet saved - save it first
      saveAndSelectIngredientFood(food);
    } else {
      // Fallback - should not happen
      setSelectedIngredientFood(food);
      setIngredientForm({ ...ingredientForm, food_id: food.id || food.fdc_id });
      setIngredientSearchTerm(food.name);
    }
  };

  const handleAddIngredient = () => {
    if (!ingredientForm.food_id || !ingredientForm.quantity) {
      showSnackbar('Заполните все поля ингредиента', 'warning');
      return;
    }
    
    const food = selectedIngredientFood || foods.find(f => f.id === parseInt(ingredientForm.food_id));
    if (!food) {
      showSnackbar('Продукт не найден', 'error');
      return;
    }
    
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
    setIngredientSearchTerm('');
    setSelectedIngredientFood(null);
    setIngredientSearchResults({ saved: [], usda: [], recipes: [] });
  };

  const handleRemoveIngredient = (index) => {
    setRecipeForm({
      ...recipeForm,
      ingredients: recipeForm.ingredients.filter((_, i) => i !== index),
    });
  };

  const handleSaveRecipe = async () => {
    if (!recipeForm.name || recipeForm.ingredients.length === 0) {
      showSnackbar('Заполните название и добавьте хотя бы один ингредиент', 'warning');
      return;
    }

    try {
      const recipeData = {
        name: recipeForm.name,
        description: recipeForm.description,
        servings: parseFloat(recipeForm.servings),
      };

      let recipe;
      if (editingRecipe) {
        // Update recipe with ingredients
        const recipeDataWithIngredients = {
          ...recipeData,
          ingredients: recipeForm.ingredients.map(ing => ({
            food_id: ing.food_id || ing.food?.id,
            quantity: parseFloat(ing.quantity),
          })),
        };
        const response = await api.put(`/api/recipes/${editingRecipe.id}/`, recipeDataWithIngredients);
        recipe = response.data;
      } else {
        // Create recipe with ingredients
        const recipeDataWithIngredients = {
          ...recipeData,
          ingredients: recipeForm.ingredients.map(ing => ({
            food_id: ing.food_id || ing.food?.id,
            quantity: parseFloat(ing.quantity),
          })),
        };
        const response = await api.post('/api/recipes/', recipeDataWithIngredients);
        recipe = response.data;
      }

      showSnackbar(editingRecipe ? 'Рецепт обновлен' : 'Рецепт создан', 'success');
      fetchRecipes();
      handleCloseRecipeDialog();
    } catch (error) {
      console.error('Failed to save recipe:', error);
      showSnackbar('Ошибка сохранения рецепта', 'error');
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (!window.confirm('Удалить этот рецепт?')) return;
    try {
      await api.delete(`/api/recipes/${recipeId}/`);
      showSnackbar('Рецепт удален', 'success');
      fetchRecipes();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      showSnackbar('Ошибка удаления рецепта', 'error');
    }
  };

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      showSnackbar('Введите URL', 'warning');
      return;
    }

    setImporting(true);
    try {
      const response = await api.post('/api/foods/import-url/', {
        url: importUrl.trim(),
      });
      
      if (response.data.food) {
        showSnackbar('Продукт успешно импортирован!', 'success');
        setImportUrl('');
        setImportUrlDialogOpen(false);
        fetchFoods();
        window.localStorage.setItem('foodSaved', 'true');
      }
    } catch (error) {
      console.error('Failed to import food:', error);
      showSnackbar(error.response?.data?.error || 'Ошибка импорта продукта', 'error');
    } finally {
      setImporting(false);
    }
  };

  const FoodCard = ({ food, isUsda = false }) => {
    // Extract nutritional values - handle both direct properties and nested structures
    // Also handle string to number conversion
    const parseNumber = (value) => {
      if (value === null || value === undefined) return 0;
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(num) ? 0 : num;
    };
    
    const calories = parseNumber(food.calories || food.nutrition?.calories);
    const protein = parseNumber(food.protein || food.nutrition?.protein);
    const carbs = parseNumber(food.carbs || food.nutrition?.carbs);
    const fat = parseNumber(food.fat || food.nutrition?.fat);
    const fiber = parseNumber(food.fiber || food.nutrition?.fiber);
    
    // Get preparation state from description
    const getPreparationState = () => {
      if (!food.description) return '';
      const desc = food.description.toLowerCase();
      if (desc.includes('raw')) return 'raw';
      if (desc.includes('cooked') || desc.includes('braised') || desc.includes('roasted') || desc.includes('grilled')) return 'cooked';
      if (desc.includes('fried')) return 'fried';
      return '';
    };
    
    const prepState = getPreparationState();
    const displayName = food.name || 'Unknown';
    const displayDescription = food.description && food.description !== food.name ? food.description : '';
    
    return (
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 3,
            borderColor: 'primary.main',
          },
        }}
      >
        <CardContent sx={{ flexGrow: 1, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.1rem' }}>
                {displayName}
              </Typography>
              {prepState && (
                <Chip 
                  label={prepState} 
                  size="small" 
                  sx={{ 
                    height: 20, 
                    fontSize: '0.7rem',
                    backgroundColor: prepState === 'raw' ? 'rgba(156, 39, 176, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                    color: prepState === 'raw' ? 'primary.main' : 'success.main',
                  }} 
                />
              )}
            </Box>
            {isUsda && (food.saved || food.is_saved) && (
              <Chip
                icon={<CheckCircleIcon />}
                label="Сохранено"
                color="success"
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          
          {displayDescription && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.8rem', lineHeight: 1.4 }}>
              {displayDescription}
            </Typography>
          )}

          <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 1 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#F44336', fontWeight: 600, fontSize: '0.875rem' }}>
                  Калории: {calories > 0 ? calories.toFixed(0) : 'N/A'} {calories > 0 ? 'kcal' : ''}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#4CAF50', fontWeight: 600, fontSize: '0.875rem' }}>
                  Белки: {protein > 0 ? protein.toFixed(1) : 'N/A'} {protein > 0 ? 'g' : ''}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#9C27B0', fontWeight: 600, fontSize: '0.875rem' }}>
                  Углеводы: {carbs > 0 ? carbs.toFixed(1) : 'N/A'} {carbs > 0 ? 'g' : ''}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#FFC107', fontWeight: 600, fontSize: '0.875rem' }}>
                  Жиры: {fat > 0 ? fat.toFixed(1) : 'N/A'} {fat > 0 ? 'g' : ''}
                </Typography>
              </Grid>
              {fiber > 0 && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    Клетчатка: {fiber.toFixed(1)}g
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>

          {isUsda && !food.saved && !food.is_saved && (food.fdc_id || food.usda_fdc_id) && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={savingFoodId === (food.fdc_id || food.usda_fdc_id) ? <CircularProgress size={16} /> : <SaveIcon />}
                onClick={() => saveUsdaFood(food)}
                disabled={savingFoodId === (food.fdc_id || food.usda_fdc_id)}
                fullWidth
                sx={{
                  backgroundColor: '#4CAF50',
                  '&:hover': {
                    backgroundColor: '#45a049',
                  },
                }}
              >
                {savingFoodId === (food.fdc_id || food.usda_fdc_id) ? 'Сохранение...' : 'Сохранить в базу'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        mt: 4,
        mb: 4,
        width: '100%',
        maxWidth: '100%',
        mx: 'auto',
        overflow: 'hidden',
        px: { xs: 1, sm: 2 },
        boxSizing: 'border-box',
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ fontSize: { xs: '1.6rem', md: '2.125rem' } }}
      >
        База продуктов
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Сохраненные продукты" />
          <Tab label="Поиск в USDA" />
          <Tab label="Рецепты" icon={<RestaurantMenuIcon />} iconPosition="start" />
        </Tabs>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {tabValue === 0 && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setImportUrlDialogOpen(true)}
            >
              Импорт по URL
            </Button>
          )}
          {tabValue === 2 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenRecipeDialog()}
            >
              Создать рецепт
            </Button>
          )}
        </Box>
      </Box>

      {tabValue === 0 && (
        <>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Поиск сохраненных продуктов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ width: '100%', margin: 0 }}>
              {foods.map((food) => (
                <Grid item xs={12} sm={6} md={4} key={food.id} sx={{ width: '100%' }}>
                  <FoodCard food={food} />
                </Grid>
              ))}
            </Grid>
          )}

          {!loading && foods.length === 0 && (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {searchTerm ? 'Продукты не найдены' : 'Нет сохраненных продуктов'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Используйте вкладку "Поиск в USDA" для добавления продуктов
              </Typography>
            </Paper>
          )}
        </>
      )}

      {tabValue === 1 && (
        <>
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              placeholder="Введите название продукта (например: apple, chicken, rice)..."
              value={usdaSearchTerm}
              onChange={(e) => setUsdaSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  searchUsdaFoods();
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={searchUsdaFoods}
              disabled={usdaLoading || !usdaSearchTerm.trim()}
              sx={{ minWidth: 120 }}
            >
              {usdaLoading ? <CircularProgress size={24} /> : 'Поиск'}
            </Button>
          </Box>

          {usdaLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {usdaFoods.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Найдено продуктов: {usdaFoods.length}. Сохраните нужные продукты в базу данных.
                </Alert>
              )}
              <Grid container spacing={2} sx={{ width: '100%', margin: 0 }}>
                {usdaFoods.map((food, index) => (
                  <Grid item xs={12} sm={6} md={4} key={food.fdc_id || index} sx={{ width: '100%' }}>
                    <FoodCard food={food} isUsda={true} />
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          {!usdaLoading && usdaFoods.length === 0 && usdaSearchTerm && (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">Продукты не найдены</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Попробуйте другой поисковый запрос
              </Typography>
            </Paper>
          )}

          {!usdaLoading && !usdaSearchTerm && (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Введите название продукта для поиска в локальной базе данных
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Все импортированные продукты USDA доступны для поиска
              </Typography>
            </Paper>
          )}
        </>
      )}

      {tabValue === 2 && (
        <>
          {recipesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
            {recipes.length > 0 ? (
            <Grid container spacing={2} sx={{ width: '100%', margin: 0 }}>
              {recipes.map((recipe) => (
                <Grid item xs={12} sm={6} md={4} key={recipe.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                          {recipe.name}
                        </Typography>
                        <Box>
                          <IconButton size="small" onClick={() => handleOpenRecipeDialog(recipe)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteRecipe(recipe.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      
                      {recipe.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {recipe.description}
                        </Typography>
                      )}

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Порций: {recipe.servings}
                      </Typography>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          На 1 порцию:
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="body2" sx={{ color: '#FF9800', fontWeight: 600 }}>
                              {recipe.calories_per_serving?.toFixed(0) || 0} kcal
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" sx={{ color: '#4CAF50', fontWeight: 600 }}>
                              Б: {recipe.protein_per_serving?.toFixed(1) || 0}g
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" sx={{ color: '#9C27B0', fontWeight: 600 }}>
                              У: {recipe.carbs_per_serving?.toFixed(1) || 0}g
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" sx={{ color: '#FFC107', fontWeight: 600 }}>
                              Ж: {recipe.fat_per_serving?.toFixed(1) || 0}g
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>

                      {recipe.ingredients && recipe.ingredients.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                            Ингредиенты:
                          </Typography>
                          <List dense>
                            {recipe.ingredients.slice(0, 3).map((ing, idx) => (
                              <ListItem key={idx} sx={{ py: 0 }}>
                                <ListItemText
                                  primary={ing.food?.name || 'Unknown'}
                                  secondary={`${ing.quantity}g`}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                  secondaryTypographyProps={{ variant: 'caption' }}
                                />
                              </ListItem>
                            ))}
                            {recipe.ingredients.length > 3 && (
                              <ListItem sx={{ py: 0 }}>
                                <ListItemText
                                  primary={`...и еще ${recipe.ingredients.length - 3}`}
                                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                                />
                              </ListItem>
                            )}
                          </List>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <RestaurantMenuIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography color="text.secondary">
                  Нет созданных рецептов
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Создайте свой первый рецепт, нажав кнопку "Создать рецепт"
                </Typography>
              </Paper>
            )}
            </>
          )}
        </>
      )}

      {/* Recipe Dialog */}
      <Dialog open={recipeDialogOpen} onClose={handleCloseRecipeDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {editingRecipe ? 'Редактировать рецепт' : 'Создать рецепт'}
            </Typography>
            <IconButton onClick={handleCloseRecipeDialog} size="small">
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

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label="Поиск продукта"
                placeholder="Введите название продукта..."
                value={ingredientSearchTerm}
                onChange={(e) => setIngredientSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Количество (г)"
                type="number"
                value={ingredientForm.quantity}
                onChange={(e) => setIngredientForm({ ...ingredientForm, quantity: e.target.value })}
                inputProps={{ min: 0.1, step: 0.1 }}
                sx={{ width: 150 }}
              />
              <Button 
                variant="contained" 
                onClick={handleAddIngredient} 
                startIcon={<AddIcon />}
                disabled={!ingredientForm.food_id || !ingredientForm.quantity}
              >
                Добавить
              </Button>
            </Box>

            {/* Search Results */}
            {ingredientSearching && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {!ingredientSearching && ingredientSearchTerm.length >= 2 && (
              <Box sx={{ maxHeight: 300, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, mb: 2 }}>
                {(() => {
                  const allFoods = [
                    ...ingredientSearchResults.saved.map(f => ({ ...f, is_saved: true })),
                    ...ingredientSearchResults.usda.map(f => ({ ...f, is_usda: true, is_saved: f.is_saved || false })),
                  ];
                  
                  if (allFoods.length === 0) {
                    return (
                      <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Продукты не найдены
                        </Typography>
                      </Box>
                    );
                  }

                  return (
                    <List dense>
                      {allFoods.map((food) => (
                        <ListItem
                          key={food.id || food.fdc_id}
                          button
                          onClick={() => handleSelectIngredientFood(food)}
                          selected={ingredientForm.food_id === food.id}
                          disabled={savingIngredientFoodId === food.fdc_id}
                        >
                          <ListItemText
                            primary={food.name}
                            secondary={
                              food.brand 
                                ? `${food.brand} • ${(food.calories || food.nutrition?.calories || 0).toFixed(0)} cal/100g`
                                : `${(food.calories || food.nutrition?.calories || 0).toFixed(0)} cal/100g`
                            }
                          />
                          {food.is_usda && (
                            <Chip 
                              label={food.is_saved ? "USDA (сохранено)" : "USDA"} 
                              size="small" 
                              color={food.is_saved ? "success" : "default"}
                              sx={{ ml: 1 }}
                            />
                          )}
                          {savingIngredientFoodId === food.fdc_id && (
                            <CircularProgress size={16} sx={{ ml: 1 }} />
                          )}
                        </ListItem>
                      ))}
                    </List>
                  );
                })()}
              </Box>
            )}

            {ingredientSearchTerm.length < 2 && !selectedIngredientFood && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1, textAlign: 'center' }}>
                Введите минимум 2 символа для поиска продуктов
              </Typography>
            )}

            {selectedIngredientFood && (
              <Box sx={{ p: 1, bgcolor: 'action.selected', borderRadius: 1, mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Выбран: {selectedIngredientFood.name}
                  {selectedIngredientFood.brand && ` (${selectedIngredientFood.brand})`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(selectedIngredientFood.calories || selectedIngredientFood.nutrition?.calories || 0).toFixed(0)} cal/100g
                </Typography>
              </Box>
            )}
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

          {recipeForm.ingredients.length > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Общая питательная ценность:
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Калории: {recipeForm.ingredients.reduce((sum, ing) => 
                      sum + (ing.food?.calories || 0) * ing.quantity / 100, 0
                    ).toFixed(0)} kcal
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Белки: {recipeForm.ingredients.reduce((sum, ing) => 
                      sum + (ing.food?.protein || 0) * ing.quantity / 100, 0
                    ).toFixed(1)}g
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Углеводы: {recipeForm.ingredients.reduce((sum, ing) => 
                      sum + (ing.food?.carbs || 0) * ing.quantity / 100, 0
                    ).toFixed(1)}g
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Жиры: {recipeForm.ingredients.reduce((sum, ing) => 
                      sum + (ing.food?.fat || 0) * ing.quantity / 100, 0
                    ).toFixed(1)}g
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRecipeDialog}>Отмена</Button>
          <Button onClick={handleSaveRecipe} variant="contained" disabled={!recipeForm.name || recipeForm.ingredients.length === 0}>
            {editingRecipe ? 'Обновить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import URL Dialog */}
      <Dialog open={importUrlDialogOpen} onClose={() => setImportUrlDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Импорт продукта по URL</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Введите URL страницы с информацией о продукте. Система попытается автоматически извлечь данные о питательной ценности.
          </Alert>
          <TextField
            fullWidth
            label="URL страницы"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://example.com/food-page"
            margin="normal"
            required
            disabled={importing}
            helperText="Вставьте ссылку на страницу с информацией о продукте"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportUrlDialogOpen(false)} disabled={importing}>
            Отмена
          </Button>
          <Button 
            onClick={handleImportFromUrl} 
            variant="contained" 
            disabled={!importUrl.trim() || importing}
            startIcon={importing ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {importing ? 'Импорт...' : 'Импортировать'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Foods;
