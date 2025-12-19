import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import api from '../services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Statistics = () => {
  const [data, setData] = useState([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    fetchStatistics();
  }, [days]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/statistics/?days=${days}`);
      console.log('Statistics API response:', response.data);
      // API returns { nutrition: [...], weight: [...] }
      // Extract nutrition data
      const statsData = response.data?.nutrition || response.data || [];
      setData(Array.isArray(statsData) ? statsData : []);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      console.error('Error details:', error.response?.data);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      // Handle both ISO date strings and date objects
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) {
        // If date parsing fails, try parsing as YYYY-MM-DD
        const parts = dateString.split('-');
        if (parts.length === 3) {
          return `${parts[1]}/${parts[2]}`;
        }
        return dateString;
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      console.error('Date formatting error:', error, dateString);
      return dateString;
    }
  };

  const chartData = data.map((item) => ({
    date: formatDate(item.date),
    calories: Number(item.total_calories) || 0,
    protein: Number(item.total_protein) || 0,
    carbs: Number(item.total_carbs) || 0,
    fat: Number(item.total_fat) || 0,
  }));

  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const response = await api.get('/api/nutrition-report-pdf/', {
        params: {
          start_date: startDateStr,
          end_date: endDateStr,
        },
        responseType: 'blob', // Important for binary data
      });

      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `nutrition_report_${startDateStr}_${endDateStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setPdfDialogOpen(false);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Ошибка при генерации PDF отчета');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, width: '100%', maxWidth: '100%', mx: 'auto', overflow: 'hidden', px: { xs: 1, sm: 2 }, boxSizing: 'border-box' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2.125rem' } }}>
          Statistics
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select value={days} onChange={(e) => setDays(e.target.value)} label="Period">
              <MenuItem value={7}>7 days</MenuItem>
              <MenuItem value={14}>14 days</MenuItem>
              <MenuItem value={30}>30 days</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            onClick={() => setPdfDialogOpen(true)}
            sx={{ minWidth: 180 }}
          >
            Скачать PDF отчет
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : chartData.length > 0 ? (
        <Grid container spacing={3} sx={{ width: '100%', maxWidth: '100%', margin: 0, boxSizing: 'border-box' }}>
          <Grid item xs={12} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Paper sx={{ p: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <Typography variant="h6" gutterBottom sx={{ wordBreak: 'break-word' }}>
                Calories Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="calories" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Paper sx={{ p: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <Typography variant="h6" gutterBottom sx={{ wordBreak: 'break-word' }}>
                Macronutrients
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="protein" fill="#82ca9d" />
                  <Bar dataKey="carbs" fill="#8884d8" />
                  <Bar dataKey="fat" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <Typography color="textSecondary" sx={{ wordBreak: 'break-word' }}>
            No data available for the selected period. Add meals in the Diary to see statistics.
          </Typography>
        </Paper>
      )}

      <Dialog open={pdfDialogOpen} onClose={() => setPdfDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Скачать PDF отчет</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Начальная дата"
              type="date"
              value={startDate.toISOString().split('T')[0]}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Конечная дата"
              type="date"
              value={endDate.toISOString().split('T')[0]}
              onChange={(e) => setEndDate(new Date(e.target.value))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <Typography variant="body2" color="text.secondary">
              Выберите период для генерации отчета (максимум 90 дней)
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPdfDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleDownloadPDF}
            variant="contained"
            disabled={generatingPdf || startDate > endDate}
            startIcon={generatingPdf ? <CircularProgress size={20} /> : <PictureAsPdfIcon />}
          >
            {generatingPdf ? 'Генерация...' : 'Скачать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Statistics;

