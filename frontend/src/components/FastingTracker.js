import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Button,
  LinearProgress,
  Chip,
  Alert,
} from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SettingsIcon from '@mui/icons-material/Settings';
import api from '../services/api';

const FastingTracker = () => {
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState(null);
  const [settings, setSettings] = useState({
    protocol: '16:8',
    custom_fasting_hours: 16,
    widget_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get('/api/fasting-settings/my_settings/');
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch fasting settings:', error);
    }
  }, []);

  const fetchActiveSession = useCallback(async () => {
    try {
      const response = await api.get('/api/fasting/active/');
      if (response.data && !response.data.message) {
        setActiveSession(response.data);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setActiveSession(null);
      } else {
        console.error('Failed to fetch active session:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchActiveSession();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchActiveSession();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchSettings, fetchActiveSession]);

  const startFasting = async () => {
    try {
      const response = await api.post('/api/fasting/start/');
      setActiveSession(response.data);
    } catch (error) {
      console.error('Failed to start fasting:', error);
    }
  };

  const endFasting = async () => {
    if (!activeSession) return;
    try {
      const response = await api.post(`/api/fasting/${activeSession.id}/end/`);
      setActiveSession(null);
    } catch (error) {
      console.error('Failed to end fasting:', error);
    }
  };

  // Calculate elapsed time
  const elapsedTime = useMemo(() => {
    if (!activeSession) return { hours: 0, minutes: 0, seconds: 0 };
    
    const startTime = new Date(activeSession.start_time);
    const diff = currentTime - startTime;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  }, [activeSession, currentTime]);

  // Calculate target fasting hours based on protocol
  const targetHours = useMemo(() => {
    if (settings.protocol === 'custom') {
      return settings.custom_fasting_hours || 16;
    }
    const protocolHours = {
      '16:8': 16,
      '18:6': 18,
      '20:4': 20,
      '24:0': 24,
    };
    return protocolHours[settings.protocol] || 16;
  }, [settings]);

  // Calculate progress percentage
  const progress = useMemo(() => {
    const totalMinutes = elapsedTime.hours * 60 + elapsedTime.minutes;
    const targetMinutes = targetHours * 60;
    return Math.min((totalMinutes / targetMinutes) * 100, 100);
  }, [elapsedTime, targetHours]);

  // Format time display
  const formatTime = (hours, minutes, seconds) => {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  if (loading) {
    return null;
  }

  return (
    <Card sx={{ mb: 3, background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(156, 39, 176, 0.05) 100%)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimerIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Fasting
            </Typography>
            {activeSession && (
              <Chip 
                label={settings.protocol} 
                size="small" 
                sx={{ ml: 1, backgroundColor: 'primary.main', color: 'white' }}
              />
            )}
          </Box>
          <IconButton
            size="small"
            onClick={() => {
              navigate('/profile');
              // Set tab to fasting after navigation
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('profileTabChange', { detail: { tab: 5 } }));
              }, 100);
            }}
            sx={{ color: 'text.secondary' }}
          >
            <SettingsIcon />
          </IconButton>
        </Box>

        {activeSession ? (
          <>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                {formatTime(elapsedTime.hours, elapsedTime.minutes, elapsedTime.seconds)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {elapsedTime.hours} hours {elapsedTime.minutes} minutes
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Progress to {targetHours}h goal
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {progress.toFixed(0)}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #9C27B0 0%, #BA68C8 100%)',
                  },
                }}
              />
            </Box>

            <Button
              fullWidth
              variant="contained"
              startIcon={<StopIcon />}
              onClick={endFasting}
              sx={{
                backgroundColor: '#9C27B0',
                '&:hover': {
                  backgroundColor: '#7B1FA2',
                },
              }}
            >
              End Fast
            </Button>
          </>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Start your fasting period. Your goal is {targetHours} hours ({settings.protocol}).
            </Alert>
            <Button
              fullWidth
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={startFasting}
              sx={{
                backgroundColor: '#9C27B0',
                '&:hover': {
                  backgroundColor: '#7B1FA2',
                },
              }}
            >
              Start Fast
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FastingTracker;

