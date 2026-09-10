import Announcement from '../models/Announcement.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendAnnouncementEmail } from '../utils/sendEmail.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const ALL_ROLES = ['admin', 'hr', 'intern', 'employee', 'pmo'];
const CAN_SEND_ROLES = ['hr', 'hr-manager', 'pmo', 'pmo-lead', 'admin', 'super-admin'];

const roleSlug = (user) => (user.role?.slug || (typeof user.role === 'string' ? user.role : '') || '').toLowerCase();
const canSendAnnouncement = (user) => {
  const slug = roleSlug(user);
  const name = (user.role?.name || '').toLowerCase();
  return CAN_SEND_ROLES.includes(slug) || name.includes('hr') || name.includes('pmo') || name.includes('admin');
};

const matchesRole = (user, target) => {
  const t = target.toLowerCase();
  const slug = roleSlug(user);
  const name = (user.role?.name || '').toLowerCase();
  if (t === 'all' || t === 'everyone') return true;
  if (slug === t || name.includes(t)) return true;
  if (t === 'employee') return user.employmentType !== 'Intern' && ['employee'].includes(slug);
  if (t === 'intern') return user.employmentType === 'Intern' || slug === 'intern';
  return false;
};

export const getAnnouncementRecipients = async (req, res, next) => {
  try {
    if (!canSendAnnouncement(req.user)) return sendError(res, 'Only Admin, HR, and PMO can select recipients', 403);
    const search = String(req.query.search || '').trim();
    const filter = { status: 'Active', deletedAt: { $exists: false }, _id: { $ne: req.user._id } };
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
    ];
    const users = await User.find(filter).populate('role', 'name slug').select('name email employeeId username avatar role employmentType').sort({ name: 1 }).limit(500);
    sendSuccess(res, users);
  } catch (error) { next(error); }
};

export const getAnnouncements = async (req, res, next) => {
  try {
    const slug = roleSlug(req.user);
    const name = (req.user.role?.name || '').toLowerCase();
    const canSeeAll = ['admin', 'super-admin', 'hr', 'hr-manager', 'pmo', 'pmo-lead'].includes(slug) || name.includes('admin') || name.includes('hr') || name.includes('pmo');
    let query;
    if (canSeeAll) {
      query = {};
    } else {
      query = {
        $or: [
          { sentBy: req.user._id },
          { targetUsers: req.user._id },
          { targetRoles: 'all' },
          { targetRoles: 'everyone' },
          { targetRoles: slug },
          { targetRoles: name },
        ],
      };
      if (req.user.employmentType === 'Intern') query.$or.push({ targetRoles: 'intern' });
    }
    const announcements = await Announcement.find(query)
      .populate('sentBy', 'name email employeeId avatar profileImage designation role')
      .populate('targetUsers', 'name email employeeId username role employmentType')
      .sort({ pinned: -1, createdAt: -1 });
    sendSuccess(res, announcements);
  } catch (error) { next(error); }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    if (!canSendAnnouncement(req.user)) return sendError(res, 'Only Admin, HR, or PMO can send announcements', 403);
    const { title, content, zoomLink, pinned = false } = req.body;
    let targetRoles = Array.isArray(req.body.targetRoles) ? req.body.targetRoles : [];
    let targetUsers = Array.isArray(req.body.targetUsers) ? req.body.targetUsers : [];
    if (!title?.trim() || !content?.trim()) return sendError(res, 'Title and content are required', 400);

    targetRoles = [...new Set(targetRoles.map(r => String(r).toLowerCase().trim()).filter(Boolean))];
    targetUsers = [...new Set(targetUsers.map(String).filter(Boolean))];
    if (!targetRoles.length && !targetUsers.length) return sendError(res, 'Select Everyone, one or more roles, or specific people', 400);
    if (targetRoles.includes('all') || targetRoles.includes('everyone')) targetRoles = ['all'];

    const validUsers = targetUsers.length
      ? await User.find({ _id: { $in: targetUsers }, status: 'Active', deletedAt: { $exists: false } }).select('_id name email role employmentType').populate('role', 'name slug')
      : [];
    const announcement = await Announcement.create({
      title: title.trim(), content: content.trim(), zoomLink: String(zoomLink || '').trim(),
      targetRoles, targetUsers: validUsers.map(u => u._id), pinned: Boolean(pinned), sentBy: req.user._id, createdBy: req.user._id,
    });

    // Resolve recipients by role OR explicit people. This keeps the announcement itself authoritative.
    const activeUsers = await User.find({ status: 'Active', deletedAt: { $exists: false }, _id: { $ne: req.user._id } })
      .populate('role', 'name slug').select('name email role employmentType');
    const recipients = activeUsers.filter(u => targetUsers.includes(String(u._id)) || targetRoles.some(t => matchesRole(u, t)));

    if (recipients.length) {
      const senderName = req.user.name || 'OWMS User';
      const senderDesignation = req.user.designation || req.user.role?.name || 'Management';
      await Notification.insertMany(recipients.map(u => ({
        recipient: u._id, type: 'system_alert', title: `📢 Announcement: ${title.trim()}`, message: content.trim(), link: '', sender: req.user._id,
        metadata: { isAnnouncement: true, announcementId: announcement._id, title: title.trim(), content: content.trim(), zoomLink: announcement.zoomLink, senderName, senderDesignation, targetRoles, targetUsers: announcement.targetUsers },
      })));
      const loginUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';
      await Promise.allSettled(recipients.filter(u => u.email).map(u => sendAnnouncementEmail({
        to: u.email, name: u.name, title: title.trim(), content: content.trim(), zoomLink: announcement.zoomLink, senderName, senderDesignation, loginUrl,
      })));
    }

    const populated = await Announcement.findById(announcement._id)
      .populate('sentBy', 'name email employeeId avatar profileImage designation role')
      .populate('targetUsers', 'name email employeeId username role employmentType');
    sendSuccess(res, populated, `Announcement sent to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}`, 201);
  } catch (error) { next(error); }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    if (!canSendAnnouncement(req.user)) return sendError(res, 'Only Admin, HR, or PMO can delete announcements', 403);
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return sendError(res, 'Announcement not found', 404);
    await announcement.deleteOne();
    sendSuccess(res, null, 'Announcement deleted');
  } catch (error) { next(error); }
};

export const togglePin = async (req, res, next) => {
  try {
    if (!canSendAnnouncement(req.user)) return sendError(res, 'Only Admin, HR, or PMO can update announcements', 403);
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return sendError(res, 'Announcement not found', 404);
    announcement.pinned = !announcement.pinned;
    await announcement.save();
    const populated = await Announcement.findById(announcement._id).populate('sentBy', 'name email employeeId avatar profileImage designation role').populate('targetUsers', 'name email employeeId username role employmentType');
    sendSuccess(res, populated, `Announcement ${announcement.pinned ? 'pinned' : 'unpinned'}`);
  } catch (error) { next(error); }
};
