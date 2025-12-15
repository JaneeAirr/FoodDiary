import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/auth/profile/');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Set up token and fetch profile
  useEffect(() => {
    if (token) {
      // Fetch user profile
      fetchProfile();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await api.post('/api/auth/login/', { username, password });
      const { tokens, user } = response.data;
      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);
      setToken(tokens.access);
      setUser(user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data || 'Login failed',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/api/auth/register/', userData);
      const { tokens, user } = response.data;
      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);
      setToken(tokens.access);
      setUser(user);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      // Handle different error formats
      let errorMessage = 'Registration failed';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.password) {
          errorMessage = Array.isArray(error.response.data.password) 
            ? error.response.data.password.join(', ') 
            : error.response.data.password;
        } else if (error.response.data.username) {
          errorMessage = Array.isArray(error.response.data.username) 
            ? error.response.data.username.join(', ') 
            : error.response.data.username;
        } else if (error.response.data.email) {
          errorMessage = Array.isArray(error.response.data.email) 
            ? error.response.data.email.join(', ') 
            : error.response.data.email;
        } else {
          errorMessage = JSON.stringify(error.response.data);
        }
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
    // Redirect will be handled by PrivateRoute component
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

