import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';
import Attendance from '../models/Attendance.js';
import { generateTokenPair } from '../utils/generateToken.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { sendPasswordResetEmail } from '../utils/sendEmail.js';
import { getClientInfo } from '../utils/clientInfo.js';

/**
 * POST /api/auth/login
 * Login with email OR employeeId + password.
 * Implements account lockout after too many failed attempts.
 */
export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    // 1. Validate input
    if (!identifier || !password) {
      return sendError(res, 'Email/Employee ID and password are required', 400);
    }

    // 2. Determine lookup field
    let query;
    if (identifier.includes('@')) {
      query = { email: identifier.toLowerCase() };
    } else if (/^(EMP|INT)-\d{4}-\d{3}$/.test(identifier)) {
      query = { employeeId: identifier };
    } else {
      return sendError(res, 'Invalid identifier format. Use email or Employee ID (EMP-YYYY-XXX)', 400);
    }

    // 3. Find user with password + role populated
    const user = await User.findOne(query)
      .select('+password +refreshToken')
      .populate({
        path: 'role',
        populate: {
          path: 'permissions',
          select: 'name resource action status',
        },
      })
      .populate('department', 'name code');

    if (!user) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // 4. Get settings for lockout config
    const settings = await Settings.findOne({ key: 'global' });
    const maxAttempts = settings?.security?.maxFailedLogins || 5;

    // 5. Check if account is locked
    if (user.isLocked()) {
      return sendError(res, 'Account is temporarily locked due to too many failed login attempts. Please try again later.', 423);
    }

    // 6. Compare password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Increment failed attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= maxAttempts) {
        // Lock the account for 15 minutes
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save({ validateBeforeSave: false });

      // Audit failed login
      await AuditLog.create({
        user: user._id,
        userName: user.name,
        action: 'Login',
        module: 'Auth',
        result: 'FAILED',
        details: `Failed login attempt (${user.loginAttempts}/${maxAttempts})`,
        ...getClientInfo(req),
      }).catch(() => {});

      return sendError(res, 'Invalid credentials', 401);
    }

    // 7. Check user status
    if (user.status !== 'Active') {
      return sendError(res, `Account is ${user.status.toLowerCase()}. Contact your administrator.`, 403);
    }

    // 8. Successful login — reset lockout
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();

    // 9. Generate token pair
    const { token, refreshToken } = generateTokenPair(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // 9.5 Automatically mark attendance for the day if not exists, but ONLY if they don't need to change password
    if (!user.mustChangePassword) {
      const today = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
      const existingAttendance = await Attendance.findOne({
        user: user._id,
        date: today
      });
      if (!existingAttendance) {
        await Attendance.create({
          user: user._id,
          date: today,
          status: 'Present',
          checkIn: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          markedBy: user._id,
          note: 'Auto-marked on login'
        });
      }
    }

    // 10. Audit successful login
    await AuditLog.create({
      user: user._id,
      userName: user.name,
      action: 'Login',
      module: 'Auth',
      result: 'SUCCESS',
      details: `User ${user.name} logged in`,
      ...getClientInfo(req),
    }).catch(() => {});

    // 11. Build safe user response (no password, no refreshToken)
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      avatar: user.avatar,
      avatarUrl: user.avatarUrl,
      role: {
        _id: user.role._id,
        name: user.role.name,
        slug: user.role.slug,
        permissions: user.role.permissions?.map((p) => ({
          _id: p._id,
          name: p.name,
          resource: p.resource,
          action: p.action,
          status: p.status,
        })) || [],
      },
      department: user.department,
      designation: user.designation,
      employmentType: user.employmentType,
      status: user.status,
      lastLogin: user.lastLogin,
      mustChangePassword: user.mustChangePassword || false,
    };

    sendSuccess(res, { token, refreshToken, user: userResponse }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'role',
        populate: {
          path: 'permissions',
          select: 'name resource action status',
        },
      })
      .populate('department', 'name code')
      .populate('manager', 'name employeeId designation')
      .populate('hrManager', 'name employeeId');

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, user, 'User profile retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Accepts a refresh token, validates it, and returns a new token pair.
 * Implements refresh token rotation for security.
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: incomingToken } = req.body;

    if (!incomingToken) {
      return sendError(res, 'Refresh token is required', 400);
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(incomingToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return sendError(res, 'Invalid or expired refresh token', 401);
    }

    // Find user and validate stored refresh token
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== incomingToken) {
      return sendError(res, 'Invalid refresh token', 401);
    }

    // Generate new token pair (rotation)
    const tokens = generateTokenPair(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    sendSuccess(res, tokens, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Invalidates the user's refresh token.
 */
export const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      refreshToken: null,
    });

    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * Accepts an email, generates a reset token, and emails a reset link.
 * Always responds with success to avoid leaking which emails are registered.
 */
export const forgotPassword = async (req, res, next) => {
  // Generic message used for every outcome — never reveal whether the email exists.
  const genericMessage = 'If an account with that email exists, a password reset link has been sent.';

  try {
    const { email } = req.body;
    if (!email) return sendError(res, 'Email is required', 400);

    const user = await User.findOne({
      email: email.toLowerCase(),
      deletedAt: { $exists: false },
    });

    // No user, or an inactive account → respond success but do nothing.
    if (!user || user.status !== 'Active') {
      return sendSuccess(res, null, genericMessage);
    }

    // Generate + persist the hashed token
    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    } catch (emailErr) {
      // Roll back the token so a failed send doesn't leave a dangling reset request
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error('Password reset email failed:', emailErr.message);
      return sendError(res, 'Could not send the reset email. Please try again later.', 502);
    }

    await AuditLog.create({
      user: user._id,
      userName: user.name,
      action: 'Update',
      module: 'Auth',
      result: 'SUCCESS',
      details: `Password reset link requested for ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});

    return sendSuccess(res, null, genericMessage);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Validates the reset token + sets a new password.
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword) {
      return sendError(res, 'Token and new password are required', 400);
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return sendError(res, 'Passwords do not match', 400);
    }

    // Enforce minimum length from settings
    const settings = await Settings.findOne({ key: 'global' });
    const minLen = settings?.security?.minPasswordLength || 8;
    if (newPassword.length < minLen) {
      return sendError(res, `Password must be at least ${minLen} characters`, 400);
    }

    // Hash the incoming token and match against a non-expired record
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return sendError(res, 'This reset link is invalid or has expired. Please request a new one.', 400);
    }

    // Apply the new password and clear all reset / lockout state
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.mustChangePassword = false;
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.refreshToken = null; // invalidate existing sessions
    await user.save();

    await AuditLog.create({
      user: user._id,
      userName: user.name,
      action: 'Update',
      module: 'Auth',
      result: 'SUCCESS',
      details: `Password reset completed for ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});

    return sendSuccess(res, null, 'Your password has been reset. You can now log in with your new password.');
  } catch (error) {
    next(error);
  }
};
