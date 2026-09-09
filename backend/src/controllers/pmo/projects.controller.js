import mongoose from 'mongoose';
import Project from '../../models/Project.js';
import Department from '../../models/Department.js';
import Task from '../../models/Task.js';
import User from '../../models/User.js';
import Issue from '../../models/Issue.js';
import AuditLog from '../../models/AuditLog.js';
import ProjectActivity from '../../models/ProjectActivity.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js';
import { getPagination } from '../../utils/paginate.js';
import { sendNotification } from '../../utils/sendNotification.js';
import { sendProjectAssignmentEmail } from '../../utils/sendEmail.js';
import { encryptSecret, decryptSecret } from '../../utils/cryptoVault.js';
import { getClientInfo } from '../../utils/clientInfo.js';
import { provisionProjectChannel, syncProjectTeamMembers } from '../../services/chatChannelSync.service.js';

// ─── HELPER: Log Project Audit Event ──────────────────────────────────────────
async function logProjectAudit(req, { action, module = 'Projects', resourceId, details, result = 'SUCCESS', errorMessage }) {
  try {
    const client = getClientInfo(req);
    await AuditLog.create({
      user: req.user?._id,
      userName: req.user?.name || 'System',
      action,
      module,
      resource: 'Project',
      resourceId,
      details,
      result,
      errorMessage,
      ...client,
    });
  } catch (err) {
    // Non-blocking audit logging failure
    console.error('Failed to write audit log:', err);
  }
}

// ─── HELPER: Record Project Activity ─────────────────────────────────────────
async function recordActivity({ projectId, req, action, title, details = '', metadata = {} }) {
  try {
    await ProjectActivity.create({
      project: projectId,
      actor: req.user._id,
      actorName: req.user.name,
      action,
      title,
      details,
      metadata,
    });
  } catch (err) {
    console.error('Failed to write project activity:', err);
  }
}

// ─── GET ALL PROJECTS ────────────────────────────────────────────────────────
export const getProjects = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, priority, search } = req.query;

    const filter = { ...req.projectFilter };
    if (status && status !== 'All') filter.status = status;
    if (priority && priority !== 'All') filter.priority = priority;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('manager', 'name avatar designation email')
        .populate('department', 'name code')
        .populate({
          path: 'team.user',
          select: 'name designation avatar department',
          populate: { path: 'department', select: 'name code' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Project.countDocuments(filter),
    ]);

    // Enrich with tasks & bugs counts
    const enriched = await Promise.all(
      projects.map(async (project) => {
        const [tasks, activeBugs] = await Promise.all([
          Task.find({ project: project._id }, 'status'),
          Issue.countDocuments({ project: project._id, status: { $in: ['Open', 'In Progress'] } }),
        ]);

        const totalTasks = tasks.length;
        const doneTasks = tasks.filter((t) => t.status === 'Done').length;
        const projObj = project.toJSON();

        projObj.completionPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
        projObj.taskCount = totalTasks;
        projObj.doneTaskCount = doneTasks;
        projObj.activeBugsCount = activeBugs;
        projObj.teamCount = (project.team?.length || 0) + (project.interns?.length || 0);
        projObj.latestVersion = project.currentVersion || (project.deployments?.[project.deployments.length - 1]?.version) || 'v1.0.0';
        projObj.releaseCadence = project.releaseCadence || 'Bi-weekly Sprint';
        projObj.targetChannel = project.targetChannel || 'Production';

        // Never expose raw encryptedValue or authTag in project listing
        delete projObj.credentials;

        return projObj;
      })
    );

    sendPaginated(res, enriched, {
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

// ─── GET PROJECT BY ID ───────────────────────────────────────────────────────
export const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter })
      .populate('manager', 'name avatar designation email phone')
      .populate('hrManager', 'name avatar designation email')
      .populate('department', 'name code')
      .populate({
        path: 'team.user',
        select: 'name designation department avatar email phone employmentType',
        match: { deletedAt: { $exists: false } },
        populate: { path: 'department', select: 'name code' },
      })
      .populate({
        path: 'interns.user',
        select: 'name college avatar domain employmentType email designation department',
        match: { deletedAt: { $exists: false } },
        populate: { path: 'department', select: 'name code' },
      })
      .populate('deployments.deployedBy', 'name avatar')
      .populate('credentials.updatedBy', 'name avatar');

    if (!project) return sendError(res, 'Project not found', 404);

    project.team = (project.team || []).filter((t) => t.user);
    project.interns = (project.interns || []).filter((i) => i.user);

    const [tasks, bugs] = await Promise.all([
      Task.find({ project: project._id }),
      Issue.find({ project: project._id }),
    ]);

    const now = new Date();
    const taskStats = tasks.reduce(
      (acc, curr) => {
        acc.total++;
        if (curr.status === 'Todo') acc.todo++;
        else if (curr.status === 'In Progress') acc.inProgress++;
        else if (curr.status === 'In Review') acc.inReview++;
        else if (curr.status === 'Done') acc.done++;
        else if (curr.status === 'Blocked') acc.blocked++;

        if (curr.dueDate && curr.dueDate < now && curr.status !== 'Done') acc.overdue++;
        return acc;
      },
      { total: 0, todo: 0, inProgress: 0, inReview: 0, done: 0, blocked: 0, overdue: 0 }
    );

    const bugStats = bugs.reduce(
      (acc, curr) => {
        acc.total++;
        if (curr.status === 'Open') acc.open++;
        else if (curr.status === 'In Progress') acc.inProgress++;
        else if (curr.status === 'Resolved' || curr.status === 'Closed') acc.resolved++;
        if (curr.severity === 'Critical' && curr.status !== 'Resolved' && curr.status !== 'Closed') acc.criticalOpen++;
        return acc;
      },
      { total: 0, open: 0, inProgress: 0, resolved: 0, criticalOpen: 0 }
    );

    const timeline = {
      totalDays: project.endDate && project.startDate
        ? Math.max(1, Math.ceil((new Date(project.endDate) - new Date(project.startDate)) / (1000 * 60 * 60 * 24)))
        : 0,
      elapsed: project.startDate
        ? Math.max(0, Math.ceil((now - new Date(project.startDate)) / (1000 * 60 * 60 * 24)))
        : 0,
      remaining: project.endDate
        ? Math.max(0, Math.ceil((new Date(project.endDate) - now) / (1000 * 60 * 60 * 24)))
        : 0,
    };

    let health = project.healthStatus || 'On Track';
    const utilization = project.budget ? Math.round((project.budgetSpent / project.budget) * 100) : 0;
    if (taskStats.overdue > 3 || utilization > 90 || bugStats.criticalOpen > 2) health = 'Delayed';
    else if (taskStats.overdue > 1 || utilization > 75 || bugStats.criticalOpen > 0) health = 'At Risk';

    const projObj = project.toJSON();
    projObj.tasks = taskStats;
    projObj.bugs = bugStats;
    projObj.budget = {
      allocated: project.budget || 0,
      spent: project.budgetSpent || 0,
      utilizationPercent: utilization,
    };
    projObj.timeline = timeline;
    projObj.healthStatus = health;
    projObj.completionPercent = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0;
    projObj.latestVersion = project.currentVersion || (project.deployments?.[0]?.version) || 'v1.0.0';
    projObj.currentVersion = project.currentVersion || (project.deployments?.[0]?.version) || 'v1.0.0';
    projObj.releaseCadence = project.releaseCadence || 'Bi-weekly Sprint';
    projObj.targetChannel = project.targetChannel || 'Production';
    projObj.releaseNotes = project.releaseNotes || '';

    // ── SECRETS VAULT: Zero Plaintext Policy ─────────────────────────────────
    // Return masked credential placeholders only. Ciphertext and plaintext
    // are strictly omitted from general payload.
    projObj.credentials = (project.credentials || []).map((c) => ({
      _id: c._id,
      key: c.key,
      env: c.env,
      description: c.description || '',
      isMasked: true,
      maskedValue: '••••••••••••••••',
      updatedAt: c.updatedAt,
      updatedBy: c.updatedBy,
    }));

    sendSuccess(res, projObj);
  } catch (error) {
    next(error);
  }
};

// ─── CREATE PROJECT ──────────────────────────────────────────────────────────
export const createProject = async (req, res, next) => {
  try {
    const {
      name,
      description,
      department,
      priority = 'Medium',
      startDate,
      endDate,
      tags = [],
      milestones = [],
      hrRepId,
      techStack = [],
      repositoryUrl,
      cicdUrl,
      documentationUrl,
      architectureNotes,
      initialVersion,
      currentVersion,
      releaseCadence,
      targetChannel,
      releaseNotes,
    } = req.body;

    if (!name || !name.trim()) return sendError(res, 'Project name is required', 400);

    // ── Robust Department Resolution (Accepts ObjectId, department name or code) ──
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
    if (!departmentId) {
      const defaultDept = await Department.findOne({});
      if (defaultDept) departmentId = defaultDept._id;
    }

    const year = new Date().getFullYear();
    const count = await Project.countDocuments({ code: new RegExp(`^PRJ-${year}`) });
    const code = `PRJ-${year}-${String(count + 1).padStart(3, '0')}`;

    // Build initial team with PMO Lead (100% allocation)
    const initialTeam = [{
      user: req.user._id,
      role: 'PMO Lead',
      allocationPercentage: 100,
      addedAt: new Date(),
    }];

    let hrUser = null;
    if (hrRepId && mongoose.Types.ObjectId.isValid(hrRepId)) {
      hrUser = await User.findById(hrRepId);
      if (hrUser && hrUser.status === 'Active') {
        initialTeam.push({
          user: hrUser._id,
          role: 'HR Representative',
          allocationPercentage: 25,
          addedAt: new Date(),
        });
      }
    }

    const versionTag = (currentVersion || initialVersion || 'v1.0.0').trim();
    const activeChannel = (targetChannel || 'Production').trim();
    const cadence = (releaseCadence || 'Bi-weekly Sprint').trim();

    // Initial deployment / release record
    const initialDeployments = [{
      environment: activeChannel,
      url: repositoryUrl ? repositoryUrl.trim() : '',
      status: 'Live',
      version: versionTag,
      previousVersion: 'None (Initial Baseline)',
      durationSeconds: 42,
      deployedAt: new Date(),
      deployedBy: req.user._id,
    }];

    const project = await Project.create({
      code,
      name: name.trim(),
      description: description ? description.trim() : '',
      department: departmentId || undefined,
      priority,
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 90 * 86400000),
      budget: 0,
      tags,
      milestones,
      manager: req.user._id,
      team: initialTeam,
      techStack: Array.isArray(techStack) ? techStack : [],
      repositoryUrl: repositoryUrl ? repositoryUrl.trim() : '',
      cicdUrl: cicdUrl || '',
      documentationUrl: documentationUrl || '',
      architectureNotes: architectureNotes || '',
      currentVersion: versionTag,
      releaseCadence: cadence,
      targetChannel: activeChannel,
      releaseNotes: releaseNotes ? releaseNotes.trim() : `Initial ${versionTag} release baseline.`,
      deployments: initialDeployments,
      credentials: [],
    });

    if (hrUser) {
      hrUser.project = project._id;
      hrUser.manager = req.user._id;
      await hrUser.save({ validateBeforeSave: false });

      await sendNotification({
        recipient: hrUser._id,
        type: 'project_assigned',
        title: 'New Project Assignment',
        message: `You've been assigned as HR Representative for ${name} by ${req.user.name}.`,
        link: '/hr/projects',
        sender: req.user._id,
      });

      try {
        await sendProjectAssignmentEmail({
          to: hrUser.email,
          employeeName: hrUser.name,
          projectName: name,
          projectCode: code,
          role: 'HR Representative',
          pmoName: req.user.name,
          hrName: null,
          loginUrl: process.env.APP_URL,
        });
      } catch (_) {}
    }

    // Write to AuditLog & Activity Stream
    await logProjectAudit(req, {
      action: 'CreateProject',
      resourceId: project._id,
      details: `Project "${name}" (${code}) provisioned by ${req.user.name}`,
    });

    await recordActivity({
      projectId: project._id,
      req,
      action: 'created_milestone',
      title: `Project ${name} (${code}) provisioned in workspace`,
      details: `Version ${versionTag} (${activeChannel}) baseline established. PMO Lead: ${req.user.name}`,
    });

    // Auto-provision dedicated project chat channel & enroll initial team
    try {
      await provisionProjectChannel(project, initialTeam, req.user._id);
    } catch (chatErr) {
      console.error('Failed to auto-provision project chat channel:', chatErr);
    }

    sendSuccess(res, project, 'Project created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE PROJECT ──────────────────────────────────────────────────────────
export const updateProject = async (req, res, next) => {
  try {
    const {
      name,
      description,
      department,
      status,
      priority,
      startDate,
      endDate,
      budget,
      tags,
      healthStatus,
      milestones,
      hrManager,
      techStack,
      repositoryUrl,
      cicdUrl,
      documentationUrl,
      architectureNotes,
      currentVersion,
      releaseCadence,
      targetChannel,
      releaseNotes,
    } = req.body;

    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    const oldStatus = project.status;

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (department && mongoose.Types.ObjectId.isValid(department)) project.department = department;
    if (status) project.status = status;
    if (priority) project.priority = priority;
    if (startDate) project.startDate = startDate;
    if (endDate) project.endDate = endDate;
    if (budget !== undefined) project.budget = Number(budget);
    if (tags) project.tags = tags;
    if (healthStatus) project.healthStatus = healthStatus;
    if (milestones) project.milestones = milestones;
    if (hrManager) project.hrManager = hrManager;
    if (techStack) project.techStack = techStack;
    if (repositoryUrl !== undefined) project.repositoryUrl = repositoryUrl;
    if (cicdUrl !== undefined) project.cicdUrl = cicdUrl;
    if (documentationUrl !== undefined) project.documentationUrl = documentationUrl;
    if (architectureNotes !== undefined) project.architectureNotes = architectureNotes;
    if (currentVersion) project.currentVersion = currentVersion;
    if (releaseCadence) project.releaseCadence = releaseCadence;
    if (targetChannel) project.targetChannel = targetChannel;
    if (releaseNotes !== undefined) project.releaseNotes = releaseNotes;

    await project.save();

    await logProjectAudit(req, {
      action: 'UpdateProject',
      resourceId: project._id,
      details: `Project "${project.name}" updated by ${req.user.name}`,
    });

    sendSuccess(res, project, 'Project updated successfully');
  } catch (error) {
    next(error);
  }
};

// ─── CHANGE PROJECT LEAD ──────────────────────────────────────────────────────
// PATCH /api/pmo/projects/:id/lead
// Body: { newManagerId: string, handoverNotes?: string }
export const changeProjectLead = async (req, res, next) => {
  try {
    const { newManagerId, handoverNotes } = req.body;

    if (!newManagerId || !mongoose.Types.ObjectId.isValid(newManagerId)) {
      return sendError(res, 'Valid newManagerId is required', 400);
    }

    const [project, newManager] = await Promise.all([
      Project.findOne({ _id: req.params.id, ...req.projectFilter }).populate('manager', 'name email designation avatar'),
      User.findById(newManagerId).select('name email designation avatar status'),
    ]);

    if (!project) return sendError(res, 'Project not found', 404);
    if (!newManager) return sendError(res, 'New project lead not found', 404);
    if (newManager.status && newManager.status.toLowerCase() !== 'active') {
      return sendError(res, 'Cannot assign lead to an inactive user', 400);
    }

    const previousManager = project.manager;
    const previousManagerName = previousManager?.name || 'Unassigned';

    // Update project manager
    project.manager = newManagerId;
    await project.save();

    // Ensure new lead is on the project team roster
    const isAlreadyOnTeam = project.team.some(
      (t) => (t.user?._id || t.user).toString() === newManagerId.toString()
    );
    if (!isAlreadyOnTeam) {
      project.team.push({
        user: newManagerId,
        role: 'Project Lead',
        allocationPercentage: 100,
        addedAt: new Date(),
      });
      await project.save();
    } else {
      // Update their role to reflect lead status
      const idx = project.team.findIndex(
        (t) => (t.user?._id || t.user).toString() === newManagerId.toString()
      );
      if (idx >= 0) project.team[idx].role = 'Project Lead';
      await project.save();
    }

    // Update user's project reference
    await User.findByIdAndUpdate(newManagerId, { project: project._id, manager: null });

    // Audit log
    await logProjectAudit(req, {
      action: 'ChangeProjectLead',
      resourceId: project._id,
      details: `Project lead changed from "${previousManagerName}" to "${newManager.name}" by ${req.user.name}. ${handoverNotes ? 'Handover: ' + handoverNotes : ''}`,
    });

    // Activity feed
    await recordActivity({
      projectId: project._id,
      req,
      action: 'lead_changed',
      title: `${req.user.name} transferred project leadership to ${newManager.name}`,
      details: `Previous lead: ${previousManagerName} → New lead: ${newManager.name} (${newManager.designation || 'Project Lead'})${handoverNotes ? '. Handover notes: ' + handoverNotes : ''}`,
    });

    // Notify new project lead
    await sendNotification({
      recipient: newManagerId,
      type: 'project_lead_assigned',
      title: '🏆 You are now Project Lead',
      message: `You have been designated as the new Project Lead for "${project.name}" (${project.code}) by ${req.user.name}.${handoverNotes ? ' Handover notes: ' + handoverNotes : ''}`,
      link: '/pmo/projects',
      sender: req.user._id,
    });

    // Notify previous lead (if exists and different from requester)
    if (previousManager && previousManager._id?.toString() !== req.user._id?.toString()) {
      await sendNotification({
        recipient: previousManager._id,
        type: 'project_lead_removed',
        title: 'Project Leadership Transferred',
        message: `Your lead role on "${project.name}" has been transferred to ${newManager.name} by ${req.user.name}.`,
        link: '/pmo/projects',
        sender: req.user._id,
      });
    }

    await project.populate([
      { path: 'manager', select: 'name avatar designation email' },
      { path: 'team.user', select: 'name avatar designation email department' },
    ]);

    sendSuccess(res, project, `Project lead successfully transferred to ${newManager.name}`);
  } catch (error) {
    next(error);
  }
};

// ─── DELETE PROJECT ──────────────────────────────────────────────────────────
export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    await Task.deleteMany({ project: project._id });
    await Issue.deleteMany({ project: project._id });
    await ProjectActivity.deleteMany({ project: project._id });
    await User.updateMany({ project: project._id }, { $unset: { project: 1, manager: 1, hrManager: 1 } });
    await Project.deleteOne({ _id: project._id });

    await logProjectAudit(req, {
      action: 'DeleteProject',
      resourceId: project._id,
      details: `Project "${project.name}" (${project.code}) deleted by ${req.user.name}`,
    });

    sendSuccess(res, null, 'Project deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ─── TEAM: ADD MEMBERS WITH ALLOCATION % ─────────────────────────────────────
export const addTeamMembers = async (req, res, next) => {
  try {
    const { members } = req.body; // [{ userId, role, allocationPercentage }]

    if (!Array.isArray(members) || members.length === 0) {
      return sendError(res, 'Members list is required', 400);
    }

    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    for (const member of members) {
      if (!member.userId) continue;

      const user = await User.findById(member.userId);
      if (!user) continue;

      // Case-insensitive status check
      if (user.status && user.status.toLowerCase() !== 'active') continue;

      const alloc = Math.min(100, Math.max(0, Number(member.allocationPercentage) ?? 100));
      const targetRole = (member.role && member.role.toString().trim().length > 0)
        ? member.role.toString().trim()
        : (user.designation || 'Contributor');

      const existingIndex = project.team.findIndex(
        (t) => (t.user?._id || t.user).toString() === member.userId.toString()
      );

      if (existingIndex >= 0) {
        // Update existing member on team roster
        project.team[existingIndex].role = targetRole;
        project.team[existingIndex].allocationPercentage = alloc;

        await logProjectAudit(req, {
          action: 'UpdateTeamMember',
          module: 'ProjectTeam',
          resourceId: project._id,
          details: `Updated ${user.name} on ${project.name} to ${targetRole} (${alloc}% capacity)`,
        });

        await recordActivity({
          projectId: project._id,
          req,
          action: 'updated_member',
          title: `${req.user.name} updated ${user.name}'s capacity allocation`,
          details: `Role: ${targetRole} • Dedicated capacity: ${alloc}%`,
        });
      } else {
        // Add new member to team roster
        project.team.push({
          user: member.userId,
          role: targetRole,
          allocationPercentage: alloc,
          addedAt: new Date(),
        });

        user.project = project._id;
        user.manager = req.user._id;
        await user.save({ validateBeforeSave: false });

        await logProjectAudit(req, {
          action: 'AddTeamMember',
          module: 'ProjectTeam',
          resourceId: project._id,
          details: `Added ${user.name} to ${project.name} as ${targetRole} (${alloc}% capacity)`,
        });

        await recordActivity({
          projectId: project._id,
          req,
          action: 'added_member',
          title: `${req.user.name} added ${user.name} to team roster`,
          details: `Assigned role: ${targetRole} with ${alloc}% dedicated capacity.`,
        });

        await sendNotification({
          recipient: member.userId,
          type: 'project_assigned',
          title: 'New Project Assignment',
          message: `You've been added to ${project.name} as ${targetRole} by ${req.user.name}.`,
          link: '/employee/projects',
          sender: req.user._id,
        });
      }
    }

    await project.save();

    // Auto-sync team members to dedicated project chat channel
    try {
      await syncProjectTeamMembers({
        projectId: project._id,
        addedMembers: members,
        performedBy: req.user,
      });
    } catch (syncErr) {
      console.error('Failed to sync team members to chat channel:', syncErr);
    }

    await project.populate([
      {
        path: 'team.user',
        select: 'name designation avatar department email phone',
        populate: { path: 'department', select: 'name code' },
      },
    ]);

    sendSuccess(res, project.team, 'Team updated successfully');
  } catch (error) {
    next(error);
  }
};

// ─── TEAM: REMOVE MEMBER ─────────────────────────────────────────────────────
export const removeTeamMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    const userToRemove = await User.findById(userId);

    const initialLen = project.team.length;
    project.team = project.team.filter(
      (t) => (t.user?._id || t.user).toString() !== userId.toString()
    );

    if (project.team.length !== initialLen) {
      await project.save();

      // Only unset project reference if user was mapped to this project
      await User.findOneAndUpdate(
        { _id: userId, project: project._id },
        { $unset: { project: 1 } }
      );

      await logProjectAudit(req, {
        action: 'RemoveTeamMember',
        module: 'ProjectTeam',
        resourceId: project._id,
        details: `Removed ${userToRemove?.name || userId} from ${project.name}`,
      });

      await recordActivity({
        projectId: project._id,
        req,
        action: 'removed_member',
        title: `${req.user.name} removed ${userToRemove?.name || 'member'} from team`,
        details: 'Released personnel back to enterprise bench pool.',
      });

      // Auto-sync removal to dedicated project chat channel
      try {
        await syncProjectTeamMembers({
          projectId: project._id,
          removedUserIds: [userId],
          performedBy: req.user,
        });
      } catch (syncErr) {
        console.error('Failed to sync member removal to chat channel:', syncErr);
      }
    }

    sendSuccess(res, null, 'User removed from project team');
  } catch (error) {
    next(error);
  }
};

// ─── INTERNS: ASSIGN ─────────────────────────────────────────────────────────
export const assignInterns = async (req, res, next) => {
  try {
    const { internIds } = req.body;
    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    for (const internId of (internIds || [])) {
      const intern = await User.findOne({ _id: internId, employmentType: 'Intern' });
      if (!intern) continue;

      const exists = project.interns.find(
        (i) => (i.user?._id || i.user).toString() === internId.toString()
      );
      if (!exists) {
        project.interns.push({ user: internId, addedAt: new Date() });
        intern.project = project._id;
        intern.manager = req.user._id;
        await intern.save({ validateBeforeSave: false });

        await recordActivity({
          projectId: project._id,
          req,
          action: 'added_member',
          title: `${req.user.name} assigned intern ${intern.name} to project`,
          details: `Domain: ${intern.domain || 'Engineering'}`,
        });
      }
    }

    await project.save();
    await project.populate('interns.user', 'name college avatar domain employmentType email');

    sendSuccess(res, project.interns, 'Interns assigned successfully');
  } catch (error) {
    next(error);
  }
};

// ─── MILESTONES: ADD WITH BLOCKED-BY ──────────────────────────────────────────
export const addMilestone = async (req, res, next) => {
  try {
    const { name, date, deliverable, blockedBy } = req.body;
    if (!name) return sendError(res, 'Milestone name is required', 400);

    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    project.milestones.push({
      name,
      date: date ? new Date(date) : new Date(),
      status: 'upcoming',
      deliverable: deliverable || '',
      blockedBy: Array.isArray(blockedBy) ? blockedBy : [],
    });

    await project.save();

    await logProjectAudit(req, {
      action: 'CreateMilestone',
      module: 'ProjectMilestones',
      resourceId: project._id,
      details: `Milestone "${name}" added to project ${project.name}`,
    });

    await recordActivity({
      projectId: project._id,
      req,
      action: 'created_milestone',
      title: `${req.user.name} created milestone: "${name}"`,
      details: deliverable ? `Deliverable: ${deliverable}` : '',
    });

    sendSuccess(res, project.milestones, 'Milestone added successfully');
  } catch (error) {
    next(error);
  }
};

// ─── MILESTONES: UPDATE ──────────────────────────────────────────────────────
export const updateMilestone = async (req, res, next) => {
  try {
    const { milestoneId } = req.params;
    const { status, name, date, deliverable, blockedBy } = req.body;

    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    const milestone = project.milestones.id(milestoneId);
    if (!milestone) return sendError(res, 'Milestone not found', 404);

    if (name) milestone.name = name;
    if (date) milestone.date = new Date(date);
    if (deliverable !== undefined) milestone.deliverable = deliverable;
    if (blockedBy !== undefined) milestone.blockedBy = blockedBy;

    if (status && status !== milestone.status) {
      milestone.status = status;
      if (status === 'completed') {
        await recordActivity({
          projectId: project._id,
          req,
          action: 'updated_milestone',
          title: `Milestone reached: "${milestone.name}" 🎉`,
          details: `Marked completed by ${req.user.name}`,
        });
      }
    }

    await project.save();
    sendSuccess(res, project.milestones, 'Milestone updated successfully');
  } catch (error) {
    next(error);
  }
};

// ─── DEPLOYMENTS: RECORD (APPEND-ONLY HISTORY) ───────────────────────────────
export const recordDeployment = async (req, res, next) => {
  try {
    const {
      environment = 'Staging',
      url,
      status = 'Live',
      version,
      previousVersion,
      durationSeconds = 0,
      pipelineRunUrl,
    } = req.body;

    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    const newDeployment = {
      environment,
      url: url || '',
      status,
      version: version || 'v1.0.0',
      previousVersion: previousVersion || '',
      durationSeconds: Number(durationSeconds) || 0,
      pipelineRunUrl: pipelineRunUrl || '',
      deployedAt: new Date(),
      deployedBy: req.user._id,
    };

    project.deployments.unshift(newDeployment);
    // Maintain up to 25 historical deployments per project
    if (project.deployments.length > 25) {
      project.deployments = project.deployments.slice(0, 25);
    }

    if (status === 'Live' && version) {
      project.currentVersion = version.trim();
      project.targetChannel = environment;
    }

    await project.save();

    await logProjectAudit(req, {
      action: 'RecordDeployment',
      module: 'ProjectDeployments',
      resourceId: project._id,
      details: `${req.user.name} deployed ${version || 'build'} to ${environment} (${status})`,
    });

    await recordActivity({
      projectId: project._id,
      req,
      action: 'deployed',
      title: `${req.user.name} deployed release ${version || 'v1.0.0'} to ${environment}`,
      details: `Status: ${status} • Pipeline: ${pipelineRunUrl || 'Manual'}${durationSeconds ? ` • Duration: ${durationSeconds}s` : ''}`,
    });

    sendSuccess(res, project.deployments, 'Deployment recorded successfully', 201);
  } catch (error) {
    next(error);
  }
};

// ─── VAULT: ADD ENCRYPTED CREDENTIAL (SINGLE OR BATCH IMPORT) ───────────────
export const addCredential = async (req, res, next) => {
  try {
    // Clearance check: Only admin, super-admin, or project manager can store secrets
    const isAuthorized = ['super-admin', 'admin'].includes(req.user.role?.slug) ||
      (req.user.role?.slug === 'pmo-lead');

    if (!isAuthorized) {
      return sendError(res, 'Insufficient clearance: Only Administrators & PMO Leads can manage project vault secrets', 403);
    }

    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    // Support both single credential and array of credentials (bulk .env import)
    const items = Array.isArray(req.body.secrets)
      ? req.body.secrets
      : Array.isArray(req.body)
        ? req.body
        : [req.body];

    if (!items.length) {
      return sendError(res, 'At least one secret key and value are required', 400);
    }

    const added = [];
    for (const item of items) {
      const { key, env = 'Staging', value, description } = item;
      if (!key || value === undefined || value === null) continue;

      const trimmedKey = key.toString().trim().toUpperCase();
      const trimmedVal = value.toString().trim();
      if (!trimmedKey || !trimmedVal) continue;

      // Encrypt at rest via AES-256-GCM
      const encrypted = encryptSecret(trimmedVal);

      // Check if key already exists in project credentials for this env (upsert)
      const existingIdx = project.credentials.findIndex(
        (c) => c.key.toUpperCase() === trimmedKey && c.env === env
      );

      const credObj = {
        key: trimmedKey,
        env,
        encryptedValue: encrypted.encryptedValue,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyVersion: encrypted.keyVersion,
        description: description ? description.toString().trim() : '',
        updatedAt: new Date(),
        updatedBy: req.user._id,
      };

      if (existingIdx >= 0) {
        project.credentials[existingIdx] = {
          ...project.credentials[existingIdx].toObject(),
          ...credObj,
        };
        added.push(project.credentials[existingIdx]);
      } else {
        project.credentials.push(credObj);
        added.push(project.credentials[project.credentials.length - 1]);
      }
    }

    if (!added.length) {
      return sendError(res, 'No valid key-value pairs provided', 400);
    }

    await project.save();

    await logProjectAudit(req, {
      action: 'AddSecret',
      module: 'ProjectVault',
      resourceId: project._id,
      details: `${added.length} secret(s) stored in project vault by ${req.user.name}`,
    });

    await recordActivity({
      projectId: project._id,
      req,
      action: 'added_secret',
      title: `${req.user.name} stored ${added.length} secret(s) in vault`,
      details: `Keys: ${added.map((a) => a.key).slice(0, 3).join(', ')}${added.length > 3 ? ` +${added.length - 3} more` : ''}`,
    });

    // Return masked representation
    const response = added.map((created) => ({
      _id: created._id,
      key: created.key,
      env: created.env,
      description: created.description,
      isMasked: true,
      maskedValue: '••••••••••••••••',
      updatedAt: created.updatedAt,
    }));

    sendSuccess(
      res,
      response.length === 1 ? response[0] : response,
      `${added.length} secret(s) encrypted and saved to vault`,
      201
    );
  } catch (error) {
    next(error);
  }
};

// ─── VAULT: REVEAL ENCRYPTED CREDENTIAL (STRICT AUDITED RBAC) ────────────────
export const revealCredential = async (req, res, next) => {
  try {
    const isAuthorized = ['super-admin', 'admin'].includes(req.user.role?.slug);
    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    const isProjectManager = project.manager?.toString() === req.user._id?.toString();

    // Deny by default: only Corporate Admin or this Project's Lead Manager can decrypt
    if (!isAuthorized && !isProjectManager) {
      await logProjectAudit(req, {
        action: 'RevealSecretDenied',
        module: 'ProjectVault',
        resourceId: project._id,
        details: `Unauthorized attempt to reveal secret in ${project.name} by ${req.user.name}`,
        result: 'WARNING',
        errorMessage: 'Access Denied: Insufficient security clearance',
      });
      return sendError(res, 'Security Clearance Required: Restricted to Workspace Administrators and Project Managers', 403);
    }

    const credential = project.credentials.id(req.params.credId);
    if (!credential) return sendError(res, 'Credential not found in vault', 404);

    // Decrypt AES-256-GCM
    const plaintext = decryptSecret({
      encryptedValue: credential.encryptedValue,
      iv: credential.iv,
      authTag: credential.authTag,
    });

    // Immutable compliance audit trail
    await logProjectAudit(req, {
      action: 'RevealSecret',
      module: 'ProjectVault',
      resourceId: project._id,
      details: `Personnel ${req.user.name} revealed encrypted vault key "${credential.key}" (${credential.env}) for project ${project.code}`,
    });

    await recordActivity({
      projectId: project._id,
      req,
      action: 'revealed_secret',
      title: `${req.user.name} accessed vault secret "${credential.key}"`,
      details: 'Audit log entry recorded for security governance compliance.',
    });

    sendSuccess(res, {
      key: credential.key,
      env: credential.env,
      plaintext,
    }, 'Secret revealed and logged to audit trail');
  } catch (error) {
    next(error);
  }
};

// ─── VAULT: DELETE CREDENTIAL ────────────────────────────────────────────────
export const deleteCredential = async (req, res, next) => {
  try {
    const isAuthorized = ['super-admin', 'admin'].includes(req.user.role?.slug);
    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    const isProjectManager = project.manager?.toString() === req.user._id?.toString();
    if (!isAuthorized && !isProjectManager) {
      return sendError(res, 'Insufficient clearance to delete vault secrets', 403);
    }

    const credential = project.credentials.id(req.params.credId);
    if (!credential) return sendError(res, 'Credential not found in vault', 404);

    const keyName = credential.key;
    project.credentials.pull(req.params.credId);
    await project.save();

    await logProjectAudit(req, {
      action: 'DeleteSecret',
      module: 'ProjectVault',
      resourceId: project._id,
      details: `Secret "${keyName}" deleted from vault by ${req.user.name}`,
    });

    sendSuccess(res, null, 'Secret removed from project vault');
  } catch (error) {
    next(error);
  }
};

// ─── BUGS: GET PROJECT BUGS (WITH SLA AGING & SOLVER FORENSICS) ──────────────
export const getProjectBugs = async (req, res, next) => {
  try {
    const bugs = await Issue.find({ project: req.params.id })
      .populate('createdBy', 'name avatar designation')
      .populate('resolvedBy', 'name avatar designation')
      .populate('blockedBy', 'ticketId title severity status')
      .populate('comments.author', 'name avatar')
      .sort({ createdAt: -1 });

    const now = new Date();

    const enriched = bugs.map((b) => {
      const bugObj = b.toJSON();
      const createdTime = new Date(b.createdAt);
      const ageHours = Math.max(0, Math.round((now - createdTime) / (1000 * 60 * 60)));
      const ageDays = Math.max(0, Math.round(ageHours / 24));

      const isResolved = b.status === 'Resolved' || b.status === 'Closed';
      const isOverdue = !isResolved && (
        (b.severity === 'Blocker' && ageHours > 12) ||
        (b.severity === 'Critical' && ageHours > 24) ||
        (b.severity === 'Major' && ageHours > 48) ||
        (b.severity === 'High' && ageHours > 48) ||
        (b.severity === 'Medium' && ageHours > 120) ||
        (b.severity === 'Minor' && ageHours > 168)
      );

      bugObj.ageHours = ageHours;
      bugObj.ageDays = ageDays;
      bugObj.isOverdue = isOverdue;

      return bugObj;
    });

    sendSuccess(res, enriched);
  } catch (error) {
    next(error);
  }
};

// ─── BUGS: REPORT NEW BUG ────────────────────────────────────────────────────
export const createProjectBug = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category = 'Defect',
      severity = 'Medium',
      priority,
      environment = 'Production',
      module = 'General',
      stepsToReproduce = '',
      expectedBehavior = '',
      actualBehavior = '',
      attachments = [],
      blockedBy = [],
    } = req.body;
    if (!title) return sendError(res, 'Bug title is required', 400);

    const project = await Project.findOne({ _id: req.params.id, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    const year = new Date().getFullYear();
    const count = await Issue.countDocuments();
    const ticketId = `BUG-${year}-${String(count + 1).padStart(3, '0')}`;

    // Normalize priority if not provided
    let finalPriority = priority;
    if (!finalPriority) {
      if (severity === 'Blocker') finalPriority = 'P0';
      else if (severity === 'Critical') finalPriority = 'P0';
      else if (severity === 'Major') finalPriority = 'P1';
      else if (severity === 'High') finalPriority = 'P1';
      else if (severity === 'Medium') finalPriority = 'P2';
      else if (severity === 'Minor') finalPriority = 'P2';
      else if (severity === 'Trivial') finalPriority = 'P3';
      else finalPriority = 'Medium';
    }

    // Normalize attachments (support array of URL strings or attachment objects)
    const normalizedAttachments = Array.isArray(attachments)
      ? attachments.map((item) => {
          if (typeof item === 'string') {
            const fileName = item.split('/').pop() || 'attachment.png';
            return {
              url: item,
              name: fileName,
              fileType: fileName.endsWith('.png') ? 'image/png' : fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg' : 'application/octet-stream',
              sizeBytes: 0,
            };
          }
          if (item && item.url) {
            return {
              url: item.url,
              name: item.name || 'attachment.png',
              fileType: item.fileType || 'image/png',
              sizeBytes: item.sizeBytes || 0,
            };
          }
          return null;
        }).filter(Boolean)
      : [];

    const bug = await Issue.create({
      ticketId,
      project: project._id,
      title: title.trim(),
      category: category.trim(),
      severity,
      priority: finalPriority,
      environment: environment.trim(),
      module: module.trim(),
      stepsToReproduce: stepsToReproduce.trim(),
      expectedBehavior: expectedBehavior.trim(),
      actualBehavior: actualBehavior.trim(),
      attachments: normalizedAttachments,
      description: description || stepsToReproduce || 'No detailed reproduction steps provided.',
      status: 'Open',
      createdBy: req.user._id,
      creatorRole: req.user.role?.name || 'Engineer',
      blockedBy: Array.isArray(blockedBy) ? blockedBy : [],
      comments: [],
    });

    await logProjectAudit(req, {
      action: 'CreateBug',
      module: 'ProjectBugs',
      resourceId: project._id,
      details: `${req.user.name} reported ${severity} bug ${ticketId}: "${title}"`,
    });

    await recordActivity({
      projectId: project._id,
      req,
      action: 'reported_bug',
      title: `${req.user.name} logged ${severity} bug: ${ticketId}`,
      details: title,
    });

    const populated = await Issue.findById(bug._id)
      .populate('createdBy', 'name avatar designation')
      .populate('blockedBy', 'ticketId title severity status');

    sendSuccess(res, populated, 'Bug ticket created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// ─── BUGS: RESOLVE (RECORD SOLVER, COMMIT HASH, PR & NOTES) ─────────────────
export const resolveProjectBug = async (req, res, next) => {
  try {
    const { resolutionNotes, fixCommitHash, fixBranch, fixPrUrl } = req.body;

    const bug = await Issue.findOne({ _id: req.params.bugId, project: req.params.id });
    if (!bug) return sendError(res, 'Bug ticket not found', 404);

    bug.status = 'Resolved';
    bug.resolvedBy = req.user._id;
    bug.resolvedAt = new Date();
    bug.resolutionNotes = resolutionNotes || 'Resolved and verified by engineer.';
    if (fixCommitHash) bug.fixCommitHash = fixCommitHash.trim();
    if (fixBranch) bug.fixBranch = fixBranch.trim();
    if (fixPrUrl) bug.fixPrUrl = fixPrUrl.trim();

    await bug.save();

    await logProjectAudit(req, {
      action: 'ResolveBug',
      module: 'ProjectBugs',
      resourceId: bug.project,
      details: `${req.user.name} resolved bug ${bug.ticketId} (Commit: ${fixCommitHash || 'N/A'})`,
    });

    await recordActivity({
      projectId: bug.project,
      req,
      action: 'resolved_bug',
      title: `${req.user.name} solved bug ${bug.ticketId}: "${bug.title}"`,
      details: `Resolution: ${bug.resolutionNotes}${fixCommitHash ? ` • Commit: ${fixCommitHash}` : ''}${fixBranch ? ` • Branch: ${fixBranch}` : ''}`,
    });

    const populated = await Issue.findById(bug._id)
      .populate('createdBy', 'name avatar designation')
      .populate('resolvedBy', 'name avatar designation')
      .populate('blockedBy', 'ticketId title severity status');

    sendSuccess(res, populated, 'Bug marked as resolved with solver forensics');
  } catch (error) {
    next(error);
  }
};

// ─── BUGS: REOPEN ────────────────────────────────────────────────────────────
export const reopenProjectBug = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const bug = await Issue.findOne({ _id: req.params.bugId, project: req.params.id });
    if (!bug) return sendError(res, 'Bug ticket not found', 404);

    bug.status = 'Open';
    bug.reopenedCount = (bug.reopenedCount || 0) + 1;
    bug.reopenedHistory.push({
      reopenedAt: new Date(),
      reopenedBy: req.user._id,
      reason: reason || 'Defect recurred during verification.',
    });

    await bug.save();

    await logProjectAudit(req, {
      action: 'ReopenBug',
      module: 'ProjectBugs',
      resourceId: bug.project,
      details: `${req.user.name} reopened bug ${bug.ticketId} (Reopen #${bug.reopenedCount})`,
    });

    await recordActivity({
      projectId: bug.project,
      req,
      action: 'reopened_bug',
      title: `${req.user.name} reopened bug ${bug.ticketId}`,
      details: reason || 'Defect persisted in testing cycle.',
    });

    const populated = await Issue.findById(bug._id)
      .populate('createdBy', 'name avatar designation')
      .populate('resolvedBy', 'name avatar designation')
      .populate('blockedBy', 'ticketId title severity status');

    sendSuccess(res, populated, 'Bug ticket reopened');
  } catch (error) {
    next(error);
  }
};

// ─── BUGS: ADD COMMENT ───────────────────────────────────────────────────────
export const addProjectBugComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return sendError(res, 'Comment text is required', 400);

    const bug = await Issue.findOne({ _id: req.params.bugId, project: req.params.id });
    if (!bug) return sendError(res, 'Bug ticket not found', 404);

    bug.comments.push({
      author: req.user._id,
      authorName: req.user.name,
      text: text.trim(),
      createdAt: new Date(),
    });

    await bug.save();
    await bug.populate('comments.author', 'name avatar designation');

    sendSuccess(res, bug.comments, 'Comment posted successfully');
  } catch (error) {
    next(error);
  }
};

// ─── ACTIVITY FEED: GET LIVE EVENTS ──────────────────────────────────────────
export const getProjectActivity = async (req, res, next) => {
  try {
    const activities = await ProjectActivity.find({ project: req.params.id })
      .populate('actor', 'name avatar designation')
      .sort({ createdAt: -1 })
      .limit(30);

    sendSuccess(res, activities);
  } catch (error) {
    next(error);
  }
};
