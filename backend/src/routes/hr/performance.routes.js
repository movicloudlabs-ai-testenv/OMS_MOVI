import { Router } from 'express';
import { getMonthlyPerformance } from '../../controllers/hr/performance.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { hrScope } from '../../middleware/hrScope.js';

const router = Router();
router.use(protect, hrScope);

router.get('/monthly', requirePermission('Daily Tracker', 'read'), getMonthlyPerformance);

export default router;
