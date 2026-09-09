import apiClient from './client';

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type?: 'task' | 'leave' | 'attendance' | 'system' | 'general';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export const NotificationApi = {
  async getNotifications(): Promise<{ success: boolean; data: NotificationItem[]; unreadCount: number }> {
    const { data } = await apiClient.get('/api/notifications');
    return data;
  },

  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.patch(`/api/notifications/${notificationId}/read`);
    return data;
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    const { data } = await apiClient.post('/api/notifications/read-all');
    return data;
  },
};
