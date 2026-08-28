import { Router } from 'express';
import {
  getNotifications, markAsRead, markAllAsRead, deleteNotification,
} from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect); // All users can access their own notifications

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
