import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('apna_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('apna_token');
      localStorage.removeItem('apna_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Products
export const productsApi = {
  getAll: (params?: Record<string, string>) => api.get('/products', { params }),
  getById: (id: number) => api.get(`/products/${id}`),
  getLowStock: () => api.get('/products/low-stock'),
  getCategories: () => api.get('/products/categories'),
  create: (data: Record<string, unknown>) => api.post('/products', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
};

// Transactions
export const transactionsApi = {
  getAll: (params?: Record<string, string | number>) => api.get('/transactions', { params }),
  getById: (id: number) => api.get(`/transactions/${id}`),
  create: (data: Record<string, unknown>) => api.post('/transactions', data),
  delete: (id: number) => api.delete(`/transactions/${id}`),
};

// Customers
export const customersApi = {
  getAll: (params?: Record<string, string>) => api.get('/customers', { params }),
  getById: (id: number) => api.get(`/customers/${id}`),
  getLedger: (id: number) => api.get(`/customers/${id}/ledger`),
  create: (data: Record<string, unknown>) => api.post('/customers', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
  addPayment: (id: number, data: Record<string, unknown>) => api.post(`/customers/${id}/payment`, data),
};

// Suppliers
export const suppliersApi = {
  getAll: (params?: Record<string, string>) => api.get('/suppliers', { params }),
  getById: (id: number) => api.get(`/suppliers/${id}`),
  getLedger: (id: number) => api.get(`/suppliers/${id}/ledger`),
  create: (data: Record<string, unknown>) => api.post('/suppliers', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/suppliers/${id}`, data),
  delete: (id: number) => api.delete(`/suppliers/${id}`),
  addPayment: (id: number, data: Record<string, unknown>) => api.post(`/suppliers/${id}/payment`, data),
};

// Expenses
export const expensesApi = {
  getAll: (params?: Record<string, string>) => api.get('/expenses', { params }),
  getSummary: (params?: Record<string, string>) => api.get('/expenses/summary', { params }),
  create: (data: Record<string, unknown>) => api.post('/expenses', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/expenses/${id}`, data),
  delete: (id: number) => api.delete(`/expenses/${id}`),
};

// Reports
export const reportsApi = {
  getDashboard: (params?: { from?: string; to?: string }) => api.get('/reports/dashboard', { params }),
  getProfitLoss: (params: { from: string; to: string }) => api.get('/reports/profit-loss', { params }),
  getBestSellers: (params?: Record<string, string | number>) => api.get('/reports/best-sellers', { params }),
  getInventoryValue: () => api.get('/reports/inventory-value'),
  getMonthlyTrend: () => api.get('/reports/monthly-trend'),
};

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; shop_name: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// AI
export const aiApi = {
  chat: (message: string, context?: Record<string, unknown>) =>
    api.post('/ai/chat', { message, context }),
};

export default api;
