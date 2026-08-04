import User from '../../models/User.js';
import DailyTracker from '../../models/DailyTracker.js';
import Attendance from '../../models/Attendance.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const countWorkingDaysSoFar = (year, month) => {
  // Mon-Fri working days from day 1 of the month up to today (or month end if it's a past month)
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const lastDay = isCurrentMonth ? now.getDate() : new Date(year, month + 1, 0).getDate();

  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    const day = new Date(year, month, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
};

// GET /api/hr/performance/monthly?month=&year=
// Aggregates Daily Tracker productivity + Attendance % per user for the given month.
export const getMonthlyPerformance = async (req, res, next) => {
  try {
    const now = new Date();
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();
    const month = req.query.month ? Number(req.query.month) - 1 : now.getMonth(); // 0-indexed

    const rangeStart = new Date(year, month, 1);
    const rangeEnd = new Date(year, month + 1, 1);

    const users = await User.find({
      ...req.scopeFilter,
      employmentType: { $in: ['Intern', 'Full-time'] },
    }).select('name employeeId employmentType designation department');

    const userIds = users.map(u => u._id);

    const [trackerEntries, attendanceRecords] = await Promise.all([
      DailyTracker.find({ user: { $in: userIds }, date: { $gte: rangeStart, $lt: rangeEnd } }),
      Attendance.find({ user: { $in: userIds }, date: { $gte: rangeStart, $lt: rangeEnd } }),
    ]);

    const workingDays = countWorkingDaysSoFar(year, month);

    const result = users.map((u) => {
      const myEntries = trackerEntries.filter(t => String(t.user) === String(u._id));
      const myAttendance = attendanceRecords.filter(a => String(a.user) === String(u._id));

      const productivityScores = myEntries.map(e => e.productivityMetrics).filter(v => v != null);
      const ktScores = myEntries.map(e => e.ktCompletion).filter(v => v != null);
      const totalHours = myEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

      const presentDays = myAttendance.filter(a => ['Present', 'Half-Day', 'WFH'].includes(a.status)).length;
      const attendancePct = workingDays > 0 ? Math.round((presentDays / workingDays) * 1000) / 10 : 0;

      const avgProductivity = productivityScores.length
        ? Math.round((productivityScores.reduce((a, b) => a + b, 0) / productivityScores.length) * 10) / 10
        : null;
      const avgKt = ktScores.length
        ? Math.round(ktScores.reduce((a, b) => a + b, 0) / ktScores.length)
        : null;

      return {
        user: {
          _id: u._id, name: u.name, employeeId: u.employeeId,
          employmentType: u.employmentType, designation: u.designation,
        },
        reportsSubmitted: myEntries.length,
        avgProductivity,
        avgKtCompletion: avgKt,
        totalHours: Math.round(totalHours * 10) / 10,
        presentDays,
        workingDays,
        attendancePct,
      };
    });

    sendSuccess(res, {
      month: month + 1,
      year,
      workingDays,
      results: result,
    });
  } catch (error) {
    next(error);
  }
};
