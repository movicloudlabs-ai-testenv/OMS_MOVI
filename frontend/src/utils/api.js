import axios from 'axios';

const getBaseURL = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return url.endsWith('/api') ? url : `${url}/api`;
};

// Create a configured axios instance
const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true, // Send cookies/session across domains if needed
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('owms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('owms_token');
      localStorage.removeItem('owms_refresh_token');
      localStorage.removeItem('owms_user');
      // Fire event so AuthContext can clear React state (avoid stale UI)
      window.dispatchEvent(new Event('owms:unauthorized'));
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.replace('/login');
      }
    }
    if (error.response?.status === 403) {
      console.warn('Access denied:', error.response.data?.message);
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── AUTH API ─────────────────────────────────────────────────────────────
export const authAPI = {
  // credentials: { identifier, password } — backend accepts email OR employeeId in 'identifier'
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// ─── ADMIN API ────────────────────────────────────────────────────────────
export const adminAPI = {
  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  getUserProjects: (id) => api.get(`/admin/users/${id}/projects`),
  getUserDeletionImpact: (id) => api.get(`/admin/users/${id}/deletion-impact`),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id, data) => api.delete(`/admin/users/${id}`, { data }),
  updateUserStatus: (id, status) => api.patch(`/admin/users/${id}/status`, { status }),
  resetUserPassword: (id, data) => api.post(`/admin/users/${id}/reset-password`, data),

  // Roles
  getRoles: () => api.get('/admin/roles'),
  getRole: (id) => api.get(`/admin/roles/${id}`),
  createRole: (data) => api.post('/admin/roles', data),
  updateRole: (id, data) => api.put(`/admin/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/admin/roles/${id}`),
  updateRolePermissions: (id, permissions) =>
    api.post(`/admin/roles/${id}/permissions`, { permissions }),

  // Departments
  getDepartments: (params) => api.get('/admin/departments', { params }),
  getDepartment: (id) => api.get(`/admin/departments/${id}`),
  createDepartment: (data) => api.post('/admin/departments', data),
  updateDepartment: (id, data) => api.put(`/admin/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/admin/departments/${id}`),

  // Permissions (read-only — auto-generated from backend config)
  getPermissions: (params) => api.get('/admin/permissions', { params }),

  // Access Matrix
  getAccessMatrix: () => api.get('/admin/access-matrix'),
  saveAccessMatrix: (matrix) => api.put('/admin/access-matrix', { matrix }),
  // legacy alias
  updateAccessMatrix: (data) => api.put('/admin/access-matrix', data),

  // Audit Logs
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),

  // Dashboard
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  createAnnouncement: (data) => api.post('/admin/dashboard/announcements', data),
  deleteAnnouncement: (id) => api.delete(`/admin/dashboard/announcements/${id}`),

  // Reports
  getReports: (params) => api.get('/admin/reports', { params }),
  triggerRun: (id) => api.post(`/admin/reports/${id}/run`),
  getRunStatus: (id, runId) => api.get(`/admin/reports/${id}/runs/${runId}/status`),
  exportReportFile: (id, format) => api.get(`/admin/reports/${id}/export`, { params: { format }, responseType: 'blob' }),
  deleteReport: (id) => api.delete(`/admin/reports/${id}`),
  archiveReport: (id) => api.patch(`/admin/reports/${id}/archive`),
  // legacy aliases kept for backward compat
  getReportTypes: () => api.get('/admin/reports'),
  runReport: (type, filters) => api.post('/admin/reports/run', { type, filters }),
  exportReport: (type, filters) => api.get(`/admin/reports/${type}/export`, { params: filters, responseType: 'blob' }),

  // Settings
  getSettings: () => api.get('/admin/settings'),
  saveSettings: (data) => api.put('/admin/settings', data),
  updateSettings: (data) => api.put('/admin/settings', data),
  resetSettings: () => api.post('/admin/settings/reset'),
  testEmail: (identity) => api.post('/admin/settings/test-email', identity ? { identity } : {}),
  uploadLogo: (formData) =>
    api.post('/admin/settings/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Archive / Retention
  getArchivedUsers: (params) => api.get('/admin/users/archived', { params }),
  restoreUser: (archivedId, data) => api.post(`/admin/users/archived/${archivedId}/restore`, data),
  permanentlyDelete: (archivedId) => api.delete(`/admin/users/archived/${archivedId}/permanent`),
};

// ─── HR API ───────────────────────────────────────────────────────────────
export const hrAPI = {
  getEmployees: (params) => api.get('/hr/employees', { params }),
  getEmployee: (id) => api.get(`/hr/employees/${id}`),
  getEmployeeAttendance: (id, params) => api.get(`/hr/employees/${id}/attendance`, { params }),
  getEmployeeLeaves: (id) => api.get(`/hr/employees/${id}/leaves`),
  addEmployeeNote: (id, note) => api.post(`/hr/employees/${id}/notes`, { note }),

  getPendingOnboarding: () => api.get('/hr/onboarding/pending'),
  getCompletedOnboarding: () => api.get('/hr/onboarding/completed'),
  updateOnboardingChecklist: (id, data) => api.patch(`/hr/onboarding/${id}/checklist`, data),
  getHRList: () => api.get('/hr/onboarding/hr-list'),
  reassignHR: (id, hrManagerId) => api.patch(`/hr/onboarding/${id}/reassign`, { hrManagerId }),

  getAttendance: (params) => api.get('/hr/attendance', { params }),
  getMyAttendance: (params) => api.get('/hr/my-attendance', { params }),
  markAttendance: (data) => api.post('/hr/attendance/mark', data),
  exportAttendance: (params) => api.get('/hr/attendance/export', { params, responseType: 'blob' }),

  getPendingLeaves: () => api.get('/hr/leaves/pending'),
  getLeaves: (params) => api.get('/hr/leaves', { params }),
  reviewLeave: (id, data) => api.patch(`/hr/leaves/${id}/review`, data),
  allocateLeaveBalance: (data) => api.post('/hr/leaves/balance', data),

  getMyLeaveBalance: () => api.get('/hr/leaves/my/balance'),
  getMyLeaves: () => api.get('/hr/leaves/my'),
  applyMyLeave: (data) => api.post('/hr/leaves/my/apply', data),

  getInterns: (params) => api.get('/hr/interns', { params }),
  getIntern: (id) => api.get(`/hr/interns/${id}`),
  getInternLearning: (id) => api.get(`/hr/interns/${id}/learning`),
  assignInternLearning: (id, data) => api.post(`/hr/interns/${id}/learning`, data),
  deleteInternLearning: (id, resourceId) => api.delete(`/hr/interns/${id}/learning/${resourceId}`),
  addInternPerformance: (id, data) => api.post(`/hr/interns/${id}/performance`, data),
  assignInternMentor: (id, data) => api.patch(`/hr/interns/${id}/assign-mentor`, data),
  uploadInternDocument: (id, docType, formData) => api.post(`/hr/interns/${id}/documents/${docType}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteInternDocument: (id, docType) => api.delete(`/hr/interns/${id}/documents/${docType}`),

  // Recruitment / Candidate pipeline
  getCandidates: (params) => api.get('/hr/recruitment', { params }),
  getCandidateStats: () => api.get('/hr/recruitment/stats'),
  getCandidate: (id) => api.get(`/hr/recruitment/${id}`),
  createCandidate: (data) => api.post('/hr/recruitment', data),
  updateCandidate: (id, data) => api.patch(`/hr/recruitment/${id}`, data),
  deleteCandidate: (id) => api.delete(`/hr/recruitment/${id}`),
  convertCandidateToUser: (id, data) => api.post(`/hr/recruitment/${id}/convert-to-user`, data),
  addCandidateNote: (id, text) => api.post(`/hr/recruitment/${id}/notes`, { text }),
  uploadCandidateDocument: (id, docType, formData) => api.post(`/hr/recruitment/${id}/documents/${docType}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteCandidateDocument: (id, docType) => api.delete(`/hr/recruitment/${id}/documents/${docType}`),

  // Daily Tracker / EOD Reports (HR view + edit)
  getDailyTrackerEntries: (params) => api.get('/hr/daily-tracker', { params }),
  getUserTrackerHistory: (userId) => api.get(`/hr/daily-tracker/user/${userId}`),
  updateTrackerEntry: (id, data) => api.patch(`/hr/daily-tracker/${id}`, data),
  exportDailyTracker: (params) => api.get('/hr/daily-tracker/export', { params, responseType: 'blob' }),
  getTrackerDayStatus: (params) => api.get('/hr/daily-tracker/day-status', { params }),

  // EOD Reports (simple daily message updates — view only)
  getEODReports: (params) => api.get('/hr/eod', { params }),
  getUserEODHistory: (userId) => api.get(`/hr/eod/user/${userId}`),
  getEODDayStatus: (params) => api.get('/hr/eod/day-status', { params }),
  exportEODReports: (params) => api.get('/hr/eod/export', { params, responseType: 'blob' }),

  // Performance Analytics (monthly, derived from Daily Tracker + Attendance)
  getMonthlyPerformance: (params) => api.get('/hr/performance-analytics/monthly', { params }),

  getHeadcountReport: () => api.get('/hr/reports/headcount'),
  getAttendanceSummary: (params) => api.get('/hr/reports/attendance-summary', { params }),
  getLeaveSummary: (params) => api.get('/hr/reports/leave-summary', { params }),

  addEmployeePerformance: (id, data) => api.post(`/hr/employees/${id}/performance`, data),

  getMyProjects: () => api.get('/hr/projects'),
  getMyProject:  (id) => api.get(`/hr/projects/${id}`),

  getMyTasks: () => api.get('/hr/tasks/my'),
  getMyTask: (id) => api.get(`/hr/tasks/my/${id}`),
  getInternTasks: () => api.get('/hr/tasks/interns'),
  getEmployeeTasks: () => api.get('/hr/tasks/employees'),
  updateMyTaskStatus: (id, data) => api.patch(`/hr/tasks/my/${id}/status`, data),
  deleteMyLeave: (id) => api.delete(`/hr/leaves/my/${id}`),
  toggleMySubtask: (taskId, index) => api.patch(`/hr/tasks/my/${taskId}/subtasks/${index}`),
  uploadMyTaskAttachment: (taskId, formData) =>
    api.post(`/hr/tasks/my/${taskId}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  addMyTaskComment: (id, data) => api.post(`/hr/tasks/my/${id}/comments`, data),
  assignTask: (data) => api.post('/hr/tasks/assign', data),
};

// ─── PMO API ──────────────────────────────────────────────────────────────
export const pmoAPI = {
  getProjects: (params) => api.get('/pmo/projects', { params }),
  getProject: (id) => api.get(`/pmo/projects/${id}`),
  createProject: (data) => api.post('/pmo/projects', data),
  updateProject: (id, data) => api.put(`/pmo/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/pmo/projects/${id}`),
  addProjectTeam: (id, members) => api.post(`/pmo/projects/${id}/team`, { members }),
  removeProjectTeamMember: (id, userId) => api.delete(`/pmo/projects/${id}/team/${userId}`),
  assignProjectInterns: (id, internIds) => api.post(`/pmo/projects/${id}/interns`, { internIds }),
  addProjectMilestone: (id, data) => api.post(`/pmo/projects/${id}/milestones`, data),
  updateProjectMilestone: (id, milestoneId, data) => api.patch(`/pmo/projects/${id}/milestones/${milestoneId}`, data),

  getTasks: (params) => api.get('/pmo/tasks', { params }),
  getTask: (id) => api.get(`/pmo/tasks/${id}`),
  createTask: (data) => api.post('/pmo/tasks', data),
  bulkReassignTasks: (data) => api.post('/pmo/tasks/bulk-reassign', data),
  updateTask: (id, data) => api.put(`/pmo/tasks/${id}`, data),
  updateTaskStatus: (id, data) => api.patch(`/pmo/tasks/${id}/status`, data),
  addTaskComment: (id, data) => api.post(`/pmo/tasks/${id}/comments`, data),
  deleteTask: (id) => api.delete(`/pmo/tasks/${id}`),
  uploadTaskAttachment: (id, formData) =>
    api.post(`/pmo/tasks/${id}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  getTeam: () => api.get('/pmo/team'),
  getAvailableMembers: (params) => api.get('/pmo/team/available', { params }),
  getEmployee: (id) => api.get(`/pmo/team/${id}`),

  getInterns: () => api.get('/pmo/interns'),
  getIntern: (id) => api.get(`/pmo/interns/${id}`),
  getInternLearning: (id) => api.get(`/pmo/interns/${id}/learning`),
  assignInternLearning: (id, data) => api.post(`/pmo/interns/${id}/learning`, data),
  deleteInternLearning: (id, resourceId) => api.delete(`/pmo/interns/${id}/learning/${resourceId}`),
  addInternRating: (id, data) => api.post(`/pmo/interns/${id}/performance`, data),
  requestInterns: (data) => api.post('/pmo/interns/request', data),

  getPendingLeaves: () => api.get('/pmo/approvals/leaves'),
  getLeaveOverview: () => api.get('/pmo/approvals/leave-overview'),
  getTasksInReview: () => api.get('/pmo/approvals/tasks'),
  getPendingOnboarding: () => api.get('/pmo/approvals/onboarding'),
  approveOnboarding: (id) => api.post(`/pmo/approvals/onboarding/${id}/approve`),

  getProjectHealth: () => api.get('/pmo/reports/health'),
  getResourceWarnings: () => api.get('/pmo/reports/warnings'),
  getReports: (params) => api.get('/pmo/reports', { params }),
  getDashboardStats: () => api.get('/pmo/dashboard'),
  getAttendance: (params) => api.get('/pmo/attendance', { params }),
  reviewApproval: (id, data) => api.put(`/pmo/approvals/${id}`, data),

  // Daily Tracker / EOD Reports (PMO view + edit)
  getDailyTrackerEntries: (params) => api.get('/pmo/daily-tracker', { params }),
  getUserTrackerHistory: (userId) => api.get(`/pmo/daily-tracker/user/${userId}`),
  updateTrackerEntry: (id, data) => api.patch(`/pmo/daily-tracker/${id}`, data),
  exportDailyTracker: (params) => api.get('/pmo/daily-tracker/export', { params, responseType: 'blob' }),
  getTrackerDayStatus: (params) => api.get('/pmo/daily-tracker/day-status', { params }),

  // Daily Tracker — PMO submitting their OWN entry
  getMyTrackerToday: () => api.get('/pmo/daily-tracker/my/today'),
  getMyTrackerHistory: () => api.get('/pmo/daily-tracker/my'),
  submitDailyTracker: (data) => api.post('/pmo/daily-tracker/my', data),

  // EOD Reports (simple daily message updates — view only)
  getEODReports: (params) => api.get('/pmo/eod', { params }),
  getUserEODHistory: (userId) => api.get(`/pmo/eod/user/${userId}`),
  getEODDayStatus: (params) => api.get('/pmo/eod/day-status', { params }),
  exportEODReports: (params) => api.get('/pmo/eod/export', { params, responseType: 'blob' }),

  // EOD Report — PMO submitting their OWN update
  getMyEODToday: () => api.get('/pmo/eod/my/today'),
  getMyEODHistory: () => api.get('/pmo/eod/my'),
  submitEOD: (message) => api.post('/pmo/eod/my', { message }),
};

// ─── EMPLOYEE API ─────────────────────────────────────────────────────────
export const employeeAPI = {
  // Profile
  getProfile: () => api.get('/employee/profile'),
  updateProfile: (data) => api.patch('/employee/profile', data),
  changePassword: (data) => api.post('/employee/profile/change-password', data),

  // Tasks
  getTasks: (params) => api.get('/employee/tasks', { params }),
  getTask: (id) => api.get(`/employee/tasks/${id}`),
  updateTaskStatus: (id, data) => api.patch(`/employee/tasks/${id}/status`, data),
  addComment: (id, data) => api.post(`/employee/tasks/${id}/comments`, data),
  uploadAttachment: (id, formData) =>
    api.post(`/employee/tasks/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  toggleSubtask: (taskId, subtaskId) =>
    api.patch(`/employee/tasks/${taskId}/subtasks/${subtaskId}`),

  // Projects
  getProjects: () => api.get('/employee/projects'),
  getProject: (id) => api.get(`/employee/projects/${id}`),

  // Team
  getTeam: () => api.get('/employee/team'),
  getTeamMember: (userId) => api.get(`/employee/team/${userId}`),

  // Attendance
  getAttendance: (params) => api.get('/employee/attendance', { params }),
  getTodayAttendance: () => api.get('/employee/attendance/today'),
  checkIn: () => api.post('/employee/attendance/check-in'),
  checkOut: () => api.post('/employee/attendance/check-out'),

  // Daily Tracker / EOD Report
  getMyTrackerToday: () => api.get('/employee/daily-tracker/today'),
  getMyTrackerHistory: () => api.get('/employee/daily-tracker'),
  submitDailyTracker: (data) => api.post('/employee/daily-tracker', data),

  // EOD Report (simple daily message)
  getMyEODToday: () => api.get('/employee/eod/today'),
  getMyEODHistory: () => api.get('/employee/eod'),
  submitEOD: (message) => api.post('/employee/eod', { message }),

  // Leave
  getLeaveBalance: () => api.get('/employee/leave/balance'),
  getLeaveRequests: (params) => api.get('/employee/leave/requests', { params }),
  applyLeave: (data) => api.post('/employee/leave/apply', data),
  cancelLeave: (id) => api.delete(`/employee/leave/${id}`),

  // Notifications
  getNotifications: () => api.get('/employee/notifications'),
  markRead: (id) => api.patch(`/employee/notifications/${id}/read`),
  markAllRead: () => api.patch('/employee/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/employee/notifications/${id}`),
};

// ─── INTERN API ───────────────────────────────────────────────────────────
export const internAPI = {
  getProfile: () => api.get('/intern/profile'),
  updateProfile: (data) => api.patch('/intern/profile', data),
  changePassword: (data) => api.post('/intern/profile/change-password', data),

  getTasks: (params) => api.get('/intern/tasks', { params }),
  updateTaskStatus: (id, data) => api.patch(`/intern/tasks/${id}/status`, data),
  addTaskComment: (id, data) => api.post(`/intern/tasks/${id}/comments`, data),

  getAttendance: (params) => api.get('/intern/attendance', { params }),
  getTodayAttendance: () => api.get('/intern/attendance/today'),
  checkIn: () => api.post('/intern/attendance/check-in'),
  checkOut: () => api.post('/intern/attendance/check-out'),

  // Daily Tracker / EOD Report
  getMyTrackerToday: () => api.get('/intern/daily-tracker/today'),
  getMyTrackerHistory: () => api.get('/intern/daily-tracker'),
  submitDailyTracker: (data) => api.post('/intern/daily-tracker', data),

  // EOD Report (simple daily message)
  getMyEODToday: () => api.get('/intern/eod/today'),
  getMyEODHistory: () => api.get('/intern/eod'),
  submitEOD: (message) => api.post('/intern/eod', { message }),
  
  getLeaves: () => api.get('/intern/leave'),
  getLeaveBalance: () => api.get('/intern/leave/balance'),
  applyForLeave: (data) => api.post('/intern/leave', data),

  getLearningResources: () => api.get('/intern/learning'),
  updateLearningStatus: (id, data) => api.patch(`/intern/learning/${id}/status`, data),

  cancelLeave: (id) => api.delete(`/intern/leave/${id}`),
  getProjects: () => api.get('/intern/projects'),
  getProject: (id) => api.get(`/intern/projects/${id}`),
  getTask: (id) => api.get(`/intern/tasks/${id}`),
  toggleSubtask: (taskId, subtaskId) => api.patch(`/intern/tasks/${taskId}/subtasks/${subtaskId}`),
  uploadAttachment: (taskId, formData) =>
    api.post(`/intern/tasks/${taskId}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ─── ME API (any role — profile self-service) ─────────────────────────────
export const meAPI = {
  getProfile:     ()     => api.get('/me/profile'),
  updateProfile:  (data) => api.patch('/me/profile', data),
  changePassword: (data) => api.post('/me/change-password', data),
};

// ─── NOTIFICATION API ─────────────────────────────────────────────────────
export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};

// ─── PAYMENTS API (Admin & Intern) ────────────────────────────────────────
export const paymentsAPI = {
  getAll: (params) => api.get('/admin/payments', { params }),
  getById: (id) => api.get(`/admin/payments/${id}`),
  create: (data) => api.post('/admin/payments', data),
  update: (id, data) => api.put(`/admin/payments/${id}`, data),
  delete: (id) => api.delete(`/admin/payments/${id}`),
  getMy: () => api.get('/intern/payments'),
};

// ─── ANNOUNCEMENTS & COMMUNICATION API ────────────────────────────────────
export const announcementsAPI = {
  getAll: (params) => api.get('/announcements', { params }),
  create: (data) => api.post('/announcements', data),
  delete: (id) => api.delete(`/announcements/${id}`),
  togglePin: (id) => api.patch(`/announcements/${id}/pin`),
};
