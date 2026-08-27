import { Router } from 'express';
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  togglePin,
} from '../controllers/announcements.controller.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();
router.use(protect);

router.get('/', getAnnouncements);
router.post('/', auditLog('Create', 'Communication'), createAnnouncement);
router.delete('/:id', auditLog('Delete', 'Communication'), deleteAnnouncement);
router.patch('/:id/pin', auditLog('Update', 'Communication'), togglePin);

export default router;
