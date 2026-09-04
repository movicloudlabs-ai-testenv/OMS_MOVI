import Project from '../models/Project.js';
import User from '../models/User.js';

/**
 * HR Scope Middleware
 * Restricts HR Manager to see users they are responsible for:
 *   a) Users explicitly linked via hrManager === this HR's _id
 *   b) Users who share a project with this HR manager (auto-discovered scope)
 *
 * Attaches req.scopeFilter  — spread into User.find() queries
 */
export const hrScope = async (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (req.user.role.slug === 'super-admin' || req.user.role.slug === 'admin') {
      req.scopeFilter = {};
      req.hrUserIds   = null;
      return next();
    }

    // Allow self-access if user is requesting their own profile/employee details
    if (req.params.id && (req.params.id === req.user._id.toString() || req.params.id === req.user.employeeId)) {
      req.scopeFilter = { _id: req.user._id };
      req.hrUserIds   = null;
      return next();
    }

    if (req.user.role.slug === 'hr-manager') {
      // Explicit assignments & created users
      const explicitUsers = await User.find({
        $or: [
          { hrManager: req.user._id },
          { createdBy: req.user._id }
        ]
      }).select('_id');
      const ids = new Set(explicitUsers.map(u => u._id.toString()));

      // Implicit: all team members & interns in projects this HR is part of
      const sharedProjects = await Project.find({ 'team.user': req.user._id })
        .select('team interns');

      sharedProjects.forEach(p => {
        p.team.forEach(t => {
          if (t.user.toString() !== req.user._id.toString()) ids.add(t.user.toString());
        });
        (p.interns || []).forEach(i => ids.add(i.user.toString()));
      });

      // Unassigned pool: users with no HR Manager set yet are visible to every
      // HR manager so a newly added intern/employee doesn't disappear until
      // someone explicitly claims them.
      const unassignedUsers = await User.find({
        $or: [
          { hrManager: null },
          { hrManager: { $exists: false } },
          { hrManager: { $type: 'string' } }
        ],
      }).select('_id');
      unassignedUsers.forEach(u => ids.add(u._id.toString()));

      const allIds = Array.from(ids);
      req.scopeFilter = allIds.length ? { _id: { $in: allIds } } : {};
      req.hrUserIds   = null;
      return next();
    }

    // Allow PMO Lead and other roles granted cross-role access via RBAC
    if (req.user.role.slug === 'pmo-lead' || req.user.role.permissions?.some(p => p.resource === 'Users' || p.resource === 'Interns')) {
      req.scopeFilter = {};
      req.hrUserIds   = null;
      return next();
    }

    return res.status(403).json({ success: false, message: 'HR access required' });
  } catch (error) {
    next(error);
  }
};
