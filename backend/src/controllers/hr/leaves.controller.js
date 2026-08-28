import LeaveRequest from '../../models/LeaveRequest.js';
import LeaveBalance from '../../models/LeaveBalance.js';
import User from '../../models/User.js';
import Project from '../../models/Project.js';
import Attendance from '../../models/Attendance.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js';
import { getPagination } from '../../utils/paginate.js';
import { sendNotification } from '../../utils/sendNotification.js';

const getWorkingDays = (startDate, endDate) => {
  let count = 0;
  const curDate = new Date(startDate);
  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
};

export const getPendingLeaves = async (req, res, next) => {
  try {
    // Get scoped users
    const users = await User.find(req.scopeFilter).select('_id');
    const userIds = users.map((u) => u._id);

    const pendingLeaves = await LeaveRequest.find({
      status: 'Pending',
      user: { $in: userIds },
    })
      .populate('user', 'name employeeId department role avatar')
      .sort({ createdAt: 1 });

    sendSuccess(res, pendingLeaves);
  } catch (error) {
    next(error);
  }
};

export const getLeaves = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, type, userId, dateFrom, dateTo } = req.query;

    const users = await User.find(req.scopeFilter).select('_id');
    const userIds = users.map((u) => u._id);

    const filter = { user: { $in: userIds } };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (userId) filter.user = userId;
    
    if (dateFrom || dateTo) {
      filter.fromDate = {};
      if (dateFrom) filter.fromDate.$gte = new Date(dateFrom);
      if (dateTo) filter.fromDate.$lte = new Date(dateTo);
    }

    const [leaves, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate({ path: 'user', select: 'name employeeId department avatar role', populate: { path: 'role', select: 'slug name' } })
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

export const reviewLeave = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;
    
    if (!['Approved', 'Rejected'].includes(status)) {
      return sendError(res, 'Status must be Approved or Rejected', 400);
    }

    const leave = await LeaveRequest.findById(req.params.id)
      .populate('user', 'name pmoLead manager');
      
    if (!leave) return sendError(res, 'Leave request not found', 404);

    // Verify HR scope
    const isSuperAdmin = req.user.role.slug === 'super-admin';
    const isHrManager = req.user._id.toString() === leave.user.hrManager?.toString();
    if (!isSuperAdmin && !isHrManager && leave.user.hrManager) {
      return sendError(res, 'Not authorized to review this leave request', 403);
    }

    if (leave.status !== 'Pending') {
      return sendError(res, 'This request has already been reviewed', 400);
    }

    const typeKey = leave.type.toLowerCase();
    const currentYear = new Date().getFullYear();
    const workingDays = getWorkingDays(leave.fromDate, leave.toDate);

    if (status === 'Approved') {
      // Check leave balance
      let balance = await LeaveBalance.findOne({ user: leave.user._id, year: currentYear });
      if (!balance) {
        // Initialize if missing
        balance = await LeaveBalance.create({ user: leave.user._id, year: currentYear });
      }

      const available = balance[typeKey].total - balance[typeKey].used;
      if (workingDays > available) {
        return sendError(res, `Insufficient ${leave.type} leave balance. Available: ${available} days.`, 400);
      }

      // Deduct balance
      balance[typeKey].used += workingDays;
      balance.markModified(typeKey);
      await balance.save();

      // Create attendance records
      const curDate = new Date(leave.fromDate);
      const endDate = new Date(leave.toDate);
      while (curDate <= endDate) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          await Attendance.findOneAndUpdate(
            { user: leave.user._id, date: new Date(curDate) },
            { $set: { status: 'Leave', note: `Approved ${leave.type} Leave`, markedBy: req.user._id } },
            { upsert: true }
          );
        }
        curDate.setDate(curDate.getDate() + 1);
      }

      // Notify User
      await sendNotification({
        recipient: leave.user._id,
        type: 'leave_approved',
        title: 'Leave Approved',
        message: `Your ${leave.type} leave request has been approved by ${req.user.name}.`,
        link: '/employee/leave',
        sender: req.user._id,
      });

      // Notify PMO if assigned
      if (leave.user.pmoLead) {
        await sendNotification({
          recipient: leave.user.pmoLead,
          type: 'system_alert',
          title: 'Team Member on Leave',
          message: `${leave.user.name} leave approved: ${leave.fromDate.toDateString()} to ${leave.toDate.toDateString()}. Project impact: review tasks.`,
          link: '/pmo/approvals',
          sender: req.user._id,
        });
      }
    } else {
      // Rejected
      await sendNotification({
        recipient: leave.user._id,
        type: 'leave_rejected',
        title: 'Leave Rejected',
        message: `Your leave request was not approved. Reason: ${reviewNote || 'No reason provided'}`,
        link: '/employee/leave',
        sender: req.user._id,
      });
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewNote = reviewNote;
    leave.reviewedAt = new Date();

    await leave.save();
    
    sendSuccess(res, leave, `Leave request ${status.toLowerCase()} successfully`);
  } catch (error) {
    next(error);
  }
};

// ─── HR self-leave endpoints ──────────────────────────────────────────────────

export const getMyLeaveBalance = async (req, res, next) => {
  try {
    const year = new Date().getFullYear();
    let balance = await LeaveBalance.findOne({ user: req.user._id, year });
    if (!balance) {
      balance = await LeaveBalance.create({ user: req.user._id, year });
    }
    sendSuccess(res, balance);
  } catch (error) {
    next(error);
  }
};

export const getMyLeaves = async (req, res, next) => {
  try {
    const leaves = await LeaveRequest.find({ user: req.user._id })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    sendSuccess(res, leaves);
  } catch (error) {
    next(error);
  }
};

/**
 * HR self-leave is auto-approved — HR does NOT need PMO approval.
 * We deduct the balance, mark attendance, and only *notify* PMO (informational).
 */
export const applyMyLeave = async (req, res, next) => {
  try {
    const { type, fromDate, toDate, reason, projectImpact } = req.body;
    if (!type || !fromDate || !toDate) {
      return sendError(res, 'type, fromDate, and toDate are required', 400);
    }

    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    if (!trimmedReason) {
      return sendError(res, 'Leave reason is required.', 400);
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (to < from) return sendError(res, 'toDate must be after fromDate', 400);

    const days = getWorkingDays(from, to);
    if (days === 0) return sendError(res, 'Selected dates contain no working days', 400);

    const typeKey = type.toLowerCase();
    const currentYear = new Date().getFullYear();

    // Check + deduct leave balance
    let balance = await LeaveBalance.findOne({ user: req.user._id, year: currentYear });
    if (!balance) balance = await LeaveBalance.create({ user: req.user._id, year: currentYear });
    if (!balance[typeKey]) return sendError(res, `Invalid leave type: ${type}`, 400);

    const available = balance[typeKey].total - balance[typeKey].used;
    if (days > available) {
      return sendError(res, `Insufficient ${type} leave balance. Available: ${available} day(s).`, 400);
    }
    balance[typeKey].used += days;
    balance.markModified(typeKey);
    await balance.save();

    // Create the request already Approved (self-service, no PMO gate)
    const leave = await LeaveRequest.create({
      user: req.user._id,
      type,
      fromDate: from,
      toDate: to,
      days,
      reason: trimmedReason,
      projectImpact: projectImpact || '',
      status: 'Approved',
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      reviewNote: 'Auto-approved (HR self-service)',
    });

    // Mark attendance as Leave for each working day in range
    const cur = new Date(from);
    while (cur <= to) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) {
        await Attendance.findOneAndUpdate(
          { user: req.user._id, date: new Date(cur) },
          { $set: { status: 'Leave', note: `${type} Leave`, markedBy: req.user._id } },
          { upsert: true }
        );
      }
      cur.setDate(cur.getDate() + 1);
    }

    // Notify PMO leads — informational only (no approval required)
    const projects = await Project.find({
      $or: [{ 'team.user': req.user._id }, { manager: req.user._id }],
    }).select('manager').lean();

    const pmoManagerIds = [...new Set(
      projects.map(p => p.manager?.toString()).filter(Boolean)
    )].filter(id => id !== req.user._id.toString()); // don't notify self

    await Promise.all(pmoManagerIds.map(managerId =>
      sendNotification({
        recipient: managerId,
        type: 'system_alert',
        title: 'HR on Leave',
        message: `${req.user.name} (HR Manager) will be on ${type} leave from ${from.toDateString()} to ${to.toDateString()} (${days} day${days > 1 ? 's' : ''}).`,
        link: '/pmo/approvals',
        sender: req.user._id,
      })
    ));

    sendSuccess(res, leave, 'Leave applied successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an upcoming (not-yet-started) HR leave — restores balance & attendance.
 */
export const deleteMyLeave = async (req, res, next) => {
  try {
    const leave = await LeaveRequest.findOne({ _id: req.params.id, user: req.user._id });
    if (!leave) return sendError(res, 'Leave request not found', 404);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(leave.fromDate) <= today) {
      return sendError(res, 'Only upcoming leave (not yet started) can be cancelled', 400);
    }

    // Restore balance if it was deducted
    if (leave.status === 'Approved') {
      const year = new Date(leave.fromDate).getFullYear();
      const typeKey = leave.type.toLowerCase();
      const balance = await LeaveBalance.findOne({ user: req.user._id, year });
      if (balance && balance[typeKey]) {
        balance[typeKey].used = Math.max(0, balance[typeKey].used - leave.days);
        balance.markModified(typeKey);
        await balance.save();
      }
      // Remove the Leave attendance records for this range
      await Attendance.deleteMany({
        user: req.user._id,
        date: { $gte: new Date(leave.fromDate), $lte: new Date(leave.toDate) },
        status: 'Leave',
      });
    }

    await leave.deleteOne();
    sendSuccess(res, null, 'Leave cancelled');
  } catch (error) {
    next(error);
  }
};

export const allocateLeaveBalance = async (req, res, next) => {
  try {
    const { userId, leaveType, days } = req.body;

    if (!userId || !leaveType || days === undefined) {
      return sendError(res, 'User ID, leaveType, and days are required', 400);
    }

    const typeKey = leaveType.toLowerCase();
    const validTypes = ['casual', 'sick', 'annual', 'emergency', 'compensatory'];
    if (!validTypes.includes(typeKey)) {
      return sendError(res, `Invalid leave type. Valid types are: ${validTypes.join(', ')}`, 400);
    }

    const currentYear = new Date().getFullYear();
    
    let balance = await LeaveBalance.findOne({ user: userId, year: currentYear });
    if (!balance) {
      balance = new LeaveBalance({ user: userId, year: currentYear });
    }

    balance[typeKey].total += Number(days);
    await balance.save();

    await sendNotification({
      recipient: userId,
      type: 'system_alert',
      title: 'Leave Balance Updated',
      message: `${days} days have been added to your ${leaveType} leave balance.`,
      link: '/profile',
      sender: req.user._id,
    });

    sendSuccess(res, balance, `Added ${days} days to ${leaveType} balance`);
  } catch (error) {
    next(error);
  }
};
