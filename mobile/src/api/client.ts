import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { SecureStorage, STORAGE_KEYS } from '../services/storage';

const apiClient: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Inject Bearer JWT from SecureStorage
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStorage.get(STORAGE_KEYS.ACCESS_TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 & token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStorage.get(STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          const { data } = await axios.post(`${ENV.API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const newAccessToken =
            data.data?.token || data.data?.accessToken || data.accessToken || data.token;
          if (newAccessToken) {
            await SecureStorage.set(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshErr) {
        await SecureStorage.delete(STORAGE_KEYS.ACCESS_TOKEN);
        await SecureStorage.delete(STORAGE_KEYS.REFRESH_TOKEN);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
