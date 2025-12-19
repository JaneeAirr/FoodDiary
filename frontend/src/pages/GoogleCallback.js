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
        // Use api service for consistency and better error handling
        const response = await api.get(`/api/auth/google/callback/`, {
          params: { code, format: 'json' }
        });

        if (response.data.tokens) {
          // Save tokens
          localStorage.setItem('accessToken', response.data.tokens.access);
          localStorage.setItem('refreshToken', response.data.tokens.refresh);
          
          // Redirect immediately without waiting
          window.location.href = '/dashboard';
        } else {
          setError(response.data.error || 'Failed to authenticate with Google');
          setLoading(false);
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (error) {
        console.error('Callback error:', error);
        const errorMsg = error.response?.data?.error || error.message || 'Failed to process Google authentication';
        setError(errorMsg);
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
