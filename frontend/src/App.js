import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { AuthProvider, useAuth } from './store/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Diary from './pages/Diary';
import Foods from './pages/Foods';
import Statistics from './pages/Statistics';
import Profile from './pages/Profile';
import Weight from './pages/Weight';
import Notifications from './pages/Notifications';
import AI from './pages/AI';
import api from './services/api';

const getThemeMode = (preference) => {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference || 'dark';
};

const createAppTheme = (mode) => {
  const isDark = mode === 'dark';
  return createTheme({
    palette: {
      mode: mode,
      primary: {
        main: '#ff6b35', // Orange accent
      },
      secondary: {
        main: '#f7931e',
      },
      background: {
        default: isDark ? '#121212' : '#f5f5f5',
        paper: isDark ? '#1e1e1e' : '#ffffff',
      },
      text: {
        primary: isDark ? '#ffffff' : '#000000',
        secondary: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
          },
        },
      },
    },
  });
};

function AppContent() {
  const { user } = useAuth();
  const [themeMode, setThemeMode] = useState(() => {
    // Initialize from localStorage or default
    const saved = localStorage.getItem('themePreference') || 'dark';
    return getThemeMode(saved);
  });
  const [theme, setTheme] = useState(() => createAppTheme(getThemeMode(localStorage.getItem('themePreference') || 'dark')));

  useEffect(() => {
    const loadTheme = async () => {
      try {
        if (user) {
          const response = await api.get('/api/auth/profile/');
          const preference = response.data?.theme_preference || localStorage.getItem('themePreference') || 'dark';
          const mode = getThemeMode(preference);
          setThemeMode(mode);
          setTheme(createAppTheme(mode));
          localStorage.setItem('themePreference', preference);
        } else {
          const saved = localStorage.getItem('themePreference') || 'dark';
          const mode = getThemeMode(saved);
          setThemeMode(mode);
          setTheme(createAppTheme(mode));
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem('themePreference') || 'dark';
        const mode = getThemeMode(saved);
        setThemeMode(mode);
        setTheme(createAppTheme(mode));
      }
    };
    loadTheme();

    // Listen for theme changes from Profile
    const handleThemeChange = (event) => {
      const newPreference = event.detail;
      const mode = getThemeMode(newPreference);
      setThemeMode(mode);
      setTheme(createAppTheme(mode));
      localStorage.setItem('themePreference', newPreference);
      console.log('Theme changed to:', mode, 'from preference:', newPreference);
    };
    window.addEventListener('themeChanged', handleThemeChange);
    
    // Listen for system theme changes if preference is 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      if (localStorage.getItem('themePreference') === 'system') {
        const mode = e.matches ? 'dark' : 'light';
        setThemeMode(mode);
        setTheme(createAppTheme(mode));
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [user]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <Sidebar />
                  <Box
                    component="main"
                    sx={{
                      flexGrow: 1,
                      p: 3,
                      ml: '240px',
                      backgroundColor: theme.palette.background.default,
                      minHeight: '100vh',
                    }}
                  >
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/diary" element={<Diary />} />
                      <Route path="/foods" element={<Foods />} />
                      <Route path="/statistics" element={<Statistics />} />
                      <Route path="/weight" element={<Weight />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/ai" element={<AI />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/leaderboard" element={<div>Leaderboard (Coming Soon)</div>} />
                      <Route path="/blog" element={<div>Blog (Coming Soon)</div>} />
                      <Route path="/contact" element={<div>Contact (Coming Soon)</div>} />
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Box>
                </PrivateRoute>
              }
            />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

