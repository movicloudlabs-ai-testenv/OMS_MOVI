import AuditLog from '../../models/AuditLog.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js';
import { getPagination } from '../../utils/paginate.js';

/**
 * GET /api/admin/audit-logs
 * List all audit logs with pagination and filters.
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, user, module, action, result, dateFrom, dateTo, ipAddress } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { details: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
      ];
    }

    if (user) filter.user = user;
    if (module) filter.module = module;
    if (action) filter.action = action;
    if (result) filter.result = result;
    if (ipAddress) filter.ipAddress = { $regex: ipAddress, $options: 'i' };

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate({
          path: 'user',
          select: 'name employeeId role',
          populate: { path: 'role', select: 'name' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    sendPaginated(res, logs, {
      total, page, limit,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/audit-logs/:id
 */
export const getAuditLogById = async (req, res, next) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate({
        path: 'user',
        select: 'name employeeId role',
        populate: { path: 'role', select: 'name' },
      });

    if (!log) {
      return sendError(res, 'Audit log not found', 404);
    }

    sendSuccess(res, log);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/audit-logs/export
 * Export filtered audit logs as CSV.
 */
export const exportAuditLogs = async (req, res, next) => {
  try {
    const { search, module, action, result, ipAddress, dateFrom, dateTo } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { details: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
      ];
    }
    if (module) filter.module = module;
    if (action) filter.action = action;
    if (result) filter.result = result;
    if (ipAddress) filter.ipAddress = { $regex: ipAddress, $options: 'i' };
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const logs = await AuditLog.find(filter)
      .populate({ path: 'user', select: 'name email employeeId', populate: { path: 'role', select: 'name' } })
      .sort({ createdAt: -1 })
      .limit(10000);

    // BOM so Excel opens UTF-8 correctly
    const BOM = '﻿';

    const headers = [
      'Timestamp (UTC)', 'Date', 'Time',
      'User Name', 'User Email', 'Employee ID', 'Role',
      'Action', 'Module', 'Result',
      'IP Address', 'Location', 'Browser', 'OS', 'Device', 'Details',
    ];

    const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = logs.map((log) => {
      const dt = log.createdAt ? new Date(log.createdAt) : null;
      const timestamp  = dt ? dt.toISOString() : '';
      const dateStr    = dt ? dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : '';
      const timeStr    = dt ? dt.toLocaleTimeString('en-US', { hour12: false }) : '';
      const userName   = log.user?.name   || log.userName || 'System';
      const userEmail  = log.user?.email  || '';
      const employeeId = log.user?.employeeId || '';
      const role       = log.user?.role?.name || '';

      return [
        escape(timestamp),
        escape(dateStr),
        escape(timeStr),
        escape(userName),
        escape(userEmail),
        escape(employeeId),
        escape(role),
        escape(log.action || ''),
        escape(log.module || ''),
        escape(log.result || ''),
        escape(log.ipAddress || ''),
        escape(log.location || ''),
        escape(log.browser || ''),
        escape(log.os || ''),
        escape(log.device || ''),
        escape(log.details || ''),
      ].join(',');
    });

    const csv = BOM + headers.map(escape).join(',') + '\n' + rows.join('\n');

    const exportedAt = new Date().toISOString().slice(0, 10);
    const filename = `OWMS_AuditLogs_${exportedAt}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
