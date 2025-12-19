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
  Box,
  Grid,
  Card,
  CardContent,
  IconButton,
  Alert,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import FlagIcon from '@mui/icons-material/Flag';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api, { clearCache } from '../services/api';
import { useAuth } from '../store/AuthContext';

const Weight = () => {
  const { user } = useAuth();
  const [weights, setWeights] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [open, setOpen] = useState(false);
  const [editingWeight, setEditingWeight] = useState(null);
  const [formData, setFormData] = useState({
    weight: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalFormData, setGoalFormData] = useState({
    target_weight: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchWeights();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/api/auth/profile/');
      setUserProfile(response.data);
      if (response.data.target_weight) {
        setGoalFormData({ target_weight: response.data.target_weight });
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleSaveGoal = async () => {
    try {
      await api.patch('/api/auth/profile/update/', {
        target_weight: parseFloat(goalFormData.target_weight),
      });
      fetchUserProfile();
      setGoalDialogOpen(false);
      setMessage('Цель обновлена успешно!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save goal:', error);
      setMessage('Ошибка сохранения цели: ' + (error.response?.data?.detail || error.response?.data?.error || error.message));
    }
  };

  const fetchWeights = async () => {
    try {
      const response = await api.get('/api/weight/');
      const weightsData = response.data.results || response.data || [];
      setWeights(Array.isArray(weightsData) ? weightsData : []);
    } catch (error) {
      console.error('Failed to fetch weights:', error);
      setWeights([]);
    }
  };

  const handleOpen = (weight = null) => {
    if (weight) {
      setEditingWeight(weight);
      setFormData({
        weight: weight.weight,
        date: weight.date,
        notes: weight.notes || '',
      });
    } else {
      setEditingWeight(null);
      setFormData({
        weight: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingWeight(null);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const data = {
        ...formData,
        weight: parseFloat(formData.weight),
      };
      
      if (editingWeight) {
        await api.put(`/api/weight/${editingWeight.id}/`, data);
        setMessage('Weight updated successfully!');
      } else {
        await api.post('/api/weight/', data);
        setMessage('Weight added successfully!');
      }
      
      // Clear cache and refresh data
      clearCache();
      await Promise.all([fetchWeights(), fetchUserProfile()]);
      
      // Notify Dashboard to refresh
      window.dispatchEvent(new CustomEvent('weightUpdated'));
      
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (error) {
      console.error('Failed to save weight:', error);
      setMessage('Failed to save weight: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this weight entry?')) {
      try {
        await api.delete(`/api/weight/${id}/`);
        
        // Clear cache and refresh data
        clearCache();
        await Promise.all([fetchWeights(), fetchUserProfile()]);
        
        // Notify Dashboard to refresh
        window.dispatchEvent(new CustomEvent('weightUpdated'));
      } catch (error) {
        console.error('Failed to delete weight:', error);
      }
    }
  };

  const chartData = weights
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((w) => ({
      date: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: parseFloat(w.weight),
    }));

  // Calculate goal progress
  const currentWeight = weights.length > 0 
    ? weights.sort((a, b) => new Date(b.date) - new Date(a.date))[0].weight 
    : null;
  const targetWeight = userProfile?.target_weight;
  const weightRemaining = currentWeight && targetWeight 
    ? (currentWeight > targetWeight ? currentWeight - targetWeight : targetWeight - currentWeight)
    : null;
  const isGoalReached = currentWeight && targetWeight 
    ? (currentWeight <= targetWeight && userProfile?.goal === 'weight_loss') || 
      (currentWeight >= targetWeight && userProfile?.goal === 'weight_gain')
    : false;

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
          Weight Tracking
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{
            backgroundColor: '#ff6b35',
            '&:hover': {
              backgroundColor: '#e55a2b',
            },
          }}
        >
          Add Weight
        </Button>
      </Box>

      {/* Goal Information Card */}
      {!targetWeight && (
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Установите цель по весу
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Установите желаемый вес, чтобы отслеживать прогресс
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<FlagIcon />}
                onClick={() => setGoalDialogOpen(true)}
                sx={{
                  backgroundColor: '#4CAF50',
                  '&:hover': { backgroundColor: '#45a049' },
                }}
              >
                Установить цель
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {targetWeight && currentWeight && (
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FlagIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Цель по весу
                </Typography>
              </Box>
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={() => setGoalDialogOpen(true)}
              >
                Изменить цель
              </Button>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Текущий вес
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#ff6b35' }}>
                  {currentWeight.toFixed(1)} кг
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Желаемый вес
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                  {targetWeight.toFixed(1)} кг
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Осталось
                </Typography>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 600,
                    color: isGoalReached ? '#4CAF50' : '#ff6b35'
                  }}
                >
                  {isGoalReached ? 'Цель достигнута!' : `${weightRemaining.toFixed(1)} кг`}
                </Typography>
                {!isGoalReached && (
                  <Chip 
                    label={userProfile?.goal === 'weight_loss' ? 'Похудеть' : 'Набрать'} 
                    size="small" 
                    sx={{ mt: 0.5 }}
                    color={userProfile?.goal === 'weight_loss' ? 'primary' : 'secondary'}
                  />
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {weights.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Weight Progress
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="weight" stroke="#ff6b35" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2}>
        {weights.length > 0 ? (
          weights
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((weight) => (
              <Grid item xs={12} sm={6} md={4} key={weight.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <Box>
                        <Typography variant="h5">{weight.weight} kg</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {new Date(weight.date).toLocaleDateString()}
                        </Typography>
                        {weight.notes && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {weight.notes}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <IconButton size="small" onClick={() => handleOpen(weight)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(weight.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
        ) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="textSecondary">No weight entries yet. Add your first entry!</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingWeight ? 'Edit Weight Entry' : 'Add Weight Entry'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {message && (
              <Alert severity={message.includes('success') ? 'success' : 'error'} sx={{ mb: 2 }}>
                {message}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Weight (kg)"
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              margin="normal"
              required
              inputProps={{ min: 0, step: 0.1 }}
            />
            <TextField
              fullWidth
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
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
            <Button type="submit" variant="contained" sx={{ backgroundColor: '#ff6b35' }}>
              {editingWeight ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Goal Dialog */}
      <Dialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Установить цель по весу</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Желаемый вес (кг)"
            type="number"
            value={goalFormData.target_weight}
            onChange={(e) => setGoalFormData({ target_weight: e.target.value })}
            margin="normal"
            required
            inputProps={{ min: 0, step: 0.1 }}
            helperText="Введите желаемый вес в килограммах"
          />
          {currentWeight && goalFormData.target_weight && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Текущий вес: {currentWeight.toFixed(1)} кг
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Осталось: {Math.abs(currentWeight - parseFloat(goalFormData.target_weight || 0)).toFixed(1)} кг
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoalDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSaveGoal} variant="contained" sx={{ backgroundColor: '#4CAF50' }}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Weight;
