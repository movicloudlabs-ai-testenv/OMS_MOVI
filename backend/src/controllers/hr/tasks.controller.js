import Task from '../../models/Task.js';
import User from '../../models/User.js';
import Project from '../../models/Project.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { sendNotification } from '../../utils/sendNotification.js';

// Returns all user IDs that this HR manager is responsible for (explicit + project-shared)
const getHRScopeUserIds = async (hrUserId) => {
  const explicit = await User.find({ hrManager: hrUserId }).select('_id');
  const ids = new Set(explicit.map(u => u._id.toString()));

  const sharedProjects = await Project.find({ 'team.user': hrUserId }).select('team interns');
  sharedProjects.forEach(p => {
    p.team.forEach(t => { if (t.user.toString() !== hrUserId.toString()) ids.add(t.user.toString()); });
    (p.interns || []).forEach(i => ids.add(i.user.toString()));
  });

  return Array.from(ids);
};

// Tasks assigned TO this HR by PMO — HR can work on these
export const getMyTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate('project', 'name')
      .populate('assignedBy', 'name')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1, createdAt: -1 });
    sendSuccess(res, tasks);
  } catch (error) { next(error); }
};

// Tasks assigned to interns under this HR — HR can VIEW only
export const getInternTasks = async (req, res, next) => {
  try {
    const allIds = await getHRScopeUserIds(req.user._id);
    const interns = await User.find({ _id: { $in: allIds }, employmentType: 'Intern', status: 'Active' }).select('_id');
    const internIds = interns.map(i => i._id);

    const tasks = await Task.find({ assignedTo: { $in: internIds } })
      .populate('assignedTo', 'name employmentType')
      .populate('project', 'name')
      .populate('assignedBy', 'name')
      .sort({ dueDate: 1, createdAt: -1 });
    sendSuccess(res, tasks);
  } catch (error) { next(error); }
};

// Tasks assigned to employees under this HR — HR can VIEW only
export const getEmployeeTasks = async (req, res, next) => {
  try {
    const allIds = await getHRScopeUserIds(req.user._id);
    const employees = await User.find({ _id: { $in: allIds }, employmentType: { $ne: 'Intern' }, status: 'Active' }).select('_id');
    const employeeIds = employees.map(e => e._id);

    const tasks = await Task.find({ assignedTo: { $in: employeeIds } })
      .populate('assignedTo', 'name employmentType designation')
      .populate('project', 'name')
      .populate('assignedBy', 'name')
      .sort({ dueDate: 1, createdAt: -1 });
    sendSuccess(res, tasks);
  } catch (error) { next(error); }
};

// Single task detail — HR must be the assignee
export const getMyTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, assignedTo: req.user._id })
      .populate('project', 'name')
      .populate('assignedBy', 'name designation avatar')
      .populate('assignedTo', 'name avatar')
      .populate('comments.author', 'name avatar');
    if (!task) return sendError(res, 'Task not found or not assigned to you', 404);
    sendSuccess(res, task);
  } catch (error) { next(error); }
};

// HR adds a comment to their own task
export const addMyTaskComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return sendError(res, 'Comment text is required', 400);

    const task = await Task.findOne({ _id: req.params.id, assignedTo: req.user._id });
    if (!task) return sendError(res, 'Task not found or not assigned to you', 404);

    task.comments.push({ author: req.user._id, text: text.trim() });
    await task.save();

    const populated = await Task.findById(task._id)
      .populate('comments.author', 'name avatar');
    sendSuccess(res, populated.comments, 'Comment added');
  } catch (error) { next(error); }
};

// HR updates status of their OWN tasks (assigned to them by PMO)
export const updateMyTaskStatus = async (req, res, next) => {
  try {
    const { status, blockedReason } = req.body;
    const valid = ['Todo', 'In Progress', 'In Review', 'Blocked', 'Done'];
    if (!valid.includes(status)) return sendError(res, 'Invalid status', 400);

    const task = await Task.findOne({ _id: req.params.id, assignedTo: req.user._id });
    if (!task) return sendError(res, 'Task not found or not assigned to you', 404);

    task.statusHistory.push({ status: task.status, changedBy: req.user._id, changedAt: new Date() });
    task.status = status;
    if (status === 'Blocked') task.blockedReason = blockedReason || '';
    if (status === 'In Review') task.submittedAt = new Date();

    await task.save();

    // Notify assignedBy (PMO) when submitted for review
    if (status === 'In Review' && task.assignedBy) {
      await sendNotification({
        recipient: task.assignedBy,
        type: 'system_alert',
        title: 'Task Submitted for Review',
        message: `${req.user.name} submitted "${task.title}" for review.`,
        link: '/pmo/approvals',
        sender: req.user._id,
      });
    }

    sendSuccess(res, task, 'Task updated');
  } catch (error) { next(error); }
};

// HR uploads an attachment to their own task
export const addMyTaskAttachment = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded', 400);
    const task = await Task.findOne({ _id: req.params.id, assignedTo: req.user._id });
    if (!task) return sendError(res, 'Task not found or not assigned to you', 404);
    const sizeKB = req.file.size / 1024;
    const attachment = {
      name: req.file.originalname,
      path: `/uploads/attachments/${req.file.filename}`,
      size: sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${Math.round(sizeKB)} KB`,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    };
    task.attachments.push(attachment);
    await task.save();
    const populated = await Task.findById(task._id).populate('attachments.uploadedBy', 'name');
    sendSuccess(res, populated.attachments, 'Attachment added');
  } catch (error) { next(error); }
};

// HR toggles a subtask on their own task
export const toggleMySubtask = async (req, res, next) => {
  try {
    const { index } = req.params;
    const task = await Task.findOne({ _id: req.params.id, assignedTo: req.user._id });
    if (!task) return sendError(res, 'Task not found or not assigned to you', 404);
    const i = parseInt(index, 10);
    if (!task.subtasks[i]) return sendError(res, 'Subtask not found', 404);
    task.subtasks[i].completed = !task.subtasks[i].completed;
    await task.save();
    sendSuccess(res, task.subtasks, 'Subtask updated');
  } catch (error) { next(error); }
};

// HR assigns a task to one of their interns or employees
export const assignTask = async (req, res, next) => {
  try {
    const { title, description, projectId, assignedTo, priority, dueDate, effortPoints } = req.body;
    if (!title || !projectId || !assignedTo) {
      return sendError(res, 'Title, project, and assignee are required', 400);
    }

    // Verify the assignee is under this HR's scope (explicit or project-shared)
    const allIds = await getHRScopeUserIds(req.user._id);
    if (!allIds.includes(assignedTo.toString())) return sendError(res, 'Assignee is not under your team', 403);
    const assignee = await User.findById(assignedTo);
    if (!assignee) return sendError(res, 'Assignee not found', 404);

    const task = await Task.create({
      title,
      description,
      project: projectId,
      assignedBy: req.user._id,
      assignedTo,
      priority: priority || 'Medium',
      dueDate,
      effortPoints,
    });

    const link = assignee.employmentType === 'Intern' ? '/intern/tasks' : '/employee/tasks';
    await sendNotification({
      recipient: assignedTo,
      type: 'system_alert',
      title: 'New Task Assigned',
      message: `${req.user.name} assigned you a task: "${title}"`,
      link,
      sender: req.user._id,
    });

    sendSuccess(res, task, 'Task assigned', 201);
  } catch (error) { next(error); }
};
