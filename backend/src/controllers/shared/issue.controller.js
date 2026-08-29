import Issue from '../../models/Issue.js';
import User from '../../models/User.js';
import Role from '../../models/Role.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { sendNotification } from '../../utils/sendNotification.js';

const normalizeRole = (user) => user?.role?.slug || '';

const recipientSlugsFor = (creatorRole) => {
  if (['intern', 'employee'].includes(creatorRole)) return ['hr-manager', 'pmo-lead'];
  if (['hr-manager', 'pmo-lead', 'hr', 'pmo'].includes(creatorRole)) return ['admin', 'super-admin'];
  return [];
};

const buildTicketId = async () => {
  const count = await Issue.countDocuments();
  return `ISS-${String(count + 1).padStart(5, '0')}`;
};

export const createIssue = async (req, res, next) => {
  try {
    const { title, category, priority, description } = req.body;
    if (!title?.trim() || !category?.trim() || !description?.trim()) {
      return sendError(res, 'Title, category and description are required', 400);
    }

    const creatorRole = normalizeRole(req.user);
    const recipientSlugs = recipientSlugsFor(creatorRole);
    if (!recipientSlugs.length) {
      return sendError(res, 'Your role is not configured to raise support issues', 403);
    }

    const roles = await Role.find({ slug: { $in: recipientSlugs } }).select('_id slug');
    const roleIds = roles.map(r => r._id);
    const recipients = await User.find({ role: { $in: roleIds }, status: 'Active' }).select('_id name role');

    if (!recipients.length) {
      return sendError(res, 'No active support recipient is configured for this issue', 409);
    }

    const issue = await Issue.create({
      ticketId: await buildTicketId(),
      title: title.trim(),
      category: category.trim(),
      priority: priority || 'Medium',
      description: description.trim(),
      createdBy: req.user._id,
      creatorRole,
      recipients: recipients.map(u => u._id),
    });

    await issue.populate([
      { path: 'createdBy', select: 'name email employeeId designation' },
      { path: 'recipients', select: 'name email employeeId designation role' },
    ]);

    const recipientMessage = `${req.user.name} reported: ${issue.title}`;
    await Promise.all(recipients.map(recipient => sendNotification({
      recipient: recipient._id,
      type: 'issue_reported',
      title: `New support issue ${issue.ticketId}`,
      message: recipientMessage,
      link: '/support/issues',
      sender: req.user._id,
      metadata: { issueId: issue._id.toString(), ticketId: issue.ticketId, priority: issue.priority },
    })));

    sendSuccess(res, issue, 'Issue reported successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getIssues = async (req, res, next) => {
  try {
    const role = normalizeRole(req.user);
    let filter;
    if (['admin', 'super-admin'].includes(role)) filter = { creatorRole: { $in: ['hr-manager', 'pmo-lead', 'hr', 'pmo'] } };
    else if (['hr-manager', 'pmo-lead', 'hr', 'pmo'].includes(role)) {
      filter = { $or: [{ recipients: req.user._id }, { createdBy: req.user._id }] };
    } else {
      filter = { createdBy: req.user._id };
    }

    const issues = await Issue.find(filter)
      .populate('createdBy', 'name email employeeId designation role')
      .populate('recipients', 'name email employeeId designation role')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(200);

    sendSuccess(res, issues);
  } catch (error) {
    next(error);
  }
};

export const updateIssue = async (req, res, next) => {
  try {
    const role = normalizeRole(req.user);
    const issue = await Issue.findById(req.params.id);
    if (!issue) return sendError(res, 'Issue not found', 404);

    const canManage = ['admin', 'super-admin', 'hr-manager', 'pmo-lead', 'hr', 'pmo'].includes(role)
      && (['admin', 'super-admin'].includes(role) || issue.recipients.some(id => id.toString() === req.user._id.toString()) || issue.createdBy.toString() === req.user._id.toString());
    if (!canManage) return sendError(res, 'You do not have access to update this issue', 403);

    const { status } = req.body;
    if (!['Open', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
      return sendError(res, 'Invalid issue status', 400);
    }

    issue.status = status;
    if (['Resolved', 'Closed'].includes(status)) {
      issue.resolvedBy = req.user._id;
      issue.resolvedAt = new Date();
    } else {
      issue.resolvedBy = undefined;
      issue.resolvedAt = undefined;
    }
    await issue.save();
    await issue.populate([
      { path: 'createdBy', select: 'name email employeeId designation role' },
      { path: 'recipients', select: 'name email employeeId designation role' },
      { path: 'resolvedBy', select: 'name email' },
    ]);

    if (issue.createdBy && issue.createdBy._id.toString() !== req.user._id.toString()) {
      await sendNotification({
        recipient: issue.createdBy._id,
        type: 'issue_status_updated',
        title: `Issue ${issue.ticketId} updated`,
        message: `${req.user.name} changed the issue status to ${status}.`,
        link: '/support/issues',
        sender: req.user._id,
        metadata: { issueId: issue._id.toString(), ticketId: issue.ticketId, status },
      });
    }

    sendSuccess(res, issue, 'Issue status updated');
  } catch (error) {
    next(error);
  }
};
