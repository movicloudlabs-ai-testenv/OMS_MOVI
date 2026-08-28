import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

export const getMyProjects = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const projects = await Project.find({
      $or: [
        { 'team.user': userId },
        { 'interns.user': userId }
      ],
      status: { $ne: 'Cancelled' }
    })
      .populate('manager', 'name avatar designation')
      .populate('department', 'name')
      .populate('team.user', 'name designation avatar')
      .populate('interns.user', 'name designation avatar college')
      .lean();

    const projectIds = projects.map((p) => p._id);
    const taskAgg = await Task.aggregate([
      { $match: { assignedTo: userId, project: { $in: projectIds } } },
      { $group: { _id: { project: '$project', status: '$status' }, count: { $sum: 1 } } },
    ]);

    const result = projects.map((p) => {
      const myTeamEntry = p.team.find((t) => t.user?._id?.toString() === userId.toString());
      const myInternEntry = p.interns?.find((i) => i.user?._id?.toString() === userId.toString());
      const myRole = myTeamEntry?.role || (myInternEntry ? 'Intern' : null);

      const myTaskStats = { total: 0, todo: 0, inProgress: 0, inReview: 0, blocked: 0, done: 0 };
      taskAgg
        .filter((a) => a._id.project.toString() === p._id.toString())
        .forEach(({ _id, count }) => {
          myTaskStats.total += count;
          if (_id.status === 'Todo') myTaskStats.todo = count;
          else if (_id.status === 'In Progress') myTaskStats.inProgress = count;
          else if (_id.status === 'In Review') myTaskStats.inReview = count;
          else if (_id.status === 'Blocked') myTaskStats.blocked = count;
          else if (_id.status === 'Done') myTaskStats.done = count;
        });

      const completionPercent = myTaskStats.total > 0
        ? Math.round((myTaskStats.done / myTaskStats.total) * 100)
        : 0;

      return {
        ...p,
        myRole,
        myTaskStats,
        completionPercent,
        teamSize: p.team.length,
      };
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const project = await Project.findById(req.params.id)
      .populate('manager', 'name avatar designation')
      .populate('department', 'name')
      .populate('team.user', 'name designation avatar employeeId')
      .populate('interns.user', 'name avatar college email');

    if (!project) return sendError(res, 'Project not found', 404);

    const isMember = project.team.some((t) => t.user?._id?.toString() === userId.toString()) ||
                     project.interns.some((i) => i.user?._id?.toString() === userId.toString());
    if (!isMember) return sendError(res, 'You are not assigned to this project', 403);

    const myTasks = await Task.find({ project: project._id, assignedTo: userId })
      .populate('assignedBy', 'name avatar');

    const projObj = project.toObject();
    projObj.myTasks = myTasks;

    sendSuccess(res, projObj);
  } catch (error) {
    next(error);
  }
};

// Kept for the /projects/team route (existing frontend compat)
export const getMyTeam = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const projects = await Project.find({
      $or: [
        { 'team.user': userId },
        { 'interns.user': userId }
      ],
      status: { $ne: 'Cancelled' }
    })
      .populate('manager', 'name avatar designation email')
      .populate('team.user', 'name avatar designation email employeeId')
      .populate('interns.user', 'name avatar email employeeId')
      .lean();

    const teamMap = new Map();

    projects.forEach((p) => {
      p.team.forEach((m) => {
        if (!m.user || m.user._id.toString() === userId.toString()) return;
        const key = m.user._id.toString();
        if (!teamMap.has(key)) {
          teamMap.set(key, { ...m.user, roleInProject: m.role, sharedProjects: [p.name] });
        } else {
          teamMap.get(key).sharedProjects.push(p.name);
        }
      });
      p.interns.forEach((i) => {
        if (!i.user || i.user._id.toString() === userId.toString()) return;
        const key = i.user._id.toString();
        if (!teamMap.has(key)) {
          teamMap.set(key, { ...i.user, roleInProject: 'Intern', sharedProjects: [p.name] });
        } else {
          teamMap.get(key).sharedProjects.push(p.name);
        }
      });
    });

    sendSuccess(res, Array.from(teamMap.values()));
  } catch (error) {
    next(error);
  }
};
