import LeaveRequest from '../../models/LeaveRequest.js';
import LeaveBalance from '../../models/LeaveBalance.js';
import User from '../../models/User.js';
import Project from '../../models/Project.js';
import AuditLog from '../../models/AuditLog.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js';
import { getPagination } from '../../utils/paginate.js';
import { sendNotification } from '../../utils/sendNotification.js';

const getWorkingDays = (startDate, endDate) => {
  let count = 0;
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

export const getMyLeaveBalance = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    let balance = await LeaveBalance.findOne({ user: req.user._id, year: currentYear });
    if (!balance) {
      balance = await LeaveBalance.create({
        user: req.user._id, year: currentYear,
        casual: { total: 10, used: 0 }, sick: { total: 7, used: 0 },
        annual: { total: 15, used: 0 }, emergency: { total: 2, used: 0 },
      });
    }
    sendSuccess(res, balance);
  } catch (error) {
    next(error);
  }
};

export const getMyLeaves = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, type } = req.query;

    const filter = { user: req.user._id };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const [leaves, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LeaveRequest.countDocuments(filter),
    ]);

    sendPaginated(res, leaves, {
      total, page, limit,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    next(error);
  }
};

export const applyForLeave = async (req, res, next) => {
  try {
    const { type, fromDate, toDate, reason } = req.body;

    if (!type || !fromDate || !toDate) {
      return sendError(res, 'type, fromDate, and toDate are required', 400);
    }

    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    if (!trimmedReason) {
      return sendError(res, 'Leave reason is required.', 400);
    }

    const validTypes = ['Casual', 'Sick', 'Annual', 'Emergency'];
    if (!validTypes.includes(type)) {
      return sendError(res, `Leave type must be one of: ${validTypes.join(', ')}`, 400);
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    if (isNaN(start) || isNaN(end)) return sendError(res, 'Invalid date format', 400);
    if (start > end) return sendError(res, 'fromDate cannot be after toDate', 400);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) return sendError(res, 'Leave cannot be applied for past dates', 400);

    const days = getWorkingDays(start, end);
    if (days === 0) return sendError(res, 'No working days in the selected date range', 400);

    const currentYear = new Date().getFullYear();
    let balance = await LeaveBalance.findOne({ user: req.user._id, year: currentYear });
    if (!balance) {
      balance = await LeaveBalance.create({
        user: req.user._id, year: currentYear,
        casual: { total: 10, used: 0 }, sick: { total: 7, used: 0 },
        annual: { total: 15, used: 0 }, emergency: { total: 2, used: 0 },
      });
    }

    const typeKey = type.toLowerCase();
    const remaining = balance[typeKey].total - balance[typeKey].used;
    if (days > remaining) {
      return sendError(
        res,
        `Insufficient ${type} leave balance. You have ${remaining} days remaining but requested ${days} days.`,
        400
      );
    }

    // Overlap check
    const overlap = await LeaveRequest.findOne({
      user: req.user._id,
      status: { $in: ['Pending', 'Approved'] },
      $or: [
        { fromDate: { $lte: end }, toDate: { $gte: start } },
      ],
    });
    if (overlap) {
      return sendError(res, 'You already have a leave request for overlapping dates', 400);
    }

    const leave = await LeaveRequest.create({
      user: req.user._id, type, fromDate: start, toDate: end, days, reason: trimmedReason, status: 'Pending',
    });

    const employee = await User.findById(req.user._id).populate('hrManager', 'name');
    const fromStr = start.toDateString();
    const toStr = end.toDateString();

    if (employee.hrManager) {
      await sendNotification({
        recipient: employee.hrManager._id,
        type: 'leave_requested',
        title: 'New Leave Request',
        message: `${employee.name} has requested ${type} leave from ${fromStr} to ${toStr} (${days} working days). Reason: ${reason}`,
        link: '/hr/leave-approval',
        sender: req.user._id,
        metadata: { leaveId: leave._id },
      });
    }

    // Notify PMO Lead on any active project
    const activeProject = await Project.findOne({ 'team.user': req.user._id, status: 'Active' });
    if (activeProject?.manager) {
      await sendNotification({
        recipient: activeProject.manager,
        type: 'leave_requested',
        title: 'Team Member Leave Request',
        message: `${employee.name} applied for leave: ${fromStr} to ${toStr}. Review project timeline impact.`,
        link: '/pmo/approvals',
        sender: req.user._id,
        metadata: { leaveId: leave._id },
      });
    }

    await AuditLog.create({
      user: req.user._id, userName: req.user.name,
      action: 'Create', module: 'Leave',
      details: `Leave request submitted: ${type} ${fromStr} to ${toStr}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'], result: 'SUCCESS',
    }).catch(() => {});

    sendSuccess(res, leave, 'Leave request submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const cancelLeave = async (req, res, next) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id).populate('user', 'name hrManager');
    if (!leave) return sendError(res, 'Leave request not found', 404);

    if (leave.user._id.toString() !== req.user._id.toString()) {
      return sendError(res, 'You do not have permission to cancel this leave request', 403);
    }
    if (leave.status !== 'Pending') {
      return sendError(res, 'Cannot cancel a leave request that has already been reviewed', 400);
    }

    const employee = await User.findById(req.user._id);
    const fromStr = leave.fromDate.toDateString();
    const toStr = leave.toDate.toDateString();

    await leave.deleteOne();

    if (employee.hrManager) {
      await sendNotification({
        recipient: employee.hrManager,
        type: 'system_alert',
        title: 'Leave Request Cancelled',
        message: `${employee.name} cancelled their leave request (${fromStr} to ${toStr})`,
        link: '/hr/leave',
        sender: req.user._id,
      });
    }

    await AuditLog.create({
      user: req.user._id, userName: req.user.name,
      action: 'Delete', module: 'Leave',
      details: `Leave request cancelled: ${fromStr} to ${toStr}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'], result: 'SUCCESS',
    }).catch(() => {});

    sendSuccess(res, null, 'Leave request cancelled successfully');
  } catch (error) {
    next(error);
  }
};
