import Attendance from '../../models/Attendance.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const getMyAttendance = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const m = month ? parseInt(month) - 1 : new Date().getMonth();
    const y = year ? parseInt(year) : new Date().getFullYear();

    const startOfMonth = new Date(y, m, 1);
    const endOfMonth = new Date(y, m + 1, 0);

    const records = await Attendance.find({
      user: req.user._id,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: 1 });

    const summary = records.reduce(
      (acc, r) => {
        if (r.status === 'Present') acc.present++;
        else if (r.status === 'Absent') acc.absent++;
        else if (r.status === 'Leave') acc.leave++;
        else if (r.status === 'Holiday') acc.holiday++;
        else if (r.status === 'Half-Day') acc.halfDay++;
        return acc;
      },
      { present: 0, absent: 0, leave: 0, holiday: 0, halfDay: 0 }
    );

    const totalWorkingDays = records.length - summary.holiday;
    summary.percentage = totalWorkingDays > 0
      ? Math.round(((summary.present + summary.halfDay * 0.5) / totalWorkingDays) * 100)
      : 0;

    sendSuccess(res, { records, summary, month: m + 1, year: y });
  } catch (error) {
    next(error);
  }
};
