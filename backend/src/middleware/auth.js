import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Settings from '../models/Settings.js';

/**
 * JWT Authentication Middleware
 * 1. Extracts Bearer token from Authorization header
 * 2. Verifies JWT signature
 * 3. Loads user with role + permissions populated
 * 4. Checks user status, password change, maintenance mode
 * 5. Attaches user to req.user
 */
export const protect = async (req, res, next) => {
  try {
    // 1. Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — no token provided',
      });
    }

    // 2. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired — please log in again',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    // 3. Find user, populate role with permissions
    const user = await User.findById(decoded.id)
      .populate({
        path: 'role',
        populate: {
          path: 'permissions',
          select: 'name resource action status',
        },
      })
      .populate('department', 'name code');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists',
      });
    }

    // 4. Check user status
    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}. Contact your administrator.`,
      });
    }

    // 5. Check if password changed after token was issued
    if (user.passwordChangedAt) {
      const changedAt = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedAt) {
        return res.status(401).json({
          success: false,
          message: 'Password was recently changed. Please log in again.',
        });
      }
    }

    // 6. Check maintenance mode (except super-admin)
    if (user.role && user.role.slug !== 'super-admin') {
      const settings = await Settings.findOne({ key: 'global' });
      if (settings && settings.system.maintenanceMode) {
        return res.status(503).json({
          success: false,
          message: settings.system.maintenanceMessage || 'System under maintenance.',
        });
      }
    }

    // 7. Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authorization failed',
    });
  }
};
