import { sendError } from '../utils/apiResponse.js';

export const employeeScope = (req, res, next) => {
  if (!req.user) return sendError(res, 'Not authenticated', 401);

  const slug = req.user.role?.slug;
  const allowed = ['employee', 'pmo-lead', 'intern', 'admin', 'super-admin', 'hr-manager'];
  if (!allowed.includes(slug)) {
    return sendError(res, 'Access denied — employee access only', 403);
  }

  req.employeeId = req.user._id;
  next();
};
