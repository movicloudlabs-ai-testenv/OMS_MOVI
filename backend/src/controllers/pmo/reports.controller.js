import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import LeaveRequest from '../../models/LeaveRequest.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const getProjectHealth = async (req, res, next) => {
  try {
    const projects = await Project.find({ ...req.projectFilter, status: { $nin: ['Completed', 'Cancelled'] } });
    const projectIds = projects.map(p => p._id);

    const tasks = await Task.find({ project: { $in: projectIds } });
    const now = new Date();

    const healthReport = projects.map(project => {
      const pTasks = tasks.filter(t => t.project.toString() === project._id.toString());
      const overdue = pTasks.filter(t => t.dueDate < now && t.status !== 'Done').length;
      const blocked = pTasks.filter(t => t.status === 'Blocked').length;
      const done = pTasks.filter(t => t.status === 'Done').length;
      const completionPercent = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;
      
      let health = 'On Track';
      if (overdue > 3 || blocked > 2) health = 'Delayed';
      else if (overdue > 0 || blocked > 0) health = 'At Risk';

      return {
        _id: project._id,
        name: project.name,
        health,
        metrics: {
          totalTasks: pTasks.length,
          overdueTasks: overdue,
          blockedTasks: blocked,
          completionPercent,
        }
      };
    });

    sendSuccess(res, healthReport);
  } catch (error) {
    next(error);
  }
};

export const getResourceWarnings = async (req, res, next) => {
  try {
    const projects = await Project.find({ ...req.projectFilter }).select('team interns');
    
    const memberIds = new Set();
    projects.forEach(p => {
      p.team.forEach(t => memberIds.add(t.user.toString()));
      p.interns.forEach(i => memberIds.add(i.user.toString()));
    });
    
    const membersArray = Array.from(memberIds);

    // Get leaves that are approved and happening in the next 14 days
    const now = new Date();
    const next14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const upcomingLeaves = await LeaveRequest.find({
      user: { $in: membersArray },
      status: 'Approved',
      fromDate: { $lte: next14Days },
      toDate: { $gte: now },
    }).populate('user', 'name');

    // Get members with high workload (> 8 active tasks)
    const activeTasks = await Task.find({
      assignedTo: { $in: membersArray },
      status: { $nin: ['Done', 'Cancelled'] },
    }).populate('assignedTo', 'name');

    const workloadMap = new Map();
    activeTasks.forEach(t => {
      const uid = t.assignedTo._id.toString();
      if (!workloadMap.has(uid)) {
        workloadMap.set(uid, { user: t.assignedTo, count: 0 });
      }
      workloadMap.get(uid).count++;
    });

    const maxWorkload = parseInt(process.env.TASK_WORKLOAD_MAX) || 10;
    const overloadedMembers = Array.from(workloadMap.values())
      .filter(w => w.count > (maxWorkload * 0.8))
      .map(w => ({
        user: w.user.name,
        activeTasks: w.count,
        warning: `High workload (${w.count} active tasks)`
      }));

    const leaveWarnings = upcomingLeaves.map(l => ({
      user: l.user.name,
      leaveType: l.type,
      dates: `${new Date(l.fromDate).toLocaleDateString()} to ${new Date(l.toDate).toLocaleDateString()}`,
      warning: 'Upcoming leave'
    }));

    sendSuccess(res, {
      overloadedMembers,
      leaveWarnings,
    });
  } catch (error) {
    next(error);
  }
};

export const getReportsList = async (req, res, next) => {
  try {
    const pmoReports = [
      {
        _id: 'r1', name: 'Project Health Overview', category: 'Project Reports',
        description: 'Comprehensive health status for all active projects including completion rates, milestone tracking, and risk flags.',
        schedule: 'Weekly', type: 'system',
        lastRun: { status: 'SUCCESS', executedAt: new Date(Date.now() - 2 * 3600000).toISOString(), recordCount: 12, fileSize: '1.2 MB', duration: '1.4s' },
        runHistory: [
          { status: 'SUCCESS', executedAt: new Date(Date.now() - 2 * 3600000).toISOString(), duration: '1.4s', recordCount: 12 },
          { status: 'SUCCESS', executedAt: new Date(Date.now() - 7 * 86400000).toISOString(), duration: '1.2s', recordCount: 11 },
        ],
        outputFormats: ['CSV'], dataSource: ['Projects', 'Tasks', 'Milestones'],
      },
      {
        _id: 'r2', name: 'Resource Utilization Report', category: 'Resource Reports',
        description: 'All team members, workload percentage tracking, active task counts, and overloaded employee alerts.',
        schedule: 'Daily', type: 'system',
        lastRun: { status: 'SUCCESS', executedAt: new Date(Date.now() - 86400000).toISOString(), recordCount: 45, fileSize: '3.4 MB', duration: '2.1s' },
        runHistory: [
          { status: 'SUCCESS', executedAt: new Date(Date.now() - 86400000).toISOString(), duration: '2.1s', recordCount: 45 },
          { status: 'SUCCESS', executedAt: new Date(Date.now() - 2 * 86400000).toISOString(), duration: '1.9s', recordCount: 42 },
          { status: 'SUCCESS', executedAt: new Date(Date.now() - 3 * 86400000).toISOString(), duration: '2.0s', recordCount: 41 },
        ],
        outputFormats: ['CSV'], dataSource: ['Team', 'Tasks'],
      },
      {
        _id: 'r3', name: 'Task Velocity Report', category: 'Task Reports',
        description: 'Tasks completed per week mapped against projected velocity trend. Helps identify sprint slowdowns early.',
        schedule: 'Weekly', type: 'system',
        lastRun: { status: 'SUCCESS', executedAt: new Date(Date.now() - 2 * 86400000).toISOString(), recordCount: 340, fileSize: '5.1 MB', duration: '3.2s' },
        runHistory: [
          { status: 'SUCCESS', executedAt: new Date(Date.now() - 2 * 86400000).toISOString(), duration: '3.2s', recordCount: 340 },
          { status: 'SUCCESS', executedAt: new Date(Date.now() - 9 * 86400000).toISOString(), duration: '2.9s', recordCount: 310 },
        ],
        outputFormats: ['CSV'], dataSource: ['Tasks'],
      },
      {
        _id: 'r4', name: 'Milestone Tracker', category: 'Project Reports',
        description: 'All milestones across projects compared on-time vs delayed delivery for executive overview.',
        schedule: 'Monthly', type: 'system',
        lastRun: { status: 'SUCCESS', executedAt: new Date(Date.now() - 7 * 86400000).toISOString(), recordCount: 28, fileSize: '800 KB', duration: '0.9s' },
        runHistory: [
          { status: 'SUCCESS', executedAt: new Date(Date.now() - 7 * 86400000).toISOString(), duration: '0.9s', recordCount: 28 },
        ],
        outputFormats: ['CSV'], dataSource: ['Projects', 'Milestones'],
      },
      {
        _id: 'r5', name: 'Intern Performance Summary', category: 'Resource Reports',
        description: 'All interns, task completion rates, and weekly performance star ratings across all projects.',
        schedule: 'Weekly', type: 'system',
        lastRun: { status: 'SUCCESS', executedAt: new Date(Date.now() - 3 * 3600000).toISOString(), recordCount: 18, fileSize: '1.5 MB', duration: '1.1s' },
        runHistory: [
          { status: 'SUCCESS', executedAt: new Date(Date.now() - 3 * 3600000).toISOString(), duration: '1.1s', recordCount: 18 },
          { status: 'SUCCESS', executedAt: new Date(Date.now() - 7 * 86400000).toISOString(), duration: '1.0s', recordCount: 16 },
        ],
        outputFormats: ['CSV'], dataSource: ['Interns', 'Tasks'],
      },
      {
        _id: 'r6', name: 'Budget Utilization Report', category: 'Financial Reports',
        description: 'Budget spent vs allocated per project. Tracks burn rate to keep project finances on track.',
        schedule: 'Monthly', type: 'system',
        lastRun: { status: 'SUCCESS', executedAt: new Date(Date.now() - 86400000).toISOString(), recordCount: 8, fileSize: '450 KB', duration: '0.7s' },
        runHistory: [
          { status: 'SUCCESS', executedAt: new Date(Date.now() - 86400000).toISOString(), duration: '0.7s', recordCount: 8 },
        ],
        outputFormats: ['CSV'], dataSource: ['Projects'],
      },
      {
        _id: 'r7', name: 'Blocker Resolution Report', category: 'Task Reports',
        description: 'Blocked tasks trend and average resolution time across projects. Helps surface recurring blockers.',
        schedule: 'Daily', type: 'system',
        lastRun: { status: 'FAILED', executedAt: new Date(Date.now() - 5 * 60000).toISOString(), errorMessage: 'Timeout querying blocked tasks' },
        runHistory: [
          { status: 'FAILED', executedAt: new Date(Date.now() - 5 * 60000).toISOString(), errorMessage: 'Timeout' },
          { status: 'SUCCESS', executedAt: new Date(Date.now() - 86400000).toISOString(), duration: '1.8s', recordCount: 5 },
        ],
        outputFormats: ['CSV'], dataSource: ['Tasks'],
      },
    ];
    sendSuccess(res, pmoReports);
  } catch (error) {
    next(error);
  }
};
