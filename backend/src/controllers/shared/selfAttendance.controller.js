import Attendance from '../../models/Attendance.js';
import AttendanceRegularization from '../../models/AttendanceRegularization.js';
import EODReport from '../../models/EODReport.js';
import Task from '../../models/Task.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const getTodayRange = () => {
  const now = new Date();
  const utcStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  const utcEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
  const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const localEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const minDate = utcStart < localStart ? utcStart : localStart;
  const maxDate = utcEnd > localEnd ? utcEnd : localEnd;
  return { minDate, maxDate, today: utcStart };
};

const to12Hour = (date) => {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

// GET /today — today's attendance record for the logged-in user (or null)
export const getTodayAttendance = async (req, res, next) => {
  try {
    const { minDate, maxDate } = getTodayRange();
    const record = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: minDate, $lte: maxDate },
    });
    sendSuccess(res, record || null);
  } catch (error) {
    next(error);
  }
};

// POST /check-in — clock in for today
export const checkIn = async (req, res, next) => {
  try {
    const { minDate, maxDate, today } = getTodayRange();
    let existing = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: minDate, $lte: maxDate },
    });

    if (existing && existing.checkIn && existing.note !== 'Auto-marked on login') {
      return sendSuccess(res, existing, 'Already clocked in today');
    }

    const { latitude, longitude, isGeofenced, workMode } = req.body;
    const now = new Date();

    // Standard policy: Late after 09:30 AM local time
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const isLate = currentHour > 9 || (currentHour === 9 && currentMin > 30);

    const validWorkMode = ['Office', 'WFH', 'On-Duty', 'Remote', 'Client Site'].includes(workMode)
      ? workMode
      : 'Remote';

    let record;
    if (existing) {
      existing.checkIn = to12Hour(now);
      existing.checkInTime = now;
      existing.status = 'Present';
      existing.workMode = validWorkMode;
      if (latitude != null) existing.latitude = Number(latitude);
      if (longitude != null) existing.longitude = Number(longitude);
      if (isGeofenced != null) existing.isGeofenced = Boolean(isGeofenced);
      existing.isLate = isLate;
      await existing.save();
      record = existing;
    } else {
      try {
        record = await Attendance.create({
          user: req.user._id,
          date: today,
          status: 'Present',
          checkIn: to12Hour(now),
          checkInTime: now,
          workMode: validWorkMode,
          latitude: latitude != null ? Number(latitude) : undefined,
          longitude: longitude != null ? Number(longitude) : undefined,
          isGeofenced: isGeofenced != null ? Boolean(isGeofenced) : false,
          isLate,
        });
      } catch (createErr) {
        if (createErr.code === 11000) {
          record = await Attendance.findOne({
            user: req.user._id,
            date: { $gte: minDate, $lte: maxDate },
          });
          if (record) {
            record.checkIn = to12Hour(now);
            record.checkInTime = now;
            record.status = 'Present';
            record.workMode = validWorkMode;
            await record.save();
          }
        } else {
          throw createErr;
        }
      }
    }

    sendSuccess(res, record, 'Checked in successfully');
  } catch (error) {
    next(error);
  }
};

// POST /check-out — clock out for today
export const checkOut = async (req, res, next) => {
  try {
    const { minDate, maxDate, today } = getTodayRange();
    const record = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: minDate, $lte: maxDate },
    });

    if (!record || !record.checkIn) {
      return sendError(res, 'You need to check in before checking out', 400);
    }
    if (record.checkOut) {
      return sendSuccess(res, record, 'Already clocked out today');
    }

    const now = new Date();
    record.checkOut = to12Hour(now);
    record.checkOutTime = now;

    // Compute hours worked from checkIn -> now
    const parseTime = (str) => {
      const [time, ampm] = str.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      const d = new Date(today);
      d.setHours(h, m, 0, 0);
      return d;
    };

    const checkInDate = record.checkInTime || parseTime(record.checkIn);
    const grossHours = Math.max(0, (now - checkInDate) / (1000 * 60 * 60));
    record.hoursWorked = Math.round(grossHours * 100) / 100;

    // Close any open break session before check-out
    const breaks = record.breaks || [];
    const openBreak = breaks.find((b) => b.end == null);
    if (openBreak) {
      openBreak.end = now;
    }

    // Sum all completed break durations
    const totalBreakMs = breaks
      .filter((b) => b.start && b.end)
      .reduce((sum, b) => sum + (new Date(b.end) - new Date(b.start)), 0);
    const totalBreakMins = Math.round(totalBreakMs / 60000);
    record.totalBreakMinutes = totalBreakMins;

    const netHours = Math.max(0, grossHours - totalBreakMins / 60);
    record.netHoursWorked = Math.round(netHours * 100) / 100;

    // Mark half-day threshold (for interns: full shift is 3.0h, half-day is 1.5h; for employees: full shift is 8.0h, half-day is 4.5h)
    const isIntern = req.user?.role?.slug === 'intern' || req.user?.employmentType === 'Intern';
    const halfDayThreshold = isIntern ? 1.5 : 4.5;
    if (record.netHoursWorked < halfDayThreshold) {
      record.status = 'Half-Day';
    }

    await record.save();

    sendSuccess(res, record, 'Checked out successfully');
  } catch (error) {
    next(error);
  }
};

// POST /break/start — begin a break session
export const startBreak = async (req, res, next) => {
  try {
    const { minDate, maxDate } = getTodayRange();
    const record = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: minDate, $lte: maxDate },
    });

    if (!record || !record.checkIn) {
      return sendError(res, 'You must be clocked in to start a break', 400);
    }
    if (record.checkOut) {
      return sendError(res, 'Your shift has already ended', 400);
    }

    // Prevent double-opening a break
    const openBreak = (record.breaks || []).find((b) => b.end == null);
    if (openBreak) {
      return sendSuccess(res, record, 'Break already in progress');
    }

    record.breaks.push({ start: new Date(), end: null });
    await record.save();
    sendSuccess(res, record, 'Break started');
  } catch (error) {
    next(error);
  }
};

// POST /break/end — end the current break session
export const endBreak = async (req, res, next) => {
  try {
    const { minDate, maxDate } = getTodayRange();
    const record = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: minDate, $lte: maxDate },
    });

    if (!record || !record.checkIn) {
      return sendError(res, 'No active shift found', 400);
    }

    const openBreak = (record.breaks || []).find((b) => b.end == null);
    if (!openBreak) {
      return sendError(res, 'No active break to end', 400);
    }

    const now = new Date();
    openBreak.end = now;

    // Recompute running total break minutes
    const totalBreakMs = record.breaks
      .filter((b) => b.start && b.end)
      .reduce((sum, b) => sum + (new Date(b.end) - new Date(b.start)), 0);
    record.totalBreakMinutes = Math.round(totalBreakMs / 60000);

    await record.save();
    sendSuccess(res, record, 'Break ended');
  } catch (error) {
    next(error);
  }
};

// POST /regularize — submit missed punch or attendance regularization request
export const submitRegularization = async (req, res, next) => {
  try {
    const { date, requestType, requestedCheckIn, requestedCheckOut, workMode, reason } = req.body;

    if (!date) {
      return sendError(res, 'Attendance date is required', 400);
    }
    if (!reason || !reason.trim()) {
      return sendError(res, 'A clear reason is required for attendance regularization', 400);
    }

    const regDate = new Date(date);
    const normalizedDate = new Date(Date.UTC(regDate.getUTCFullYear(), regDate.getUTCMonth(), regDate.getUTCDate()));

    // Cannot regularize future dates
    const { today } = getTodayRange();
    if (normalizedDate > today) {
      return sendError(res, 'Cannot request regularization for future dates', 400);
    }

    const regularization = await AttendanceRegularization.create({
      user: req.user._id,
      date: normalizedDate,
      requestType: requestType || 'Both',
      requestedCheckIn: requestedCheckIn || '09:30 AM',
      requestedCheckOut: requestedCheckOut || '06:30 PM',
      workMode: ['Office', 'WFH', 'On-Duty', 'Remote', 'Client Site'].includes(workMode) ? workMode : 'Remote',
      reason: reason.trim(),
      status: 'Pending',
    });

    sendSuccess(res, regularization, 'Regularization request submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

// GET /regularize/my — get current user's regularization requests
export const getMyRegularizations = async (req, res, next) => {
  try {
    const list = await AttendanceRegularization.find({ user: req.user._id })
      .populate('reviewedBy', 'name designation')
      .sort({ createdAt: -1 })
      .limit(50);
    sendSuccess(res, list);
  } catch (error) {
    next(error);
  }
};

// POST /reset-today or DELETE /today — Reset/clear today's attendance record (for testing and day re-starts)
export const resetTodayAttendance = async (req, res, next) => {
  try {
    const { minDate, maxDate } = getTodayRange();
    await Attendance.deleteMany({
      user: req.user._id,
      date: { $gte: minDate, $lte: maxDate },
    });
    // Also reset today's EOD report and unlock tasks so the user can re-test end-of-day flows
    await EODReport.deleteMany({
      user: req.user._id,
      date: { $gte: minDate, $lte: maxDate },
    });
    await Task.updateMany(
      { assignedTo: req.user._id, eodSubmitted: true },
      { $set: { eodSubmitted: false, eodSubmittedAt: null } }
    );
    sendSuccess(res, null, 'Today attendance and EOD records reset successfully');
  } catch (error) {
    next(error);
  }
};
