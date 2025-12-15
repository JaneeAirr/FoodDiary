import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  IconButton,
  Badge,
  Button,
  Chip,
  Alert,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications/');
      const data = response.data.results || response.data || [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/api/notifications/unread_count/');
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/mark_read/`);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/api/notifications/mark_all_read/');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'warning':
        return 'error';
      case 'info':
        return 'info';
      case 'achievement':
        return 'success';
      default:
        return 'default';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'achievement':
        return '🎉';
      default:
        return '🔔';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon sx={{ fontSize: 32 }} />
          </Badge>
          <Typography variant="h4" component="h1">
            Notifications
          </Typography>
        </Box>
        {unreadCount > 0 && (
          <Button variant="outlined" onClick={markAllAsRead}>
            Mark All as Read
          </Button>
        )}
      </Box>

      {notifications.length > 0 ? (
        <Box>
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              sx={{
                mb: 2,
                backgroundColor: notification.is_read ? 'transparent' : 'rgba(255, 107, 53, 0.1)',
                border: notification.is_read ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #ff6b35',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6" component="span">
                        {getNotificationIcon(notification.notification_type)}
                      </Typography>
                      <Typography variant="h6" component="span">
                        {notification.title}
                      </Typography>
                      <Chip
                        label={notification.notification_type}
                        size="small"
                        color={getNotificationColor(notification.notification_type)}
                      />
                      {!notification.is_read && (
                        <Chip label="New" size="small" color="error" />
                      )}
                    </Box>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(notification.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    {!notification.is_read && (
                      <IconButton
                        size="small"
                        onClick={() => markAsRead(notification.id)}
                        color="primary"
                      >
                        <CheckCircleIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No notifications yet</Typography>
        </Paper>
      )}
    </Container>
  );
};

export default Notifications;
