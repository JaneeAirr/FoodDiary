import React, { useState } from 'react';
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
  IconButton,
  Tooltip,
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
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../store/AuthContext';

export const drawerWidth = 240;
export const collapsedWidth = 64;

const menuItems = [
  { text: 'Dashboard', icon: <HomeIcon />, path: '/dashboard' },
  { text: 'Diary', icon: <RestaurantIcon />, path: '/diary' },
  { text: 'Statistics', icon: <BarChartIcon />, path: '/statistics' },
  { text: 'Weight', icon: <MonitorWeightIcon />, path: '/weight' },
  { text: 'AI Assistant', icon: <PsychologyIcon />, path: '/ai' },
  { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/profile' },
];

const Sidebar = ({ onCollapseChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    if (onCollapseChange) {
      onCollapseChange(newCollapsed);
    }
  };

  const currentWidth = collapsed ? collapsedWidth : drawerWidth;

  return (
    <Drawer
      variant="permanent"
      sx={{
        // Прячем сайдбар на мобильных устройствах, показываем только на md+
        display: { xs: 'none', md: 'block' },
        width: currentWidth,
        flexShrink: 0,
        transition: 'width 0.3s ease',
        '& .MuiDrawer-paper': {
          width: currentWidth,
          boxSizing: 'border-box',
          backgroundColor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          backgroundImage: 'none',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      <Box 
        sx={{ 
          p: collapsed ? 2 : 3,
          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          flexDirection: collapsed ? 'column' : 'row',
          gap: 1,
        }}
      >
        {!collapsed && (
          <Box sx={{ flex: 1 }}>
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
        )}
        <IconButton
          onClick={toggleCollapse}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
            },
          }}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
      <List sx={{ pt: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const listItem = (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  backgroundColor: isActive 
                    ? 'rgba(76, 175, 80, 0.12)'
                    : 'transparent',
                  borderRadius: collapsed ? '12px' : '0 12px 12px 0',
                  mx: collapsed ? 1 : 1,
                  mb: 0.5,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 1 : 2,
                  '&:hover': {
                    backgroundColor: isActive ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.08)',
                    transform: collapsed ? 'scale(1.05)' : 'translateX(4px)',
                  },
                  py: 1.5,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? 'primary.main' : 'text.secondary',
                    minWidth: collapsed ? 0 : 40,
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.text}
                    sx={{
                      '& .MuiListItemText-primary': {
                        color: isActive ? 'primary.main' : 'text.primary',
                        fontWeight: isActive ? 600 : 500,
                      },
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
          
          return collapsed ? (
            <Tooltip key={item.text} title={item.text} placement="right" arrow>
              {listItem}
            </Tooltip>
          ) : (
            listItem
          );
        })}
      </List>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
      <List sx={{ mt: 'auto', pb: 2 }}>
        <ListItem disablePadding>
          <Tooltip title={collapsed ? "Logout" : ""} placement="right" arrow>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: collapsed ? '12px' : '0 12px 12px 0',
                mx: 1,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1 : 2,
                '&:hover': {
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  transform: collapsed ? 'scale(1.05)' : 'translateX(4px)',
                },
                py: 1.5,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <ListItemIcon
                sx={{
                  color: 'error.main',
                  minWidth: collapsed ? 0 : 40,
                  justifyContent: 'center',
                }}
              >
                <LogoutIcon />
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary="Logout"
                  sx={{
                    '& .MuiListItemText-primary': {
                      color: 'error.main',
                      fontWeight: 500,
                    },
                  }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;

