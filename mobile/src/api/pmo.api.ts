import apiClient from './client';
import { TaskItem } from './employee.api';

export interface ProjectItem {
  _id: string;
  name: string;
  key?: string;
  description?: string;
  status: 'active' | 'completed' | 'on-hold' | 'planning';
  health?: 'On Track' | 'At Risk' | 'Delayed';
  lead?: { _id: string; name: string };
  teamMembers?: { _id: string; name: string; role?: string }[];
  startDate?: string;
  endDate?: string;
  taskCount?: number;
}

export const PmoApi = {
  async getProjects(): Promise<{ success: boolean; data: ProjectItem[] }> {
    const { data } = await apiClient.get('/api/pmo/projects');
    return data;
  },

  async getProjectTasks(projectId?: string): Promise<{ success: boolean; data: TaskItem[] }> {
    const url = projectId ? `/api/pmo/tasks?project=${projectId}` : '/api/pmo/tasks';
    const { data } = await apiClient.get(url);
    return data;
  },

  async approveTask(taskId: string, approvalStatus: 'approved' | 'changes_requested', feedback?: string): Promise<any> {
    const { data } = await apiClient.post(`/api/pmo/tasks/${taskId}/review`, {
      status: approvalStatus,
      feedback,
    });
    return data;
  },
};
