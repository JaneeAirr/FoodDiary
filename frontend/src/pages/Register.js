import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Divider,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../store/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
  });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/google/`);
      const data = await response.json();
      
      if (data.auth_url) {
        // Redirect to Google OAuth
        window.location.href = data.auth_url;
      } else {
        setError(data.error || 'Failed to initiate Google login');
      }
    } catch (error) {
      console.error('Google login error:', error);
      setError('Failed to connect to server');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.password2) {
      setError('Passwords do not match');
      return;
    }
    const result = await register(formData);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(typeof result.error === 'string' ? result.error : 'Registration failed');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ width: '100%', overflow: 'hidden', px: { xs: 2, sm: 3 } }}>
      <Box sx={{ mt: { xs: 4, sm: 8 }, mb: { xs: 4, sm: 0 } }}>
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: '100%', borderRadius: 3 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            align="center" 
            sx={{ 
              fontSize: { xs: '1.75rem', md: '2.5rem' },
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Register
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Create a new account to start tracking your nutrition
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            sx={{
              mb: 3,
              py: 1.5,
              borderWidth: 2,
              borderRadius: '12px',
              '&:hover': {
                borderWidth: 2,
                backgroundColor: 'rgba(76, 175, 80, 0.08)',
              },
            }}
          >
            Continue with Google
          </Button>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              OR
            </Typography>
          </Divider>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Confirm Password"
              name="password2"
              type="password"
              value={formData.password2}
              onChange={handleChange}
              margin="normal"
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 3, 
                mb: 2,
                borderRadius: '12px',
                py: 1.5,
              }}
            >
              Register
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;

