import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import User from '../../models/User.js';
import Role from '../../models/Role.js';
import LeaveRequest from '../../models/LeaveRequest.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

export const getTeam = async (req, res, next) => {
  try {
    const projects = await Project.find({ ...req.projectFilter })
      .populate({
        path: 'team.user',
        select: 'name designation avatar department employmentType',
        match: { deletedAt: { $exists: false } },
        populate: {
          path: 'department',
          select: 'name code'
        }
      })
      .populate({
        path: 'interns.user',
        select: 'name designation avatar department employmentType',
        match: { deletedAt: { $exists: false } },
        populate: {
          path: 'department',
          select: 'name code'
        }
      });
    
    const projectIds = projects.map(p => p._id);
    const membersMap = new Map();

    projects.forEach(project => {
      project.team.forEach(member => {
        if (member.user) {
          const userId = member.user._id.toString();
          if (!membersMap.has(userId)) {
            membersMap.set(userId, {
              user: member.user,
              projects: [],
            });
          }
          membersMap.get(userId).projects.push(project.name);
        }
      });
      project.interns.forEach(member => {
        if (member.user && member.user.name) { // populated checks if needed
          const userId = member.user._id.toString();
          if (!membersMap.has(userId)) {
            membersMap.set(userId, {
              user: member.user,
              projects: [],
            });
          }
          membersMap.get(userId).projects.push(project.name);
        }
      });
    });

    const maxWorkload = parseInt(process.env.TASK_WORKLOAD_MAX) || 10;
    const now = new Date();
    
    // Calculate workload for each member
    const teamStats = await Promise.all(
      Array.from(membersMap.values()).map(async (data) => {
        const tasks = await Task.find({
          assignedTo: data.user._id,
          project: { $in: projectIds }
        });

        const activeTasks = tasks.filter(t => t.status !== 'Done').length;
        const completedTasks = tasks.filter(t => t.status === 'Done').length;
        const overdueTasksCount = tasks.filter(t => t.status !== 'Done' && t.dueDate < now).length;
        
        const workload = Math.min(Math.round((activeTasks / maxWorkload) * 100), 100);

        return {
          user: data.user,
          projects: data.projects,
          stats: {
            activeTasks,
            completedTasks,
            overdueTasksCount,
            workload,
          }
        };
      })
    );

    sendSuccess(res, teamStats);
  } catch (error) {
    next(error);
  }
};

export const getMemberById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('role', 'name slug')
      .populate('department', 'name code')
      .populate('manager', 'name employeeId designation')
      .populate('hrManager', 'name employeeId');

    if (!user) return sendError(res, 'User not found', 404);

    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

export const getAvailableMembers = async (req, res, next) => {
  try {
    const { type } = req.query; // 'hr' or 'employee'

    const excludeSlugs = ['super-admin', 'admin', 'pmo-lead'];
    const hrSlugs = ['hr-manager', 'hr'];

    const [excludedRoles, hrRoles] = await Promise.all([
      Role.find({ slug: { $in: excludeSlugs } }),
      Role.find({ slug: { $in: hrSlugs } }),
    ]);
    const excludedRoleIds = excludedRoles.map(r => r._id);
    const hrRoleIds = hrRoles.map(r => r._id);

    let roleFilter;
    let employmentTypeFilter = {};

    if (type === 'hr') {
      roleFilter = { role: { $in: hrRoleIds } };
    } else if (type === 'intern') {
      roleFilter = { role: { $nin: excludedRoleIds } };
      employmentTypeFilter = { employmentType: 'Intern' };
    } else {
      // type === 'employee': exclude admins, hr, and interns
      roleFilter = { role: { $nin: [...excludedRoleIds, ...hrRoleIds] } };
      employmentTypeFilter = { employmentType: { $ne: 'Intern' } };
    }

    let filter = {
      status: 'Active',
      ...roleFilter,
      ...employmentTypeFilter,
    };

    if (type !== 'hr') {
      filter.$or = [{ project: { $exists: false } }, { project: null }];
    }

    let availableUsers = await User.find(filter)
      .select('name designation department avatar employmentType role email employeeId domain college batch')
      .populate('role', 'name slug')
      .populate('department', 'name code');
      
    if (type === 'hr') {
      availableUsers = await Promise.all(
        availableUsers.map(async (u) => {
          const userObj = u.toJSON();
          userObj.currentProjects = await Project.countDocuments({
            hrManager: u._id,
            status: { $in: ['Active', 'Planning'] },
          });
          return userObj;
        })
      );
    }

    sendSuccess(res, availableUsers);
  } catch (error) {
    next(error);
  }
};

export const getTeamLeaves = async (req, res, next) => {
  try {
    const projects = await Project.find({ ...req.projectFilter });
    
    const userIds = new Set();
    projects.forEach(p => {
      p.team.forEach(m => userIds.add(m.user.toString()));
      p.interns.forEach(m => userIds.add(m.user.toString()));
    });
    
    const leaves = await LeaveRequest.find({ user: { $in: Array.from(userIds) } })
      .populate('user', 'name employeeId avatar designation department')
      .sort({ createdAt: -1 });
      
    sendSuccess(res, leaves);
  } catch (error) {
    next(error);
  }
};
