import AuditLog from '../models/AuditLog.js';
import { getClientInfo } from './clientInfo.js';

/**
 * Reusable Audit Log Helper
 * Records immutable compliance audit log entries with client device/IP telemetry.
 */
export async function logProjectAudit(req, { action, module = 'Projects', resourceId, details, result = 'SUCCESS', errorMessage }) {
  try {
    const client = getClientInfo(req);
    return await AuditLog.create({
      user: req.user?._id,
      userName: req.user?.name || 'System',
      action,
      module,
      resource: 'Project',
      resourceId,
      details,
      result,
      errorMessage,
      ...client,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
