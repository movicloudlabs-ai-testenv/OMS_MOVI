import mongoose from 'mongoose';
import User from '../../models/User.js';
import Role from '../../models/Role.js';
import Department from '../../models/Department.js';
import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import Issue from '../../models/Issue.js';
import ArchivedUser from '../../models/ArchivedUser.js';
import AuditLog from '../../models/AuditLog.js';
import Attendance from '../../models/Attendance.js';
import LeaveBalance from '../../models/LeaveBalance.js';
import DailyTracker from '../../models/DailyTracker.js';
import EODReport from '../../models/EODReport.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js';
import { getPagination, paginatedResponse } from '../../utils/paginate.js';
import { sendNotification } from '../../utils/sendNotification.js';
import { sendWelcomeEmail } from '../../utils/sendEmail.js';
import { syncEmployeeLeaveBalance } from '../../utils/syncLeaveBalance.js';
import { autoAssignHR } from '../../utils/autoAssignHR.js';
import { generateEmployeeId } from '../../utils/generateEmployeeId.js';

/**
 * GET /api/admin/users
 * List all users with search, filters, sorting, and pagination.
 * Response shape matches frontend Users.jsx mock data exactly.
 */
export const getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, department, role, status, employmentType, sortBy, sortOrder } = req.query;

    // Build filter — always exclude soft-deleted users
    const filter = { deletedAt: { $exists: false } };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) filter.department = department;
    if (role) {
      if (mongoose.Types.ObjectId.isValid(role)) {
        filter.role = role;
      } else {
        const foundRole = await Role.findOne({
          $or: [
            { slug: role.toLowerCase() },
            { name: { $regex: new RegExp(`^${role}$`, 'i') } },
          ],
        });
        if (foundRole) {
          filter.role = foundRole._id;
        } else {
          filter.employmentType = { $regex: new RegExp(`^${role}$`, 'i') };
        }
      }
    }
    if (status) filter.status = status;
    if (employmentType) filter.employmentType = employmentType;

    // Sorting
    const sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // newest first
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('role', 'name slug color')
        .populate('department', 'name code')
        .populate('project', 'name code status')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    sendPaginated(res, users, {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/users
 * Create a new user. Auto-generates employeeId.
 * If no password provided, generates a temp password.
 */
export const createUser = async (req, res, next) => {
  try {
    const {
      name, email, role, department, designation, employmentType, password, skills,
      hrManager: hrManagerInput, phone, manager, college, domain, batch, pmoLead,
      internshipStart, internshipEnd, joinDate,
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return sendError(res, 'Name and email are required', 400);
    }

    // Check email uniqueness — ignore soft-deleted users
    const existing = await User.findOne({ email: email.toLowerCase().trim(), deletedAt: { $exists: false } });
    if (existing) {
      return sendError(res, 'Email already registered', 400);
    }

    // ── Robust Role Resolution (Accepts ObjectId, slug string, or display name) ──
    let roleDoc = null;
    if (role) {
      if (mongoose.Types.ObjectId.isValid(role)) {
        roleDoc = await Role.findById(role);
      }
      if (!roleDoc) {
        const roleStr = String(role).trim();
        roleDoc = await Role.findOne({
          $or: [
            { slug: roleStr.toLowerCase() },
            { name: new RegExp(`^${roleStr}$`, 'i') },
          ],
        });
      }
    }
    if (!roleDoc) {
      roleDoc = await Role.findOne({ slug: 'employee' });
    }
    if (!roleDoc) {
      roleDoc = await Role.findOne({});
    }
    if (!roleDoc) {
      return sendError(res, 'Invalid role specification and no system roles found', 400);
    }
    const roleId = roleDoc._id;

    // ── Robust Department Resolution (Accepts ObjectId, department name, or code) ──
    let departmentId = null;
    if (department) {
      if (mongoose.Types.ObjectId.isValid(department)) {
        const deptDoc = await Department.findById(department);
        if (deptDoc) departmentId = deptDoc._id;
      }
      if (!departmentId) {
        const deptStr = String(department).trim();
        let deptDoc = await Department.findOne({
          $or: [
            { name: new RegExp(`^${deptStr}$`, 'i') },
            { code: deptStr.toUpperCase() },
          ],
        });
        if (deptDoc) {
          departmentId = deptDoc._id;
        } else {
          // Auto-create department so valid reference is always established
          const code = deptStr.substring(0, 4).toUpperCase();
          deptDoc = await Department.create({
            name: deptStr,
            code,
            status: 'Active',
          }).catch(() => null);
          if (deptDoc) departmentId = deptDoc._id;
        }
      }
    }

    // Determine employment type from role or input
    let empType = employmentType;
    if (!empType) {
      empType = (roleDoc.slug === 'intern' || roleDoc.name.toLowerCase().includes('intern')) ? 'Intern' : 'Full-time';
    } else {
      const norm = empType.trim().toLowerCase();
      if (norm === 'intern') empType = 'Intern';
      else if (norm === 'part-time') empType = 'Part-time';
      else if (norm === 'contract') empType = 'Contract';
      else empType = 'Full-time';
    }

    // Auto-generate employeeId
    const employeeId = await generateEmployeeId(
      empType === 'Intern' ? 'Intern' : 'Employee'
    );

    // Use provided credentials/password if given (minlength 8 for User model schema), otherwise generate
    const tempPassword = password && password.trim().length >= 8
      ? password.trim()
      : (password && password.trim().length > 0
          ? `${password.trim()}00` // Pad to ensure minlength 8
          : `OWMS@${Math.floor(100000 + Math.random() * 900000)}`);

    // Auto-assign HR if not provided (run before User creation to avoid duplicate DB save and bcrypt hashing)
    // Bypassed for interns so they remain in the unassigned pool visible to all HRs
    let hrManagerId = (hrManagerInput && mongoose.Types.ObjectId.isValid(hrManagerInput)) ? hrManagerInput : null;
    let assignedHR       = null;
    let hrCapExceeded    = false;
    let autoAssigned     = false;

    if (!hrManagerId) {
      if (empType !== 'Intern' && departmentId) {
        const result = await autoAssignHR({ department: departmentId });
        if (result?.hrUser) {
          hrManagerId = result.hrUser._id;
          assignedHR    = result.hrUser;
          hrCapExceeded = result.capExceeded;
          autoAssigned  = true;
        }
      }
    } else {
      assignedHR = await User.findById(hrManagerId).select('_id name');
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: tempPassword,
      role: roleId,
      department: departmentId || undefined,
      designation: designation ? designation.trim() : (empType === 'Intern' ? 'Intern' : 'Team Member'),
      employmentType: empType,
      employeeId,
      skills: skills || [],
      phone: phone ? phone.trim() : undefined,
      manager: (manager && mongoose.Types.ObjectId.isValid(manager)) ? manager : undefined,
      joinDate: empType === 'Intern' ? undefined : (joinDate || new Date()),
      hrManager: hrManagerId || undefined,
      college: empType === 'Intern' ? (college || undefined) : undefined,
      domain: empType === 'Intern' ? (domain || undefined) : undefined,
      batch: empType === 'Intern' ? (batch || undefined) : undefined,
      pmoLead: (pmoLead && mongoose.Types.ObjectId.isValid(pmoLead)) ? pmoLead : undefined,
      internshipStart: empType === 'Intern' ? (internshipStart || undefined) : undefined,
      internshipEnd: empType === 'Intern' ? (internshipEnd || undefined) : undefined,
      mustChangePassword: true,
    });

    // Populate the newly created user directly to avoid doing another full findById query
    await user.populate([
      { path: 'role', select: 'name slug color' },
      { path: 'department', select: 'name code' },
      { path: 'hrManager', select: 'name employeeId' }
    ]);

    // Auto-create leave balance for non-interns in the background (non-blocking)
    if (empType !== 'Intern') {
      syncEmployeeLeaveBalance(user._id).catch((err) => {
        console.error('syncEmployeeLeaveBalance background failed:', err);
      });
    }

    // Notify the new user in the background (non-blocking)
    sendNotification({
      recipient: user._id,
      type: 'user_created',
      title: 'Welcome to OWMS',
      message: `Your account has been created. Employee ID: ${employeeId}`,
      link: '/profile',
      sender: req.user._id,
    });

    // Notify the assigned HR in the background (non-blocking)
    if (assignedHR) {
      sendNotification({
        recipient: assignedHR._id,
        type:      'system_alert',
        title:     'New Onboarding Assignment',
        message:   `You have been assigned as the onboarding HR for ${name} (${employeeId}).`,
        link:      '/hr/onboarding',
        sender:    req.user._id,
      });
    }

    // If cap was exceeded, also warn the admin in the background (non-blocking)
    if (hrCapExceeded && assignedHR) {
      sendNotification({
        recipient: req.user._id,
        type:      'system_alert',
        title:     'HR Onboarding Cap Exceeded',
        message:   `${assignedHR.name} has exceeded the onboarding HR limit. Consider reassigning ${name} to another HR.`,
        link:      '/hr/onboarding',
        sender:    req.user._id,
      });
    }

    // Send response IMMEDIATELY
    sendSuccess(res, {
      ...user.toJSON(),
      tempPassword,
      emailSent: 'pending',
      ...(autoAssigned  && { autoAssignedHR: assignedHR?.name }),
      ...(hrCapExceeded && { hrCapWarning: `${assignedHR?.name} has exceeded the onboarding HR cap.` }),
    }, 'User created successfully', 201);

    // Send email AFTER response — completely non-blocking
    // If this fails, user creation was already successful
    sendWelcomeEmail({
      toEmail:      user.email,
      toName:       user.name,
      employeeId,
      tempPassword,
      role:         roleDoc?.name || 'User',
      loginUrl:     (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173') + '/login',
    }).then(result => {
      if (!result.sent) {
        console.warn(`Welcome email failed for ${user.email}:`, result.reason);
      }
    }).catch(err => {
      console.error('sendWelcomeEmail unexpected error:', err);
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users/:id
 * Get a single user with deep population.
 * Response matches UserDetails.jsx mock data shape.
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: 'role',
        populate: {
          path: 'permissions',
          select: 'name resource action status',
        },
      })
      .populate('department', 'name code')
      .populate('manager', 'name employeeId designation email phone')
      .populate('hrManager', 'name employeeId email')
      .populate('mentor', 'name employeeId designation email')
      .populate('pmoLead', 'name employeeId designation email')
      .populate('project', 'name status description startDate endDate');

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Performance, EOD & Daily Activity (Real data from MongoDB)
    const [tasks, attendanceRecords, leaveBalance, dailyTrackers, eodReports] = await Promise.all([
      Task.find({ assignedTo: user._id })
        .populate('project', 'name code status')
        .sort({ updatedAt: -1 })
        .lean(),
      Attendance.find({ user: user._id })
        .sort({ date: -1 })
        .limit(30)
        .lean(),
      LeaveBalance.findOne({ user: user._id, year: new Date().getFullYear() }).lean(),
      DailyTracker.find({ user: user._id })
        .populate('project', 'name code status')
        .sort({ date: -1 })
        .limit(14)
        .lean(),
      EODReport.find({ user: user._id })
        .sort({ date: -1 })
        .limit(14)
        .lean(),
    ]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress' || t.status === 'In Review').length;
    const blockedTasks = tasks.filter(t => t.status === 'Blocked').length;
    const todoTasks = tasks.filter(t => t.status === 'Todo').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalAttendance = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(a => a.status === 'Present').length;
    const halfDays = attendanceRecords.filter(a => a.status === 'Half-Day' || a.status === 'Half Day').length;
    const absentDays = attendanceRecords.filter(a => a.status === 'Absent').length;
    const attendanceRate = totalAttendance > 0 ? Math.round(((presentDays + halfDays * 0.5) / totalAttendance) * 100) : 100;

    const userObj = user.toObject();
    userObj.performance = {
      taskMetrics: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        blocked: blockedTasks,
        todo: todoTasks,
        completionRate,
      },
      attendanceMetrics: {
        totalDaysLogged: totalAttendance,
        presentDays,
        halfDays,
        absentDays,
        attendanceRate,
      },
      leaveBalance: leaveBalance || {
        casual: { total: 0, used: 0 },
        sick: { total: 0, used: 0 },
        annual: { total: 0, used: 0 },
        emergency: { total: 0, used: 0 },
      },
      recentTasks: tasks.slice(0, 10),
      dailyTrackers: dailyTrackers || [],
      eodReports: eodReports || [],
    };

    sendSuccess(res, userObj);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/users/:id
 * Update user fields. Cannot update email or password through this endpoint.
 */
export const updateUser = async (req, res, next) => {
  try {
    const { name, designation, department, role, employmentType, status,
      manager, hrManager, skills, college, domain, batch, mentor, pmoLead,
      internshipStart, internshipEnd, project } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Track role + hrManager change for notifications
    const oldRole      = user.role?.toString();
    const oldHRManager = user.hrManager?.toString();

    // Update fields
    if (name) user.name = name;
    if (designation !== undefined) user.designation = designation;
    if (department !== undefined) user.department = department;
    if (role) user.role = role;
    if (employmentType) user.employmentType = employmentType;
    if (status) user.status = status;
    if (project !== undefined) user.project = project || undefined;
    if (manager !== undefined) {
      user.manager = manager || undefined;
    }
    if (hrManager !== undefined) {
      user.hrManager = hrManager || undefined;
    }
    if (skills) user.skills = skills;
    if (college !== undefined) user.college = college;
    if (domain !== undefined) user.domain = domain;
    if (batch !== undefined) user.batch = batch;
    if (mentor !== undefined) {
      user.mentor = mentor || undefined;
    }
    if (pmoLead !== undefined) {
      user.pmoLead = pmoLead || undefined;
    }
    if (internshipStart) user.internshipStart = internshipStart;
    if (internshipEnd) user.internshipEnd = internshipEnd;

    await user.save({ validateBeforeSave: false });

    // If project was assigned, ensure user is registered in project team
    if (project) {
      await Project.findByIdAndUpdate(project, {
        $addToSet: { team: { user: user._id, role: user.designation || 'Team Member', joinedAt: new Date() } }
      }).catch(err => console.error('Auto-team assign failed:', err));
    }

    // If role changed, notify user
    if (role && role !== oldRole) {
      const newRoleDoc = await Role.findById(role);
      await sendNotification({
        recipient: user._id,
        type: 'permission_changed',
        title: 'Role Updated',
        message: `Your role has been updated to ${newRoleDoc?.name || 'a new role'}`,
        link: '/profile',
        sender: req.user._id,
      });
    }

    // If hrManager changed, notify both old and new HR
    if (hrManager !== undefined && hrManager?.toString() !== oldHRManager) {
      if (hrManager) {
        await sendNotification({
          recipient: hrManager,
          type:      'system_alert',
          title:     'New Onboarding Assignment',
          message:   `You have been assigned as the onboarding HR for ${user.name} (${user.employeeId}).`,
          link:      '/hr/onboarding',
          sender:    req.user._id,
        });
      }
      if (oldHRManager) {
        await sendNotification({
          recipient: oldHRManager,
          type:      'system_alert',
          title:     'Onboarding Reassigned',
          message:   `${user.name} (${user.employeeId}) has been reassigned to another HR.`,
          link:      '/hr/onboarding',
          sender:    req.user._id,
        });
      }
    }

    // Return populated user
    const updatedUser = await User.findById(user._id)
      .populate('role', 'name slug color')
      .populate('department', 'name code');

    sendSuccess(res, updatedUser, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users/:id/deletion-impact
 * Preview the consequences of deleting a user: projects they manage,
 * projects they're a member of, and how many open tasks they own.
 * Lets the admin reassign managers and confirm before the cascade runs.
 */
export const getUserDeletionImpact = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('name');
    if (!user) return sendError(res, 'User not found', 404);

    const projects = await Project.find({
      $or: [{ manager: userId }, { 'team.user': userId }, { 'interns.user': userId }],
    }).select('name code status manager');

    const uid = userId.toString();
    const managedProjects = [];
    const memberProjects = [];
    for (const p of projects) {
      const entry = { _id: p._id, name: p.name, code: p.code, status: p.status };
      if (p.manager?.toString() === uid) managedProjects.push(entry);
      else memberProjects.push(entry);
    }

    const openTaskCount = await Task.countDocuments({ assignedTo: userId, status: { $ne: 'Done' } });

    sendSuccess(res, {
      user: { _id: user._id, name: user.name },
      managedProjects,
      memberProjects,
      openTaskCount,
      requiresManagerReassignment: managedProjects.length > 0,
    }, 'Deletion impact computed');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/users/:id
 * Offboarding cascade + soft delete:
 *  - reassign any projects the user manages to a replacement (required)
 *  - remove the user from every project team / intern roster
 *  - flag their open tasks as needing reassignment (assignee cleared)
 *  - notify affected project managers + the user's HR/PMO
 *  - soft delete the user (Inactive + deletedAt, email freed for reuse)
 *
 * Body: { managerReassignments: { [projectId]: newManagerId } }
 */
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('role', 'name slug')
      .populate('department', 'name');

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Prevent deleting Super Admin
    if (user.role?.slug === 'super-admin') {
      return sendError(res, 'Super Admin account cannot be deleted', 403);
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user._id.toString()) {
      return sendError(res, 'You cannot delete your own account', 400);
    }

    const userId = user._id.toString();
    const { managerReassignments = {} } = req.body || {};

    // ── Offboarding cascade (preserved from original) ──────────────────────

    // Every project this user touches
    const projects = await Project.find({
      $or: [{ manager: user._id }, { 'team.user': user._id }, { 'interns.user': user._id }],
    });

    // Projects they MANAGE need a valid, active replacement before we proceed
    const managed = projects.filter(p => p.manager?.toString() === userId);
    const missing = managed.filter(p => !managerReassignments[p._id.toString()]);
    if (missing.length > 0) {
      return sendError(
        res,
        `This user manages ${managed.length} project(s). A replacement manager is required for: ${missing.map(p => p.name).join(', ')}`,
        409
      );
    }
    for (const p of managed) {
      const newMgrId = managerReassignments[p._id.toString()];
      const newMgr = await User.findOne({
        _id: newMgrId, status: 'Active', deletedAt: { $exists: false },
      }).select('_id');
      if (!newMgr) return sendError(res, `Replacement manager for "${p.name}" is invalid or inactive`, 400);
    }

    // 1) Reassign managed projects + strip the user from all rosters
    const notifyManagerIds = new Set();
    for (const p of projects) {
      if (p.manager?.toString() === userId) {
        const newMgrId = managerReassignments[p._id.toString()];
        p.manager = newMgrId;
        notifyManagerIds.add(newMgrId.toString());
      } else if (p.manager) {
        notifyManagerIds.add(p.manager.toString());
      }
      p.team = p.team.filter(t => t.user?.toString() !== userId);
      p.interns = p.interns.filter(i => i.user?.toString() !== userId);
      await p.save({ validateBeforeSave: false });
    }

    // 2) Flag the user's open tasks for reassignment (clear assignee)
    const openTaskCount = await Task.countDocuments({ assignedTo: user._id, status: { $ne: 'Done' } });
    if (openTaskCount > 0) {
      await Task.updateMany(
        { assignedTo: user._id, status: { $ne: 'Done' } },
        {
          $set: { assignedTo: null, needsReassignment: true },
          $push: { statusHistory: { status: 'Unassigned', changedBy: req.user._id, changedAt: new Date() } },
        }
      );
    }

    // ── Archive instead of soft-delete ─────────────────────────────────────

    // 3) Copy full document to ArchivedUser
    const archived = await ArchivedUser.create({
      originalId:       user._id,
      employeeId:       user.employeeId,
      name:             user.name,
      email:            user.email,
      avatar:           user.avatar,
      role:             user.role?._id,
      department:       user.department?._id,
      designation:      user.designation,
      employmentType:   user.employmentType,
      joinDate:         user.joinDate,
      skills:           user.skills,
      archivedBy:       req.user._id,
      archivedByName:   req.user.name,
      archiveReason:    req.body.reason || 'Deleted by administrator',
      originalDocument: user.toObject(),
    });

    // 4) Hard delete from users collection
    await User.findByIdAndDelete(req.params.id);

    // 5) Create audit log
    await AuditLog.create({
      user:       req.user._id,
      userName:   req.user.name,
      action:     'Delete',
      module:     'Users',
      resourceId: user._id,
      details:    `User ${user.name} (${user.employeeId}) archived by ${req.user.name}`,
      ipAddress:  req.ip,
      result:     'WARNING',
    });

    // 6) Notify the people who now own the handover
    const recipients = new Set(notifyManagerIds);
    if (user.hrManager) recipients.add(user.hrManager.toString());
    if (user.pmoLead) recipients.add(user.pmoLead.toString());
    if (user.manager) recipients.add(user.manager.toString());
    recipients.delete(userId);
    for (const rid of recipients) {
      await sendNotification({
        recipient: rid,
        type: 'system_alert',
        title: 'Team Member Removed',
        message: `${user.name} (${user.employeeId}) has been removed from the system by Admin.${openTaskCount > 0 ? ` ${openTaskCount} of their open task(s) now need reassignment.` : ''}`,
        link: '/admin/settings?tab=retention',
        sender: req.user._id,
      });
    }

    sendSuccess(res, {
      archivedId: archived._id,
      employeeId: user.employeeId,
      name: user.name,
      projectsAffected: projects.length,
      managedReassigned: managed.length,
      tasksUnassigned: openTaskCount,
    }, 'User archived successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/users/:id/status
 * Toggle user status (Active/Inactive/Suspended).
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['Active', 'Inactive', 'Suspended'].includes(status)) {
      return sendError(res, 'Invalid status. Must be Active, Inactive, or Suspended', 400);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('role', 'name slug color').populate('department', 'name code');

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Notify the affected user
    await sendNotification({
      recipient: user._id,
      type: 'system_alert',
      title: 'Account Status Changed',
      message: `Your account status has been changed to ${status}`,
      sender: req.user._id,
    });

    sendSuccess(res, user, `User status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/users/:id/reset-password
 * Generates a new temp password for a user.
 * Returns the temp password (admin shows it once).
 */
export const resetUserPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('+password');
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Generate new temp password
    const tempPassword = `OWMS@${Math.floor(100000 + Math.random() * 900000)}`;
    user.password = tempPassword;
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    sendSuccess(res, {
      _id: user._id,
      name: user.name,
      tempPassword,
    }, 'Password reset successfully. Share this temporary password with the user.');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users/:id/projects
 * All projects where the user is manager, team member, or intern.
 */
export const getUserProjects = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const projects = await Project.find({
      $or: [
        { manager: userId },
        { 'team.user': userId },
        { 'interns.user': userId },
      ],
    })
      .populate('manager', 'name designation')
      .populate('department', 'name')
      .select('name code status priority description startDate endDate healthStatus team interns manager department completionPercent currentVersion')
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      projects.map(async (p) => {
        const uid = userId.toString();
        const teamEntry = p.team.find((t) => (t.user?._id || t.user)?.toString() === uid);
        const isManager = p.manager?._id?.toString() === uid;
        const isIntern = p.interns.some((i) => (i.user?._id || i.user)?.toString() === uid);

        const role = isManager
          ? 'Lead Manager'
          : teamEntry
            ? (teamEntry.role || 'Team Member')
            : isIntern
              ? 'Intern'
              : 'Member';

        const allocation = teamEntry
          ? teamEntry.allocationPercentage
          : isManager
            ? 100
            : 0;

        // Aggregate Sanjit's real-time contributions in this specific project
        const [totalTasks, completedTasks, solvedBugs] = await Promise.all([
          Task.countDocuments({ project: p._id, assignedTo: userId }),
          Task.countDocuments({
            project: p._id,
            assignedTo: userId,
            status: { $in: ['Done', 'Completed', 'Approved'] },
          }),
          Issue.countDocuments({ project: p._id, resolvedBy: userId }),
        ]);

        return {
          ...p.toObject(),
          userRole: role,
          userAllocation: allocation,
          userStats: {
            totalTasks,
            completedTasks,
            solvedBugs,
          },
        };
      })
    );

    sendSuccess(res, enriched, 'Projects fetched');
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIVE / RETENTION CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/users/archived
 * List all archived users with search, filters, pagination, and stats.
 */
export const getArchivedUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, employmentType, dateFrom, dateTo } = req.query;

    const filter = { isRestored: false };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    if (employmentType) filter.employmentType = employmentType;

    if (dateFrom || dateTo) {
      filter.archivedAt = {};
      if (dateFrom) filter.archivedAt.$gte = new Date(dateFrom);
      if (dateTo) filter.archivedAt.$lte = new Date(dateTo);
    }

    const [archived, total] = await Promise.all([
      ArchivedUser.find(filter)
        .populate('role', 'name color')
        .populate('department', 'name')
        .populate('archivedBy', 'name employeeId')
        .sort({ archivedAt: -1 })
        .skip(skip)
        .limit(limit),
      ArchivedUser.countDocuments(filter),
    ]);

    // Summary stats for the Retention tab header
    const stats = await ArchivedUser.aggregate([
      { $match: { isRestored: false } },
      { $group: {
        _id: '$employmentType',
        count: { $sum: 1 },
      }},
    ]);

    sendSuccess(res, {
      archived,
      stats,
      pagination: paginatedResponse(archived, total, page, limit).pagination,
    }, 'Archived users fetched');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/users/archived/:archivedId/restore
 * Restore an archived user back to the active users collection.
 */
export const restoreUser = async (req, res, next) => {
  try {
    const archived = await ArchivedUser.findById(req.params.archivedId);

    if (!archived) {
      return sendError(res, 'Archived record not found', 404);
    }

    if (archived.isRestored) {
      return sendError(res, 'This user has already been restored', 400);
    }

    // Check if email is already taken by another user
    const emailTaken = await User.findOne({ email: archived.email });
    if (emailTaken) {
      return sendError(res,
        `Email ${archived.email} is already in use by another account. Cannot restore.`, 400);
    }

    // Restore using the original document snapshot
    const originalDoc = { ...archived.originalDocument };

    // Remove MongoDB-internal fields before re-inserting
    delete originalDoc.__v;

    // Reset status to Active and clear any lock flags
    originalDoc.status = 'Active';
    originalDoc.loginAttempts = 0;
    originalDoc.lockUntil = null;
    originalDoc.mustChangePassword = true; // Force password change on restore
    delete originalDoc.deletedAt;

    // Re-create in users collection with SAME _id
    const restored = await User.create(originalDoc);

    // Mark archive record as restored
    await ArchivedUser.findByIdAndUpdate(req.params.archivedId, {
      isRestored: true,
      restoredAt: Date.now(),
      restoredBy: req.user._id,
    });

    // Notify restored user
    await sendNotification({
      recipient: restored._id,
      type: 'system_alert',
      title: 'Account Restored',
      message: `Your OWMS account has been restored by ${req.user.name}. Please login and change your password.`,
    });

    // Audit log
    await AuditLog.create({
      user:       req.user._id,
      userName:   req.user.name,
      action:     'Restore',
      module:     'Users',
      resourceId: restored._id,
      details:    `User ${restored.name} (${restored.employeeId}) restored by ${req.user.name}`,
      ipAddress:  req.ip,
      result:     'SUCCESS',
    });

    sendSuccess(res, { restored },
      `${archived.name} has been restored successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/users/archived/:archivedId/permanent
 * Permanently delete an archived user. Super Admin only.
 */
export const permanentlyDeleteUser = async (req, res, next) => {
  try {
    // Only Super Admin can permanently delete
    if (req.user.role.slug !== 'super-admin') {
      return sendError(res,
        'Only Super Admin can permanently delete records', 403);
    }

    const archived = await ArchivedUser.findById(req.params.archivedId);
    if (!archived) {
      return sendError(res, 'Record not found', 404);
    }

    await ArchivedUser.findByIdAndDelete(req.params.archivedId);

    await AuditLog.create({
      user:       req.user._id,
      userName:   req.user.name,
      action:     'Permanent Delete',
      module:     'Users',
      resourceId: archived.originalId,
      details:    `User ${archived.name} (${archived.employeeId}) permanently deleted by ${req.user.name}`,
      ipAddress:  req.ip,
      result:     'WARNING',
    });

    sendSuccess(res, null, 'User permanently deleted from all records');
  } catch (error) {
    next(error);
  }
};
