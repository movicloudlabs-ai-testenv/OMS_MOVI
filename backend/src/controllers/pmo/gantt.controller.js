import Project from '../../models/Project.js';
import Sprint from '../../models/Sprint.js';
import Task from '../../models/Task.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

/**
 * GET /api/pmo/projects/:id/gantt
 * Calculates interactive Gantt timeline data, DAG dependency links,
 * Critical Path deliverables, and baseline schedule variance.
 */
export const getProjectGantt = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter })
      .populate('manager', 'name avatar designation');
    if (!project) return sendError(res, 'Project not found', 404);

    const [sprints, tasks] = await Promise.all([
      Sprint.find({ project: project._id }).sort({ startDate: 1 }),
      Task.find({ project: project._id })
        .populate('assignedTo', 'name avatar')
        .populate('blockedBy', 'title status dueDate')
        .sort({ dueDate: 1 }),
    ]);

    const projStart = project.startDate ? new Date(project.startDate) : new Date();
    const projEnd = project.endDate ? new Date(project.endDate) : new Date(Date.now() + 90 * 86400000);

    // 1. Build unified timeline items: Milestones + Sprints + Critical Tasks
    const items = [];

    // Map Milestones
    (project.milestones || []).forEach((m, idx) => {
      const start = m.startDate ? new Date(m.startDate) : new Date(projStart.getTime() + idx * 14 * 86400000);
      const end = m.date ? new Date(m.date) : new Date(start.getTime() + 14 * 86400000);
      const baselineEnd = m.baselineEndDate ? new Date(m.baselineEndDate) : end;

      // Variance calculation in days
      const varianceDays = Math.round((end.getTime() - baselineEnd.getTime()) / (1000 * 60 * 60 * 24));

      items.push({
        id: m._id.toString(),
        key: `MLS-${idx + 1}`,
        name: m.name,
        type: 'milestone',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        baselineEndDate: baselineEnd.toISOString(),
        varianceDays,
        status: m.status,
        progressPercent: m.status === 'completed' ? 100 : (m.progressPercent || 0),
        deliverable: m.deliverable || '',
        blockedBy: (m.blockedBy || []).map((b) => b.toString()),
        isCritical: false, // will be evaluated
      });
    });

    // Map Sprints
    sprints.forEach((s, idx) => {
      const start = s.startDate ? new Date(s.startDate) : new Date();
      const end = s.endDate ? new Date(s.endDate) : new Date(start.getTime() + 14 * 86400000);

      items.push({
        id: s._id.toString(),
        key: `SPRINT-${idx + 1}`,
        name: s.name,
        type: 'sprint',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        baselineEndDate: end.toISOString(),
        varianceDays: 0,
        status: s.status,
        progressPercent: s.velocity || (s.status === 'Completed' ? 100 : (s.status === 'Active' ? 50 : 0)),
        deliverable: s.goal || 'Sprint Cycle Delivery',
        blockedBy: idx > 0 ? [sprints[idx - 1]._id.toString()] : [],
        isCritical: true,
      });
    });

    // Map Tasks that have dependencies or are Critical/High priority
    tasks
      .filter((t) => t.priority === 'Critical' || (t.blockedBy && t.blockedBy.length > 0))
      .slice(0, 15) // Limit to top critical tasks for visual clarity
      .forEach((t) => {
        const start = t.startDate ? new Date(t.startDate) : new Date();
        const end = t.dueDate ? new Date(t.dueDate) : new Date(start.getTime() + 7 * 86400000);

        items.push({
          id: t._id.toString(),
          key: t.taskCode || `TSK-${t._id.toString().slice(-4).toUpperCase()}`,
          name: t.title,
          type: 'task',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          baselineEndDate: end.toISOString(),
          varianceDays: 0,
          status: t.status,
          progressPercent: t.status === 'Done' ? 100 : (t.status === 'In Progress' ? 50 : 0),
          deliverable: t.title,
          blockedBy: (t.blockedBy || []).map((b) => b._id.toString()),
          isCritical: t.priority === 'Critical',
          assignee: t.assignedTo ? { name: t.assignedTo.name, avatar: t.assignedTo.avatar } : null,
        });
      });

    // 2. CRITICAL PATH ANALYSIS ALGORITHM (Longest Path in DAG)
    // Identify nodes that have dependencies or block others
    const itemMap = new Map();
    items.forEach((item) => itemMap.set(item.id, item));

    // Mark critical items: trace the chain with the latest end date back through predecessors
    let latestItem = null;
    let maxTime = 0;

    items.forEach((item) => {
      const endTime = new Date(item.endDate).getTime();
      if (endTime > maxTime) {
        maxTime = endTime;
        latestItem = item;
      }
    });

    const criticalPathIds = new Set();
    const traceCriticalPath = (curr) => {
      if (!curr) return;
      criticalPathIds.add(curr.id);
      curr.isCritical = true;

      // Follow blockedBy predecessors
      (curr.blockedBy || []).forEach((predId) => {
        if (itemMap.has(predId) && !criticalPathIds.has(predId)) {
          traceCriticalPath(itemMap.get(predId));
        }
      });
    };

    if (latestItem) {
      traceCriticalPath(latestItem);
    }

    // Sort items by startDate ascending
    items.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    // 3. Baseline Project Variance
    const latestForecastEnd = maxTime > 0 ? new Date(maxTime) : projEnd;
    const projectVarianceDays = Math.round(
      (latestForecastEnd.getTime() - projEnd.getTime()) / (1000 * 60 * 60 * 24)
    );

    const scheduleHealth = projectVarianceDays <= 0
      ? 'On Track'
      : (projectVarianceDays <= 5 ? 'Minor Slippage' : 'Critical Delay');

    sendSuccess(res, {
      project: {
        id: project._id,
        name: project.name,
        code: project.code,
        startDate: projStart.toISOString(),
        endDate: projEnd.toISOString(),
        forecastEndDate: latestForecastEnd.toISOString(),
        varianceDays: projectVarianceDays,
        scheduleHealth,
      },
      criticalPath: {
        totalDeliverables: criticalPathIds.size,
        targetDeliveryDate: latestForecastEnd.toISOString(),
        criticalItemKeys: items.filter((i) => i.isCritical).map((i) => i.key),
      },
      items,
    });
  } catch (error) {
    next(error);
  }
};
