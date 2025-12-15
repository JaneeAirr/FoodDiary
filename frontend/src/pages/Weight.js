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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const Weight = () => {
  const [weights, setWeights] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingWeight, setEditingWeight] = useState(null);
  const [formData, setFormData] = useState({
    weight: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchWeights();
  }, []);

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
      fetchWeights();
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
        fetchWeights();
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
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
    </Container>
  );
};

export default Weight;
