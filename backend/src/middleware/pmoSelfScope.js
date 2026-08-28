import { sendError } from '../utils/apiResponse.js';

// Same pattern as employeeScope.js — guards the "submit MY OWN Daily
// Tracker / EOD entry" endpoints for the PMO Lead role. This is separate
// from pmoScope.js (which scopes PMO's access to the *projects* they
// manage) and from requirePermission('Daily Tracker', ...) (which only
// has 'read'/'update' actions defined and governs viewing/editing OTHER
// people's entries, not submitting your own).
export const pmoSelfScope = (req, res, next) => {
  if (!req.user) return sendError(res, 'Not authenticated', 401);

  const slug = req.user.role?.slug;
  if (slug !== 'pmo-lead' && slug !== 'super-admin') {
    return sendError(res, 'Access denied — PMO access only', 403);
  }

  next();
};
