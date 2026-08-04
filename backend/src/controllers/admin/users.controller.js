import User from '../../models/User.js';
import Role from '../../models/Role.js';
import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import ArchivedUser from '../../models/ArchivedUser.js';
import AuditLog from '../../models/AuditLog.js';
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
    if (role) filter.role = role;
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

    let roleId = role;
    if (!roleId) {
      const defaultRole = await Role.findOne({ slug: 'employee' });
      if (defaultRole) roleId = defaultRole._id;
    }

    // Validate required fields
    if (!name || !email || !roleId) {
      return sendError(res, 'Name, email, and role are required', 400);
    }

    // Check email uniqueness — ignore soft-deleted users
    const existing = await User.findOne({ email: email.toLowerCase(), deletedAt: { $exists: false } });
    if (existing) {
      return sendError(res, 'Email already registered', 400);
    }

    // Check role exists
    const roleDoc = await Role.findById(roleId);
    if (!roleDoc) {
      return sendError(res, 'Invalid role ID', 400);
    }

    // Determine employment type from role
    const empType = employmentType || (roleDoc.slug === 'intern' ? 'Intern' : 'Full-time');

    // Auto-generate employeeId
    const employeeId = await generateEmployeeId(
      empType === 'Intern' ? 'Intern' : 'Employee'
    );

    // Always generate a system temp password — admin never sees it, user must change on first login
    const tempPassword = `OWMS@${Math.floor(100000 + Math.random() * 900000)}`;

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: tempPassword,
      role: roleId,
      department,
      designation,
      employmentType: empType,
      employeeId,
      skills: skills || [],
      phone: phone || undefined,
      manager: manager || undefined,
      joinDate: empType === 'Intern' ? undefined : (joinDate || new Date()),
      hrManager: hrManagerInput || undefined,
      college: empType === 'Intern' ? (college || undefined) : undefined,
      domain: empType === 'Intern' ? (domain || undefined) : undefined,
      batch: empType === 'Intern' ? (batch || undefined) : undefined,
      pmoLead: empType === 'Intern' ? (pmoLead || undefined) : undefined,
      internshipStart: empType === 'Intern' ? (internshipStart || undefined) : undefined,
      internshipEnd: empType === 'Intern' ? (internshipEnd || undefined) : undefined,
      mustChangePassword: true,
    });

    // Auto-assign HR if not provided
    let assignedHR       = null;
    let hrCapExceeded    = false;
    let autoAssigned     = false;

    if (!hrManagerInput) {
      const result = await autoAssignHR(user);
      if (result.hrUser) {
        user.hrManager = result.hrUser._id;
        await user.save({ validateBeforeSave: false });
        assignedHR    = result.hrUser;
        hrCapExceeded = result.capExceeded;
        autoAssigned  = true;
      }
    } else {
      assignedHR = await User.findById(hrManagerInput).select('_id name');
    }

    // Fetch populated user for response
    const populatedUser = await User.findById(user._id)
      .populate('role', 'name slug color')
      .populate('department', 'name code')
      .populate('hrManager', 'name employeeId');

    // Auto-create leave balance for non-interns
    if (empType !== 'Intern') {
      await syncEmployeeLeaveBalance(user._id).catch(() => {});
    }

    // Notify the new user
    await sendNotification({
      recipient: user._id,
      type: 'user_created',
      title: 'Welcome to OWMS',
      message: `Your account has been created. Employee ID: ${employeeId}`,
      link: '/profile',
      sender: req.user._id,
    });

    // Notify the assigned HR
    if (assignedHR) {
      await sendNotification({
        recipient: assignedHR._id,
        type:      'system_alert',
        title:     'New Onboarding Assignment',
        message:   `You have been assigned as the onboarding HR for ${name} (${employeeId}).`,
        link:      '/hr/onboarding',
        sender:    req.user._id,
      });
    }

    // If cap was exceeded, also warn the admin who created the user
    if (hrCapExceeded && assignedHR) {
      await sendNotification({
        recipient: req.user._id,
        type:      'system_alert',
        title:     'HR Onboarding Cap Exceeded',
        message:   `${assignedHR.name} has exceeded the onboarding HR limit. Consider reassigning ${name} to another HR.`,
        link:      '/hr/onboarding',
        sender:    req.user._id,
      });
    }

    // Send response IMMEDIATELY — do not wait for email
    // User is already created successfully at this point
    sendSuccess(res, {
      ...populatedUser.toJSON(),
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
      .populate('manager', 'name employeeId designation')
      .populate('hrManager', 'name employeeId')
      .populate('mentor', 'name employeeId designation')
      .populate('pmoLead', 'name employeeId designation')
      .populate('project', 'name status description startDate endDate');

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, user);
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
      internshipStart, internshipEnd } = req.body;

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
    if (manager !== undefined) user.manager = manager;
    if (hrManager !== undefined) user.hrManager = hrManager;
    if (skills) user.skills = skills;
    if (college !== undefined) user.college = college;
    if (domain !== undefined) user.domain = domain;
    if (batch !== undefined) user.batch = batch;
    if (mentor !== undefined) user.mentor = mentor;
    if (pmoLead !== undefined) user.pmoLead = pmoLead;
    if (internshipStart) user.internshipStart = internshipStart;
    if (internshipEnd) user.internshipEnd = internshipEnd;

    await user.save({ validateBeforeSave: false });

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
      .select('name code status priority description startDate endDate healthStatus team interns manager department')
      .sort({ createdAt: -1 });

    const enriched = projects.map(p => {
      const uid = userId.toString();
      const role =
        p.manager?._id?.toString() === uid ? 'Manager' :
        p.team.some(t => t.user?.toString() === uid)
          ? (p.team.find(t => t.user?.toString() === uid)?.role || 'Team Member')
          : p.interns.some(i => i.user?.toString() === uid) ? 'Intern' : 'Member';
      return { ...p.toObject(), userRole: role };
    });

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
