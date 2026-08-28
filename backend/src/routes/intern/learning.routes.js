import { Router } from 'express';
import {
  getMyLearning, updateLearningStatus,
} from '../../controllers/intern/learning.controller.js';
import { protect } from '../../middleware/auth.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
router.use(protect);

router.get('/', getMyLearning);
router.patch('/:id/status', auditLog('Update', 'Learning'), updateLearningStatus);

export default router;
