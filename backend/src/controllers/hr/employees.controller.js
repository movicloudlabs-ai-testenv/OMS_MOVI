import User from '../../models/User.js';
import Attendance from '../../models/Attendance.js';
import LeaveBalance from '../../models/LeaveBalance.js';
import LeaveRequest from '../../models/LeaveRequest.js';
import Project from '../../models/Project.js';
import Role from '../../models/Role.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js';
import { getPagination } from '../../utils/paginate.js';

export const getEmployees = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, department, employmentType, status, sortBy, sortOrder } = req.query;

    const filter = { ...req.scopeFilter };

    // Never show soft-deleted users
    filter.deletedAt = { $exists: false };

    // Exclude interns
    filter.employmentType = { $ne: 'Intern' };
    
    // Exclude admin, super-admin, pmo-lead, and hr-manager roles
    const restrictedRoles = await Role.find({ slug: { $in: ['admin', 'super-admin', 'pmo-lead', 'hr-manager'] } });
    const restrictedRoleIds = restrictedRoles.map(r => r._id);
    filter.role = { $nin: restrictedRoleIds };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) filter.department = department;
    if (employmentType && employmentType !== 'Intern') filter.employmentType = employmentType;
    if (status) filter.status = status;

    const sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1;
    }

    const [employees, total] = await Promise.all([
      User.find(filter)
        .populate('role', 'name color slug')
        .populate('department', 'name code')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    sendPaginated(res, employees, {
      total, page, limit,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await User.findOne({ $and: [{ _id: req.params.id }, req.scopeFilter || {}] })
      .populate({
        path: 'role',
        select: 'name slug permissions color',
      })
      .populate('department', 'name code')
      .populate('manager', 'name employeeId designation')
      .populate('hrManager', 'name employeeId')
      .populate('notes.addedBy', 'name role');

    if (!employee) return sendError(res, 'Employee not found or not in your scope', 404);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Aggregate attendance
    const attendanceRecords = await Attendance.find({
      user: employee._id,
      date: { $gte: startOfMonth },
    });
    const attendanceStats = attendanceRecords.reduce((acc, curr) => {
      if (curr.status === 'Present') acc.present++;
      else if (curr.status === 'Absent') acc.absent++;
      else if (curr.status === 'Half Day') acc.halfDay++;
      else if (curr.status === 'Leave') acc.leave++;
      return acc;
    }, { present: 0, absent: 0, halfDay: 0, leave: 0, total: attendanceRecords.length });

    const leaveBalance = await LeaveBalance.findOne({ user: employee._id, year: now.getFullYear() });
    const activeProjects = await Project.find({ 'team.user': employee._id, status: { $ne: 'Completed' } })
      .select('name status endDate');

    const empObj = employee.toJSON();
    empObj.attendanceSummary = attendanceStats;
    empObj.leaveBalance = leaveBalance;
    empObj.activeProjects = activeProjects;

    sendSuccess(res, empObj);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeAttendance = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const dateQuery = {};
    if (month && year) {
      const m = parseInt(month) - 1;
      const y = parseInt(year);
      dateQuery.$gte = new Date(y, m, 1);
      dateQuery.$lte = new Date(y, m + 1, 0);
    }

    const employee = await User.findOne({ $and: [{ _id: req.params.id }, req.scopeFilter || {}] });
    if (!employee) return sendError(res, 'Employee not found', 404);

    const records = await Attendance.find({ user: employee._id, date: dateQuery }).sort({ date: -1 });
    sendSuccess(res, records);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeLeaves = async (req, res, next) => {
  try {
    const employee = await User.findOne({ $and: [{ _id: req.params.id }, req.scopeFilter || {}] });
    if (!employee) return sendError(res, 'Employee not found', 404);

    const requests = await LeaveRequest.find({ user: employee._id }).sort({ createdAt: -1 });
    sendSuccess(res, requests);
  } catch (error) {
    next(error);
  }
};

export const addEmployeePerformance = async (req, res, next) => {
  try {
    const { week, rating, note } = req.body;
    if (!week || !rating) return sendError(res, 'Week and rating are required', 400);

    const employee = await User.findOne({ $and: [{ _id: req.params.id }, req.scopeFilter || {}] });
    if (!employee) return sendError(res, 'Employee not found', 404);

    if (!employee.performanceRatings) employee.performanceRatings = [];
    const existingIndex = employee.performanceRatings.findIndex(
      r => r.week === Number(week) && r.addedBy?.toString() === req.user._id.toString()
    );
    if (existingIndex !== -1) {
      employee.performanceRatings[existingIndex].rating = rating;
      employee.performanceRatings[existingIndex].note   = note;
      employee.performanceRatings[existingIndex].source = 'hr';
    } else {
      employee.performanceRatings.push({ week: Number(week), rating, note, source: 'hr', addedBy: req.user._id });
    }
    await employee.save({ validateBeforeSave: false });

    const { sendNotification } = await import('../../utils/sendNotification.js');
    await sendNotification({
      recipient: employee._id,
      type: 'system_alert',
      title: 'Performance Review Added',
      message: `Week ${week} performance review submitted by HR.`,
      link: '/employee/profile',
      sender: req.user._id,
    });

    sendSuccess(res, employee.performanceRatings, 'Performance rating saved');
  } catch (error) { next(error); }
};

export const addEmployeeNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note) return sendError(res, 'Note text is required', 400);

    const employee = await User.findOne({ $and: [{ _id: req.params.id }, req.scopeFilter || {}] });
    if (!employee) return sendError(res, 'Employee not found', 404);

    employee.notes.push({
      text: note,
      addedBy: req.user._id,
      createdAt: new Date(),
    });

    await employee.save();
    
    // Repopulate notes for response
    await employee.populate('notes.addedBy', 'name role');

    sendSuccess(res, employee.notes, 'Note added successfully');
  } catch (error) {
    next(error);
  }
};
