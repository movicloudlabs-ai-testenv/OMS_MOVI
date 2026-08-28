import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

// Projects where this HR is assigned as a team member
export const getMyProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({
      $or: [{ 'team.user': req.user._id }, { manager: req.user._id }],
    })
      .populate('manager', 'name designation avatar')
      .populate('department', 'name code')
      .populate({ path: 'team.user', select: 'name designation avatar employmentType', match: { deletedAt: { $exists: false } } })
      .populate({ path: 'interns.user', select: 'name college avatar', match: { deletedAt: { $exists: false } } })
      .sort({ createdAt: -1 });

    const result = await Promise.all(projects.map(async (project) => {
      const tasks = await Task.find({ project: project._id });
      const total     = tasks.length;
      const done      = tasks.filter(t => t.status === 'Done').length;
      const inProg    = tasks.filter(t => t.status === 'In Progress').length;
      const blocked   = tasks.filter(t => t.status === 'Blocked').length;
      const inReview  = tasks.filter(t => t.status === 'In Review').length;
      const overdue   = tasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== 'Done').length;
      const completion = total > 0 ? Math.round((done / total) * 100) : 0;

      const obj = project.toJSON();
      obj.team = (obj.team || []).filter((t) => t.user);
      obj.interns = (obj.interns || []).filter((i) => i.user);
      obj.taskStats = { total, done, inProg, blocked, inReview, overdue, completion };
      return obj;
    }));

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

// Single project detail — HR must be a team member
export const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [{ 'team.user': req.user._id }, { manager: req.user._id }],
    })
      .populate('manager', 'name designation avatar')
      .populate('department', 'name code')
      .populate({ path: 'team.user', select: 'name designation avatar employmentType', match: { deletedAt: { $exists: false } } })
      .populate({ path: 'interns.user', select: 'name college avatar performanceRatings', match: { deletedAt: { $exists: false } } });

    if (!project) return sendError(res, 'Project not found or you are not a member', 404);

    project.team = project.team.filter((t) => t.user);
    project.interns = project.interns.filter((i) => i.user);

    const tasks = await Task.find({ project: project._id })
      .populate('assignedTo', 'name employmentType')
      .sort({ dueDate: 1 });

    const total      = tasks.length;
    const done       = tasks.filter(t => t.status === 'Done').length;
    const inProg     = tasks.filter(t => t.status === 'In Progress').length;
    const blocked    = tasks.filter(t => t.status === 'Blocked').length;
    const inReview   = tasks.filter(t => t.status === 'In Review').length;
    const overdue    = tasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== 'Done').length;
    const completion = total > 0 ? Math.round((done / total) * 100) : 0;

    const obj = project.toJSON();
    obj.tasks     = tasks;
    obj.taskStats = { total, done, inProg, blocked, inReview, overdue, completion };

    sendSuccess(res, obj);
  } catch (error) {
    next(error);
  }
};
