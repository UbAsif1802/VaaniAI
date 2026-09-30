import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercept requests to attach JWT Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vaani_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercept responses to handle 401s gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if invalid or expired
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('vaani_token');
        localStorage.removeItem('vaani_user');
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me')
};

export const userApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.patch('/users/me', data)
};

export const conversationApi = {
  create: (data) => api.post('/conversations', data),
  list: () => api.get('/conversations'),
  getById: (id) => api.get(`/conversations/${id}`),
  addMessage: (id, data) => api.post(`/conversations/${id}/messages`, data)
};

export const aiApi = {
  sendMessage: (data) => api.post('/ai/message', data),
  analyze: (data) => api.post('/ai/analyze', data),
  executeAction: (data) => api.post('/ai/action', data)
};

export const ticketApi = {
  create: (data) => api.post('/tickets', data),
  list: (params) => api.get('/tickets', { params }),
  getById: (id) => api.get(`/tickets/${id}`),
  update: (id, data) => api.patch(`/tickets/${id}`, data),
  getStats: () => api.get('/tickets/stats/overview'),
  submitFeedback: (id, data) => api.post(`/tickets/${id}/feedback`, data)
};

export const hostApi = {
  getOverview: () => api.get('/host/overview'),
  updateTicketStatus: (id, data) => api.patch(`/host/tickets/${id}/status`, data)
};

export const systemApi = {
  getDepartments: () => api.get('/departments'),
  getHealth: () => api.get('/health')
};

export default api;
