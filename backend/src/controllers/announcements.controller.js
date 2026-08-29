import Announcement from '../models/Announcement.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Notification from '../models/Notification.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// GET /api/announcements
export const getAnnouncements = async (req, res, next) => {
  try {
    const userRoleSlug = req.user.role?.slug || '';
    const userRoleName = req.user.role?.name?.toLowerCase() || '';
    const isAdminOrHr = ['admin', 'super-admin', 'hr', 'hr-manager'].includes(userRoleSlug) || 
                        userRoleName.includes('admin') || 
                        userRoleName.includes('hr');

    let query = {};
    if (!isAdminOrHr) {
      query = {
        $or: [
          { sentBy: req.user._id },
          { targetRoles: { $exists: false } },
          { targetRoles: { $size: 0 } },
          { targetRoles: 'all' },
          { targetRoles: userRoleSlug },
          { targetRoles: userRoleName },
        ],
      };
    }

    const announcements = await Announcement.find(query)
      .populate('sentBy', 'name email employeeId avatar role')
      .sort({ pinned: -1, createdAt: -1 });

    sendSuccess(res, announcements);
  } catch (error) {
    next(error);
  }
};

// POST /api/announcements
export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, targetRoles = ['intern', 'employee'], pinned = false } = req.body;

    if (!title || !content) {
      return sendError(res, 'Title and content are required', 400);
    }

    const announcement = await Announcement.create({
      title,
      content,
      targetRoles: targetRoles.map(r => r.toLowerCase().trim()),
      pinned: Boolean(pinned),
      sentBy: req.user._id,
    });

    // ─── Notification Fan-Out ───────────────────────────────────────────────
    try {
      const normalizedTargets = targetRoles.map(r => r.toLowerCase().trim());
      
      const roleConditions = normalizedTargets.flatMap(r => [
        { slug: r },
        { slug: `${r}-manager` },
        { name: new RegExp(r, 'i') },
      ]);

      const matchingRoles = await Role.find({ $or: roleConditions }).select('_id');
      const roleIds = matchingRoles.map(r => r._id);

      const targetUsers = await User.find({
        _id: { $ne: req.user._id },
        deletedAt: { $exists: false },
        $or: [
          { role: { $in: roleIds } },
          { employmentType: { $in: normalizedTargets.map(r => r.charAt(0).toUpperCase() + r.slice(1)) } },
        ],
      }).select('_id');

      if (targetUsers.length > 0) {
        const senderName = req.user?.name || 'Sarah Connor';
        const senderDesignation = req.user?.designation || 'HR Manager';

        const notifDocs = targetUsers.map(u => ({
          recipient: u._id,
          type: 'system_alert',
          title: `📢 Announcement: ${title}`,
          message: content,
          link: '',
          sender: req.user._id,
          metadata: {
            isAnnouncement: true,
            announcementId: announcement._id,
            title: title,
            content: content,
            senderName: senderName,
            senderDesignation: senderDesignation,
            targetRoles: announcement.targetRoles,
          },
        }));

        await Notification.insertMany(notifDocs);
      }
    } catch (notifErr) {
      console.warn('Announcement notification fan-out warning:', notifErr.message);
    }

    const populated = await Announcement.findById(announcement._id)
      .populate('sentBy', 'name email employeeId avatar role');

    sendSuccess(res, populated, 'Announcement broadcasted successfully', 201);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/announcements/:id
export const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return sendError(res, 'Announcement not found', 404);
    sendSuccess(res, null, 'Announcement deleted');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/announcements/:id/pin
export const togglePin = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return sendError(res, 'Announcement not found', 404);

    announcement.pinned = !announcement.pinned;
    await announcement.save();

    const populated = await Announcement.findById(announcement._id)
      .populate('sentBy', 'name email employeeId avatar role');

    sendSuccess(res, populated, `Announcement ${announcement.pinned ? 'pinned' : 'unpinned'}`);
  } catch (error) {
    next(error);
  }
};
