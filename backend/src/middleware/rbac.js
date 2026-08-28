import AuditLog from '../models/AuditLog.js';

/**
 * RBAC Permission Checking Middleware
 * The MOST CRITICAL middleware — links directly to Access Matrix.
 *
 * Usage in routes:
 *   router.get('/', protect, requirePermission('Users', 'read'), getUsers)
 *   router.post('/', protect, requirePermission('Users', 'create'), createUser)
 *
 * When Admin changes the Access Matrix (removes 'tasks.read' from 'Intern' role),
 * the intern immediately loses access on their NEXT API request because
 * auth middleware re-fetches role.permissions from DB every time.
 */
export const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      // req.user is already populated with role.permissions from auth middleware
      const user = req.user;

      if (!user || !user.role) {
        return res.status(403).json({
          success: false,
          message: 'Access denied — no role assigned',
        });
      }

      const permissionName = `${resource.toLowerCase().replace(/\s+/g, '_')}.${action}`;

      // Super Admin bypasses ALL permission checks
      if (user.role.slug === 'super-admin') {
        return next();
      }

      // Check if user's role has this specific permission
      const hasPermission = user.role.permissions && user.role.permissions.some(
        (perm) => perm.name === permissionName && perm.status === 'Active'
      );

      if (!hasPermission) {
        // Log the denied access attempt for audit
        await AuditLog.create({
          user: user._id,
          userName: user.name,
          action: action,
          module: resource,
          result: 'FAILED',
          details: `Access denied: required permission "${permissionName}"`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }).catch((err) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Audit log creation failed:', err.message);
          }
        });

        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${permissionName}`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
      });
    }
  };
};
