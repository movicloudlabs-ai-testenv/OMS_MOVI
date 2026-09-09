import Attendance from '../../models/Attendance.js';
import AttendanceRegularization from '../../models/AttendanceRegularization.js';
import LeaveRequest from '../../models/LeaveRequest.js';
import User from '../../models/User.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

export const getAttendance = async (req, res, next) => {
  try {
    const { month, year, department, userId } = req.query;

    const m = month ? parseInt(month) - 1 : new Date().getMonth();
    const y = year ? parseInt(year) : new Date().getFullYear();
    const startDate = new Date(Date.UTC(y, m, 1));
    const endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

    // Filter users in scope
    const userFilter = { ...req.scopeFilter, status: 'Active' };
    if (department) userFilter.department = department;
    if (userId) userFilter._id = userId;

    const users = await User.find(userFilter)
      .select('name employeeId department employmentType designation')
      .populate('department', 'name code');

    const userIds = users.map((u) => u._id);

    const records = await Attendance.find({
      user: { $in: userIds },
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Group by user
    const employeesData = users.map((u) => {
      const userRecords = records.filter(r => r.user.toString() === u._id.toString());
      
      const stats = userRecords.reduce((acc, curr) => {
        if (curr.status === 'Present') acc.present++;
        else if (curr.status === 'Absent') acc.absent++;
        else if (curr.status === 'Leave') acc.leave++;
        else if (curr.status === 'Half Day' || curr.status === 'Half-Day') acc.halfDay++;
        else if (curr.status === 'Holiday') acc.holiday++;
        return acc;
      }, { present: 0, absent: 0, leave: 0, halfDay: 0, holiday: 0 });

      const workingDays = userRecords.length - stats.holiday;
      const presentEquiv = stats.present + (stats.halfDay * 0.5);
      stats.percentage = workingDays > 0 ? Math.round((presentEquiv / workingDays) * 100) : 0;

      return {
        user: u,
        stats,
        records: userRecords.map(r => ({
          _id: r._id,
          date: r.date,
          status: r.status,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          hoursWorked: r.hoursWorked,
          workMode: r.workMode || 'Office',
          isLate: r.isLate || false,
          note: r.note,
        })),
      };
    });

    sendSuccess(res, {
      period: { month: m + 1, year: y },
      summary: { totalWorkingDays: endDate.getUTCDate() },
      employees: employeesData,
    });
  } catch (error) {
    next(error);
  }
};

export const markAttendance = async (req, res, next) => {
  try {
    const { date, records } = req.body;
    
    if (!date || !records || !Array.isArray(records)) {
      return sendError(res, 'Date and records array are required', 400);
    }

    const parsedDate = new Date(date);
    const attendanceDate = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()));
    if (attendanceDate > new Date()) {
      return sendError(res, 'Cannot mark attendance for future dates', 400);
    }

    let marked = 0;
    const failed = [];

    for (const record of records) {
      try {
        const user = await User.findOne({ _id: record.userId, ...req.scopeFilter });
        if (!user) {
          failed.push({ userId: record.userId, reason: 'User not found or not in scope' });
          continue;
        }

        await Attendance.findOneAndUpdate(
          { user: record.userId, date: attendanceDate },
          {
            $set: {
              status: record.status,
              checkIn: record.checkIn,
              checkOut: record.checkOut,
              workMode: record.workMode || 'Office',
              markedBy: req.user._id,
              note: record.note,
            }
          },
          { upsert: true, new: true }
        );
        marked++;
      } catch (err) {
        failed.push({ userId: record.userId, reason: err.message });
      }
    }

    sendSuccess(res, { marked, failed }, `Successfully marked attendance for ${marked} employees`);
  } catch (error) {
    next(error);
  }
};

export const updateAttendanceRecord = async (req, res, next) => {
  try {
    const { status, checkIn, checkOut, note, workMode } = req.body;

    const record = await Attendance.findById(req.params.id).populate('user', 'hrManager');
    if (!record) return sendError(res, 'Record not found', 404);

    if (req.user.role?.slug !== 'super-admin' && req.user.role?.slug !== 'admin' && record.user.hrManager?.toString() !== req.user._id.toString()) {
      return sendError(res, 'Not authorized to modify this user\'s attendance', 403);
    }

    record.status = status || record.status;
    record.checkIn = checkIn || record.checkIn;
    record.checkOut = checkOut || record.checkOut;
    record.workMode = workMode || record.workMode || 'Office';
    record.note = note || record.note;
    record.markedBy = req.user._id;

    await record.save();
    sendSuccess(res, record, 'Attendance updated successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/hr/attendance/today-roster — live real-time roster for today
export const getTodayRoster = async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const tomorrow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));

    const users = await User.find({
      ...req.scopeFilter,
      status: 'Active',
      deletedAt: { $exists: false },
    })
      .select('name email employeeId designation department employmentType avatar')
      .populate('department', 'name code')
      .sort({ name: 1 });

    const userIds = users.map(u => u._id);

    const [attendanceRecords, leaveRecords] = await Promise.all([
      Attendance.find({
        user: { $in: userIds },
        date: { $gte: today, $lt: tomorrow },
      }).lean(),
      LeaveRequest.find({
        user: { $in: userIds },
        status: 'Approved',
        fromDate: { $lte: today },
        toDate: { $gte: today },
      }).lean(),
    ]);

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let wfhCount = 0;
    let internsCount = 0;
    let employeesCount = 0;

    const roster = users.map(u => {
      const isIntern = u.employmentType === 'Intern';
      if (isIntern) internsCount++; else employeesCount++;

      const att = attendanceRecords.find(a => String(a.user) === String(u._id));
      const leave = leaveRecords.find(l => String(l.user) === String(u._id));

      let status = 'Absent';
      let checkIn = null;
      let checkOut = null;
      let hoursWorked = 0;
      let workMode = 'Office';
      let isLate = false;
      let note = '';
      let recordId = null;

      if (att) {
        recordId = att._id;
        status = att.status || 'Present';
        checkIn = att.checkIn || null;
        checkOut = att.checkOut || null;
        hoursWorked = att.hoursWorked || 0;
        workMode = att.workMode || 'Office';
        isLate = att.isLate || false;
        note = att.note || '';

        if (status === 'Present' || status === 'Half-Day') {
          presentCount++;
          if (isLate) lateCount++;
          if (workMode === 'WFH' || workMode === 'Remote') wfhCount++;
        } else {
          absentCount++;
        }
      } else if (leave) {
        status = 'Leave';
        leaveCount++;
        note = `Approved ${leave.type} Leave`;
      } else {
        absentCount++;
      }

      return {
        user: {
          _id: u._id,
          name: u.name,
          email: u.email,
          employeeId: u.employeeId,
          designation: u.designation,
          department: u.department?.name || 'General',
          employmentType: u.employmentType,
        },
        status,
        checkIn,
        checkOut,
        hoursWorked,
        workMode,
        isLate,
        note,
        attendanceId: recordId,
      };
    });

    sendSuccess(res, {
      date: today.toISOString().split('T')[0],
      summary: {
        totalStaff: users.length,
        presentCount,
        lateCount,
        absentCount,
        leaveCount,
        wfhCount,
        internsCount,
        employeesCount,
        attendanceRate: users.length > 0 ? Math.round((presentCount / users.length) * 100) : 0,
      },
      roster,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/hr/attendance/regularizations — list pending/all regularization requests
export const getPendingRegularizations = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status && req.query.status !== 'All') {
      filter.status = req.query.status;
    }

    const list = await AttendanceRegularization.find(filter)
      .populate('user', 'name email employeeId designation department employmentType')
      .populate('reviewedBy', 'name designation')
      .sort({ createdAt: -1 })
      .limit(100);

    sendSuccess(res, list);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/hr/attendance/regularize/:id — review and approve/reject regularization
export const reviewRegularization = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return sendError(res, 'Status must be either Approved or Rejected', 400);
    }

    const reg = await AttendanceRegularization.findById(req.params.id);
    if (!reg) return sendError(res, 'Regularization request not found', 404);

    reg.status = status;
    reg.reviewedBy = req.user._id;
    reg.reviewNote = reviewNote || '';
    reg.reviewedAt = new Date();
    await reg.save();

    // If Approved, update or create Attendance record for that user and date
    if (status === 'Approved') {
      const regDate = new Date(reg.date);
      const normalizedDate = new Date(Date.UTC(regDate.getUTCFullYear(), regDate.getUTCMonth(), regDate.getUTCDate()));

      await Attendance.findOneAndUpdate(
        { user: reg.user, date: normalizedDate },
        {
          $set: {
            status: 'Present',
            checkIn: reg.requestedCheckIn || '09:30 AM',
            checkOut: reg.requestedCheckOut || '06:30 PM',
            workMode: reg.workMode || 'Office',
            hoursWorked: 8.0,
            note: `Regularized by HR: ${reviewNote || 'Approved'}`,
            markedBy: req.user._id,
          }
        },
        { upsert: true, new: true }
      );
    }

    sendSuccess(res, reg, `Regularization request ${status.toLowerCase()} successfully`);
  } catch (error) {
    next(error);
  }
};

// Helper: Parse 12-hour or 24-hour time string on a target Date object
const parseTimeToDate = (baseDate, timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  const d = new Date(baseDate);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
};

// Helper: Format Date object to canonical 12-hour format "HH:mm AM/PM"
const formatTo12H = (dateObj) => {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
  let h = dateObj.getUTCHours();
  const m = dateObj.getUTCMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

// POST /api/hr/attendance/override — manual override for a specific employee/intern
export const overrideAttendance = async (req, res, next) => {
  try {
    const { userId, date, status, checkIn, checkOut, workMode, note } = req.body;

    if (!userId || !date || !status) {
      return sendError(res, 'userId, date, and status are required', 400);
    }

    const validStatuses = ['Present', 'Absent', 'Leave', 'Half-Day', 'Holiday'];
    if (!validStatuses.includes(status)) {
      return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return sendError(res, 'Invalid date format provided', 400);
    }
    const normalizedDate = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()));

    const validWorkMode = ['Office', 'WFH', 'On-Duty', 'Remote'].includes(workMode)
      ? (workMode === 'Remote' ? 'WFH' : workMode)
      : 'Office';

    let finalCheckIn = '';
    let finalCheckOut = '';
    let checkInTime = null;
    let checkOutTime = null;
    let hoursWorked = 0;
    let isLate = false;

    if (status === 'Present' || status === 'Half-Day') {
      if (checkIn) {
        checkInTime = parseTimeToDate(normalizedDate, checkIn);
        finalCheckIn = checkInTime ? formatTo12H(checkInTime) : checkIn.trim();
      }

      if (checkOut) {
        checkOutTime = parseTimeToDate(normalizedDate, checkOut);
        finalCheckOut = checkOutTime ? formatTo12H(checkOutTime) : checkOut.trim();
      }

      // Compute precise hours worked
      if (checkInTime && checkOutTime) {
        let durationMs = checkOutTime.getTime() - checkInTime.getTime();
        if (durationMs < 0) {
          // Cross-midnight shift (e.g., 10 PM to 6 AM)
          durationMs += 24 * 60 * 60 * 1000;
        }
        hoursWorked = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
      } else if (checkInTime) {
        // Default based on status if checkout not yet stamped
        hoursWorked = status === 'Half-Day' ? 4.0 : 8.0;
      }

      // Enterprise late-arrival compliance check: threshold is 09:30 AM
      if (checkInTime) {
        const h = checkInTime.getUTCHours();
        const m = checkInTime.getUTCMinutes();
        isLate = h > 9 || (h === 9 && m > 30);
      }
    } else {
      // Absent or Leave: clear clock stamps and hours
      finalCheckIn = '';
      finalCheckOut = '';
      checkInTime = null;
      checkOutTime = null;
      hoursWorked = 0;
      isLate = false;
    }

    const hrName = req.user?.name || 'HR Manager';
    const auditNote = note
      ? `[HR Override by ${hrName}] ${note.trim()}`
      : `[HR Override by ${hrName}] Status: ${status}, Mode: ${validWorkMode}`;

    const updateFields = {
      status,
      checkIn: finalCheckIn,
      checkOut: finalCheckOut,
      checkInTime,
      checkOutTime,
      hoursWorked,
      isLate,
      workMode: validWorkMode,
      note: auditNote,
      markedBy: req.user._id,
    };

    const record = await Attendance.findOneAndUpdate(
      { user: userId, date: normalizedDate },
      { $set: updateFields },
      { upsert: true, new: true, runValidators: true }
    ).populate('user', 'name employeeId department designation email employmentType')
     .populate('markedBy', 'name designation');

    sendSuccess(res, record, 'Attendance record updated successfully in enterprise register');
  } catch (error) {
    next(error);
  }
};

export const exportAttendance = async (req, res, next) => {
  try {
    const { month, year, department } = req.query;
    
    const m = month ? parseInt(month) - 1 : new Date().getMonth();
    const y = year ? parseInt(year) : new Date().getFullYear();
    const startDate = new Date(Date.UTC(y, m, 1));
    const endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

    const userFilter = { ...req.scopeFilter, status: 'Active' };
    if (department) userFilter.department = department;

    const users = await User.find(userFilter).select('name employeeId department employmentType');
    const userIds = users.map((u) => u._id);

    const records = await Attendance.find({
      user: { $in: userIds },
      date: { $gte: startDate, $lte: endDate },
    }).populate('user', 'name employeeId employmentType').lean();

    let csv = '\ufeffDate,Employee ID,Name,Type,Status,Work Mode,Check In,Check Out,Hours\n';
    
    records.forEach(r => {
      const date = r.date.toISOString().split('T')[0];
      const empId = r.user?.employeeId || '';
      const name = r.user?.name || '';
      const type = r.user?.employmentType || 'Employee';
      const status = r.status;
      const mode = r.workMode || 'Office';
      const checkIn = r.checkIn || '';
      const checkOut = r.checkOut || '';
      const hours = r.hoursWorked || 0;
      
      csv += `${date},${empId},"${name}",${type},${status},${mode},"${checkIn}","${checkOut}",${hours}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${y}-${m+1}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
