import Attendance from '../../models/Attendance.js';
import LeaveRequest from '../../models/LeaveRequest.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const getMyAttendance = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const m = month ? parseInt(month) - 1 : new Date().getMonth();
    const y = year ? parseInt(year) : new Date().getFullYear();
    
    // First day of month and last day of month
    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0);

    // Find user to get joining date
    const user = await import('../../models/User.js').then(m => m.default.findById(req.user._id));
    const joinDate = user.joinDate ? new Date(user.joinDate) : new Date(user.createdAt);
    joinDate.setHours(0, 0, 0, 0);

    // Find the very first attendance record to use as the true "start" date if it's later than joinDate
    const userId = req.user._id;
    const firstAttendance = await Attendance.findOne({ user: userId }).sort({ date: 1 });
    let startBoundary = joinDate;

    if (firstAttendance) {
      const firstLoginDate = new Date(firstAttendance.date);
      firstLoginDate.setHours(0, 0, 0, 0);
      if (firstLoginDate > joinDate) {
        startBoundary = firstLoginDate;
      }
    }

    // Fetch attendance records for this month
    const attendanceRecords = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Fetch approved leaves overlapping with this month
    const leaves = await LeaveRequest.find({
      user: userId,
      status: 'Approved',
      $or: [
        { fromDate: { $lte: endDate }, toDate: { $gte: startDate } }
      ]
    }).lean();

    // Generate a day-by-day mapping
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysInMonth = endDate.getDate();
    const attendanceList = [];
    
    let stats = {
      present: 0,
      absent: 0,
      leave: 0,
      percentage: 0
    };

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(y, m, day);
      const isFuture = currentDate > today;

      // Find if attendance exists
      const attRecord = attendanceRecords.find(
        (r) => new Date(r.date).toDateString() === currentDate.toDateString()
      );

      // Find if leave exists for this date
      const leaveRecord = leaves.find(
        (l) => {
          const from = new Date(l.fromDate);
          from.setHours(0,0,0,0);
          const to = new Date(l.toDate);
          to.setHours(23,59,59,999);
          return currentDate >= from && currentDate <= to;
        }
      );

      let status = '';
      let details = {
        date: `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      };

      if (isFuture) {
        status = 'Blank';
      } else if (currentDate < startBoundary) {
        status = 'Blank';
      } else if (attRecord) {
        status = attRecord.status === 'Absent' ? 'Absent' : 'Present'; 
        if (attRecord.status !== 'Absent') {
          status = 'Present';
          stats.present++;
        } else {
          stats.absent++;
        }
        if (attRecord.checkIn) {
          details.loginTime = attRecord.checkIn;
        }
      } else if (leaveRecord) {
        status = 'Leave';
        stats.leave++;
        details.leaveType = leaveRecord.type;
        details.reason = leaveRecord.reason;
      } else {
        status = 'Absent';
        stats.absent++;
      }

      if (status !== 'Blank') {
        details.status = status;
      }
      
      attendanceList.push(details);
    }

    const billableDays = stats.present + stats.absent;
    stats.percentage = billableDays > 0 ? Math.round((stats.present / billableDays) * 100) : 0;

    sendSuccess(res, {
      month: m + 1,
      year: y,
      stats,
      attendance: attendanceList
    });

  } catch (error) {
    next(error);
  }
};
