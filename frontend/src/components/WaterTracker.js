import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Button,
  Collapse,
  Alert,
} from '@mui/material';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SettingsIcon from '@mui/icons-material/Settings';
import api from '../services/api';

const GLASS_SIZE_ML = 250; // 250ml per glass (approximately 8.5 fl oz)
const DEFAULT_GOAL_ML = 2000; // 2000ml = ~67.6 fl oz default goal

const WaterTracker = ({ date, onUpdate }) => {
  const navigate = useNavigate();
  const [waterIntake, setWaterIntake] = useState({ amount_ml: 0 });
  const [settings, setSettings] = useState({ 
    daily_goal_ml: DEFAULT_GOAL_ML,
    unit: 'fl_oz',
    widget_enabled: true 
  });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [animatingGlass, setAnimatingGlass] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get('/api/water-settings/my_settings/');
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch water settings:', error);
      // Use defaults if settings don't exist
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchWaterIntake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const fetchWaterIntake = useCallback(async () => {
    try {
      const response = await api.get(`/api/water/today/?date=${date}`);
      // Update state only if data actually changed to prevent flickering
      const newData = response.data || { amount_ml: 0 };
      setWaterIntake(prev => {
        if (prev.amount_ml !== newData.amount_ml) {
          return newData;
        }
        return prev;
      });
    } catch (error) {
      console.error('Failed to fetch water intake:', error);
      // If no entry exists, create one
      try {
        const response = await api.post(`/api/water/today/?date=${date}`, {
          amount_ml: 0,
        });
        setWaterIntake(response.data || { amount_ml: 0 });
      } catch (createError) {
        console.error('Failed to create water intake:', createError);
        setWaterIntake({ amount_ml: 0 });
      }
    }
  }, [date]);
  
  useEffect(() => {
    fetchWaterIntake();
  }, [fetchWaterIntake]);

  // Calculate derived values from settings and water intake using useMemo
  const goal = useMemo(() => {
    return settings?.daily_goal_ml || DEFAULT_GOAL_ML;
  }, [settings]);
  
  // Convert to display unit
  const getDisplayValue = useCallback((ml) => {
    const unit = settings?.unit || 'fl_oz';
    if (unit === 'ml') {
      return ml;
    } else if (unit === 'fl_oz') {
      return ml / 29.5735;
    } else if (unit === 'cups') {
      return ml / 236.588;
    }
    return ml / 29.5735; // Default to fl_oz
  }, [settings]);
  
  const getUnitLabel = useCallback(() => {
    const unit = settings?.unit || 'fl_oz';
    if (unit === 'ml') return 'ml';
    if (unit === 'fl_oz') return 'fl oz';
    if (unit === 'cups') return 'cups';
    return 'fl oz';
  }, [settings]);
  
  const totalWaterDisplay = useMemo(() => {
    return getDisplayValue(waterIntake?.amount_ml || 0);
  }, [waterIntake, getDisplayValue]);
  
  const goalDisplay = useMemo(() => {
    return getDisplayValue(goal);
  }, [goal, getDisplayValue]);
  
  const totalGlasses = useMemo(() => {
    return Math.ceil(goal / GLASS_SIZE_ML);
  }, [goal]);
  
  const filledGlasses = useMemo(() => {
    return Math.floor((waterIntake?.amount_ml || 0) / GLASS_SIZE_ML);
  }, [waterIntake]);
  
  const currentGlassProgress = useMemo(() => {
    return ((waterIntake?.amount_ml || 0) % GLASS_SIZE_ML) / GLASS_SIZE_ML;
  }, [waterIntake]);
  
  const progress = useMemo(() => {
    return Math.min(((waterIntake?.amount_ml || 0) / goal) * 100, 100);
  }, [waterIntake, goal]);

  const addWater = async (amount_ml) => {
    try {
      // Calculate which glasses will be filled
      const startGlass = Math.floor(waterIntake.amount_ml / GLASS_SIZE_ML);
      const endGlass = Math.floor((waterIntake.amount_ml + amount_ml) / GLASS_SIZE_ML);
      
      // Optimistically update UI to prevent flickering
      const newAmount = waterIntake.amount_ml + amount_ml;
      setWaterIntake(prev => ({ ...prev, amount_ml: newAmount }));
      
      // Trigger animation for all affected glasses
      setAnimatingGlass(endGlass);
      
      const response = await api.post(`/api/water/today/?date=${date}`, {
        amount_ml: amount_ml,
      });
      // Update with server response (in case of rounding differences)
      // Only update if different to prevent flickering
      const serverData = response.data;
      setWaterIntake(prev => {
        if (prev.amount_ml !== serverData.amount_ml) {
          return serverData;
        }
        return prev;
      });
      if (onUpdate) onUpdate();
      
      // Clear animation after delay (longer for smoother animation)
      setTimeout(() => setAnimatingGlass(null), 2500);
    } catch (error) {
      console.error('Failed to add water:', error);
      // Revert optimistic update on error
      fetchWaterIntake();
      setAnimatingGlass(null);
    }
  };

  const removeWater = async (amount_ml) => {
    const newAmount = Math.max(0, waterIntake.amount_ml - amount_ml);
    try {
      // Optimistically update UI to prevent flickering
      setWaterIntake(prev => ({ ...prev, amount_ml: newAmount }));
      
      // Calculate which glass is being emptied
      const glassIndex = Math.floor(newAmount / GLASS_SIZE_ML);
      setAnimatingGlass(glassIndex);
      
      const response = await api.put(`/api/water/today/?date=${date}`, {
        amount_ml: newAmount,
      });
      // Update with server response (only if different)
      const serverData = response.data;
      setWaterIntake(prev => {
        if (prev.amount_ml !== serverData.amount_ml) {
          return serverData;
        }
        return prev;
      });
      if (onUpdate) onUpdate();
      
      // Clear animation after delay
      setTimeout(() => setAnimatingGlass(null), 2200);
    } catch (error) {
      console.error('Failed to remove water:', error);
      // Revert optimistic update on error
      fetchWaterIntake();
      setAnimatingGlass(null);
    }
  };

  const handleGlassClick = (index) => {
    // Calculate how much water should be in this glass (and all previous ones)
    const targetAmount = (index + 1) * GLASS_SIZE_ML;
    const currentAmount = waterIntake.amount_ml;
    
    if (currentAmount >= targetAmount) {
      // If clicking on a filled glass, empty it and all after it
      const newAmount = index * GLASS_SIZE_ML;
      removeWater(currentAmount - newAmount);
    } else {
      // If clicking on an empty glass, fill it and all previous ones
      const amountToAdd = targetAmount - currentAmount;
      addWater(amountToAdd);
    }
  };

  return (
    <Card sx={{ mb: 3, background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalDrinkIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Water
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {totalWaterDisplay.toFixed(1)} / {goalDisplay.toFixed(1)} {getUnitLabel()}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ color: 'text.secondary' }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          {/* Water glasses */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, justifyContent: 'center' }}>
            {Array.from({ length: totalGlasses }).map((_, index) => {
              const isFilled = index < filledGlasses;
              const isCurrent = index === filledGlasses;
              const isNext = index === filledGlasses; // Next glass to fill
              const isAnimating = animatingGlass === index || (animatingGlass !== null && index <= animatingGlass);

              return (
                <Box
                  key={index}
                  onClick={() => handleGlassClick(index)}
                  sx={{
                    width: 50,
                    height: 60,
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                    '&:active': {
                      transform: 'scale(0.95)',
                    },
                  }}
                >
                  {/* Glass container */}
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      border: '2px solid',
                      borderColor: isFilled || isCurrent ? 'primary.main' : 'divider',
                      borderRadius: '0 0 8px 8px',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundColor: 'background.paper',
                    }}
                  >
                    {/* Water fill animation */}
                    {(isFilled || (isCurrent && currentGlassProgress > 0)) && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: isFilled
                            ? '100%'
                            : `${currentGlassProgress * 100}%`,
                          backgroundColor: isAnimating
                            ? 'primary.light'
                            : 'primary.main',
                          transition: isAnimating
                            ? 'height 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), background-color 0.6s ease'
                            : 'height 0.5s ease',
                          opacity: 0.85,
                          transform: isAnimating ? 'scaleY(1.01)' : 'scaleY(1)',
                          transformOrigin: 'bottom',
                          animation: isAnimating ? 'splash 2.5s ease-out' : 'none',
                          '@keyframes splash': {
                            '0%': {
                              transform: 'scaleY(0.05)',
                              opacity: 0.15,
                            },
                            '25%': {
                              transform: 'scaleY(0.3)',
                              opacity: 0.4,
                            },
                            '50%': {
                              transform: 'scaleY(0.7)',
                              opacity: 0.7,
                            },
                            '75%': {
                              transform: 'scaleY(1.05)',
                              opacity: 1,
                            },
                            '100%': {
                              transform: 'scaleY(1)',
                              opacity: 0.85,
                            },
                          },
                        }}
                      />
                    )}
                    
                    {/* Plus button - only on the next glass to fill */}
                    {isNext && !isFilled && currentGlassProgress === 0 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: 'text.secondary',
                          fontSize: '1.5rem',
                          zIndex: 1,
                        }}
                      >
                        <AddIcon />
                      </Box>
                    )}
                    
                    {/* Minus button - only on filled glasses */}
                    {isFilled && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: 'primary.contrastText',
                          fontSize: '1.2rem',
                          zIndex: 1,
                        }}
                      >
                        <RemoveIcon />
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {showInfo && (
            <Alert
              severity="info"
              onClose={() => setShowInfo(false)}
              sx={{ mb: 2 }}
            >
              Water added here will contribute to your total water nutrient target.
            </Alert>
          )}

          {/* Progress bar */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Total Water - {totalWaterDisplay.toFixed(1)} / {goalDisplay.toFixed(1)} {getUnitLabel()}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {progress.toFixed(0)}%
              </Typography>
            </Box>
            <Box
              sx={{
                width: '100%',
                height: 8,
                backgroundColor: 'divider',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2196F3 0%, #64B5F6 100%)',
                  transition: 'width 0.5s ease',
                  borderRadius: 4,
                }}
              />
            </Box>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              size="small"
              variant="text"
              color="primary"
              startIcon={<SettingsIcon />}
              onClick={() => navigate('/profile?tab=water')}
            >
              Water Settings
            </Button>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default WaterTracker;

