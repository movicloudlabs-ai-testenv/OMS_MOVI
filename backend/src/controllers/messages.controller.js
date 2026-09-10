import Message from '../models/Message.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const activeUserFilter = { status: 'Active', deletedAt: { $exists: false } };

export const getContacts = async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const role = String(req.query.role || '').trim().toLowerCase();
    const filter = { ...activeUserFilter, _id: { $ne: req.user._id } };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .populate('role', 'name slug')
      .select('name username email employeeId avatar profileImage role designation')
      .sort({ name: 1 });

    const filtered = role
      ? users.filter(u => (u.role?.slug || '').toLowerCase() === role || (u.role?.name || '').toLowerCase().includes(role))
      : users;

    sendSuccess(res, filtered);
  } catch (error) { next(error); }
};

const ensureCanMessage = (req, receiver) => {
  const senderRole = (req.user.role?.slug || '').toLowerCase();
  const receiverRole = (receiver.role?.slug || '').toLowerCase();
  // Interns may contact HR/PMO/Admin; management users can contact active users.
  if (senderRole === 'intern' && !['hr', 'hr-manager', 'pmo', 'pmo-lead', 'admin', 'super-admin'].includes(receiverRole)) return false;
  return true;
};

export const getConversation = async (req, res, next) => {
  try {
    const otherId = req.params.userId;
    const other = await User.findOne({ _id: otherId, ...activeUserFilter }).populate('role', 'name slug');
    if (!other) return sendError(res, 'Contact not found', 404);
    if (!ensureCanMessage(req, other)) return sendError(res, 'You cannot message this user', 403);

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: other._id },
        { sender: other._id, receiver: req.user._id },
      ],
    }).populate('sender', 'name avatar profileImage username').populate('receiver', 'name avatar profileImage username').sort({ createdAt: 1 }).limit(500);

    await Message.updateMany({ sender: other._id, receiver: req.user._id, read: false }, { $set: { read: true, readAt: new Date() } });
    sendSuccess(res, messages);
  } catch (error) { next(error); }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { receiver, content } = req.body;
    if (!receiver || !String(content || '').trim()) return sendError(res, 'Receiver and content are required', 400);
    const target = await User.findOne({ _id: receiver, ...activeUserFilter }).populate('role', 'name slug');
    if (!target) return sendError(res, 'Receiver not found', 404);
    if (String(target._id) === String(req.user._id)) return sendError(res, 'You cannot message yourself', 400);
    if (!ensureCanMessage(req, target)) return sendError(res, 'You cannot message this user', 403);

    const message = await Message.create({ sender: req.user._id, receiver: target._id, content: String(content).trim() });
    const populated = await Message.findById(message._id).populate('sender', 'name avatar profileImage username').populate('receiver', 'name avatar profileImage username');
    sendSuccess(res, populated, 'Message sent', 201);
  } catch (error) { next(error); }
};

export const markRead = async (req, res, next) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, receiver: req.user._id },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );
    if (!message) return sendError(res, 'Message not found', 404);
    sendSuccess(res, message, 'Message marked as read');
  } catch (error) { next(error); }
};
