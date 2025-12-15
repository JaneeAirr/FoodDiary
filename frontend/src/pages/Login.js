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

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
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

  return (
    <Container maxWidth="sm" sx={{ width: '100%', overflow: 'hidden', px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 4, sm: 0 },
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, sm: 4 },
            width: '100%',
            maxWidth: '100%',
            borderRadius: 3,
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            align="center" 
            sx={{ 
              fontWeight: 700, 
              mb: 1,
              fontSize: { xs: '1.75rem', md: '2.5rem' },
              background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Welcome Back
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Sign in to continue to Food Diary
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
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 2,
                mb: 2,
                py: 1.5,
                borderRadius: '12px',
              }}
            >
              Sign In
            </Button>
          </form>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Button
                variant="text"
                onClick={() => navigate('/register')}
                sx={{ 
                  color: 'primary.main', 
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'rgba(76, 175, 80, 0.08)',
                  },
                }}
              >
                Sign Up
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;

