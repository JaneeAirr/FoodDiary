import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Box, CircularProgress, Typography, Alert } from '@mui/material';
import api from '../services/api';

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(`OAuth error: ${errorParam}`);
        setLoading(false);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!code) {
        setError('Authorization code not received');
        setLoading(false);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Send code to backend
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/auth/google/callback/?code=${code}&format=json`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to authenticate' }));
          throw new Error(errorData.error || 'Authentication failed');
        }

        const data = await response.json();

        if (data.tokens) {
          // Save tokens
          localStorage.setItem('accessToken', data.tokens.access);
          localStorage.setItem('refreshToken', data.tokens.refresh);
          
          // Redirect to dashboard
          window.location.href = '/dashboard';
        } else {
          setError(data.error || 'Failed to authenticate with Google');
          setLoading(false);
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (error) {
        console.error('Callback error:', error);
        setError(error.message || 'Failed to process Google authentication');
        setLoading(false);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <Container maxWidth="sm" sx={{ width: '100%', overflow: 'hidden', px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 4, sm: 0 },
        }}
      >
        {loading ? (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Completing Google authentication...
            </Typography>
          </>
        ) : error ? (
          <>
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {error}
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Redirecting to login page...
            </Typography>
          </>
        ) : null}
      </Box>
    </Container>
  );
};

export default GoogleCallback;
