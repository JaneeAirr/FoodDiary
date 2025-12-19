import axios from 'axios';

// Use full URL - backend server should be running on http://localhost:8000
// If using proxy, you can set REACT_APP_API_URL='' to use relative URLs
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Simple cache for GET requests
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Mark cacheable requests
  if (config.method === 'get' && !config.url?.includes('/search') && !config.url?.includes('/callback') && !config.url?.includes('/statistics')) {
    const cacheKey = `${config.url}?${new URLSearchParams(config.params || {}).toString()}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // Use adapter to return cached response
      config.adapter = () => Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config
      });
    }
  }
  
  return config;
});

// Response interceptor for caching
api.interceptors.response.use(
  (response) => {
    // Clear cache on POST/PUT/DELETE/PATCH to ensure fresh data
    if (['post', 'put', 'delete', 'patch'].includes(response.config.method?.toLowerCase())) {
      cache.clear();
    }
    
    // Cache successful GET responses (skip if already cached)
    if (response.config.method === 'get' && !response.config.url?.includes('/search') && !response.config.url?.includes('/callback') && !response.config.url?.includes('/statistics')) {
      const cacheKey = `${response.config.url}?${new URLSearchParams(response.config.params || {}).toString()}`;
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Clear cache helper
export const clearCache = () => {
  cache.clear();
};

export default api;

