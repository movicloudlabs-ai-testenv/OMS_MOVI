import Sprint from '../../models/Sprint.js';
import Task from '../../models/Task.js';
import Project from '../../models/Project.js';
import ProjectActivity from '../../models/ProjectActivity.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { logProjectAudit } from '../../utils/auditLogger.js';

// ─── GET PROJECT SPRINTS ─────────────────────────────────────────────────────
export const getProjectSprints = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    const sprints = await Sprint.find({ project: project._id })
      .populate('createdBy', 'name avatar')
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      sprints.map(async (sprint) => {
        const tasks = await Task.find({ sprint: sprint._id }, 'status storyPoints effortPoints');
        const total = tasks.length;
        const done = tasks.filter((t) => t.status === 'Done').length;
        const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || t.effortPoints || 1), 0);
        const donePoints = tasks
          .filter((t) => t.status === 'Done')
          .reduce((sum, t) => sum + (t.storyPoints || t.effortPoints || 1), 0);

        const sObj = sprint.toJSON();
        sObj.taskCount = total;
        sObj.doneTaskCount = done;
        sObj.totalPoints = totalPoints;
        sObj.donePoints = donePoints;
        sObj.progressPercent = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : (total > 0 ? Math.round((done / total) * 100) : 0);
        return sObj;
      })
    );

    // Also identify active sprint
    const activeSprint = enriched.find((s) => s.status === 'Active') || null;

    sendSuccess(res, {
      sprints: enriched,
      activeSprint,
      totalSprints: enriched.length,
    });
  } catch (error) {
    next(error);
  }
};

// ─── CREATE SPRINT ───────────────────────────────────────────────────────────
export const createSprint = async (req, res, next) => {
  try {
    const { name, goal, startDate, endDate } = req.body;
    if (!name || !name.trim()) return sendError(res, 'Sprint name is required', 400);
    if (!startDate || !endDate) return sendError(res, 'Start date and end date are required', 400);

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return sendError(res, 'End date cannot be before start date', 400);

    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    const sprint = await Sprint.create({
      project: project._id,
      name: name.trim(),
      goal: goal ? goal.trim() : '',
      startDate: start,
      endDate: end,
      status: 'Planning',
      createdBy: req.user._id,
    });

    await ProjectActivity.create({
      project: project._id,
      actor: req.user._id,
      actorName: req.user.name,
      action: 'created_sprint',
      title: `${req.user.name} created sprint ${sprint.name}`,
      details: sprint.goal ? `Goal: ${sprint.goal}` : 'Sprint planned in agile delivery cycle.',
    });

    await logProjectAudit(req, {
      action: 'CreateSprint',
      module: 'ProjectSprints',
      resourceId: sprint._id,
      details: `Created agile sprint ${sprint.name} for ${project.name}`,
    });

    sendSuccess(res, sprint, 'Sprint created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// ─── START SPRINT ───────────────────────────────────────────────────────────
export const startSprint = async (req, res, next) => {
  try {
    const { sprintId } = req.params;
    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    const sprint = await Sprint.findOne({ _id: sprintId, project: project._id });
    if (!sprint) return sendError(res, 'Sprint not found', 404);

    // Deactivate any currently active sprint on this project
    await Sprint.updateMany(
      { project: project._id, status: 'Active', _id: { $ne: sprint._id } },
      { status: 'Planning' }
    );

    // Calculate baseline planned points
    const sprintTasks = await Task.find({ sprint: sprint._id });
    const plannedPoints = sprintTasks.reduce(
      (sum, t) => sum + (t.storyPoints || t.effortPoints || 1),
      0
    );

    sprint.status = 'Active';
    sprint.plannedPoints = plannedPoints;
    await sprint.save();

    await ProjectActivity.create({
      project: project._id,
      actor: req.user._id,
      actorName: req.user.name,
      action: 'started_sprint',
      title: `${req.user.name} started ${sprint.name}`,
      details: `Committed ${plannedPoints} story points across ${sprintTasks.length} work items.`,
    });

    sendSuccess(res, sprint, `${sprint.name} is now active`);
  } catch (error) {
    next(error);
  }
};

// ─── COMPLETE SPRINT (WITH AUTOMATED ROLLOVER) ───────────────────────────────
export const completeSprint = async (req, res, next) => {
  try {
    const { sprintId } = req.params;
    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    const sprint = await Sprint.findOne({ _id: sprintId, project: project._id });
    if (!sprint) return sendError(res, 'Sprint not found', 404);

    // Find all tasks assigned to this sprint
    const allTasks = await Task.find({ sprint: sprint._id });
    const doneTasks = allTasks.filter((t) => t.status === 'Done');
    const incompleteTasks = allTasks.filter((t) => t.status !== 'Done' && t.status !== 'Cancelled');

    const completedPoints = doneTasks.reduce(
      (sum, t) => sum + (t.storyPoints || t.effortPoints || 1),
      0
    );
    const planned = sprint.plannedPoints || allTasks.reduce(
      (sum, t) => sum + (t.storyPoints || t.effortPoints || 1),
      0
    );

    const velocity = planned > 0 ? Math.round((completedPoints / planned) * 100) : 100;

    // Find next upcoming sprint or fallback to backlog
    const nextSprint = await Sprint.findOne({
      project: project._id,
      status: 'Planning',
      _id: { $ne: sprint._id },
    }).sort({ startDate: 1 });

    // Execute automated rollover on incomplete tasks
    for (const task of incompleteTasks) {
      task.sprintHistory = task.sprintHistory || [];
      task.sprintHistory.push({
        sprint: sprint._id,
        rolledOver: true,
        date: new Date(),
      });

      // Reassign to next sprint or Backlog (null)
      task.sprint = nextSprint ? nextSprint._id : null;
      await task.save();
    }

    sprint.status = 'Completed';
    sprint.completedPoints = completedPoints;
    sprint.velocity = velocity;
    sprint.rolledOverCount = incompleteTasks.length;
    sprint.completedAt = new Date();
    await sprint.save();

    await ProjectActivity.create({
      project: project._id,
      actor: req.user._id,
      actorName: req.user.name,
      action: 'completed_sprint',
      title: `${req.user.name} completed ${sprint.name}`,
      details: `Velocity: ${velocity}% (${completedPoints}/${planned} pts). Rolled over ${incompleteTasks.length} tasks to ${nextSprint ? nextSprint.name : 'Backlog'}.`,
    });

    await logProjectAudit(req, {
      action: 'CompleteSprint',
      module: 'ProjectSprints',
      resourceId: sprint._id,
      details: `Closed sprint ${sprint.name} with ${velocity}% velocity. Rolled over ${incompleteTasks.length} work items.`,
    });

    sendSuccess(res, {
      sprint,
      completedPoints,
      velocity,
      rolledOverCount: incompleteTasks.length,
      nextSprintName: nextSprint ? nextSprint.name : 'Backlog',
    }, `${sprint.name} finalized successfully`);
  } catch (error) {
    next(error);
  }
};

// ─── GET PROJECT KANBAN BOARD ────────────────────────────────────────────────
export const getProjectKanban = async (req, res, next) => {
  try {
    const { sprintId } = req.query;
    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    let activeSprint = null;
    const filter = { project: project._id };

    if (sprintId === 'backlog') {
      filter.sprint = null;
    } else if (sprintId && sprintId !== 'all') {
      filter.sprint = sprintId;
      activeSprint = await Sprint.findById(sprintId);
    } else if (sprintId !== 'all') {
      // Default: Find currently active sprint or fallback to all
      activeSprint = await Sprint.findOne({ project: project._id, status: 'Active' });
      if (activeSprint) {
        filter.sprint = activeSprint._id;
      }
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name avatar designation department')
      .populate('assignedBy', 'name avatar')
      .populate('sprint', 'name status')
      .populate('blockedBy', 'title status priority')
      .sort({ updatedAt: -1 });

    const transformCard = (t) => {
      const isBlocked = (t.blockedBy && t.blockedBy.length > 0 && t.blockedBy.some((b) => b.status !== 'Done')) || t.status === 'Blocked';
      return {
        id: t._id,
        key: t.taskCode || `TSK-${t._id.toString().slice(-4).toUpperCase()}`,
        taskCode: t.taskCode,
        title: t.title,
        description: t.description || '',
        status: t.status,
        priority: t.priority || 'Medium',
        storyPoints: t.storyPoints || t.effortPoints || 1,
        assignedTo: t.assignedTo ? {
          id: t.assignedTo._id,
          name: t.assignedTo.name,
          avatar: t.assignedTo.avatar,
          designation: t.assignedTo.designation,
          department: t.assignedTo.department,
        } : null,
        dueDate: t.dueDate,
        isBlocked,
        blockedReason: t.blockedReason || (isBlocked ? 'Blocked by dependent item' : null),
        subtasksCount: t.subtasks?.length || 0,
        completedSubtasksCount: t.subtasks?.filter((s) => s.completed)?.length || 0,
        rolledOver: t.sprintHistory?.some((h) => h.rolledOver) || false,
      };
    };

    const todoCards = tasks.filter((t) => t.status === 'Todo' || t.status === 'Blocked').map(transformCard);
    const inProgressCards = tasks.filter((t) => t.status === 'In Progress').map(transformCard);
    const inReviewCards = tasks.filter((t) => t.status === 'In Review' || t.status === 'Testing').map(transformCard);
    const doneCards = tasks.filter((t) => t.status === 'Done').map(transformCard);

    // Sum story points per column
    const sumPoints = (cards) => cards.reduce((sum, c) => sum + (c.storyPoints || 1), 0);

    // Configurable WIP Limits
    const wipLimits = {
      todo: 20,
      inProgress: 6,
      inReview: 4,
      done: 999,
    };

    const board = {
      activeSprint: activeSprint ? activeSprint.toJSON() : null,
      columns: {
        todo: {
          id: 'todo',
          title: 'Todo / Backlog',
          wipLimit: wipLimits.todo,
          isBreached: todoCards.length > wipLimits.todo,
          totalPoints: sumPoints(todoCards),
          tasks: todoCards,
        },
        inProgress: {
          id: 'inProgress',
          title: 'In Progress',
          wipLimit: wipLimits.inProgress,
          isBreached: inProgressCards.length > wipLimits.inProgress,
          totalPoints: sumPoints(inProgressCards),
          tasks: inProgressCards,
        },
        inReview: {
          id: 'inReview',
          title: 'Review / QA',
          wipLimit: wipLimits.inReview,
          isBreached: inReviewCards.length > wipLimits.inReview,
          totalPoints: sumPoints(inReviewCards),
          tasks: inReviewCards,
        },
        done: {
          id: 'done',
          title: 'Completed',
          wipLimit: wipLimits.done,
          isBreached: false,
          totalPoints: sumPoints(doneCards),
          tasks: doneCards,
        },
      },
      stats: {
        totalTasks: tasks.length,
        totalPoints: tasks.reduce((sum, t) => sum + (t.storyPoints || t.effortPoints || 1), 0),
        completedPoints: doneCards.reduce((sum, c) => sum + (c.storyPoints || 1), 0),
        blockedCount: tasks.filter((t) => t.status === 'Blocked').length,
      },
    };

    sendSuccess(res, board);
  } catch (error) {
    next(error);
  }
};

// ─── QUICK MOVE TASK STATUS (KANBAN TRANSITION) ──────────────────────────────
export const moveTaskStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status, blockedReason } = req.body;

    const allowed = ['Todo', 'In Progress', 'In Review', 'Blocked', 'Done', 'Cancelled'];
    if (!allowed.includes(status)) {
      return sendError(res, `Invalid status. Must be one of: ${allowed.join(', ')}`, 400);
    }

    const task = await Task.findById(taskId);
    if (!task) return sendError(res, 'Task not found', 404);

    const oldStatus = task.status;
    task.status = status;
    if (blockedReason !== undefined) task.blockedReason = blockedReason;

    task.statusHistory = task.statusHistory || [];
    task.statusHistory.push({
      status,
      changedBy: req.user._id,
      changedAt: new Date(),
    });

    if (status === 'Done') {
      task.submittedAt = task.submittedAt || new Date();
      task.approvedAt = new Date();
      task.approvedBy = req.user._id;
    }

    await task.save();

    await ProjectActivity.create({
      project: task.project,
      actor: req.user._id,
      actorName: req.user.name,
      action: 'moved_task',
      title: `${req.user.name} moved "${task.title}" to ${status}`,
      details: `Transitioned from ${oldStatus} to ${status}.`,
    });

    sendSuccess(res, task, `Task moved to ${status}`);
  } catch (error) {
    next(error);
  }
};
