import User from '../../models/User.js';
import Department from '../../models/Department.js';
import Attendance from '../../models/Attendance.js';
import LeaveBalance from '../../models/LeaveBalance.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

export const getHeadcountReport = async (req, res, next) => {
  try {
    const departments = await Department.find().select('name code');
    const users = await User.find(req.scopeFilter).select('department status');

    const report = departments.map((dept) => {
      const deptUsers = users.filter(u => u.department?.toString() === dept._id.toString());
      const active = deptUsers.filter(u => u.status === 'Active').length;
      const inactive = deptUsers.length - active;
      return {
        name: dept.name,
        total: deptUsers.length,
        active,
        inactive,
      };
    });

    sendSuccess(res, { departments: report });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    
    const m = month ? parseInt(month) - 1 : new Date().getMonth();
    const y = year ? parseInt(year) : new Date().getFullYear();
    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0);

    const users = await User.find(req.scopeFilter).select('_id');
    const userIds = users.map(u => u._id);

    const records = await Attendance.find({
      user: { $in: userIds },
      date: { $gte: startDate, $lte: endDate },
    }).select('status');

    const summary = records.reduce((acc, curr) => {
      if (curr.status === 'Present') acc.present++;
      else if (curr.status === 'Absent') acc.absent++;
      else if (curr.status === 'Leave') acc.leave++;
      else if (curr.status === 'Half Day') acc.halfDay++;
      else if (curr.status === 'Holiday') acc.holiday++;
      return acc;
    }, { present: 0, absent: 0, leave: 0, halfDay: 0, holiday: 0 });

    sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
};

export const getLeaveSummary = async (req, res, next) => {
  try {
    const { year } = req.query;
    const y = year ? parseInt(year) : new Date().getFullYear();

    const users = await User.find(req.scopeFilter).select('_id');
    const userIds = users.map(u => u._id);

    const balances = await LeaveBalance.find({
      user: { $in: userIds },
      year: y,
    }).populate('user', 'name department');

    const summary = balances.map((b) => ({
      user: { name: b.user?.name },
      totalAllocated: b.casual.total + b.sick.total + b.annual.total + b.emergency.total + b.compensatory.total,
      totalUsed: b.casual.used + b.sick.used + b.annual.used + b.emergency.used + b.compensatory.used,
    }));

    sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
};
