import LeaveRequest from '../../models/LeaveRequest.js';
import Task from '../../models/Task.js';
import Project from '../../models/Project.js';
import User from '../../models/User.js';
import Role from '../../models/Role.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { sendNotification } from '../../utils/sendNotification.js';

export const getPendingLeaves = async (req, res, next) => {
  try {
    // Collect project team members (non-interns)
    const projects = await Project.find({ ...req.projectFilter }).select('team');
    const memberIds = new Set();
    projects.forEach(p => p.team.forEach(t => memberIds.add(t.user.toString())));

    const employeeIds = await User.find({
      _id: { $in: Array.from(memberIds) },
      employmentType: { $ne: 'Intern' },
    }).select('_id').then(u => u.map(u => u._id));

    // Also include HR managers — their leave requests go to PMO for approval
    const hrRoles = await Role.find({ slug: { $in: ['hr', 'hr-manager'] } }).select('_id');
    const hrRoleIds = hrRoles.map(r => r._id);
    const hrUserIds = await User.find({ role: { $in: hrRoleIds } }).select('_id').then(u => u.map(u => u._id));

    // Merge and deduplicate
    const allUserIdStrs = new Set([
      ...employeeIds.map(id => id.toString()),
      ...hrUserIds.map(id => id.toString()),
    ]);
    const allUserIds = Array.from(allUserIdStrs);

    const pendingLeaves = await LeaveRequest.find({
      user: { $in: allUserIds },
      status: 'Pending',
    })
      .populate('user', 'name employeeId avatar department designation role')
      .populate({ path: 'user', populate: { path: 'role', select: 'name slug' } })
      .sort({ createdAt: 1 });

    sendSuccess(res, pendingLeaves);
  } catch (error) {
    next(error);
  }
};

/**
 * Read-only leave overview for PMO — shows who is / was on leave across the
 * PMO's project team (employees + interns) and all HR managers. Approved leaves
 * only, from the last 30 days onward. PMO cannot act on these — visibility only.
 */
export const getLeaveOverview = async (req, res, next) => {
  try {
    const projects = await Project.find({ ...req.projectFilter }).select('team');
    const memberIds = new Set();
    projects.forEach(p => p.team.forEach(t => memberIds.add(t.user.toString())));

    // Include all HR managers
    const hrRoles = await Role.find({ slug: { $in: ['hr', 'hr-manager'] } }).select('_id');
    const hrRoleIds = hrRoles.map(r => r._id);
    const hrUsers = await User.find({ role: { $in: hrRoleIds } }).select('_id');
    hrUsers.forEach(u => memberIds.add(u._id.toString()));

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const leaves = await LeaveRequest.find({
      user: { $in: Array.from(memberIds) },
      status: 'Approved',
      toDate: { $gte: cutoff },
    })
      .populate({
        path: 'user',
        select: 'name employeeId avatar department designation role',
        populate: { path: 'role', select: 'name slug' },
      })
      .sort({ fromDate: -1 })
      .lean();

    const leavesWithTasks = await Promise.all(leaves.map(async (leave) => {
      const pendingTasks = await Task.find({
        assignedTo: leave.user._id,
        status: { $in: ['Todo', 'In Progress', 'In Review', 'Blocked'] }
      }).select('title status priority dueDate');
      return { ...leave, pendingTasks };
    }));

    sendSuccess(res, leavesWithTasks);
  } catch (error) {
    next(error);
  }
};

export const getPendingOnboarding = async (req, res, next) => {
  try {
    // Show recently added employees/interns with incomplete onboarding across PMO's
    // projects. Staff roles (admin/HR/PMO) are never "onboarded" by the PMO, so
    // exclude them even when they sit on a project team (e.g. as HR Representative).
    const projects = await Project.find({ ...req.projectFilter }).select('team interns');
    const memberIds = new Set();
    projects.forEach(p => {
      p.team.forEach(t => t.user && memberIds.add(t.user.toString()));
      p.interns.forEach(i => i.user && memberIds.add(i.user.toString()));
    });

    const staffRoles = await Role.find({
      slug: { $in: ['super-admin', 'admin', 'hr-manager', 'pmo-lead'] },
    }).select('_id');
    const staffRoleIds = staffRoles.map(r => r._id);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const pendingUsers = await User.find({
      _id: { $in: Array.from(memberIds) },
      role: { $nin: staffRoleIds },
      status: 'Active',
      onboardingComplete: { $ne: true },
      createdAt: { $gte: thirtyDaysAgo },
    })
      .populate('department', 'name')
      .populate('role', 'name color')
      .select('name employeeId avatar department role onboardingChecklist createdAt designation employmentType');

    const usersWithProgress = pendingUsers.map(u => {
      const user = u.toJSON();
      const checklist = user.onboardingChecklist || {};
      const items = Object.values(checklist);
      const completed = items.filter(Boolean).length;
      user.onboardingProgress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
      return user;
    });

    sendSuccess(res, usersWithProgress);
  } catch (error) {
    next(error);
  }
};

export const approveOnboarding = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return sendError(res, 'User not found', 404);

    user.onboardingComplete = true;
    await user.save({ validateBeforeSave: false });

    await sendNotification({
      recipient: user._id,
      type: 'system_alert',
      title: 'Onboarding Approved',
      message: `Your onboarding has been approved by PMO Lead ${req.user.name}. Welcome to the team!`,
      sender: req.user._id,
    });

    sendSuccess(res, null, 'Onboarding approved successfully');
  } catch (error) {
    next(error);
  }
};

export const getTasksInReview = async (req, res, next) => {
  try {
    const projects = await Project.find({ ...req.projectFilter }).select('_id name');
    const projectIds = projects.map(p => p._id);

    const tasksInReview = await Task.find({
      project: { $in: projectIds },
      status: 'In Review',
    })
      .populate('assignedTo', 'name avatar')
      .populate('project', 'name');

    sendSuccess(res, tasksInReview);
  } catch (error) {
    next(error);
  }
};

export const updateApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, note, projectImpact } = req.body; // action: 'approve' | 'reject'

    // 1. Try to find if it is a Task first
    let task = await Task.findById(id).populate('project');
    if (task) {
      if (req.user.role.slug !== 'super-admin' && task.project.manager?.toString() !== req.user._id.toString()) {
        return sendError(res, 'Not authorized to approve/reject tasks for this project', 403);
      }
      
      const newStatus = action === 'approve' ? 'Done' : 'Todo';
      task.status = newStatus;
      
      if (action === 'approve') {
        task.approvedAt = new Date();
        task.approvedBy = req.user._id;
        
        await sendNotification({
          recipient: task.assignedTo,
          type: 'system_alert',
          title: 'Task Approved',
          message: `Task '${task.title}' approved and marked complete by PMO Lead ${req.user.name} ✓`,
          sender: req.user._id,
        });
      } else {
        task.blockedReason = note || 'Changes requested by PMO';
        await sendNotification({
          recipient: task.assignedTo,
          type: 'system_alert',
          title: 'Task Changes Requested',
          message: `PMO Lead ${req.user.name} requested changes for task '${task.title}'. Notes: ${note || 'None'}`,
          sender: req.user._id,
        });
      }
      
      task.statusHistory.push({ status: newStatus, changedBy: req.user._id, changedAt: new Date() });
      await task.save();
      
      return sendSuccess(res, task, `Task successfully ${action}d`);
    }

    // 2. Leave requests are informational for PMO — they cannot approve/reject.
    const leave = await LeaveRequest.findById(id);
    if (leave) {
      return sendError(res, 'Leave requests are informational only and cannot be approved or rejected by PMO.', 403);
    }

    return sendError(res, 'Task not found with the provided ID', 404);
  } catch (error) {
    next(error);
  }
};
