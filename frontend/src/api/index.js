import api from './axios';

// Auth
export const authAPI = {
  login: (data) => api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
  register: (data) => api.post('/api/auth/register', data),
};

// Users
export const usersAPI = {
  getAll: (params) => api.get('/api/users', { params }),
  getById: (id) => api.get(`/api/users/${id}`),
  getStipendDue: () => api.get('/api/users/stipend-due'),
  getMe: () => api.get('/api/users/me'),
  updateMe: (data) => api.patch('/api/users/me', data),
  create: (data) => api.post('/api/users', data),
  update: (id, data) => api.patch(`/api/users/${id}`, data),
  delete: (id) => api.delete(`/api/users/${id}`),
};

// Tasks
export const tasksAPI = {
  getAll: (params) => api.get('/api/tasks', { params }),
  create: (data) => api.post('/api/tasks', data),
  updateStatus: (id, status) => api.patch(`/api/tasks/${id}/status`, { status }),
  approve: (id) => api.patch(`/api/tasks/${id}/approve`),
  reject: (id) => api.patch(`/api/tasks/${id}/reject`),
  delete: (id) => api.delete(`/api/tasks/${id}`),
};

// Projects
export const projectsAPI = {
  getAll: () => api.get('/api/projects'),
  getById: (id) => api.get(`/api/projects/${id}`),
  create: (data) => api.post('/api/projects', data),
  update: (id, data) => api.patch(`/api/projects/${id}`, data),
  progress: (id) => api.get(`/api/projects/${id}/progress`),
};

// Status Updates
export const statusAPI = {
  getAll: (params) => api.get('/api/status-updates', { params }),
  create: (data) => api.post('/api/status-updates', data),
};

// Attendance
export const attendanceAPI = {
  getAll: (params) => api.get('/api/attendance', { params }),
  mark: (data) => api.post('/api/attendance', data),
  update: (id, data) => api.patch(`/api/attendance/${id}`, data),
};

// Documents
export const documentsAPI = {
  getAll: (params) => api.get('/api/documents', { params }),
  upload: (formData) => api.post('/api/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  // Fetches the binary data securely via Axios
  download: (id) => api.get(`/api/documents/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/api/documents/${id}`),
};

// Messages
export const messagesAPI = {
  getAll: (userId = 'all', params) => api.get(`/api/messages/${userId}`, { params }),
  send: (data) => api.post('/api/messages', data), // Body contains { receiver, content }
  markRead: (id) => api.patch(`/api/messages/${id}/read`),
};

// Performance
export const performanceAPI = {
  getAll: (params) => api.get('/api/performance', { params }),
  create: (data) => api.post('/api/performance', data),
  update: (id, data) => api.patch(`/api/performance/${id}`, data),
};

// Resources
export const resourcesAPI = {
  getAll: (params) => api.get('/api/resources', { params }),
  create: (data) => api.post('/api/resources', data),
  delete: (id) => api.delete(`/api/resources/${id}`),
};

// Milestones
export const milestonesAPI = {
  getAll: (params) => api.get('/api/milestones', { params }),
  create: (data) => api.post('/api/milestones', data),
  update: (id, data) => api.patch(`/api/milestones/${id}`, data),
  delete: (id) => api.delete(`/api/milestones/${id}`),
};

// Announcements
export const announcementsAPI = {
  getAll: () => api.get('/api/announcements'),
  create: (data) => api.post('/api/announcements', data),
};

// Notifications (in-app, per-user)
export const notificationAPI = {
  getAll: () => api.get('/api/notifications'),
  markRead: (id) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch('/api/notifications/read-all'),
  delete: (id) => api.delete(`/api/notifications/${id}`),
};

// Admin
export const adminAPI = {
  kpis: () => api.get('/api/admin/kpis'),
  analytics: () => api.get('/api/admin/analytics'),
};

// Payments
export const paymentsAPI = {
  getAll: (params) => api.get('/api/payments', { params }),
  getMy: () => api.get('/api/payments/my'),
  create: (data) => api.post('/api/payments', data),
  update: (id, data) => api.patch(`/api/payments/${id}`, data),
  delete: (id) => api.delete(`/api/payments/${id}`),
};
