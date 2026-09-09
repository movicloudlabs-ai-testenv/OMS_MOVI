import apiClient from './client';

export interface UserRole {
  _id: string;
  name: string;
  slug: string;
}

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  employeeId?: string;
  role: UserRole | string;
  department?: { _id: string; name: string } | string;
  designation?: string;
  avatar?: string;
  phone?: string;
  isActive?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user: UserProfile;
}

export const AuthApi = {
  async login(identifier: string, password: string): Promise<LoginResponse> {
    const res = await apiClient.post('/api/auth/login', {
      identifier,
      password,
    });
    const payload = res.data?.data || res.data;
    return {
      success: res.data?.success ?? true,
      token: payload.token || payload.accessToken,
      accessToken: payload.token || payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
    };
  },

  async getMe(): Promise<{ success: boolean; user: UserProfile }> {
    const res = await apiClient.get('/api/auth/me');
    const userPayload = res.data?.data || res.data?.user || res.data;
    return {
      success: res.data?.success ?? true,
      user: userPayload,
    };
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (e) {
      // Ignore network errors during logout
    }
  },
};
