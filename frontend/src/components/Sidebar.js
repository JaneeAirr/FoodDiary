import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import BarChartIcon from '@mui/icons-material/BarChart';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ArticleIcon from '@mui/icons-material/Article';
import SettingsIcon from '@mui/icons-material/Settings';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import MonitorWeightIcon from '@mui/icons-material/MonitorWeight';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PsychologyIcon from '@mui/icons-material/Psychology';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../store/AuthContext';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <HomeIcon />, path: '/dashboard' },
  { text: 'Diary', icon: <RestaurantIcon />, path: '/diary' },
  { text: 'Statistics', icon: <BarChartIcon />, path: '/statistics' },
  { text: 'Weight', icon: <MonitorWeightIcon />, path: '/weight' },
  { text: 'AI Assistant', icon: <PsychologyIcon />, path: '/ai' },
  { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/profile' },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        // Прячем сайдбар на мобильных устройствах, показываем только на md+
        display: { xs: 'none', md: 'block' },
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          backgroundImage: 'none',
        },
      }}
    >
      <Box 
        sx={{ 
          p: 3,
          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 700,
            fontSize: '1.5rem',
            letterSpacing: '-0.02em',
          }}
        >
          Food Diary
        </Typography>
        {user && (
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary', 
              mt: 1,
              fontWeight: 500,
            }}
          >
            {user.username}
          </Typography>
        )}
      </Box>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
      <List sx={{ pt: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  backgroundColor: isActive 
                    ? 'linear-gradient(90deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.05) 100%)'
                    : 'transparent',
                  borderLeft: isActive ? '4px solid' : '4px solid transparent',
                  borderColor: isActive ? 'primary.main' : 'transparent',
                  borderRadius: '0 12px 12px 0',
                  mx: 1,
                  mb: 0.5,
                  '&:hover': {
                    backgroundColor: 'rgba(76, 175, 80, 0.08)',
                    transform: 'translateX(4px)',
                  },
                  py: 1.5,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? 'primary.main' : 'text.secondary',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    '& .MuiListItemText-primary': {
                      color: isActive ? 'primary.main' : 'text.primary',
                      fontWeight: isActive ? 600 : 500,
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
      <List sx={{ mt: 'auto', pb: 2 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: '0 12px 12px 0',
              mx: 1,
              '&:hover': {
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                transform: 'translateX(4px)',
              },
              py: 1.5,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <ListItemIcon
              sx={{
                color: 'error.main',
                minWidth: 40,
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              sx={{
                '& .MuiListItemText-primary': {
                  color: 'error.main',
                  fontWeight: 500,
                },
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;

