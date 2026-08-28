import PDFDocument from 'pdfkit';
import XLSX        from 'xlsx';
import Report      from '../../models/Report.js';
import ReportRun   from '../../models/ReportRun.js';
import User        from '../../models/User.js';
import Department  from '../../models/Department.js';
import Role        from '../../models/Role.js';
import AuditLog    from '../../models/AuditLog.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED_REPORTS = [
  {
    name: 'User Activity Report',
    description: 'Users created, deactivated, and logged in within a date range, grouped by department.',
    category: 'User Reports',
    type: 'system',
    schedule: 'Daily',
    dataSource: ['Users', 'Departments'],
    outputFormats: ['PDF', 'XLSX', 'CSV'],
    fileSizes: { pdf: '~1.2 MB', xlsx: '~0.4 MB', csv: '~100 KB' },
    parameters: 'Default: last 30 days, all departments',
    generatorKey: 'user-activity',
    filters: ['dateFrom', 'dateTo', 'department'],
    icon: 'Users',
  },
  {
    name: 'Department Summary',
    description: 'Headcount, active/inactive ratio, and role distribution per department.',
    category: 'Department Reports',
    type: 'system',
    schedule: 'Weekly',
    dataSource: ['Departments', 'Users'],
    outputFormats: ['PDF', 'XLSX', 'CSV'],
    fileSizes: { pdf: '~0.8 MB', xlsx: '~0.3 MB', csv: '~50 KB' },
    parameters: 'All departments',
    generatorKey: 'department-summary',
    filters: ['department'],
    icon: 'Building',
  },
  {
    name: 'Role & Permission Audit',
    description: 'Which roles have which permissions and how many users are assigned to each role.',
    category: 'Role Reports',
    type: 'system',
    schedule: 'Monthly',
    dataSource: ['Roles', 'Users', 'Permissions'],
    outputFormats: ['PDF', 'XLSX', 'CSV'],
    fileSizes: { pdf: '~0.5 MB', xlsx: '~0.2 MB', csv: '~30 KB' },
    parameters: 'All roles',
    generatorKey: 'role-permission-audit',
    filters: ['role'],
    icon: 'Shield',
  },
  {
    name: 'Login Activity Report',
    description: 'Login attempts, failures, and locked accounts within a date range.',
    category: 'Security Reports',
    type: 'system',
    schedule: 'Daily',
    dataSource: ['Audit Logs', 'Users'],
    outputFormats: ['PDF', 'XLSX', 'CSV'],
    fileSizes: { pdf: '~2.4 MB', xlsx: '~0.8 MB', csv: '~300 KB' },
    parameters: 'Default: last 30 days',
    generatorKey: 'login-activity',
    filters: ['dateFrom', 'dateTo'],
    icon: 'Lock',
  },
];

async function seedReports() {
  const count = await Report.countDocuments();
  if (count === 0) {
    const docs = SEED_REPORTS.map(r => ({ ...r, nextRun: calcNextRun(r.schedule) }));
    await Report.insertMany(docs);
  }
}

function calcNextRun(schedule) {
  const now = new Date();
  if (schedule === 'Daily') {
    const next = new Date(now);
    next.setHours(22, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }
  if (schedule === 'Weekly') {
    const next = new Date(now);
    const day = next.getDay();
    const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
    next.setDate(next.getDate() + daysUntilMonday);
    next.setHours(8, 0, 0, 0);
    return next;
  }
  if (schedule === 'Monthly') {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1, 8, 0, 0);
  }
  return null;
}

// ─── GET /api/admin/reports ───────────────────────────────────────────────────
export const listReports = async (req, res, next) => {
  try {
    await seedReports();

    const { page = 1, limit = 12, search, category } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = { isArchived: false };
    if (category && category !== 'All') query.category = category;
    if (search) {
      query.$or = [
        { name:       { $regex: search, $options: 'i' } },
        { category:   { $regex: search, $options: 'i' } },
        { dataSource: { $elemMatch: { $regex: search, $options: 'i' } } },
      ];
    }

    const [reports, total] = await Promise.all([
      Report.find(query).sort({ createdAt: 1 }).skip(skip).limit(Number(limit)).lean(),
      Report.countDocuments(query),
    ]);

    const enriched = await Promise.all(
      reports.map(async (r) => {
        const runs = await ReportRun.find({ report: r._id })
          .sort({ startedAt: -1 })
          .limit(10)
          .lean();

        const lastRun = runs[0]
          ? {
              executedAt:   runs[0].startedAt,
              status:       runs[0].status,
              recordCount:  runs[0].recordCount,
              fileSize:     runs[0].fileSize,
              duration:     runs[0].duration,
              errorMessage: runs[0].errorMessage,
            }
          : null;

        const runHistory = runs.map(run => ({
          executedAt:   run.startedAt,
          status:       run.status,
          duration:     run.duration || null,
          recordCount:  run.recordCount || 0,
          fileSize:     run.fileSize || null,
          errorMessage: run.errorMessage || null,
        }));

        return { ...r, lastRun, runHistory };
      })
    );

    // Stats
    const now        = new Date();
    const dayAgo     = new Date(now - 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [successLast24h, failedLast24h, allCount, scheduledTodayCount] = await Promise.all([
      ReportRun.countDocuments({ status: 'SUCCESS', startedAt: { $gte: dayAgo } }),
      ReportRun.countDocuments({ status: 'FAILED',  startedAt: { $gte: dayAgo } }),
      Report.countDocuments({ isArchived: false }),
      Report.countDocuments({
        isArchived: false,
        schedule: { $ne: 'Manual' },
        nextRun: { $gte: todayStart, $lt: todayEnd },
      }),
    ]);

    const recentRuns = await ReportRun.find({ status: 'SUCCESS' }).select('fileSize').lean();
    let totalBytes = 0;
    recentRuns.forEach(r => {
      const m = r.fileSize && r.fileSize.match(/([\d.]+)\s*(KB|MB|GB)/i);
      if (m) {
        const v = parseFloat(m[1]);
        const u = m[2].toUpperCase();
        if (u === 'KB') totalBytes += v * 1024;
        else if (u === 'MB') totalBytes += v * 1024 * 1024;
        else if (u === 'GB') totalBytes += v * 1024 * 1024 * 1024;
      }
    });
    const storageUsed = totalBytes >= 1024 * 1024
      ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(totalBytes / 1024).toFixed(1)} KB`;

    sendSuccess(res, {
      reports:    enriched,
      stats: {
        total:          allCount,
        successLast24h,
        failed:         failedLast24h,
        scheduledToday: scheduledTodayCount,
        storageUsed:    totalBytes > 0 ? storageUsed : '0 KB',
      },
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/admin/reports/:id/run ─────────────────────────────────────────
export const triggerRun = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return sendError(res, 'Report not found', 404);

    const run = await ReportRun.create({
      report:    report._id,
      executedBy: req.user?._id,
      startedAt: new Date(),
    });

    setTimeout(async () => {
      const startMs = Date.now();
      try {
        const result     = await generateReport(report.generatorKey, {});
        const durationSec = Math.max(1, Math.round((Date.now() - startMs) / 1000));
        const rows        = result.rows?.length ?? 0;
        const csvText     = buildCsv(report.name, {}, result);
        const csvBytes    = Buffer.byteLength(csvText, 'utf8');
        const fileSize    = csvBytes >= 1024 * 1024
          ? `${(csvBytes / (1024 * 1024)).toFixed(1)} MB`
          : `${(csvBytes / 1024).toFixed(1)} KB`;

        await ReportRun.findByIdAndUpdate(run._id, {
          status:      'SUCCESS',
          completedAt: new Date(),
          recordCount: rows,
          fileSize,
          duration:    `${durationSec}s`,
        });
        if (report.schedule !== 'Manual') {
          await Report.findByIdAndUpdate(report._id, { nextRun: calcNextRun(report.schedule) });
        }
      } catch (err) {
        const durationSec = Math.max(1, Math.round((Date.now() - startMs) / 1000));
        await ReportRun.findByIdAndUpdate(run._id, {
          status:       'FAILED',
          completedAt:  new Date(),
          errorMessage: err.message,
          duration:     `${durationSec}s`,
        });
      }
    }, 3000);

    sendSuccess(res, {
      runId:     run.runId,
      reportId:  report._id,
      status:    'PENDING',
      startedAt: run.startedAt,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/reports/:id/runs/:runId/status ───────────────────────────
export const getRunStatus = async (req, res, next) => {
  try {
    const run = await ReportRun.findOne({ report: req.params.id, runId: req.params.runId });
    if (!run) return sendError(res, 'Run not found', 404);
    sendSuccess(res, {
      runId:        run.runId,
      status:       run.status,
      recordCount:  run.recordCount,
      fileSize:     run.fileSize,
      duration:     run.duration,
      errorMessage: run.errorMessage,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/reports/:id/export ───────────────────────────────────────
export const exportReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return sendError(res, 'Report not found', 404);

    const format     = (req.query.format || 'csv').toLowerCase();
    const filters    = {};  // full export — no filters
    const result     = await generateReport(report.generatorKey, filters);
    const exportedAt = new Date().toISOString().slice(0, 10);
    // Keep readable name — only strip filesystem-unsafe chars
    const safeName   = report.name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();

    if (format === 'pdf') {
      const pdfBuf = await buildPdf(report.name, filters, result);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="OWMS_${safeName}_${exportedAt}.pdf"`);
      return res.status(200).send(pdfBuf);
    }

    if (format === 'xlsx') {
      const xlsxBuf = buildXlsx(report.name, filters, result);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="OWMS_${safeName}_${exportedAt}.xlsx"`);
      return res.status(200).send(xlsxBuf);
    }

    // CSV (default)
    const csv = buildCsv(report.name, filters, result);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="OWMS_${safeName}_${exportedAt}.csv"`);
    return res.status(200).send('﻿' + csv); // BOM for Excel
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/admin/reports/:id ───────────────────────────────────────────
export const deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) return sendError(res, 'Report not found', 404);
    await ReportRun.deleteMany({ report: req.params.id });
    sendSuccess(res, { message: 'Report deleted' });
  } catch (error) { next(error); }
};

// ─── PATCH /api/admin/reports/:id/archive ────────────────────────────────────
export const archiveReport = async (req, res, next) => {
  try {
    const report = await Report.findByIdAndUpdate(req.params.id, { isArchived: true }, { new: true });
    if (!report) return sendError(res, 'Report not found', 404);
    sendSuccess(res, report);
  } catch (error) { next(error); }
};

// ─── Report generators ────────────────────────────────────────────────────────
async function generateReport(generatorKey, filters) {
  switch (generatorKey) {
    case 'user-activity':        return runUserActivity(filters);
    case 'department-summary':   return runDepartmentSummary(filters);
    case 'role-permission-audit': return runRolePermissionAudit(filters);
    case 'login-activity':       return runLoginActivity(filters);
    default: throw new Error(`No generator for key: ${generatorKey}`);
  }
}

async function runUserActivity(filters) {
  const { dateFrom, dateTo, department } = filters;
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  const userFilter = { deletedAt: { $exists: false } };
  if (department) userFilter.department = department;
  if (dateFilter) userFilter.createdAt  = dateFilter;

  const [users, departments] = await Promise.all([
    User.find(userFilter)
      .populate('role',       'name slug')
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .lean(),
    Department.find().select('name').lean(),
  ]);

  const total     = users.length;
  const active    = users.filter(u => u.status === 'Active').length;
  const inactive  = users.filter(u => u.status === 'Inactive').length;
  const suspended = users.filter(u => u.status === 'Suspended').length;

  const byDept = {};
  departments.forEach(d => {
    byDept[d._id.toString()] = { department: d.name, total: 0, active: 0, inactive: 0 };
  });
  byDept['__none__'] = { department: 'No Department', total: 0, active: 0, inactive: 0 };
  users.forEach(u => {
    const key = u.department?._id?.toString() || '__none__';
    if (!byDept[key]) byDept[key] = { department: u.department?.name || 'Unknown', total: 0, active: 0, inactive: 0 };
    byDept[key].total++;
    if (u.status === 'Active') byDept[key].active++;
    else byDept[key].inactive++;
  });

  const rows = users.map(u => ({
    name:           u.name          || '—',
    email:          u.email         || '—',
    employeeId:     u.employeeId    || '—',
    role:           u.role?.name    || '—',
    department:     u.department?.name || '—',
    status:         u.status        || '—',
    employmentType: u.employmentType || '—',
    joinDate:       u.joinDate  ? new Date(u.joinDate).toLocaleDateString('en-US')  : '—',
    createdAt:      u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US') : '—',
  }));

  return {
    summary:    { total, active, inactive, suspended },
    rows,
    columns:    ['Name', 'Email', 'Employee ID', 'Role', 'Department', 'Status', 'Employment Type', 'Join Date', 'Created At'],
    columnKeys: ['name', 'email', 'employeeId', 'role', 'department', 'status', 'employmentType', 'joinDate', 'createdAt'],
  };
}

async function runDepartmentSummary(filters) {
  const { department } = filters;
  const deptFilter = department ? { _id: department } : {};
  const departments = await Department.find(deptFilter).lean();

  const rows = await Promise.all(departments.map(async (dept) => {
    const [total, active, inactive] = await Promise.all([
      User.countDocuments({ department: dept._id, deletedAt: { $exists: false } }),
      User.countDocuments({ department: dept._id, status: 'Active',   deletedAt: { $exists: false } }),
      User.countDocuments({ department: dept._id, status: 'Inactive', deletedAt: { $exists: false } }),
    ]);
    return {
      department:  dept.name,
      code:        dept.code   || '—',
      status:      dept.status || 'Active',
      headcount:   total,
      active,
      inactive,
      activeRatio: total > 0 ? `${Math.round((active / total) * 100)}%` : '0%',
    };
  }));

  const totalHeadcount = rows.reduce((s, r) => s + r.headcount, 0);
  const totalActive    = rows.reduce((s, r) => s + r.active, 0);

  return {
    summary:    { totalDepartments: rows.length, totalHeadcount, totalActive, totalInactive: totalHeadcount - totalActive },
    rows,
    columns:    ['Department', 'Code', 'Status', 'Headcount', 'Active', 'Inactive', 'Active Ratio'],
    columnKeys: ['department', 'code', 'status', 'headcount', 'active', 'inactive', 'activeRatio'],
  };
}

async function runRolePermissionAudit(filters) {
  const { role } = filters;
  const roleFilter = role ? { _id: role } : {};
  const roles = await Role.find(roleFilter)
    .populate('permissions', 'name resource action status')
    .lean();

  const rows = await Promise.all(roles.map(async (r) => {
    const userCount = await User.countDocuments({ role: r._id, deletedAt: { $exists: false } });
    const perms     = (r.permissions || []).filter(p => p.status === 'Active');
    return {
      role:            r.name,
      slug:            r.slug,
      status:          r.status,
      userCount,
      permissionCount: perms.length,
      permissions:     perms.map(p => `${p.resource}:${p.action}`).join(', ') || '—',
    };
  }));

  const totalUsers = rows.reduce((s, r) => s + r.userCount, 0);
  const totalPerms = rows.reduce((s, r) => s + r.permissionCount, 0);

  return {
    summary:    { totalRoles: rows.length, totalUsers, totalPermissions: totalPerms },
    rows,
    columns:    ['Role', 'Slug', 'Status', 'Users Assigned', 'Active Permissions', 'Permissions'],
    columnKeys: ['role', 'slug', 'status', 'userCount', 'permissionCount', 'permissions'],
  };
}

async function runLoginActivity(filters) {
  const { dateFrom, dateTo } = filters;
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  const logFilter  = { action: { $in: ['Login', 'Logout'] } };
  if (dateFilter) logFilter.createdAt = dateFilter;

  const logs = await AuditLog.find(logFilter)
    .populate({
      path: 'user',
      select: 'name email employeeId',
      populate: { path: 'role', select: 'name' },
    })
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean();

  const totalLogins   = logs.filter(l => l.action === 'Login').length;
  const successLogins = logs.filter(l => l.action === 'Login' && l.result === 'SUCCESS').length;
  const failedLogins  = logs.filter(l => l.action === 'Login' && l.result === 'FAILED').length;
  const lockedCount   = await User.countDocuments({ lockUntil: { $gt: new Date() }, deletedAt: { $exists: false } });

  const rows = logs.map(l => ({
    timestamp:  l.createdAt ? new Date(l.createdAt).toLocaleString('en-US') : '—',
    user:       l.user?.name     || l.userName || 'Unknown',
    email:      l.user?.email    || '—',
    role:       l.user?.role?.name || '—',
    action:     l.action         || '—',
    result:     l.result         || '—',
    ipAddress:  l.ipAddress      || '—',
    device:     l.device         || '—',
  }));

  return {
    summary:    { totalEvents: logs.length, totalLogins, successLogins, failedLogins, lockedAccounts: lockedCount },
    rows,
    columns:    ['Timestamp', 'User', 'Email', 'Role', 'Action', 'Result', 'IP Address', 'Device'],
    columnKeys: ['timestamp', 'user', 'email', 'role', 'action', 'result', 'ipAddress', 'device'],
  };
}

// ─── CSV builder ──────────────────────────────────────────────────────────────
function buildCsv(title, filters, result) {
  const esc  = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const keys = result.columnKeys || result.columns;

  const lines = [
    `"OWMS — Movi Cloud Labs"`,
    `"Report:","${title}"`,
    `"Generated:","${new Date().toLocaleString('en-US')}"`,
    `"Total Records:","${result.rows?.length ?? 0}"`,
  ];

  if (filters.dateFrom) lines.push(`"Date From:","${filters.dateFrom}"`);
  if (filters.dateTo)   lines.push(`"Date To:","${filters.dateTo}"`);

  if (result.summary && Object.keys(result.summary).length > 0) {
    lines.push('');
    lines.push('"— Summary —"');
    Object.entries(result.summary).forEach(([k, v]) => {
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
      lines.push(`${esc(label)},${esc(v)}`);
    });
  }

  lines.push('');
  lines.push('"— Data —"');
  lines.push(result.columns.map(esc).join(','));
  (result.rows || []).forEach(row => {
    lines.push(keys.map(k => esc(row[k] ?? '')).join(','));
  });

  return lines.join('\n');
}

// ─── XLSX builder ─────────────────────────────────────────────────────────────
function buildXlsx(title, filters, result) {
  const wb = XLSX.utils.book_new();

  // ── Summary sheet ──
  const summaryAoa = [
    ['OWMS — Movi Cloud Labs', ''],
    ['Report', title],
    ['Generated', new Date().toLocaleString('en-US')],
    ['Total Records', result.rows?.length ?? 0],
  ];
  if (filters.dateFrom) summaryAoa.push(['Date From', filters.dateFrom]);
  if (filters.dateTo)   summaryAoa.push(['Date To',   filters.dateTo]);
  if (result.summary) {
    summaryAoa.push(['', '']);
    summaryAoa.push(['Summary Metrics', '']);
    Object.entries(result.summary).forEach(([k, v]) => {
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
      summaryAoa.push([label, v]);
    });
  }
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryAoa);
  summaryWs['!cols'] = [{ wch: 28 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // ── Data sheet ──
  const keys   = result.columnKeys || result.columns;
  const header = result.columns;
  const dataAoa = [header];
  (result.rows || []).forEach(row => {
    dataAoa.push(keys.map(k => {
      const v = row[k];
      // Return numbers as numbers for Excel
      if (typeof v === 'number') return v;
      return v ?? '';
    }));
  });

  const dataWs = XLSX.utils.aoa_to_sheet(dataAoa);

  // Auto column widths (based on header length, min 12, max 40)
  dataWs['!cols'] = header.map(h => ({ wch: Math.min(40, Math.max(12, h.length + 6)) }));

  // Freeze top row (header)
  dataWs['!freeze'] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(wb, dataWs, 'Data');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// ─── PDF builder ──────────────────────────────────────────────────────────────
function buildPdf(title, filters, result) {
  return new Promise((resolve, reject) => {
    const colCount    = result.columns?.length || 0;
    const orientation = colCount > 6 ? 'landscape' : 'portrait';

    const doc = new PDFDocument({
      margin: 45,
      size:   'A4',
      layout: orientation,
      bufferPages: true,
      info: {
        Title:   title,
        Author:  'OWMS — Movi Cloud Labs',
        Creator: 'OWMS Reporting Engine v2',
        Subject: 'Administrative Report',
      },
    });

    const chunks = [];
    doc.on('data',  c  => chunks.push(c));
    doc.on('error', reject);

    const PW   = doc.page.width;
    const PH   = doc.page.height;
    const M    = 45;
    const CW   = PW - M * 2;

    // Design tokens
    const C_BLUE  = '#2563EB';
    const C_DARK  = '#0F172A';
    const C_GRAY  = '#64748B';
    const C_LGRAY = '#F8FAFC';
    const C_BORD  = '#E2E8F0';
    const C_GREEN = '#16A34A';
    const C_RED   = '#DC2626';
    const C_AMBER = '#D97706';

    // ── Page header (reused on each page) ──
    const drawPageHeader = () => {
      doc.rect(0, 0, PW, 50).fill(C_BLUE);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(13)
        .text('OWMS', M, 14, { continued: true })
        .font('Helvetica').fillColor('#BFDBFE').fontSize(10)
        .text('  ·  Movi Cloud Labs');
      doc.fillColor('#93C5FD').font('Helvetica').fontSize(7.5)
        .text('Confidential · Administrative Report', M, 33);
      const dt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.fillColor('white').font('Helvetica').fontSize(7.5)
        .text(dt, M, 33, { width: CW, align: 'right' });
    };

    drawPageHeader();
    doc.y = 68;

    // ── Title block ──
    doc.fillColor(C_DARK).font('Helvetica-Bold').fontSize(18).text(title, M);
    doc.moveDown(0.25);
    const genStr = `Generated on ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}   ·   ${result.rows?.length ?? 0} records`;
    doc.fillColor(C_GRAY).font('Helvetica').fontSize(8.5).text(genStr, M);

    if (filters.dateFrom || filters.dateTo) {
      const fp = [];
      if (filters.dateFrom) fp.push(`From: ${filters.dateFrom}`);
      if (filters.dateTo)   fp.push(`To:   ${filters.dateTo}`);
      doc.moveDown(0.15).text(`Filters applied: ${fp.join('   ·   ')}`, M);
    }

    doc.moveDown(0.8);
    doc.moveTo(M, doc.y).lineTo(PW - M, doc.y).strokeColor(C_BORD).lineWidth(0.75).stroke();
    doc.moveDown(0.8);

    // ── Summary stat boxes ──
    if (result.summary && Object.keys(result.summary).length > 0) {
      const entries = Object.entries(result.summary);
      const count   = entries.length;
      const gap     = 8;
      const boxW    = (CW - gap * (count - 1)) / count;
      const boxH    = 50;
      const startY  = doc.y;

      entries.forEach(([key, val], i) => {
        const x = M + i * (boxW + gap);
        // Box fill + border
        doc.rect(x, startY, boxW, boxH).fill('#EFF6FF');
        doc.rect(x, startY, boxW, boxH).strokeColor(C_BORD).lineWidth(0.5).stroke();
        // Top accent line
        doc.rect(x, startY, boxW, 3).fill(C_BLUE);
        // Value
        doc.fillColor(C_BLUE).font('Helvetica-Bold').fontSize(17)
          .text(String(val), x, startY + 9, { width: boxW, align: 'center' });
        // Label
        const lbl = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
        doc.fillColor(C_GRAY).font('Helvetica').fontSize(7)
          .text(lbl, x, startY + 31, { width: boxW, align: 'center' });
      });

      doc.y = startY + boxH + 14;
      doc.moveTo(M, doc.y).lineTo(PW - M, doc.y).strokeColor(C_BORD).lineWidth(0.75).stroke();
      doc.moveDown(0.8);
    }

    // ── Data table ──
    const cols    = result.columns || [];
    const keys    = result.columnKeys || cols;
    const rows    = result.rows || [];
    const HDR_H   = 22;
    const CELL_PAD_V = 5;   // top + bottom padding inside each cell
    const CELL_PAD_H = 6;   // left padding
    const FONT_SZ = 7.2;
    const LINE_H  = FONT_SZ * 1.35;
    const MIN_ROW_H = 17;
    const MAX_LINES = 6;     // cap: never let a row exceed 6 lines (~50pt)

    if (cols.length === 0 || rows.length === 0) {
      doc.fillColor(C_GRAY).font('Helvetica').fontSize(11).text('No data to display.', { align: 'center' });
    } else {
      // Proportional column widths
      const weights = keys.map(k => {
        if (k === 'permissions')               return 4.0;
        if (k === 'email')                     return 2.5;
        if (k === 'name' || k === 'user')      return 2.0;
        if (k === 'timestamp')                 return 2.2;
        if (k === 'ipAddress' || k === 'device') return 1.5;
        if (k === 'description')               return 2.5;
        return 1.0;
      });
      const weightTotal = weights.reduce((a, b) => a + b, 0);
      const colWidths   = weights.map(w => (w / weightTotal) * CW);

      // Helper: compute display value for a cell
      const cellVal = (row, key) => {
        const raw = row[key];
        return raw !== undefined && raw !== null && raw !== '' ? String(raw) : '—';
      };

      // Helper: compute the height a cell value will occupy (capped at MAX_LINES)
      const cellHeight = (val, colW, font) => {
        doc.font(font).fontSize(FONT_SZ);
        const h = doc.heightOfString(val, { width: colW - CELL_PAD_H * 2, lineBreak: true });
        const capped = Math.min(h, LINE_H * MAX_LINES);
        return Math.max(MIN_ROW_H - CELL_PAD_V * 2, capped);
      };

      const drawHeader = (ty) => {
        doc.rect(M, ty, CW, HDR_H).fill(C_BLUE);
        let cx = M;
        cols.forEach((col, i) => {
          doc.fillColor('white').font('Helvetica-Bold').fontSize(FONT_SZ - 0.5)
            .text(col.toUpperCase(), cx + CELL_PAD_H, ty + 7, {
              width:     colWidths[i] - CELL_PAD_H * 2,
              lineBreak: false,
              ellipsis:  true,
            });
          cx += colWidths[i];
        });
        return ty + HDR_H;
      };

      let tableY = doc.y;
      tableY = drawHeader(tableY);

      rows.slice(0, 2000).forEach((row, ri) => {
        // Pre-compute values and row height
        const vals = keys.map(k => cellVal(row, k));
        const contentHeights = keys.map((k, i) => {
          const font = (k === 'status' || k === 'result') ? 'Helvetica-Bold' : 'Helvetica';
          return cellHeight(vals[i], colWidths[i], font);
        });
        const contentH = Math.max(...contentHeights);
        const rowH     = contentH + CELL_PAD_V * 2;

        // New page if this row won't fit
        if (tableY + rowH > PH - 50) {
          doc.addPage();
          drawPageHeader();
          tableY = 60;
          tableY = drawHeader(tableY);
        }

        const bg = ri % 2 === 0 ? 'white' : C_LGRAY;
        let cx = M;

        // Row background + border
        doc.rect(M, tableY, CW, rowH).fill(bg)
           .rect(M, tableY, CW, rowH).strokeColor(C_BORD).lineWidth(0.2).stroke();

        // Render each cell
        cols.forEach((_col, i) => {
          const key = keys[i];
          const val = vals[i];

          if (i > 0) {
            doc.moveTo(cx, tableY).lineTo(cx, tableY + rowH).strokeColor(C_BORD).lineWidth(0.2).stroke();
          }

          let textColor = C_DARK;
          let bold      = false;
          if (key === 'status' || key === 'result') {
            if (['Active', 'SUCCESS'].includes(val))                     { textColor = C_GREEN; bold = true; }
            else if (['Inactive', 'Terminated', 'FAILED'].includes(val)) { textColor = C_RED;   bold = true; }
            else if (['On Leave', 'Suspended', 'Pending'].includes(val)) { textColor = C_AMBER; bold = true; }
          }

          // Cap text at MAX_LINES to prevent overflow beyond row boundary
          const maxH    = LINE_H * MAX_LINES;
          const cellW   = colWidths[i] - CELL_PAD_H * 2;

          doc.fillColor(textColor)
            .font(bold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(FONT_SZ)
            .text(val, cx + CELL_PAD_H, tableY + CELL_PAD_V, {
              width:     cellW,
              height:    maxH,
              lineBreak: true,
              ellipsis:  true,
            });

          cx += colWidths[i];
        });

        tableY += rowH;
      });

      if (rows.length > 2000) {
        doc.y = tableY + 4;
        doc.fillColor(C_GRAY).font('Helvetica').fontSize(7.5)
          .text(`... and ${rows.length - 2000} additional records (export limit reached)`);
      }
    }

    // ── Footers on all pages ──
    const range = doc.bufferedPageRange();
    for (let p = 0; p < range.count; p++) {
      doc.switchToPage(p);
      doc.moveTo(M, PH - 32).lineTo(PW - M, PH - 32).strokeColor(C_BORD).lineWidth(0.5).stroke();
      doc.fillColor(C_GRAY).font('Helvetica').fontSize(6.5)
        .text(
          `${title}  ·  Movi Cloud Labs  ·  Confidential`,
          M, PH - 24, { width: CW * 0.6, lineBreak: false }
        )
        .text(
          `Page ${p + 1} of ${range.count}`,
          M, PH - 24, { width: CW, align: 'right', lineBreak: false }
        );
    }

    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.flushPages();
    doc.end();
  });
}

// ─── Util ─────────────────────────────────────────────────────────────────────
function buildDateFilter(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return null;
  const f = {};
  if (dateFrom) f.$gte = new Date(dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    f.$lte = end;
  }
  return f;
}
