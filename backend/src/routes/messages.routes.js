import { Router } from 'express';
import { getMessages, sendMessage, markRead } from '../controllers/messages.controller.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();
router.use(protect);

router.get('/:userId', getMessages);
router.get('/', getMessages);
router.post('/', auditLog('Create', 'Notifications'), sendMessage);
router.patch('/:id/read', markRead);

export default router;
