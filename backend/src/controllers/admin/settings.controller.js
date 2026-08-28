import Settings  from '../../models/Settings.js';
import AuditLog  from '../../models/AuditLog.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { sendTestEmail, invalidateMailCache } from '../../utils/sendEmail.js';

// ─── GET /api/admin/settings ──────────────────────────────────────────────────
export const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ key: 'global' });
    if (!settings) settings = await Settings.create({ key: 'global' });
    // smtpPass has select:false — never returned to frontend
    sendSuccess(res, settings, 'Settings loaded');
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/admin/settings ──────────────────────────────────────────────────
export const updateSettings = async (req, res, next) => {
  try {
    const incoming = req.body;

    // Server-side validation
    if (incoming.security?.minPasswordLength !== undefined) {
      const len = Number(incoming.security.minPasswordLength);
      if (len < 6 || len > 32)
        return sendError(res, 'Password length must be between 6 and 32', 400);
    }
    if (incoming.general?.itemsPerPage !== undefined) {
      const ipp = Number(incoming.general.itemsPerPage);
      if (ipp < 10 || ipp > 100)
        return sendError(res, 'Items per page must be between 10 and 100', 400);
    }
    if (incoming.system?.apiRateLimit !== undefined) {
      const rl = Number(incoming.system.apiRateLimit);
      if (rl < 10 || rl > 1000)
        return sendError(res, 'API rate limit must be between 10 and 1000', 400);
    }

    // Build flat dot-path update object per section
    const updateObj = {};
    const sections  = ['general', 'security', 'notifications', 'branding', 'system', 'hr'];
    for (const section of sections) {
      if (incoming[section]) {
        for (const [key, value] of Object.entries(incoming[section])) {
          updateObj[`${section}.${key}`] = value;
        }
      }
    }

    // Never overwrite smtpPass with empty string
    if (!incoming.notifications?.smtpPass) {
      delete updateObj['notifications.smtpPass'];
    }

    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: updateObj },
      { new: true, upsert: true, runValidators: true }
    );

    // Drop the cached mail config so new SMTP / sender identities take effect now
    if (incoming.notifications) invalidateMailCache();

    await AuditLog.create({
      user:     req.user._id,
      userName: req.user.name,
      action:   'Update',
      module:   'Settings',
      details:  `System settings updated by ${req.user.name}`,
      ipAddress: req.ip,
      result:   'SUCCESS',
    });

    sendSuccess(res, settings, 'Settings saved successfully');
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/admin/settings/reset ──────────────────────────────────────────
export const resetSettings = async (req, res, next) => {
  try {
    if (req.user.role?.slug !== 'super-admin')
      return sendError(res, 'Only Super Admin can reset settings', 403);

    await Settings.findOneAndDelete({ key: 'global' });
    const fresh = await Settings.create({ key: 'global' });

    await AuditLog.create({
      user:     req.user._id,
      userName: req.user.name,
      action:   'Reset',
      module:   'Settings',
      details:  'System settings reset to factory defaults',
      ipAddress: req.ip,
      result:   'WARNING',
    });

    sendSuccess(res, fresh, 'Settings reset to defaults');
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/admin/settings/test-email ─────────────────────────────────────
export const testEmail = async (req, res) => {
  try {
    // Send a fresh copy reflecting any unsaved-then-saved identity changes
    invalidateMailCache();
    const identity = ['onboarding', 'alerts', 'support'].includes(req.body?.identity)
      ? req.body.identity
      : 'support';

    // Uses DB SMTP when configured, otherwise the EMAIL_* environment fallback.
    await sendTestEmail({ to: req.user.email, identity });

    await AuditLog.create({
      user:     req.user._id,
      userName: req.user.name,
      action:   'Test',
      module:   'Settings',
      details:  `Test email (${identity}) sent to ${req.user.email}`,
      result:   'SUCCESS',
    });

    sendSuccess(res, null, `Test email sent to ${req.user.email}`);
  } catch (err) {
    // Return friendly SMTP error, not a 500
    sendError(res, `Failed to send test email: ${err.message}`, 400);
  }
};

// ─── POST /api/admin/settings/upload-logo ────────────────────────────────────
export const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded', 400);

    const logoPath = req.file.filename;
    await Settings.findOneAndUpdate(
      { key: 'global' },
      { 'branding.logoPath': logoPath },
      { upsert: true }
    );

    await AuditLog.create({
      user:     req.user._id,
      userName: req.user.name,
      action:   'Update',
      module:   'Settings',
      details:  'Company logo updated',
      result:   'SUCCESS',
    });

    sendSuccess(res, { logoUrl: `/uploads/avatars/${logoPath}` }, 'Logo uploaded successfully');
  } catch (err) {
    next(err);
  }
};
