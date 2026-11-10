import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token to every request if stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Global 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('pms_token');
        localStorage.removeItem('pms_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data)
};

export const medicineAPI = {
  getAll: (params) => api.get('/medicines', { params }),
  getById: (id) => api.get(`/medicines/${id}`),
  create: (data) => api.post('/medicines', data),
  update: (id, data) => api.put(`/medicines/${id}`, data),
  delete: (id) => api.delete(`/medicines/${id}`),
  getCategories: () => api.get('/medicines/categories'),
  getManufacturers: () => api.get('/medicines/manufacturers')
};

export const batchAPI = {
  getAll: (params) => api.get('/batches', { params }),
  getFEFO: (medicineId) => api.get(`/batches/fefo/${medicineId}`),
  create: (data) => api.post('/batches', data),
  adjustStock: (batchId, data) => api.post(`/batches/${batchId}/adjust`, data),
  recall: (batchId, data) => api.post(`/batches/${batchId}/recall`, data)
};

export const saleAPI = {
  create: (saleData) => api.post('/sales', saleData),
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  cancel: (id, reason) => api.post(`/sales/${id}/cancel`, { reason }),
  getPdfUrl: (id) => `/api/sales/${id}/pdf`
};

export const purchaseAPI = {
  getAll: (params) => api.get('/purchases', { params }),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data),
  verify: (id) => api.post(`/purchases/${id}/verify`)
};

export const prescriptionAPI = {
  getAll: (params) => api.get('/prescriptions', { params }),
  getById: (id) => api.get(`/prescriptions/${id}`),
  create: (formData) => api.post('/prescriptions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  verify: (id, data) => api.post(`/prescriptions/${id}/verify`, data)
};

export const regulatedAPI = {
  getScheduleH1: (params) => api.get('/regulated/schedule-h1', { params })
};

export const supplierAPI = {
  getAll: () => api.get('/suppliers'),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`)
};

export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  create: (data) => api.post('/customers', data),
  getHistory: (id) => api.get(`/customers/${id}/history`)
};

export const reportAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getSalesAnalytics: () => api.get('/reports/sales-analytics'),
  getTopMedicines: () => api.get('/reports/top-medicines'),
  getCategories: () => api.get('/reports/categories'),
  getValuation: () => api.get('/reports/valuation')
};

export const userAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  toggleStatus: (id) => api.patch(`/users/${id}/toggle-status`),
  getAuditLogs: (params) => api.get('/audit-logs', { params })
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data)
};

export default api;

