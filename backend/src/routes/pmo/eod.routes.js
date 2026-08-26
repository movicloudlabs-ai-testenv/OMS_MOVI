import { Router } from 'express';
import {
  getAllEODs, getUserEODs, exportEODs, getDayStatus,
  getMyTodayEOD, getMyEODs, submitMyEOD,
} from '../../controllers/shared/eodReport.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { pmoSelfScope } from '../../middleware/pmoSelfScope.js';

const router = Router();
router.use(protect);

// PMO submitting their OWN EOD update (mirrors employee/intern self-submit)
router.get('/my/today', pmoSelfScope, getMyTodayEOD);
router.get('/my', pmoSelfScope, getMyEODs);
router.post('/my', pmoSelfScope, submitMyEOD);

router.get('/', requirePermission('Daily Tracker', 'read'), getAllEODs);
router.get('/export', requirePermission('Daily Tracker', 'read'), exportEODs);
router.get('/day-status', requirePermission('Daily Tracker', 'read'), getDayStatus);
router.get('/user/:userId', requirePermission('Daily Tracker', 'read'), getUserEODs);

export default router;
