import Task from '../../models/Task.js';
import Project from '../../models/Project.js';
import User from '../../models/User.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js';
import { getPagination } from '../../utils/paginate.js';
import { sendNotification } from '../../utils/sendNotification.js';

export const getTasks = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { projectId, status, priority, assignedTo, search, overdue } = req.query;

    // PMO scope: only tasks for projects PMO manages
    const projects = await Project.find({ ...req.projectFilter }).select('_id');
    const projectIds = projects.map(p => p._id);

    const filter = { project: { $in: projectIds } };
    
    if (projectId) {
      if (!projectIds.some(p => p.toString() === projectId)) {
        return sendError(res, 'Project not found or not in your scope', 404);
      }
      filter.project = projectId;
    }
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $ne: 'Done' };
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignedTo', 'name avatar')
        .populate('project', 'name')
        .populate('assignedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    sendPaginated(res, tasks, {
      total, page, limit,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const { title, description, project, assignedTo, priority, dueDate, effortPoints, subtasks } = req.body;

    if (!title || !project || !assignedTo) {
      return sendError(res, 'Title, project, and assignedTo are required', 400);
    }

    const proj = await Project.findOne({ _id: project, ...req.projectFilter });
    if (!proj) return sendError(res, 'Project not found or not in your scope', 404);

    const assignee = await User.findById(assignedTo);
    if (!assignee) return sendError(res, 'Assignee not found', 404);

    const isMember = proj.team.some(t => t.user.toString() === assignedTo) || 
                     proj.interns.some(i => i.user.toString() === assignedTo);
    
    if (!isMember) {
      return sendError(res, 'Assignee is not a member of this project', 400);
    }

    const task = await Task.create({
      title,
      description,
      project,
      assignedTo,
      assignedBy: req.user._id,
      priority,
      dueDate,
      effortPoints,
      subtasks,
      statusHistory: [{ status: 'Todo', changedBy: req.user._id, changedAt: new Date() }],
    });

    await sendNotification({
      recipient: assignedTo,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `New task assigned: ${title}\nProject: ${proj.name} | Due: ${new Date(dueDate).toLocaleDateString()}\nPriority: ${priority}`,
      link: assignee.employmentType === 'Intern' ? `/intern/tasks` : `/employee/tasks`,
      sender: req.user._id,
    });

    if (assignee.employmentType === 'Intern' && assignee.hrManager) {
      await sendNotification({
        recipient: assignee.hrManager,
        type: 'system_alert',
        title: 'Intern Task Assigned',
        message: `Intern ${assignee.name} has been assigned a new task: ${title}.`,
        sender: req.user._id,
      });
    }

    sendSuccess(res, task, 'Task created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name avatar employeeId role employmentType')
      .populate('assignedBy', 'name role')
      .populate('project', 'name status manager')
      .populate('comments.author', 'name avatar role')
      .populate('attachments.uploadedBy', 'name');

    if (!task) return sendError(res, 'Task not found', 404);

    // Verify scope (is PMO Lead of this project or Super Admin)
    if (req.user.role.slug !== 'super-admin' && task.project.manager?.toString() !== req.user._id.toString()) {
      return sendError(res, 'Not authorized to view this task', 403);
    }

    sendSuccess(res, task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const { title, description, priority, dueDate, effortPoints, subtasks, blockedReason, assignedTo } = req.body;

    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return sendError(res, 'Task not found', 404);

    if (req.user.role.slug !== 'super-admin' && task.project.manager?.toString() !== req.user._id.toString()) {
      return sendError(res, 'Not authorized to update this task', 403);
    }

    const oldDueDate = task.dueDate;

    // (Re)assignment — validate the new assignee belongs to the project, then
    // clear the needs-reassignment flag once a valid owner is set.
    let reassignedTo = null;
    if (assignedTo && assignedTo.toString() !== task.assignedTo?.toString()) {
      const proj = task.project;
      const isMember = proj.team.some(t => t.user?.toString() === assignedTo.toString()) ||
                       proj.interns.some(i => i.user?.toString() === assignedTo.toString());
      if (!isMember) return sendError(res, 'Assignee is not a member of this project', 400);
      task.assignedTo = assignedTo;
      task.needsReassignment = false;
      reassignedTo = assignedTo;
    }

    if (title) task.title = title;
    if (description) task.description = description;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = dueDate;
    if (effortPoints) task.effortPoints = effortPoints;
    if (subtasks) task.subtasks = subtasks;
    if (blockedReason) task.blockedReason = blockedReason;

    await task.save();

    if (reassignedTo) {
      const assignee = await User.findById(reassignedTo).select('employmentType');
      await sendNotification({
        recipient: reassignedTo,
        type: 'task_assigned',
        title: 'Task Assigned to You',
        message: `You've been assigned the task "${task.title}" on project ${task.project.name}.`,
        link: assignee?.employmentType === 'Intern' ? '/intern/tasks' : '/employee/tasks',
        sender: req.user._id,
      });
    }

    if (dueDate && oldDueDate && new Date(dueDate).getTime() !== new Date(oldDueDate).getTime() && task.assignedTo) {
      await sendNotification({
        recipient: task.assignedTo,
        type: 'system_alert',
        title: 'Task Deadline Updated',
        message: `Task deadline updated: ${task.title}\nNew due date: ${new Date(dueDate).toLocaleDateString()}`,
        sender: req.user._id,
      });
    }

    sendSuccess(res, task, 'Task updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return sendError(res, 'Task not found', 404);

    if (req.user.role.slug !== 'super-admin' && task.project.manager?.toString() !== req.user._id.toString()) {
      return sendError(res, 'Not authorized to update this task', 403);
    }

    const validStatuses = ['Todo', 'In Progress', 'In Review', 'Done', 'Blocked'];
    if (!validStatuses.includes(status)) {
      return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    task.status = status;
    if (note) task.blockedReason = note; // usually used when moving to blocked

    task.statusHistory.push({ status, changedBy: req.user._id, changedAt: new Date() });

    if (status === 'Done') {
      task.approvedAt = new Date();
      task.approvedBy = req.user._id;
      await sendNotification({
        recipient: task.assignedTo,
        type: 'system_alert',
        title: 'Task Approved',
        message: `Task '${task.title}' approved and marked complete by ${req.user.name} ✓`,
        sender: req.user._id,
      });
    }

    await task.save();
    sendSuccess(res, task, `Task status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};

export const addTaskComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return sendError(res, 'Comment text is required', 400);

    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return sendError(res, 'Task not found', 404);

    if (req.user.role.slug !== 'super-admin' && task.project.manager?.toString() !== req.user._id.toString()) {
      return sendError(res, 'Not authorized to comment on this task', 403);
    }

    task.comments.push({ text, author: req.user._id, createdAt: new Date() });
    await task.save();

    if (task.assignedTo.toString() !== req.user._id.toString()) {
      await sendNotification({
        recipient: task.assignedTo,
        type: 'system_alert',
        title: 'New Comment on Task',
        message: `${req.user.name} commented on task '${task.title}'.`,
        sender: req.user._id,
      });
    }

    await task.populate('comments.author', 'name avatar role');
    sendSuccess(res, task.comments, 'Comment added');
  } catch (error) {
    next(error);
  }
};

export const addTaskAttachment = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded', 400);

    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return sendError(res, 'Task not found', 404);

    if (req.user.role.slug !== 'super-admin' && task.project.manager?.toString() !== req.user._id.toString()) {
      return sendError(res, 'Not authorized to add attachments to this task', 403);
    }

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

    sendSuccess(res, attachment, 'Attachment added successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return sendError(res, 'Task not found', 404);

    // Hard delete is possible, or soft delete by status Cancelled.
    // Spec: Soft approach: mark task as cancelled, Hard delete only by Super Admin
    if (req.user.role.slug === 'super-admin') {
      await Task.findByIdAndDelete(req.params.id);
    } else {
      if (task.project.manager?.toString() !== req.user._id.toString()) {
        return sendError(res, 'Not authorized to delete this task', 403);
      }
      task.status = 'Cancelled';
      await task.save();
    }

    await sendNotification({
      recipient: task.assignedTo,
      type: 'system_alert',
      title: 'Task Removed',
      message: `Task '${task.title}' has been removed.`,
      sender: req.user._id,
    });

    sendSuccess(res, null, 'Task deleted/cancelled successfully');
  } catch (error) {
    next(error);
  }
};
