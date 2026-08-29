import Attendance from '../../models/Attendance.js';
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
      .select('name employeeId department')
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
        else if (curr.status === 'Half Day') acc.halfDay++;
        else if (curr.status === 'Holiday') acc.holiday++;
        return acc;
      }, { present: 0, absent: 0, leave: 0, halfDay: 0, holiday: 0 });

      // Calculate percentage (excluding holidays and leaves from base if preferred, 
      // but standard is (present + halfDay*0.5) / workingDays)
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
        // Validate user is in scope
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
    const { status, checkIn, checkOut, note } = req.body;

    const record = await Attendance.findById(req.params.id).populate('user', 'hrManager');
    if (!record) return sendError(res, 'Record not found', 404);

    // Verify scope (is HR manager of the user)
    if (req.user.role.slug !== 'super-admin' && record.user.hrManager?.toString() !== req.user._id.toString()) {
      return sendError(res, 'Not authorized to modify this user\'s attendance', 403);
    }

    record.status = status || record.status;
    record.checkIn = checkIn || record.checkIn;
    record.checkOut = checkOut || record.checkOut;
    record.note = note || record.note;
    record.markedBy = req.user._id;

    await record.save();
    sendSuccess(res, record, 'Attendance updated successfully');
  } catch (error) {
    next(error);
  }
};

export const exportAttendance = async (req, res, next) => {
  try {
    const { month, year, department } = req.query;
    
    // Simplistic export implementation
    // In a real scenario, this would use the same logic as getAttendance and format to CSV
    const m = month ? parseInt(month) - 1 : new Date().getMonth();
    const y = year ? parseInt(year) : new Date().getFullYear();
    const startDate = new Date(Date.UTC(y, m, 1));
    const endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

    const userFilter = { ...req.scopeFilter, status: 'Active' };
    if (department) userFilter.department = department;

    const users = await User.find(userFilter).select('name employeeId department');
    const userIds = users.map((u) => u._id);

    const records = await Attendance.find({
      user: { $in: userIds },
      date: { $gte: startDate, $lte: endDate },
    }).populate('user', 'name employeeId').lean();

    let csv = 'Date,Employee ID,Name,Status,Check In,Check Out\n';
    
    records.forEach(r => {
      const date = r.date.toISOString().split('T')[0];
      const empId = r.user?.employeeId || '';
      const name = r.user?.name || '';
      const status = r.status;
      const checkIn = r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '';
      const checkOut = r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '';
      
      csv += `${date},${empId},"${name}",${status},${checkIn},${checkOut}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${y}-${m+1}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
