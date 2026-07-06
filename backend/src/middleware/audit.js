import AuditLog from '../models/AuditLog.js';
import { getClientInfo } from '../utils/clientInfo.js';

/**
 * Auto Audit Logging Middleware
 * Wraps res.json to intercept successful responses and automatically
 * create audit log entries. Generates human-readable details.
 *
 * Usage: router.post('/', protect, auditLog('Create', 'Users'), createUser)
 */

// Generate human-readable audit details
const generateAuditDetails = (action, module, reqBody, resData) => {
  const name = resData?.name || reqBody?.name || '';
  const id = resData?.employeeId || resData?._id || '';

  switch (action) {
    case 'Create':
      return `Created ${module.slice(0, -1)} ${name}${id ? ` (ID: ${id})` : ''}`;
    case 'Update':
      return `Updated ${module.slice(0, -1)} ${name}${id ? ` (ID: ${id})` : ''}`;
    case 'Delete':
      return `Deleted ${module.slice(0, -1)} ${name}${id ? ` (ID: ${id})` : ''}`;
    case 'Login':
      return `User ${name} logged in`;
    default:
      return `${action} on ${module}${name ? ` — ${name}` : ''}`;
  }
};

export const auditLog = (action, module) => {
  return async (req, res, next) => {
    // Wrap res.json to intercept the response
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      // Only log successful operations (status < 400)
      if (res.statusCode < 400 && body?.success !== false) {
        try {
          const client = getClientInfo(req);
          await AuditLog.create({
            user: req.user?._id,
            userName: req.user?.name || 'System',
            action,
            module,
            resourceId: req.params?.id || body?.data?._id,
            details: generateAuditDetails(action, module, req.body, body?.data),
            ...client,
            result: 'SUCCESS',
            sessionId: req.headers['x-session-id'],
          });
        } catch (err) {
          // Audit logging should never break the request
          if (process.env.NODE_ENV === 'development') {
            console.error('Audit log failed:', err.message);
          }
        }
      }
      return originalJson(body);
    };

    next();
  };
};
