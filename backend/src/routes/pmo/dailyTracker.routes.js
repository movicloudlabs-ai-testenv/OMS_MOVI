import { Router } from 'express';
import {
  getAllEntries, getUserEntries, updateEntry, exportEntries, getDayStatus,
  getMyTodayEntry, getMyEntries, submitMyEntry,
} from '../../controllers/shared/dailyTracker.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { auditLog } from '../../middleware/audit.js';
import { pmoSelfScope } from '../../middleware/pmoSelfScope.js';

const router = Router();
router.use(protect);

// PMO submitting their OWN Daily Tracker entry (mirrors employee/intern self-submit)
router.get('/my/today', pmoSelfScope, getMyTodayEntry);
router.get('/my', pmoSelfScope, getMyEntries);
router.post('/my', pmoSelfScope, submitMyEntry);

router.get('/', requirePermission('Daily Tracker', 'read'), getAllEntries);
router.get('/export', requirePermission('Daily Tracker', 'read'), exportEntries);
router.get('/day-status', requirePermission('Daily Tracker', 'read'), getDayStatus);
router.get('/user/:userId', requirePermission('Daily Tracker', 'read'), getUserEntries);
router.patch('/:id', requirePermission('Daily Tracker', 'update'), auditLog('Update', 'Daily Tracker'), updateEntry);

export default router;
