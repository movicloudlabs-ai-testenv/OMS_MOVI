import Message from '../models/Message.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { sendNotification } from '../utils/sendNotification.js';

/**
 * GET /api/messages/:userId
 * Get conversation history between current user and target user
 */
export const getMessages = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    if (!targetUserId || targetUserId === 'all') {
      const messages = await Message.find({
        $or: [{ sender: currentUserId }, { receiver: currentUserId }],
      })
        .populate('sender', 'name email avatar employeeId designation')
        .populate('receiver', 'name email avatar employeeId designation')
        .sort({ createdAt: 1 });

      return sendSuccess(res, messages);
    }

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: targetUserId },
        { sender: targetUserId, receiver: currentUserId },
      ],
    })
      .populate('sender', 'name email avatar employeeId designation')
      .populate('receiver', 'name email avatar employeeId designation')
      .sort({ createdAt: 1 });

    sendSuccess(res, messages);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/messages
 * Send a direct 1-on-1 message to another user
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { receiver, content } = req.body;

    if (!receiver) return sendError(res, 'Message receiver is required', 400);
    if (!content || !content.trim()) return sendError(res, 'Message content is required', 400);

    const recipientUser = await User.findById(receiver);
    if (!recipientUser) return sendError(res, 'Recipient user not found', 404);

    const message = await Message.create({
      sender: req.user._id,
      receiver: recipientUser._id,
      content: content.trim(),
    });

    await message.populate('sender', 'name email avatar employeeId designation');
    await message.populate('receiver', 'name email avatar employeeId designation');

    // Trigger real-time system notification for recipient
    await sendNotification({
      recipient: recipientUser._id,
      type: 'system_alert',
      title: `Message from ${req.user.name}`,
      message: content.trim(),
      link: '/intern/profile',
      sender: req.user._id,
    });

    sendSuccess(res, message, 'Message sent successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/messages/:id/read
 * Mark a message as read
 */
export const markRead = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return sendError(res, 'Message not found', 404);

    if (message.receiver.toString() !== req.user._id.toString()) {
      return sendError(res, 'Unauthorized to mark this message as read', 403);
    }

    message.read = true;
    message.readAt = new Date();
    await message.save();

    sendSuccess(res, message, 'Message marked as read');
  } catch (error) {
    next(error);
  }
};
