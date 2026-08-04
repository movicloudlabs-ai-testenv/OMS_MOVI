import { Router } from 'express';
import { getAllEODs, getUserEODs, exportEODs } from '../../controllers/shared/eodReport.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';

const router = Router();
router.use(protect);

router.get('/', requirePermission('Daily Tracker', 'read'), getAllEODs);
router.get('/export', requirePermission('Daily Tracker', 'read'), exportEODs);
router.get('/user/:userId', requirePermission('Daily Tracker', 'read'), getUserEODs);

export default router;
