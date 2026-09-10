import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { getContacts, getConversation, sendMessage, markRead } from '../controllers/messages.controller.js';

const router = Router();
router.use(protect);
router.get('/contacts', getContacts);
router.get('/:userId', getConversation);
router.post('/', sendMessage);
router.patch('/:id/read', markRead);
export default router;
