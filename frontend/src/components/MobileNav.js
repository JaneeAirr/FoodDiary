import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import BarChartIcon from '@mui/icons-material/BarChart';
import MonitorWeightIcon from '@mui/icons-material/MonitorWeight';
import SettingsIcon from '@mui/icons-material/Settings';
import PsychologyIcon from '@mui/icons-material/Psychology';

const navItems = [
  { label: 'Home', icon: <HomeIcon />, path: '/dashboard' },
  { label: 'Diary', icon: <RestaurantIcon />, path: '/diary' },
  { label: 'Stats', icon: <BarChartIcon />, path: '/statistics' },
  { label: 'Weight', icon: <MonitorWeightIcon />, path: '/weight' },
  { label: 'AI', icon: <PsychologyIcon />, path: '/ai' },
  { label: 'Profile', icon: <SettingsIcon />, path: '/profile' },
];

const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentIndex = navItems.findIndex((item) =>
    location.pathname.startsWith(item.path)
  );

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: { xs: 'block', md: 'none' },
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <BottomNavigation
        value={currentIndex === -1 ? 0 : currentIndex}
        onChange={(event, newValue) => {
          const item = navItems[newValue];
          if (item) {
            navigate(item.path);
          }
        }}
        showLabels
      >
        {navItems.map((item) => (
          <BottomNavigationAction
            key={item.label}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
};

export default MobileNav;

