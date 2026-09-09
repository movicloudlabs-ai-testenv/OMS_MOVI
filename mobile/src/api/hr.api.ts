import apiClient from './client';
import { UserProfile } from './auth.api';
import { LeaveRequestItem } from './employee.api';

export const HrApi = {
  async getEmployees(): Promise<{ success: boolean; data: UserProfile[] }> {
    const { data } = await apiClient.get('/api/hr/employees');
    return data;
  },

  async getPendingLeaves(): Promise<{ success: boolean; data: LeaveRequestItem[] }> {
    const { data } = await apiClient.get('/api/hr/leaves/pending');
    return data;
  },

  async updateLeaveStatus(
    leaveId: string,
    status: 'approved' | 'rejected',
    comment?: string
  ): Promise<{ success: boolean; data: LeaveRequestItem }> {
    const { data } = await apiClient.patch(`/api/hr/leaves/${leaveId}/status`, {
      status,
      comment,
    });
    return data;
  },
};
