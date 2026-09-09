import apiClient from './client';

export interface AttendanceRecord {
  _id?: string;
  user?: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'half-day' | 'leave' | 'holiday';
  workMode?: 'office' | 'remote' | 'hybrid';
  latitude?: number;
  longitude?: number;
  isGeofenced?: boolean;
}

export interface TaskItem {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'in-review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project?: { _id: string; name: string; key?: string };
  assignedTo?: { _id: string; name: string; avatar?: string };
  dueDate?: string;
  subtasks?: { _id: string; title: string; completed: boolean }[];
  commentsCount?: number;
}

export interface LeaveBalance {
  casualLeave: { total: number; used: number; remaining: number };
  sickLeave: { total: number; used: number; remaining: number };
  earnedLeave: { total: number; used: number; remaining: number };
}

export interface LeaveRequestItem {
  _id: string;
  leaveType: 'casual' | 'sick' | 'earned' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
}

export const EmployeeApi = {
  // Attendance
  async getTodayAttendance(): Promise<{ success: boolean; data: AttendanceRecord | null }> {
    const { data } = await apiClient.get('/api/employee/attendance/today');
    return data;
  },

  async checkIn(payload?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number | null;
    isGeofenced?: boolean;
    workMode?: 'office' | 'remote';
  }): Promise<{ success: boolean; data: AttendanceRecord; message?: string }> {
    const { data } = await apiClient.post('/api/employee/attendance/check-in', payload || {});
    return data;
  },

  async checkOut(): Promise<{ success: boolean; data: AttendanceRecord; message?: string }> {
    const { data } = await apiClient.post('/api/employee/attendance/check-out', {});
    return data;
  },

  async getMyAttendanceHistory(): Promise<{ success: boolean; data: AttendanceRecord[] }> {
    const { data } = await apiClient.get('/api/employee/attendance');
    return data;
  },

  // Tasks
  async getMyTasks(): Promise<{ success: boolean; data: TaskItem[] }> {
    const { data } = await apiClient.get('/api/employee/tasks');
    return data;
  },

  async updateTaskStatus(taskId: string, status: string): Promise<{ success: boolean; data: TaskItem }> {
    const { data } = await apiClient.patch(`/api/employee/tasks/${taskId}/status`, { status });
    return data;
  },

  // Leaves
  async getLeaveBalance(): Promise<{ success: boolean; data: LeaveBalance }> {
    const { data } = await apiClient.get('/api/employee/leave/balance');
    return data;
  },

  async getMyLeaveRequests(): Promise<{ success: boolean; data: LeaveRequestItem[] }> {
    const { data } = await apiClient.get('/api/employee/leave/requests');
    return data;
  },

  async applyLeave(payload: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
  }): Promise<{ success: boolean; data: LeaveRequestItem }> {
    const { data } = await apiClient.post('/api/employee/leave/apply', payload);
    return data;
  },

  // EOD
  async submitEOD(payload: { summary: string; tasksCompleted: string[]; blockers?: string }): Promise<any> {
    const { data } = await apiClient.post('/api/employee/eod', payload);
    return data;
  },
};
