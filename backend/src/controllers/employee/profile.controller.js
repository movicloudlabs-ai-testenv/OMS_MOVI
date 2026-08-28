import User from '../../models/User.js';
import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import LeaveBalance from '../../models/LeaveBalance.js';
import Attendance from '../../models/Attendance.js';
import Settings from '../../models/Settings.js';
import AuditLog from '../../models/AuditLog.js';
import { generateTokenPair } from '../../utils/generateToken.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate({ path: 'role', populate: { path: 'permissions', select: 'name resource action status' } })
      .populate('department', 'name code head')
      .populate('manager', 'name designation employeeId avatar')
      .populate('mentor', 'name email avatar')
      .populate('pmoLead', 'name email avatar')
      .populate('project', 'name status code endDate')
      .populate('hrManager', 'name employeeId');

    if (!user) return sendError(res, 'User not found', 404);

    const currentYear = new Date().getFullYear();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [projects, taskStatsAgg, leaveBalanceDoc, attendanceRecords] = await Promise.all([
      Project.find({ 'team.user': userId, status: { $ne: 'Cancelled' } })
        .populate('manager', 'name')
        .lean(),
      Task.aggregate([
        { $match: { assignedTo: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      LeaveBalance.findOne({ user: userId, year: currentYear }),
      Attendance.find({ user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } }).lean(),
    ]);

    // Task stats
    const taskStats = { total: 0, todo: 0, inProgress: 0, inReview: 0, blocked: 0, done: 0, overdue: 0 };
    taskStatsAgg.forEach(({ _id, count }) => {
      taskStats.total += count;
      if (_id === 'Todo') taskStats.todo = count;
      else if (_id === 'In Progress') taskStats.inProgress = count;
      else if (_id === 'In Review') taskStats.inReview = count;
      else if (_id === 'Blocked') taskStats.blocked = count;
      else if (_id === 'Done') taskStats.done = count;
    });
    taskStats.overdue = await Task.countDocuments({
      assignedTo: userId,
      dueDate: { $lt: now },
      status: { $ne: 'Done' },
    });

    // Leave balance — auto-create if missing
    let leaveBalance = leaveBalanceDoc;
    if (!leaveBalance) {
      leaveBalance = await LeaveBalance.create({
        user: userId, year: currentYear,
        casual: { total: 10, used: 0 }, sick: { total: 7, used: 0 },
        annual: { total: 15, used: 0 }, emergency: { total: 2, used: 0 },
      });
    }

    // Attendance summary
    const attendance = attendanceRecords.reduce(
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
    const workingDays = attendanceRecords.length - attendance.holiday;
    attendance.percentage = workingDays > 0
      ? Math.round(((attendance.present + attendance.halfDay * 0.5) / workingDays) * 100)
      : 0;

    // Per-project task stats
    const projectIds = projects.map((p) => p._id);
    const projectTaskAgg = await Task.aggregate([
      { $match: { assignedTo: userId, project: { $in: projectIds } } },
      { $group: { _id: { project: '$project', status: '$status' }, count: { $sum: 1 } } },
    ]);

    const projectsWithStats = projects.map((p) => {
      const myTeamEntry = p.team.find((t) => t.user.toString() === userId.toString());
      const myRole = myTeamEntry?.role || null;

      const myTaskStats = { total: 0, todo: 0, inProgress: 0, inReview: 0, blocked: 0, done: 0 };
      projectTaskAgg
        .filter((a) => a._id.project.toString() === p._id.toString())
        .forEach(({ _id, count }) => {
          myTaskStats.total += count;
          if (_id.status === 'Todo') myTaskStats.todo = count;
          else if (_id.status === 'In Progress') myTaskStats.inProgress = count;
          else if (_id.status === 'In Review') myTaskStats.inReview = count;
          else if (_id.status === 'Blocked') myTaskStats.blocked = count;
          else if (_id.status === 'Done') myTaskStats.done = count;
        });

      return { _id: p._id, name: p.name, status: p.status, priority: p.priority, manager: p.manager, myRole, myTaskStats };
    });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;

    sendSuccess(res, { user: userObj, projects: projectsWithStats, taskStats, leaveBalance, attendance });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { phone, address, bio, emergencyContactName, emergencyContactPhone,
      emergencyContactRelation, linkedin, skills } = req.body;

    const updateData = {};
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (bio !== undefined) updateData.bio = bio;
    if (linkedin !== undefined) updateData.linkedIn = linkedin;
    if (skills !== undefined) updateData.skills = skills;
    if (emergencyContactName !== undefined) updateData['emergencyContact.name'] = emergencyContactName;
    if (emergencyContactPhone !== undefined) updateData['emergencyContact.phone'] = emergencyContactPhone;
    if (emergencyContactRelation !== undefined) updateData['emergencyContact.relation'] = emergencyContactRelation;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('role', 'name slug')
      .populate('department', 'name code');

    await AuditLog.create({
      user: req.user._id, userName: req.user.name,
      action: 'Update', module: 'Profile',
      details: 'Employee updated their profile',
      ipAddress: req.ip, userAgent: req.headers['user-agent'], result: 'SUCCESS',
    }).catch(() => {});

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;
    sendSuccess(res, userObj, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return sendError(res, 'currentPassword, newPassword, and confirmPassword are required', 400);
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return sendError(res, 'User not found', 404);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return sendError(res, 'Current password is incorrect', 400);

    if (newPassword === currentPassword) {
      return sendError(res, 'New password must be different from your current password', 400);
    }
    if (newPassword !== confirmPassword) {
      return sendError(res, 'New password and confirm password do not match', 400);
    }

    const settings = await Settings.findOne({ key: 'global' });
    const sec = settings?.security || {};
    const minLen = sec.minPasswordLength || 8;
    const requireUpper = sec.requireUppercase !== false;
    const requireNums = sec.requireNumbers !== false;
    const requireSpecial = sec.requireSpecial || false;

    if (newPassword.length < minLen) {
      return sendError(res, `Password must be at least ${minLen} characters long`, 400);
    }
    if (requireUpper && !/[A-Z]/.test(newPassword)) {
      return sendError(res, 'Password must contain at least one uppercase letter', 400);
    }
    if (requireNums && !/[0-9]/.test(newPassword)) {
      return sendError(res, 'Password must contain at least one number', 400);
    }
    if (requireSpecial && !/[^A-Za-z0-9]/.test(newPassword)) {
      return sendError(res, 'Password must contain at least one special character', 400);
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    const { token, refreshToken } = generateTokenPair(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      user: req.user._id, userName: req.user.name,
      action: 'Update', module: 'Profile',
      details: 'Employee changed their password',
      ipAddress: req.ip, userAgent: req.headers['user-agent'], result: 'SUCCESS',
    }).catch(() => {});

    sendSuccess(res, { token, refreshToken }, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};
