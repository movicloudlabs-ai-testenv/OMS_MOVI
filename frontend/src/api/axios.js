import axios from 'axios';

const getBaseURL = () => {
  let url = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
  if (url.endsWith('/api')) {
    url = url.slice(0, -4);
  }
  return url;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('owms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// ── Response interceptor: global 401 handler ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('owms_token');
      // Fire event so AuthContext can clear React state (avoid stale UI)
      window.dispatchEvent(new Event('owms:unauthorized'));
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
