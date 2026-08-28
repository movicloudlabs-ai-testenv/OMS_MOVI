import Notification from '../../models/Notification.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

export const getNotifications = async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .limit(20),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
    ]);
    sendSuccess(res, { notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return sendError(res, 'Notification not found', 404);
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return sendError(res, 'Not authorized', 403);
    }
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
    sendSuccess(res, notification);
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    sendSuccess(res, { updated: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return sendError(res, 'Notification not found', 404);
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return sendError(res, 'Not authorized', 403);
    }
    await notification.deleteOne();
    sendSuccess(res, null, 'Notification deleted');
  } catch (error) {
    next(error);
  }
};
