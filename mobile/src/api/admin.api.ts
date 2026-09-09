import apiClient from './client';
import { UserProfile } from './auth.api';

export interface AuditLogItem {
  _id: string;
  action: string;
  module: string;
  user?: { _id: string; name: string; email: string };
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

export const AdminApi = {
  async getSystemStats(): Promise<{
    success: boolean;
    data: {
      totalUsers: number;
      activeProjects: number;
      todayAttendance: number;
      pendingLeaves: number;
    };
  }> {
    const { data } = await apiClient.get('/api/admin/dashboard/stats');
    return data;
  },

  async getUsers(): Promise<{ success: boolean; data: UserProfile[] }> {
    const { data } = await apiClient.get('/api/admin/users');
    return data;
  },

  async getAuditLogs(page = 1, limit = 20): Promise<{ success: boolean; data: AuditLogItem[] }> {
    const { data } = await apiClient.get(`/api/admin/logs?page=${page}&limit=${limit}`);
    return data;
  },
};
