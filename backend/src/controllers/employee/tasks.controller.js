import Task from '../../models/Task.js';
import Project from '../../models/Project.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js';
import { getPagination } from '../../utils/paginate.js';
import { sendNotification } from '../../utils/sendNotification.js';

// Allowed status transitions for employees
const ALLOWED_TRANSITIONS = {
  'Todo': ['In Progress'],
  'In Progress': ['In Review', 'Blocked'],
  'Blocked': ['In Progress'],
  'In Review': ['In Progress', 'Done'],
};

export const getMyTasks = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, priority, projectId, overdue, search } = req.query;

    const filter = { assignedTo: req.user._id };
    if (status) {
      const statuses = status.split(',');
      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }
    if (priority) filter.priority = priority;
    if (projectId) filter.project = projectId;
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
        .populate('project', 'name status priority')
        .populate('assignedBy', 'name role avatar')
        .sort({ dueDate: 1 })
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
      .populate('project', 'name status manager')
      .populate('assignedBy', 'name role avatar designation')
      .populate('comments.author', 'name avatar role')
      .populate('approvedBy', 'name');

    if (!task) return sendError(res, 'Task not found', 404);

    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return sendError(res, 'This task is not assigned to you', 403);
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
    const { status, note } = req.body;

    const task = await Task.findById(req.params.id)
      .populate('project', 'name manager');

    if (!task) return sendError(res, 'Task not found', 404);
    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return sendError(res, 'This task is not assigned to you', 403);
    }
    if (status === 'Done' && task.status !== 'In Review') {
      return sendError(res, 'Only PMO Lead can mark a task as Done', 400);
    }

    const allowed = ALLOWED_TRANSITIONS[task.status] || [];
    if (!allowed.includes(status)) {
      return sendError(
        res,
        `Cannot move task from "${task.status}" to "${status}". Allowed transitions: ${allowed.join(', ') || 'none'}`,
        400
      );
    }

    task.status = status;
    task.statusHistory.push({ status, changedBy: req.user._id, changedAt: new Date(), note });

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

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) return sendError(res, 'Subtask not found', 404);

    subtask.completed = !subtask.completed;
    await task.save();

    sendSuccess(res, task.subtasks, 'Subtask updated');
  } catch (error) {
    next(error);
  }
};
