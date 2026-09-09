import Task from '../../models/Task.js';
import Project from '../../models/Project.js';
import User from '../../models/User.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js';
import { getPagination } from '../../utils/paginate.js';
import { sendNotification } from '../../utils/sendNotification.js';
import { generateTaskCode } from '../../utils/generateTaskCode.js';

// Allowed status transitions for employees
const ALLOWED_TRANSITIONS = {
  'Todo': ['In Progress', 'In Review', 'Done'],
  'In Progress': ['In Review', 'Blocked', 'Done', 'Todo'],
  'Blocked': ['In Progress', 'Todo'],
  'In Review': ['In Progress', 'Done', 'Testing'],
  'Testing': ['In Review', 'Done', 'In Progress'],
  'Done': ['In Progress', 'Todo'],
};

export const getMyTasks = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, priority, projectId, overdue, search, scope, view } = req.query;

    const isTeamView = scope === 'team' || view === 'team';
    const isTestingView = scope === 'testing' || view === 'testing';
    let filter = {};

    if (isTestingView) {
      if (projectId) {
        filter.project = projectId;
      } else {
        const userProjects = await Project.find({
          $or: [
            { manager: req.user._id },
            { 'team.user': req.user._id },
            { 'interns.user': req.user._id },
          ],
          status: { $ne: 'Cancelled' },
        }).select('_id');
        const projIds = userProjects.map((p) => p._id);
        filter.project = { $in: projIds };
      }
      filter.$or = [
        { status: 'Testing' },
        { assignedTester: req.user._id },
      ];
    } else if (isTeamView) {
      if (projectId) {
        filter.project = projectId;
      } else {
        // Find projects where user is manager, lead, or member
        const userProjects = await Project.find({
          $or: [
            { manager: req.user._id },
            { 'team.user': req.user._id },
            { 'interns.user': req.user._id },
          ],
          status: { $ne: 'Cancelled' },
        }).select('_id');
        const projIds = userProjects.map((p) => p._id);
        filter.project = { $in: projIds };
      }
    } else {
      filter.assignedTo = req.user._id;
      if (projectId) filter.project = projectId;
    }

    if (status) {
      const statuses = status.split(',');
      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }
    if (priority) filter.priority = priority;
    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $ne: 'Done' };
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('project', 'name code status priority manager')
        .populate('assignedTo', 'name role avatar designation')
        .populate('assignedBy', 'name role avatar designation')
        .populate('assignedTester', 'name role avatar designation')
        .sort({ dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    const now = new Date();
    const tasksWithOverdue = tasks.map((t) => {
      const obj = t.toObject();
      obj.isOverdue = t.dueDate && t.dueDate < now && t.status !== 'Done';
      return obj;
    });

    sendPaginated(res, tasksWithOverdue, {
      total, page, limit,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    next(error);
  }
};

export const getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name code status manager team interns')
      .populate('assignedTo', 'name role avatar designation')
      .populate('assignedBy', 'name role avatar designation')
      .populate('comments.author', 'name avatar role')
      .populate('approvedBy', 'name');

    if (!task) return sendError(res, 'Task not found', 404);

    const isAssignee = task.assignedTo?._id?.toString() === req.user._id.toString() ||
                       task.assignedTo?.toString() === req.user._id.toString();
    const isAssigner = task.assignedBy?._id?.toString() === req.user._id.toString() ||
                       task.assignedBy?.toString() === req.user._id.toString();
    const isManager = task.project?.manager?.toString() === req.user._id.toString();
    const isTeamMember = (task.project?.team || []).some((t) => t.user?.toString() === req.user._id.toString()) ||
                         (task.project?.interns || []).some((i) => i.user?.toString() === req.user._id.toString());
    const isPmoOrAdmin = ['pmo-lead', 'admin', 'super-admin'].includes(req.user.role?.slug);

    if (!isAssignee && !isAssigner && !isManager && !isTeamMember && !isPmoOrAdmin) {
      return sendError(res, 'You do not have permission to view this task', 403);
    }

    const obj = task.toObject();
    obj.isOverdue = task.dueDate && task.dueDate < new Date() && task.status !== 'Done';
    sendSuccess(res, obj);
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatus = async (req, res, next) => {
  try {
    let { status, note } = req.body;
    if (!status) return sendError(res, 'Status is required', 400);

    // Normalize status string (e.g. 'Completed' -> 'Done', 'in-progress' -> 'In Progress')
    const statusLower = status.toLowerCase().trim();
    if (statusLower === 'completed' || statusLower === 'done') {
      status = 'Done';
    } else if (statusLower === 'in progress' || statusLower === 'in-progress' || statusLower === 'inprogress') {
      status = 'In Progress';
    } else if (statusLower === 'in review' || statusLower === 'in-review' || statusLower === 'inreview') {
      status = 'In Review';
    } else if (statusLower === 'testing') {
      status = 'Testing';
    } else if (statusLower === 'blocked') {
      status = 'Blocked';
    } else if (statusLower === 'todo') {
      status = 'Todo';
    }

    const task = await Task.findById(req.params.id)
      .populate('project', 'name manager team');

    if (!task) return sendError(res, 'Task not found', 404);

    const isAssignee = task.assignedTo?.toString() === req.user._id.toString();
    const isAssigner = task.assignedBy?.toString() === req.user._id.toString();
    const isManager = task.project?.manager?.toString() === req.user._id.toString();
    const isPmoOrAdmin = ['pmo-lead', 'admin', 'super-admin'].includes(req.user.role?.slug);

    if (!isAssignee && !isAssigner && !isManager && !isPmoOrAdmin) {
      return sendError(res, 'You do not have permission to update this task', 403);
    }

    const allowed = ALLOWED_TRANSITIONS[task.status] || [];
    if (!allowed.includes(status) && task.status !== status) {
      return sendError(
        res,
        `Cannot move task from "${task.status}" to "${status}". Allowed transitions: ${allowed.join(', ') || 'none'}`,
        400
      );
    }

    // If EOD report has been submitted, prevent reverting to 'Todo' or 'In Progress'
    if (task.eodSubmitted && ['Todo', 'In Progress'].includes(status) && !isPmoOrAdmin && !isManager) {
      return sendError(
        res,
        'Cannot revert task to In Progress / Todo after EOD report has been submitted.',
        400
      );
    }

    task.status = status;
    task.statusHistory.push({ status, changedBy: req.user._id, changedAt: new Date(), note });

    if (status === 'Done') {
      task.completedAt = new Date();
      if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        task.subtasks.forEach((s) => {
          s.completed = true;
          if (!s.completedAt) s.completedAt = new Date();
        });
      }
    }

    if (status === 'In Review') {
      task.submittedAt = new Date();
      await sendNotification({
        recipient: task.assignedBy,
        type: 'task_submitted_for_review',
        title: 'Task Ready for Review',
        message: `${req.user.name} submitted "${task.title}" for review — Project: ${task.project?.name}`,
        link: '/pmo/approvals',
        sender: req.user._id,
      });
    }

    if (status === 'Blocked') {
      if (note) task.blockedReason = note;
      await sendNotification({
        recipient: task.assignedBy,
        type: 'task_blocked',
        title: 'Task Blocked',
        message: `⚠ ${req.user.name} reported "${task.title}" as blocked. Reason: ${note || 'No reason provided'}`,
        link: '/pmo/monitoring',
        sender: req.user._id,
      });
      // Notify project manager if different from assignedBy
      if (task.project?.manager && task.project.manager.toString() !== task.assignedBy.toString()) {
        await sendNotification({
          recipient: task.project.manager,
          type: 'task_blocked',
          title: 'Task Blocked',
          message: `⚠ ${req.user.name} reported "${task.title}" as blocked. Reason: ${note || 'No reason provided'}`,
          link: '/pmo/monitoring',
          sender: req.user._id,
        });
      }
    }

    if (status === 'In Progress' && task.blockedReason) {
      task.blockedReason = undefined;
      await sendNotification({
        recipient: task.assignedBy,
        type: 'system_alert',
        title: 'Task Unblocked',
        message: `${req.user.name} unblocked task "${task.title}"`,
        link: '/pmo/tasks',
        sender: req.user._id,
      });
    }

    await task.save();
    sendSuccess(res, task, `Task moved to ${status}`);
  } catch (error) {
    next(error);
  }
};

export const addTaskComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return sendError(res, 'Comment text is required', 400);

    const task = await Task.findById(req.params.id);
    if (!task) return sendError(res, 'Task not found', 404);

    const isAssignee = task.assignedTo.toString() === req.user._id.toString();
    const isAssigner = task.assignedBy.toString() === req.user._id.toString();
    if (!isAssignee && !isAssigner) {
      return sendError(res, 'You do not have permission to comment on this task', 403);
    }

    task.comments.push({ author: req.user._id, text: text.trim(), createdAt: new Date() });
    await task.save();

    const notifyRecipient = isAssignee ? task.assignedBy : task.assignedTo;
    const truncated = text.length > 80 ? text.slice(0, 80) + '...' : text;
    await sendNotification({
      recipient: notifyRecipient,
      type: 'task_comment',
      title: 'New Comment on Task',
      message: `${req.user.name} commented on "${task.title}": "${truncated}"`,
      link: `/tasks?taskId=${task._id}`,
      sender: req.user._id,
      metadata: { taskId: task._id, projectId: task.project },
    });

    await task.populate('comments.author', 'name avatar role');
    const newComment = task.comments[task.comments.length - 1];
    sendSuccess(res, newComment, 'Comment added');
  } catch (error) {
    next(error);
  }
};

export const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded', 400);

    const task = await Task.findById(req.params.id);
    if (!task) return sendError(res, 'Task not found', 404);
    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return sendError(res, 'This task is not assigned to you', 403);
    }

    const sizeKB = req.file.size / 1024;
    const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB.toFixed(0)} KB`;

    task.attachments.push({
      name: req.file.originalname,
      path: req.file.filename,
      size: sizeStr,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    });
    await task.save();

    sendSuccess(res, task.attachments, 'Attachment uploaded');
  } catch (error) {
    next(error);
  }
};

export const toggleSubtask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return sendError(res, 'Task not found', 404);
    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return sendError(res, 'This task is not assigned to you', 403);
    }

    let subtask = null;
    try {
      subtask = task.subtasks.id(req.params.subtaskId);
    } catch (_) {}

    if (!subtask) {
      subtask = task.subtasks.find((s) => s._id?.toString() === req.params.subtaskId);
    }

    if (!subtask) {
      const idx = parseInt(req.params.subtaskId, 10);
      if (!isNaN(idx) && task.subtasks[idx]) {
        subtask = task.subtasks[idx];
      }
    }

    if (!subtask) return sendError(res, 'Subtask not found', 404);

    // If EOD report has already been submitted, completed subtasks cannot be undone
    if (task.eodSubmitted && subtask.completed) {
      return sendError(
        res,
        'Cannot uncheck subtask after EOD report has been submitted for this task.',
        400
      );
    }

    subtask.completed = !subtask.completed;
    if (subtask.completed) {
      subtask.completedAt = new Date();
    }

    // If all subtasks are now completed, auto-mark task as Done (finished)
    const allDone = task.subtasks.length > 0 && task.subtasks.every((s) => s.completed);
    if (allDone && task.status !== 'Done') {
      task.status = 'Done';
      task.completedAt = new Date();
      task.statusHistory.push({
        status: 'Done',
        changedBy: req.user._id,
        changedAt: new Date(),
        note: 'Auto-completed upon finishing all subtasks',
      });
    } else if (!subtask.completed && task.status === 'Done') {
      task.status = 'In Progress';
      task.statusHistory.push({
        status: 'In Progress',
        changedBy: req.user._id,
        changedAt: new Date(),
        note: 'Reverted to In Progress upon unchecking subtask',
      });
    }

    await task.save();

    sendSuccess(res, task, 'Subtask updated');
  } catch (error) {
    next(error);
  }
};

// POST /personal — create a personal to-do task (self-assigned, no project required)
export const createPersonalTask = async (req, res, next) => {
  try {
    const { title, priority, notes, dueDate } = req.body;

    if (!title?.trim()) {
      return sendError(res, 'Task title is required', 400);
    }

    const validPriority = ['Critical', 'High', 'Medium', 'Low'].includes(priority)
      ? priority
      : 'Medium';

    // Find or create a personal sentinel project for this user
    // We use the 'Personal' project if available, else create the task without project
    // by using the first project the employee belongs to as a soft anchor.
    // If no project exists, we store project as null (schema allows null via 'required: true'
    // override — we bypass validation for personal tasks).
    const task = new Task({
      title: title.trim(),
      description: notes?.trim() || '',
      project: null,           // Personal tasks have no project
      assignedBy: req.user._id,
      assignedTo: req.user._id,
      priority: validPriority,
      status: 'In Progress',
      taskType: 'personal',
      dueDate: dueDate ? new Date(dueDate) : null,
      startDate: new Date(),
    });

    // Bypass the 'project required' validator for personal tasks
    await task.save({ validateBeforeSave: false });

    sendSuccess(res, task, 'Personal task created', 201);
  } catch (error) {
    next(error);
  }
};

// ─── My Projects ───────────────────────────────────────────────────────────────
/**
 * GET /api/employee/tasks/my-projects
 * Returns all projects where the current user is either:
 *  - The project manager (isLeader = true)
 *  - A team member or intern
 *  - Part of the project assigned on user document
 *  - PMO Lead or Admin (isLeader = true)
 */
export const getMyProjects = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const currentUser = await User.findById(userId).select('project role designation');
    const userRoleSlug = req.user.role?.slug;
    const isPmoOrAdmin = ['pmo-lead', 'admin', 'super-admin'].includes(userRoleSlug);

    let query;
    if (isPmoOrAdmin) {
      query = { status: { $ne: 'Cancelled' } };
    } else {
      const orConditions = [
        { manager: userId },
        { 'team.user': userId },
        { 'interns.user': userId },
      ];
      if (currentUser?.project) {
        orConditions.push({ _id: currentUser.project });
      }
      query = { $or: orConditions, status: { $ne: 'Cancelled' } };
    }

    const projects = await Project.find(query)
      .select('name code status priority manager team interns')
      .populate('manager', 'name avatar')
      .sort({ updatedAt: -1 });

    const result = projects.map((proj) => {
      const isManager = proj.manager?._id?.toString() === userId.toString();
      const teamEntry = (proj.team || []).find(
        (t) => t.user?.toString() === userId.toString()
      );
      const isTeamLead = /lead|manager|head|director/i.test(teamEntry?.role || '') ||
                         /lead|manager|head|director/i.test(currentUser?.designation || '');
      const isLeader = isManager || isPmoOrAdmin || isTeamLead;

      const memberRole = isManager
        ? 'Project Lead'
        : (teamEntry?.role || (isLeader ? 'Project Lead' : 'Team Member'));

      return {
        id: proj._id,
        name: proj.name,
        code: proj.code || 'PRJ',
        status: proj.status,
        priority: proj.priority,
        isLeader,
        memberRole,
        managerName: proj.manager?.name,
        teamSize: (proj.team?.length || 0) + (proj.interns?.length || 0) + 1,
      };
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/employee/tasks/project-members/:projectId
 * Returns all potential assignees for this project:
 * Project manager, team members, interns, and available personnel.
 */
export const getProjectTeamMembers = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId)
      .populate('manager', 'name email avatar designation role employeeId')
      .populate('team.user', 'name email avatar designation role employeeId')
      .populate('interns.user', 'name email avatar designation role employeeId');

    if (!project) return sendError(res, 'Project not found', 404);

    const membersMap = new Map();

    if (project.manager) {
      membersMap.set(project.manager._id.toString(), {
        _id: project.manager._id,
        name: project.manager.name,
        email: project.manager.email,
        avatar: project.manager.avatar,
        designation: project.manager.designation || 'Project Manager',
        role: 'Manager',
        employeeId: project.manager.employeeId,
      });
    }

    (project.team || []).forEach((t) => {
      if (t.user) {
        membersMap.set(t.user._id.toString(), {
          _id: t.user._id,
          name: t.user.name,
          email: t.user.email,
          avatar: t.user.avatar,
          designation: t.user.designation || t.role || 'Developer',
          role: t.role || 'Member',
          employeeId: t.user.employeeId,
        });
      }
    });

    (project.interns || []).forEach((i) => {
      if (i.user) {
        membersMap.set(i.user._id.toString(), {
          _id: i.user._id,
          name: i.user.name,
          email: i.user.email,
          avatar: i.user.avatar,
          designation: i.user.designation || 'Intern Developer',
          role: 'Intern',
          employeeId: i.user.employeeId,
        });
      }
    });

    // If project team is small, also fetch other active employees as options
    if (membersMap.size < 3) {
      const allActive = await User.find({ status: 'Active' })
        .select('name email avatar designation role employeeId')
        .limit(10);
      allActive.forEach((u) => {
        if (!membersMap.has(u._id.toString())) {
          membersMap.set(u._id.toString(), {
            _id: u._id,
            name: u.name,
            email: u.email,
            avatar: u.avatar,
            designation: u.designation || 'Employee',
            role: 'Member',
            employeeId: u.employeeId,
          });
        }
      });
    }

    sendSuccess(res, Array.from(membersMap.values()));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/employee/tasks/create-task
 * Allows a project leader / manager to create and assign deliverables with subtasks.
 */
export const createProjectTask = async (req, res, next) => {
  try {
    const { title, description, projectId, assignedTo, assignedTester, priority, dueDate, subtasks } = req.body;

    if (!title?.trim()) {
      return sendError(res, 'Task title is required', 400);
    }
    if (!projectId) {
      return sendError(res, 'Project ID is required', 400);
    }

    const project = await Project.findById(projectId);
    if (!project) return sendError(res, 'Project not found', 404);

    const assigneeId = assignedTo || req.user._id;
    const assignee = await User.findById(assigneeId);
    if (!assignee) return sendError(res, 'Assignee not found', 404);

    let validTesterId = null;
    if (assignedTester) {
      const tester = await User.findById(assignedTester);
      if (tester) validTesterId = tester._id;
    }

    const validPriority = ['Critical', 'High', 'Medium', 'Low'].includes(priority)
      ? priority
      : 'Medium';

    // Parse subtasks into model structure
    const parsedSubtasks = (subtasks || []).map((s) => {
      if (typeof s === 'string') {
        return { title: s.trim(), completed: false };
      }
      return { title: s.title || '', completed: s.completed || false };
    }).filter((s) => s.title && s.title.length > 0);

    const taskCode = await generateTaskCode(project.code || project.name || 'PRJ');

    const task = new Task({
      taskCode,
      title: title.trim(),
      description: description?.trim() || '',
      project: project._id,
      assignedBy: req.user._id,
      assignedTo: assignee._id,
      assignedTester: validTesterId,
      priority: validPriority,
      status: 'Todo',
      dueDate: dueDate ? new Date(dueDate) : null,
      startDate: new Date(),
      subtasks: parsedSubtasks,
      statusHistory: [{ status: 'Todo', changedBy: req.user._id, changedAt: new Date() }],
    });

    await task.save();

    // Populate for clean response
    await task.populate('project', 'name code status priority');
    await task.populate('assignedTo', 'name role avatar designation');
    await task.populate('assignedBy', 'name role avatar designation');
    await task.populate('assignedTester', 'name role avatar designation');

    // Notify assignee if not assigning to self
    if (assignee._id.toString() !== req.user._id.toString()) {
      await sendNotification({
        recipient: assignee._id,
        type: 'task_assigned',
        title: 'New Deliverable Assigned',
        message: `${req.user.name} assigned you: "${task.title}" in ${project.name}`,
        link: `/tasks?taskId=${task._id}`,
        sender: req.user._id,
        metadata: { taskId: task._id, projectId: project._id },
      });
    }

    sendSuccess(res, task, 'Deliverable created and assigned', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/employee/tasks/:id/send-to-testing
 * Allows the project leader or assigner to move an In Review deliverable to Testing.
 */
export const sendToTesting = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return sendError(res, 'Task not found', 404);

    const isSuperAdmin = req.user.role?.slug === 'super-admin' || req.user.role?.slug === 'admin';
    const isManager = task.project?.manager?.toString() === req.user._id.toString();
    const isAssigner = task.assignedBy?.toString() === req.user._id.toString();
    const isPmo = req.user.role?.slug === 'pmo-lead';

    if (!isSuperAdmin && !isManager && !isAssigner && !isPmo) {
      return sendError(res, 'Only the project leader or assigner can send tasks to testing', 403);
    }

    task.status = 'Testing';
    task.sentToTestingAt = new Date();
    task.qaRejectionNotes = null;
    task.statusHistory.push({ status: 'Testing', changedBy: req.user._id, changedAt: new Date() });

    task.testingStatus = {
      overallResult: 'Pending',
      testedBy: null,
      completedAt: null,
      results: task.subtasks.map((sub) => ({
        subtaskId: sub._id,
        subtaskTitle: sub.title,
        result: 'Pending',
        notes: '',
        testedBy: null,
        testedAt: null,
      })),
    };

    await task.save();
    await task.populate('project', 'name code');
    await task.populate('assignedTo', 'name role avatar designation');

    // Notify assignee
    if (task.assignedTo) {
      await sendNotification({
        recipient: task.assignedTo._id || task.assignedTo,
        type: 'system_alert',
        title: 'Deliverable In QA Testing',
        message: `"${task.title}" has been forwarded to QA for verification.`,
        link: `/tasks?taskId=${task._id}`,
        sender: req.user._id,
      });
    }

    sendSuccess(res, task, 'Task transitioned to Testing');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/employee/tasks/:id/test-subtask/:subtaskId
 * Allows testers or leads to record verdict on individual subtask.
 */
export const testSubtask = async (req, res, next) => {
  try {
    const { id, subtaskId } = req.params;
    const { result, notes } = req.body;

    if (!['Pass', 'Fail'].includes(result)) {
      return sendError(res, 'Result must be "Pass" or "Fail"', 400);
    }

    const task = await Task.findById(id).populate('project');
    if (!task) return sendError(res, 'Task not found', 404);

    if (!task.testingStatus || !task.testingStatus.results) {
      task.testingStatus = {
        overallResult: 'Pending',
        results: task.subtasks.map((s) => ({
          subtaskId: s._id,
          subtaskTitle: s.title,
          result: 'Pending',
          notes: '',
        })),
      };
    }

    let subResult = task.testingStatus.results.find(
      (r) => r.subtaskId?.toString() === subtaskId
    );

    if (!subResult) {
      const subtask = task.subtasks.find((s) => s._id?.toString() === subtaskId);
      if (subtask) {
        task.testingStatus.results.push({
          subtaskId: subtask._id,
          subtaskTitle: subtask.title,
          result,
          notes: notes || '',
          testedBy: req.user._id,
          testedAt: new Date(),
        });
        subResult = task.testingStatus.results[task.testingStatus.results.length - 1];
      } else {
        return sendError(res, 'Subtask not found in testing record', 404);
      }
    } else {
      subResult.result = result;
      subResult.notes = notes || subResult.notes;
      subResult.testedBy = req.user._id;
      subResult.testedAt = new Date();
    }

    // Auto-compute overall status & trigger automatic state bounce
    const allResults = task.testingStatus.results.map((r) => r.result);
    const hasFail = allResults.includes('Fail');
    const allPassed = allResults.length > 0 && allResults.every((r) => r === 'Pass');

    if (hasFail) {
      task.testingStatus.overallResult = 'Failed';

      // 🚨 AUTOMATIC BOUNCE: Return to In Progress for the assigned developer
      task.status = 'In Progress';
      task.qaRejectionNotes = notes || subResult.notes || 'QA verification failed. Please resolve flaws in subtasks.';
      task.qaRejectedAt = new Date();

      task.statusHistory.push({
        status: 'In Progress',
        changedBy: req.user._id,
        changedAt: new Date(),
        note: `QA Verification Failed: ${subResult.subtaskTitle} - ${task.qaRejectionNotes}`,
      });

      // Notify the original developer immediately
      if (task.assignedTo) {
        await sendNotification({
          recipient: task.assignedTo._id || task.assignedTo,
          type: 'system_alert',
          title: '🚨 QA Testing Rejected — Returned to In Progress',
          message: `Tester ${req.user.name} reported flaws on "${task.title}". Subtask: "${subResult.subtaskTitle}". Note: "${task.qaRejectionNotes}". Deliverable returned to In Progress for fixes.`,
          link: `/tasks?taskId=${task._id}`,
          sender: req.user._id,
          metadata: { taskId: task._id, subtaskId, result: 'Fail' },
        });
      }
    } else if (allPassed) {
      task.testingStatus.overallResult = 'Passed';
      task.testingStatus.completedAt = new Date();
      task.testingStatus.testedBy = req.user._id;

      // ✅ ZERO DEFECTS: Complete deliverable
      task.status = 'Done';
      task.approvedAt = new Date();
      task.approvedBy = req.user._id;
      task.qaRejectionNotes = null;

      task.statusHistory.push({
        status: 'Done',
        changedBy: req.user._id,
        changedAt: new Date(),
        note: `All ${task.subtasks.length} subtasks passed QA inspection.`,
      });

      // Notify developer and Team Lead
      if (task.assignedTo) {
        await sendNotification({
          recipient: task.assignedTo._id || task.assignedTo,
          type: 'system_alert',
          title: '✅ QA Passed: Deliverable Done! 🎉',
          message: `Congratulations! "${task.title}" passed all QA inspections and is marked Done.`,
          link: `/tasks?taskId=${task._id}`,
          sender: req.user._id,
          metadata: { taskId: task._id, result: 'Pass' },
        });
      }
    } else {
      task.testingStatus.overallResult = 'Pending';
    }

    await task.save();
    await task.populate('project', 'name code status priority');
    await task.populate('assignedTo', 'name role avatar designation');
    await task.populate('assignedBy', 'name role avatar designation');
    await task.populate('assignedTester', 'name role avatar designation');

    sendSuccess(res, task, `Subtask marked as ${result}. Status is now ${task.status}.`);
  } catch (error) {
    next(error);
  }
};
