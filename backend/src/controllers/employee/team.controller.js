import Project from '../../models/Project.js';
import User from '../../models/User.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const SAFE_FIELDS = 'name designation email avatar employeeId skills bio joinDate';

export const getTeam = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const projects = await Project.find({ 'team.user': userId, status: { $ne: 'Cancelled' } })
      .select('name team interns')
      .lean();

    const memberMap = new Map();

    for (const p of projects) {
      for (const m of p.team) {
        if (!m.user || m.user.toString() === userId.toString()) continue;
        const key = m.user.toString();
        if (!memberMap.has(key)) {
          memberMap.set(key, { userId: key, role: m.role, sharedProjects: [p.name], type: 'employee' });
        } else {
          memberMap.get(key).sharedProjects.push(p.name);
        }
      }
      for (const i of p.interns) {
        if (!i.user || i.user.toString() === userId.toString()) continue;
        const key = i.user.toString();
        if (!memberMap.has(key)) {
          memberMap.set(key, { userId: key, role: 'Intern', sharedProjects: [p.name], type: 'intern' });
        } else {
          memberMap.get(key).sharedProjects.push(p.name);
        }
      }
    }

    const userIds = Array.from(memberMap.keys());
    const users = await User.find({ _id: { $in: userIds } })
      .select(SAFE_FIELDS)
      .populate('role', 'name slug')
      .populate('department', 'name')
      .lean();

    const result = users.map((u) => {
      const meta = memberMap.get(u._id.toString());
      return {
        ...u,
        roleInProject: meta?.role,
        sharedProjects: meta?.sharedProjects || [],
      };
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getTeamMember = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const targetId = req.params.userId;

    // Verify they share at least one project
    const sharedProject = await Project.findOne({
      'team.user': userId,
      $or: [
        { 'team.user': targetId },
        { 'interns.user': targetId },
      ],
      status: { $ne: 'Cancelled' },
    }).select('name').lean();

    if (!sharedProject) {
      return sendError(res, 'Not authorized to view this user\'s profile', 403);
    }

    const member = await User.findById(targetId)
      .select(SAFE_FIELDS)
      .populate('role', 'name slug')
      .populate('department', 'name')
      .lean();

    if (!member) return sendError(res, 'User not found', 404);

    // Collect all shared projects
    const sharedProjects = await Project.find({
      'team.user': userId,
      $or: [
        { 'team.user': targetId },
        { 'interns.user': targetId },
      ],
      status: { $ne: 'Cancelled' },
    }).select('name').lean();

    sendSuccess(res, { ...member, sharedProjects: sharedProjects.map((p) => p.name) });
  } catch (error) {
    next(error);
  }
};
