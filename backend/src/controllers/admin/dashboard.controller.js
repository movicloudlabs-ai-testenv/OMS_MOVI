import mongoose from 'mongoose';
import User from '../../models/User.js';
import Settings from '../../models/Settings.js';
import Announcement from '../../models/Announcement.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

/**
 * GET /api/admin/dashboard/stats
 * Live system stats for the admin dashboard — everything here is measured,
 * not hardcoded: DB connection state, maintenance flag, online users
 * (lastLogin within 15 min), active sessions (lastLogin within the hour),
 * MongoDB storage stats, latest announcements, and new-user signups per day.
 */
export const getDashboardStats = async (req, res) => {
  try {
    const now = Date.now();
    const online15m = new Date(now - 15 * 60 * 1000);
    const session1h = new Date(now - 60 * 60 * 1000);
    const days30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
    days30.setHours(0, 0, 0, 0);

    const [settings, usersOnline, activeSessions, announcements, growthRaw, dbStats] =
      await Promise.all([
        Settings.findOne({ key: 'global' }).select('system').lean(),
        User.countDocuments({ lastLogin: { $gte: online15m }, status: 'Active' }),
        User.countDocuments({ lastLogin: { $gte: session1h }, status: 'Active' }),
        Announcement.find().sort({ createdAt: -1 }).limit(5)
          .populate('sentBy', 'name avatar').lean(),
        User.aggregate([
          { $match: { createdAt: { $gte: days30 } } },
          { $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
          } },
        ]),
        mongoose.connection.db.command({ dbStats: 1 }).catch(() => ({ dataSize: 0, storageSize: 0 })),
      ]);

    const quotaBytes = (Number(process.env.STORAGE_QUOTA_GB) || 1) * 1024 * 1024 * 1024;

    sendSuccess(res, {
      health: {
        apiServer: true, // this response existing proves the API is up
        dbConnected: mongoose.connection.readyState === 1,
        maintenanceMode: settings?.system?.maintenanceMode ?? false,
        uptimeSec: Math.floor(process.uptime()),
      },
      usersOnline,
      activeSessions,
      storage: {
        dataBytes: dbStats?.dataSize || 0,
        storageBytes: dbStats?.storageSize || 0,
        quotaBytes,
      },
      announcements,
      // Daily new-user counts (last 30 days) keyed by YYYY-MM-DD
      newUsersPerDay: growthRaw.reduce((acc, g) => { acc[g._id] = g.count; return acc; }, {}),
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    sendError(res, 'Failed to load dashboard stats', 500);
  }
};

/**
 * POST /api/admin/dashboard/announcements — publish an announcement.
 */
export const createAnnouncement = async (req, res) => {
  try {
    const { title, body, content, type, targetRoles, pinned } = req.body;
    const messageContent = content || body;
    if (!title || !messageContent) return sendError(res, 'Title and content are required', 400);
    const announcement = await Announcement.create({
      title,
      content: messageContent,
      type: type || 'general',
      targetRoles: targetRoles || [],
      pinned: !!pinned,
      sentBy: req.user._id,
    });
    sendSuccess(res, announcement, 'Announcement published', 201);
  } catch (err) {
    console.error('Create announcement error:', err);
    sendError(res, 'Failed to create announcement', 500);
  }
};

/**
 * DELETE /api/admin/dashboard/announcements/:id
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const deleted = await Announcement.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, 'Announcement not found', 404);
    sendSuccess(res, null, 'Announcement deleted');
  } catch (err) {
    console.error('Delete announcement error:', err);
    sendError(res, 'Failed to delete announcement', 500);
  }
};
