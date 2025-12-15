import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import api from '../services/api';

const Foods = () => {
  const [foods, setFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFoods();
  }, [searchTerm]);

  const fetchFoods = async () => {
    setLoading(true);
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const response = await api.get('/api/foods/', { params });
      setFoods(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch foods:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, width: '100%', maxWidth: '100%', mx: 'auto', overflow: 'hidden', px: { xs: 1, sm: 2 }, boxSizing: 'border-box' }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.6rem', md: '2.125rem' } }}>
        Food Database
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search foods..."
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
        <Typography>Loading...</Typography>
      ) : (
        <Grid container spacing={2} sx={{ width: '100%', margin: 0 }}>
          {foods.map((food) => (
            <Grid item xs={12} sm={6} md={4} key={food.id} sx={{ width: '100%' }}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{food.name}</Typography>
                  {food.brand && (
                    <Typography variant="body2" color="textSecondary">
                      {food.brand}
                    </Typography>
                  )}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Calories:</strong> {food.calories} kcal/100g
                    </Typography>
                    <Typography variant="body2">
                      <strong>Protein:</strong> {food.protein}g | <strong>Carbs:</strong> {food.carbs}g | <strong>Fat:</strong> {food.fat}g
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {!loading && foods.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No foods found</Typography>
        </Paper>
      )}
    </Container>
  );
};

export default Foods;

