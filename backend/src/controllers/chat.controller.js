import ChatMessage from '../models/ChatMessage.js';
import ChatChannel from '../models/ChatChannel.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { sendNotification } from '../utils/sendNotification.js';
import { ensureDefaultChannels, syncExistingProjects, markChannelAsRead } from '../services/chatChannelSync.service.js';

let _syncInitialized = false;

/**
 * Lazy initialization on first request to ensure channels and existing projects are synced.
 */
const initChatChannelsOnce = async () => {
  if (_syncInitialized) return;
  _syncInitialized = true;
  try {
    await ensureDefaultChannels();
    await syncExistingProjects();
  } catch (err) {
    console.error('Chat auto-sync failed:', err.message);
  }
};

/**
 * GET /api/chat/channels
 * Returns segmented channels: Company-wide and My Projects.
 * Project channels are filtered based on user membership or admin privileges.
 */
export const getChannels = async (req, res, next) => {
  try {
    await initChatChannelsOnce();

    const userRoleSlug = req.user.role?.slug || '';
    const isPrivileged = ['super-admin', 'admin', 'pmo-lead', 'hr-manager', 'hr'].includes(userRoleSlug);

    // Channel query filter:
    // 1. Company channels are public to all.
    // 2. Project channels: visible to Admins/PMO/HR, or users in `members.user`.
    const channelFilter = isPrivileged
      ? {}
      : {
          $or: [
            { channelType: 'company' },
            { channelType: 'project', 'members.user': req.user._id },
          ],
        };

    const [dbChannels, channelAgg, directMessages] = await Promise.all([
      ChatChannel.find(channelFilter)
        .populate('project', 'name code status priority manager healthStatus')
        .populate('members.user', 'name avatar designation department')
        .sort({ channelType: 1, displayName: 1 })
        .lean(),
      ChatMessage.aggregate([
        { $match: { channel: { $ne: null } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$channel',
            count: { $sum: 1 },
            lastMessageAt: { $first: '$createdAt' },
            lastMessage: { $first: '$message' },
            lastMessageType: { $first: '$messageType' },
            lastSenderId: { $first: '$sender' },
          },
        },
      ]),
      ChatMessage.find({
        $or: [
          { sender: req.user._id, recipient: { $ne: null } },
          { recipient: req.user._id },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('sender', 'name avatar designation role')
        .populate('recipient', 'name avatar designation role')
        .lean(),
    ]);

    // Lookup sender names for channel last messages
    const senderIds = channelAgg.map((c) => c.lastSenderId).filter(Boolean);
    const senders = await User.find({ _id: { $in: senderIds } }).select('name').lean();
    const senderMap = new Map(senders.map((s) => [s._id.toString(), s.name]));

    const countMap = {};
    for (const c of channelAgg) {
      const sId = c.lastSenderId ? c.lastSenderId.toString() : null;
      const isMe = sId === req.user._id.toString();
      countMap[c._id] = {
        count: c.count,
        lastMessageAt: c.lastMessageAt,
        lastMessage: {
          message: c.lastMessage || '',
          senderName: isMe ? 'You' : (senderMap.get(sId) || 'Colleague'),
          messageType: c.lastMessageType || 'text',
          isMe,
          createdAt: c.lastMessageAt,
        },
      };
    }

    const formattedChannels = dbChannels.map((ch) => {
      const stats = countMap[ch.channelId] || {};
      const lastMsg = stats.lastMessage || null;

      // Find user's last read timestamp for this channel
      const receipts = Array.isArray(ch.readReceipts) ? ch.readReceipts : [];
      const members = Array.isArray(ch.members) ? ch.members : [];

      const receipt = receipts.find(
        (r) => (r.user?._id || r.user)?.toString() === req.user._id.toString()
      );
      const member = members.find(
        (m) => (m.user?._id || m.user)?.toString() === req.user._id.toString()
      );
      const userLastReadAt = receipt?.lastReadAt || member?.lastReadAt || null;

      // Calculate actual unread count: 0 if user sent the last message or already read!
      let unreadCount = 0;
      if (lastMsg && !lastMsg.isMe) {
        if (!userLastReadAt) {
          unreadCount = 1;
        } else if (new Date(lastMsg.createdAt) > new Date(userLastReadAt)) {
          unreadCount = 1;
        }
      }

      return {
        id: ch.channelId,
        _id: ch._id,
        name: ch.name,
        displayName: ch.displayName,
        topic: ch.topic || (ch.project ? `${ch.project.name} team discussions` : ''),
        channelType: ch.channelType,
        isPrivate: ch.isPrivate,
        avatar: ch.avatar || (ch.project ? ch.project.avatar : null) || null,
        project: ch.project || null,
        membersCount: ch.members?.length || 0,
        unreadCount, // <--- Correctly 0 if user sent the message or opened the channel!
        messageCount: stats.count || ch.messageCount || 0,
        lastMessageAt: stats.lastMessageAt || ch.lastMessageAt || null,
        lastMessage: lastMsg,
      };
    });

    // Group direct messages by other user
    const dmList = [];
    const seenDMs = new Set();

    for (const dm of directMessages) {
      const isMe = dm.sender?._id?.toString() === req.user._id.toString();
      const other = isMe ? dm.recipient : dm.sender;
      if (!other || !other._id) continue;
      const otherId = other._id.toString();
      if (seenDMs.has(otherId)) continue;
      seenDMs.add(otherId);

      dmList.push({
        id: `dm_${otherId}`,
        recipientId: otherId,
        name: other.name,
        displayName: other.name,
        topic: `${other.designation || 'Colleague'} • Direct Message`,
        channelType: 'direct',
        isPrivate: true,
        avatar: other.avatar || null,
        recipient: other,
        unreadCount: 0,
        messageCount: 1,
        lastMessageAt: dm.createdAt,
        lastMessage: {
          message: dm.message || '',
          senderName: isMe ? 'You' : other.name,
          isMe,
          createdAt: dm.createdAt,
        },
      });
    }

    // Combine channels and direct messages, sorted by lastMessageAt descending
    const allConversations = [...formattedChannels, ...dmList].sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeB - timeA;
    });

    sendSuccess(res, allConversations, 'Conversations fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/channels/:channelId/members
 * Returns member roster for a specific channel to power @mentions autocomplete.
 */
export const getChannelMembers = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    const channel = await ChatChannel.findOne({ channelId })
      .populate('members.user', 'name avatar designation email department role status')
      .populate('project', 'name code manager')
      .lean();

    let members = [];

    if (channel && channel.members && channel.members.length > 0) {
      members = channel.members
        .filter((m) => m.user != null)
        .map((m) => ({
          _id: m.user._id,
          name: m.user.name,
          avatar: m.user.avatar || null,
          designation: m.user.designation || m.role || 'Member',
          department: m.user.department?.name || null,
          role: m.role,
        }));
    } else {
      // Fallback to active workspace users for global company channels
      const activeUsers = await User.find({ status: 'Active' })
        .select('name avatar designation department role')
        .sort({ name: 1 })
        .limit(50)
        .lean();

      members = activeUsers.map((u) => ({
        _id: u._id,
        name: u.name,
        avatar: u.avatar || null,
        designation: u.designation || 'Team Member',
        role: 'Member',
      }));
    }

    // Include smart broadcast alias tags
    const broadcastAliases = [
      {
        _id: 'alias_team',
        name: 'team',
        designation: 'Notify entire project team',
        isAlias: true,
      },
      {
        _id: 'alias_leads',
        name: 'leads',
        designation: 'Notify Project & Tech Leads',
        isAlias: true,
      },
      {
        _id: 'alias_here',
        name: 'here',
        designation: 'Notify currently active members',
        isAlias: true,
      },
    ];

    sendSuccess(res, { members, aliases: broadcastAliases }, 'Channel members fetched');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/messages
 * Fetch messages for a channel or direct message thread.
 */
export const getMessages = async (req, res, next) => {
  try {
    const { channel, recipientId, limit = 60 } = req.query;

    let filter = {};
    if (recipientId) {
      // 1:1 Direct Message
      filter = {
        $or: [
          { sender: req.user._id, recipient: recipientId },
          { sender: recipientId, recipient: req.user._id },
        ],
      };
    } else {
      const targetChannel = channel || '#general';
      filter = { channel: targetChannel };
    }

    const messages = await ChatMessage.find(filter)
      .populate('sender', 'name email employeeId designation role department avatar')
      .populate('mentions.user', 'name designation')
      .populate('replyTo', 'message sender createdAt')
      .sort({ createdAt: 1 })
      .limit(Math.min(parseInt(limit, 10) || 60, 100))
      .lean();

    // Asynchronously mark fetched messages as read & delivered by this user
    ChatMessage.updateMany(
      {
        ...filter,
        sender: { $ne: req.user._id },
        'readBy.user': { $ne: req.user._id },
      },
      {
        $addToSet: {
          readBy: { user: req.user._id, readAt: new Date() },
          deliveredTo: { user: req.user._id, deliveredAt: new Date() },
        },
      }
    ).catch((err) => console.error('Failed to update read receipts:', err.message));

    sendSuccess(res, messages, 'Messages fetched');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/upload
 * Upload media or file attachment for chat message
 */
export const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    const fileUrl = `/uploads/attachments/${req.file.filename}`;
    const fileData = {
      url: fileUrl,
      name: req.file.originalname,
      fileType: req.file.mimetype,
      sizeBytes: req.file.size,
    };

    sendSuccess(res, fileData, 'Attachment uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/messages/:messageId/info
 * Returns read receipts and delivery analytics for WhatsApp-style Message Info
 */
export const getMessageInfo = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await ChatMessage.findById(messageId)
      .populate('sender', 'name avatar designation role email')
      .populate('readBy.user', 'name avatar designation role email')
      .populate('deliveredTo.user', 'name avatar designation role email')
      .lean();

    if (!message) {
      return sendError(res, 'Message not found', 404);
    }

    const readByList = (message.readBy || [])
      .filter((r) => r.user != null)
      .sort((a, b) => new Date(b.readAt) - new Date(a.readAt))
      .map((r) => ({
        user: r.user,
        readAt: r.readAt,
      }));

    const deliveredList = (message.deliveredTo || [])
      .filter((d) => d.user != null)
      .sort((a, b) => new Date(b.deliveredAt) - new Date(a.deliveredAt))
      .map((d) => ({
        user: d.user,
        deliveredAt: d.deliveredAt,
      }));

    sendSuccess(
      res,
      {
        messageId: message._id,
        message: message.message,
        messageType: message.messageType,
        attachments: message.attachments || [],
        createdAt: message.createdAt,
        sender: message.sender,
        readBy: readByList,
        deliveredTo: deliveredList,
      },
      'Message info retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/messages
 * Post a new message to a channel or direct message thread with @mentions detection.
 */
export const sendMessage = async (req, res, next) => {
  try {
    const {
      channel,
      recipientId,
      message,
      attachments,
      messageType = 'text',
      taskRef,
      replyTo,
    } = req.body;

    if (!message || message.trim().length === 0) {
      return sendError(res, 'Message text is required', 400);
    }

    const targetChannel = recipientId ? undefined : (channel || '#general');

    // Parse @mentions in message body
    const mentionRegex = /@([A-Za-z0-9_.\s]+?)(?=\s|$|[.,!?])/g;
    const matches = [...message.matchAll(mentionRegex)].map((m) => m[1].trim());

    const detectedMentions = [];
    if (matches.length > 0 && targetChannel) {
      // Match against users in DB
      const mentionedUsers = await User.find({
        name: { $in: matches.map((m) => new RegExp(`^${m}$`, 'i')) },
        _id: { $ne: req.user._id },
      }).select('_id name');

      for (const u of mentionedUsers) {
        detectedMentions.push({ user: u._id, name: u.name });

        // Dispatch in-app notification to mentioned colleague
        sendNotification({
          recipient: u._id,
          type: 'chat_mention',
          title: `${req.user.name} mentioned you in chat`,
          message: message.trim().slice(0, 120),
          link: '/chat',
          sender: req.user._id,
        }).catch((err) => console.error('Notification dispatch error:', err));
      }
    }

    const newMsg = await ChatMessage.create({
      channel: targetChannel,
      recipient: recipientId || undefined,
      sender: req.user._id,
      message: message.trim(),
      messageType,
      taskRef: taskRef || undefined,
      replyTo: replyTo || undefined,
      mentions: detectedMentions,
      attachments: attachments || [],
    });

    await newMsg.populate('sender', 'name email employeeId designation role department avatar');
    if (newMsg.mentions && newMsg.mentions.length > 0) {
      await newMsg.populate('mentions.user', 'name designation');
    }

    // Update channel activity snippet
    if (targetChannel) {
      await ChatChannel.findOneAndUpdate(
        { channelId: targetChannel },
        {
          $inc: { messageCount: 1 },
          $set: {
            lastMessageAt: new Date(),
            lastMessage: {
              message: message.trim().slice(0, 100),
              sender: req.user._id,
              createdAt: new Date(),
            },
          },
        }
      );
    }

    sendSuccess(res, newMsg, 'Message sent', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/tasks/from-message
 * Turn any chat message into a tracked PMO Project Task (Conversational Ticketing).
 */
export const createTaskFromMessage = async (req, res, next) => {
  try {
    const { messageId, projectId, title, priority = 'Medium', assignedTo, dueDate } = req.body;

    if (!title || !projectId) {
      return sendError(res, 'Task title and project ID are required', 400);
    }

    const project = await Project.findById(projectId);
    if (!project) return sendError(res, 'Project not found', 404);

    let originalMsgText = '';
    if (messageId) {
      const origMsg = await ChatMessage.findById(messageId);
      if (origMsg) originalMsgText = origMsg.message;
    }

    const newTask = await Task.create({
      title: title.trim(),
      description: originalMsgText ? `Created from Chat:\n"${originalMsgText}"` : 'Created from Chat',
      project: project._id,
      assignedBy: req.user._id,
      assignedTo: assignedTo || req.user._id,
      priority,
      status: 'Todo',
      dueDate: dueDate || new Date(Date.now() + 7 * 86400000),
    });

    await newTask.populate('assignedTo', 'name email designation avatar');

    const channelId = `prj_${project._id.toString()}`;

    // Post an interactive task card in the channel
    const cardMsg = await ChatMessage.create({
      channel: channelId,
      sender: req.user._id,
      message: `📌 New Task Logged: "${newTask.title}"`,
      messageType: 'task_card',
      taskRef: {
        taskId: newTask._id,
        code: project.code || 'TASK',
        title: newTask.title,
        status: newTask.status,
        priority: newTask.priority,
      },
    });

    await cardMsg.populate('sender', 'name email employeeId designation role department avatar');

    sendSuccess(res, { task: newTask, message: cardMsg }, 'Task created from message', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/users
 * Returns active colleagues for direct 1:1 internal chatting.
 */
export const getDirectChatUsers = async (req, res, next) => {
  try {
    const colleagues = await User.find({
      _id: { $ne: req.user._id },
      status: 'Active',
    })
      .select('name email employeeId designation department role status avatar')
      .populate('role', 'name color')
      .populate('department', 'name code')
      .sort({ name: 1 })
      .limit(100)
      .lean();

    sendSuccess(res, colleagues, 'Direct chat users fetched');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/channels/:channelId/read
 * Marks all messages in channel as read by the user up to this moment.
 */
export const markChannelRead = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    await markChannelAsRead(channelId, req.user._id);
    sendSuccess(res, null, 'Channel marked as read');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/announcements
 * Broadcasts an executive or official bulletin to the workspace.
 */
export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, priority = 'Normal' } = req.body;
    if (!title || !message) {
      return sendError(res, 'Announcement title and message are required', 400);
    }

    const channelId = '#general';

    const newMsg = await ChatMessage.create({
      channel: channelId,
      sender: req.user._id,
      message: `📢 ANNOUNCEMENT: ${title.trim()}\n\n${message.trim()}`,
      messageType: 'text',
    });

    await newMsg.populate('sender', 'name email designation role department avatar');

    // Notify all active colleagues in workspace
    const users = await User.find({ _id: { $ne: req.user._id }, status: 'Active' }).select('_id');
    for (const u of users) {
      sendNotification({
        recipient: u._id,
        type: 'announcement',
        title: `📢 Announcement: ${title.trim()}`,
        message: message.trim().slice(0, 100),
        link: '/chat',
        sender: req.user._id,
      }).catch(() => {});
    }

    sendSuccess(res, newMsg, 'Announcement broadcasted successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/channels
 * Creates a custom topic or team channel.
 */
export const createCustomChannel = async (req, res, next) => {
  try {
    const { name, topic, isPrivate = false } = req.body;
    if (!name || name.trim().length === 0) {
      return sendError(res, 'Channel name is required', 400);
    }

    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const channelId = `#${cleanName}`;

    let existing = await ChatChannel.findOne({ channelId });
    if (existing) {
      return sendError(res, `Channel #${cleanName} already exists`, 409);
    }

    const newChannel = await ChatChannel.create({
      channelId,
      name: cleanName,
      displayName: `#${cleanName}`,
      topic: topic ? topic.trim() : 'Custom workspace channel',
      channelType: 'company',
      isPrivate: Boolean(isPrivate),
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'Owner', joinedAt: new Date(), lastReadAt: new Date() }],
      readReceipts: [{ user: req.user._id, lastReadAt: new Date() }],
    });

    await ChatMessage.create({
      channel: channelId,
      sender: req.user._id,
      message: `✨ Channel #${cleanName} created by ${req.user.name}.`,
      messageType: 'system',
    });

    sendSuccess(res, newChannel, 'Channel created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/channels/:channelId/avatar
 * Upload and update custom channel or group profile icon
 */
export const updateChannelAvatar = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    if (!req.file) {
      return sendError(res, 'No avatar image uploaded', 400);
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const channel = await ChatChannel.findOneAndUpdate(
      { channelId },
      { $set: { avatar: avatarUrl } },
      { new: true }
    );

    if (!channel) {
      return sendError(res, 'Channel not found', 404);
    }

    if (channel.project) {
      await Project.findByIdAndUpdate(channel.project, { $set: { avatar: avatarUrl } }).catch(() => {});
    }

    sendSuccess(res, { channelId, avatar: avatarUrl }, 'Group profile icon updated successfully');
  } catch (error) {
    next(error);
  }
};
