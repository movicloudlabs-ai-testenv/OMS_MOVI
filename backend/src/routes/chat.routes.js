import { Router } from 'express';
import {
  getChannels,
  getChannelMembers,
  getMessages,
  sendMessage,
  createTaskFromMessage,
  getDirectChatUsers,
  markChannelRead,
  createAnnouncement,
  createCustomChannel,
  uploadAttachment,
  getMessageInfo,
  updateChannelAvatar,
} from '../controllers/chat.controller.js';
import { protect } from '../middleware/auth.js';
import { upload, setUploadType } from '../middleware/upload.js';

const router = Router();

// All chat routes require authentication
router.use(protect);

// GET /api/chat/channels — List company and project channels with live message counts
router.get('/channels', getChannels);

// POST /api/chat/channels — Create custom team channel
router.post('/channels', createCustomChannel);

// POST /api/chat/channels/:channelId/avatar — Upload/update channel group profile icon
router.post('/channels/:channelId/avatar', setUploadType('avatars'), upload.single('file'), updateChannelAvatar);

// POST /api/chat/channels/:channelId/read — Mark channel read
router.post('/channels/:channelId/read', markChannelRead);

// GET /api/chat/channels/:channelId/members — Member roster for @mentions autocomplete
router.get('/channels/:channelId/members', getChannelMembers);

// GET /api/chat/messages — List messages in channel or DM
router.get('/messages', getMessages);

// GET /api/chat/messages/:messageId/info — WhatsApp-style read receipts & delivery info
router.get('/messages/:messageId/info', getMessageInfo);

// POST /api/chat/upload — Upload media/image attachment for chat
router.post('/upload', setUploadType('attachments'), upload.single('file'), uploadAttachment);

// POST /api/chat/messages — Send a message (with @mentions parsing)
router.post('/messages', sendMessage);

// POST /api/chat/announcements — Broadcast company bulletin
router.post('/announcements', createAnnouncement);

// POST /api/chat/tasks/from-message — Create tracked PMO task from chat message
router.post('/tasks/from-message', createTaskFromMessage);

// GET /api/chat/users — List colleagues for direct internal messaging
router.get('/users', getDirectChatUsers);

export default router;
