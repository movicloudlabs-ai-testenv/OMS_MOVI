import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const projects = await Project.find({ ...req.projectFilter });
    const projectIds = projects.map(p => p._id);
    
    // 1. Active projects count
    const activeProjectsCount = projects.filter(
      p => p.status === 'Active' || p.status === 'Planning'
    ).length;
    
    // 2. Delayed/At Risk projects count
    // A project is considered delayed/at risk if healthStatus is 'Delayed' or 'At Risk'
    const delayedProjectsCount = projects.filter(
      p => p.healthStatus === 'Delayed' || p.healthStatus === 'At Risk'
    ).length;
    
    // 3. Resource Utilization (workload stats)
    // Gather all unique team members and interns assigned to these projects
    const membersMap = new Map();
    projects.forEach(project => {
      project.team.forEach(member => {
        if (member.user) {
          membersMap.set(member.user.toString(), true);
        }
      });
      project.interns.forEach(intern => {
        if (intern.user) {
          membersMap.set(intern.user.toString(), true);
        }
      });
    });
    
    const maxWorkload = parseInt(process.env.TASK_WORKLOAD_MAX) || 10;
    let totalWorkload = 0;
    const memberIds = Array.from(membersMap.keys());
    
    if (memberIds.length > 0) {
      const tasks = await Task.find({
        assignedTo: { $in: memberIds },
        project: { $in: projectIds }
      });
      
      memberIds.forEach(memberId => {
        const activeTasks = tasks.filter(
          t => t.assignedTo.toString() === memberId && t.status !== 'Done'
        ).length;
        const workload = Math.min(Math.round((activeTasks / maxWorkload) * 100), 100);
        totalWorkload += workload;
      });
    }
    
    const avgUtilization = memberIds.length > 0
      ? Math.round(totalWorkload / memberIds.length)
      : 0;
      
    // 4. Upcoming milestones count
    let upcomingMilestonesCount = 0;
    projects.forEach(p => {
      if (p.milestones) {
        p.milestones.forEach(m => {
          if (m.status === 'upcoming' || m.status === 'current') {
            upcomingMilestonesCount++;
          }
        });
      }
    });

    sendSuccess(res, {
      activeProjectsCount,
      delayedProjectsCount,
      avgUtilization,
      upcomingMilestonesCount
    });
  } catch (error) {
    next(error);
  }
};
