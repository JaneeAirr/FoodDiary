import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { AuthProvider, useAuth } from './store/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Sidebar, { drawerWidth, collapsedWidth } from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Login from './pages/Login';
import Register from './pages/Register';
import GoogleCallback from './pages/GoogleCallback';
import Dashboard from './pages/Dashboard';
import Diary from './pages/Diary';
import Foods from './pages/Foods';
import Statistics from './pages/Statistics';
import Profile from './pages/Profile';
import Weight from './pages/Weight';
import Notifications from './pages/Notifications';
import AI from './pages/AI';
import api from './services/api';
import reminderService from './services/reminderService';

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
        main: '#4CAF50', // Green accent (health/nutrition theme)
        light: '#81C784',
        dark: '#388E3C',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#FF9800', // Orange accent
        light: '#FFB74D',
        dark: '#F57C00',
      },
      success: {
        main: '#4CAF50',
        light: '#81C784',
        dark: '#388E3C',
      },
      warning: {
        main: '#FF9800',
      },
      error: {
        main: '#F44336',
      },
      info: {
        main: '#2196F3',
      },
      background: {
        default: isDark ? '#0a0e27' : '#f8f9fa',
        paper: isDark ? '#1a1f3a' : '#ffffff',
      },
      text: {
        primary: isDark ? '#ffffff' : '#1a1a1a',
        secondary: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
      button: {
        fontWeight: 600,
        letterSpacing: '0.02em',
      },
    },
    shape: {
      borderRadius: 16,
    },
    shadows: [
      'none',
      '0px 2px 4px rgba(0,0,0,0.1)',
      '0px 4px 8px rgba(0,0,0,0.12)',
      '0px 8px 16px rgba(0,0,0,0.15)',
      '0px 12px 24px rgba(0,0,0,0.18)',
      ...Array(20).fill('0px 16px 32px rgba(0,0,0,0.2)'),
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 12,
            padding: '10px 24px',
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0px 4px 12px rgba(76, 175, 80, 0.3)',
            },
          },
          contained: {
            background: isDark 
              ? 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)'
              : 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
            '&:hover': {
              background: isDark 
                ? 'linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%)'
                : 'linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            backgroundColor: isDark ? '#1a1f3a' : '#ffffff',
            backgroundImage: 'none',
            boxShadow: isDark 
              ? '0px 4px 20px rgba(0, 0, 0, 0.3), 0px 0px 1px rgba(255, 255, 255, 0.1)'
              : '0px 2px 12px rgba(0, 0, 0, 0.08), 0px 0px 1px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: isDark 
                ? '0px 8px 28px rgba(0, 0, 0, 0.4), 0px 0px 1px rgba(255, 255, 255, 0.15)'
                : '0px 4px 20px rgba(0, 0, 0, 0.12), 0px 0px 1px rgba(0, 0, 0, 0.08)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 16,
          },
          elevation1: {
            boxShadow: isDark 
              ? '0px 2px 8px rgba(0, 0, 0, 0.2)'
              : '0px 1px 4px rgba(0, 0, 0, 0.08)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
    },
  });
};

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [themeMode, setThemeMode] = useState(() => {
    // Initialize from localStorage or default
    const saved = localStorage.getItem('themePreference') || 'dark';
    return getThemeMode(saved);
  });
  const [theme, setTheme] = useState(() => createAppTheme(getThemeMode(localStorage.getItem('themePreference') || 'dark')));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Start reminder service when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      reminderService.start();
      return () => {
        reminderService.stop();
      };
    } else {
      reminderService.stop();
    }
  }, [isAuthenticated, user]);

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
        <Box
          sx={{
            display: 'flex',
            minHeight: '100vh',
            backgroundColor: theme.palette.background.default,
            width: '100%',
            overflowX: 'hidden',
            maxWidth: '100vw',
          }}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <Sidebar onCollapseChange={setSidebarCollapsed} />
                  <Box
                    component="main"
                    sx={{
                      flexGrow: 1,
                      p: { xs: 2, sm: 3 },
                      // Отступ под сайдбар только на десктопе - динамический
                      ml: { 
                        xs: 0, 
                        md: sidebarCollapsed ? `${collapsedWidth}px` : `${drawerWidth}px` 
                      },
                      transition: 'margin-left 0.3s ease',
                      // Отступ снизу под мобильную навигацию
                      pb: { xs: 7, md: 3 },
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
                  {/* Нижняя навигация только для мобильных устройств */}
                  <MobileNav />
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

