import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Grid,
  Button,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

const CustomCalendar = ({ selectedDate, onDateChange, highlightDates = [] }) => {
  // Initialize currentMonth from selectedDate if provided
  const initialMonth = useMemo(() => {
    if (selectedDate) {
      try {
        const [year, month] = selectedDate.split('-').map(Number);
        if (year && month) {
          return new Date(year, month - 1, 1);
        }
      } catch (e) {
        // Invalid date, use today
      }
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, []); // Only initialize once
  
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  
  // Update currentMonth when selectedDate changes (but only if it's a different month)
  useEffect(() => {
    if (selectedDate) {
      try {
        const [year, month] = selectedDate.split('-').map(Number);
        if (year && month) {
          const newMonth = new Date(year, month - 1, 1);
          const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
          // Only update if month/year changed
          if (newMonth.getTime() !== currentMonthStart.getTime()) {
            setCurrentMonth(newMonth);
          }
        }
      } catch (e) {
        // Invalid date, ignore
      }
    }
  }, [selectedDate]); // Removed currentMonth from dependencies to allow month navigation
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };
  
  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else if (direction === 'next') {
        newDate.setMonth(prev.getMonth() + 1);
      } else if (direction === 'prevYear') {
        newDate.setFullYear(prev.getFullYear() - 1);
      } else if (direction === 'nextYear') {
        newDate.setFullYear(prev.getFullYear() + 1);
      }
      return newDate;
    });
  };
  
  const isToday = (day) => {
    // Only show today marker if the selected date is today
    if (!selectedDate) {
      const today = new Date();
      return (
        day === today.getDate() &&
        currentMonth.getMonth() === today.getMonth() &&
        currentMonth.getFullYear() === today.getFullYear()
      );
    }
    
    // If a date is selected, only show today if it's actually today AND selected
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    if (selectedDate === todayStr) {
      return (
        day === today.getDate() &&
        currentMonth.getMonth() === today.getMonth() &&
        currentMonth.getFullYear() === today.getFullYear()
      );
    }
    
    return false; // Don't show today marker if another date is selected
  };
  
  const isSelected = (day) => {
    if (!selectedDate) return false;
    try {
      // Parse selectedDate as YYYY-MM-DD
      const [year, month, date] = selectedDate.split('-').map(Number);
      if (!year || !month || !date) return false;
      
      return (
        day === date &&
        currentMonth.getMonth() + 1 === month &&
        currentMonth.getFullYear() === year
      );
    } catch (e) {
      return false;
    }
  };
  
  const isHighlighted = (day) => {
    if (!highlightDates || highlightDates.length === 0) return false;
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return highlightDates.includes(dateStr);
  };
  
  const handleDateClick = (day) => {
    if (day === null) return; // Don't handle clicks on empty cells
    
    // Format as YYYY-MM-DD to avoid timezone issues
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateString = `${year}-${month}-${dayStr}`;
    
    if (onDateChange) {
      onDateChange(dateString);
    }
  };
  
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  
  // Get previous month's last days for display
  const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 0);
  const prevMonthDays = prevMonth.getDate();
  const prevDays = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    prevDays.push(prevMonthDays - i);
  }
  
  // Get next month's first days for display
  const remainingCells = 42 - days.length; // 6 rows * 7 days
  const nextDays = [];
  for (let day = 1; day <= remainingCells; day++) {
    nextDays.push(day);
  }
  
  return (
    <Paper
      sx={{
        p: 3,
        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(76, 175, 80, 0.02) 100%)',
        borderRadius: 3,
      }}
    >
      {/* Header with navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => navigateMonth('prevYear')}>
            <KeyboardDoubleArrowLeftIcon />
          </IconButton>
          <IconButton size="small" onClick={() => navigateMonth('prev')}>
            <ChevronLeftIcon />
          </IconButton>
        </Box>
        
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => navigateMonth('next')}>
            <ChevronRightIcon />
          </IconButton>
          <IconButton size="small" onClick={() => navigateMonth('nextYear')}>
            <KeyboardDoubleArrowRightIcon />
          </IconButton>
        </Box>
      </Box>
      
      {/* Day names */}
      <Grid container spacing={0.5} sx={{ mb: 1 }}>
        {dayNames.map((day, index) => (
          <Grid item xs={12 / 7} key={index}>
            <Typography
              variant="caption"
              sx={{
                textAlign: 'center',
                display: 'block',
                fontWeight: 600,
                color: 'text.secondary',
                py: 0.5,
              }}
            >
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>
      
      {/* Calendar days */}
      <Grid container spacing={0.5}>
        {days.map((day, index) => {
          if (day === null) {
            return <Grid item xs={12 / 7} key={`empty-${index}`} />;
          }
          
          const isSelectedDay = isSelected(day);
          const isTodayDay = isToday(day);
          const isHighlightedDay = isHighlighted(day);
          
          return (
            <Grid item xs={12 / 7} key={day}>
              <Button
                onClick={() => handleDateClick(day)}
                sx={{
                  minWidth: 0,
                  width: '100%',
                  aspectRatio: '1',
                  p: 0,
                  borderRadius: 2,
                  position: 'relative',
                  backgroundColor: isSelectedDay
                    ? 'primary.main'
                    : isTodayDay
                    ? 'primary.light'
                    : isHighlightedDay
                    ? 'rgba(76, 175, 80, 0.1)'
                    : 'transparent',
                  color: isSelectedDay
                    ? 'primary.contrastText'
                    : isTodayDay
                    ? 'primary.dark'
                    : 'text.primary',
                  fontWeight: isSelectedDay || isTodayDay ? 700 : 500,
                  '&:hover': {
                    backgroundColor: isSelectedDay
                      ? 'primary.dark'
                      : 'rgba(76, 175, 80, 0.15)',
                  },
                  transition: 'all 0.2s ease',
                  border: isTodayDay && !isSelectedDay ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                }}
              >
                <Typography variant="body2">{day}</Typography>
                {isHighlightedDay && !isSelectedDay && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 2,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                    }}
                  />
                )}
              </Button>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

export default CustomCalendar;

