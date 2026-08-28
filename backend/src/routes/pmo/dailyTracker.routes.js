import { Router } from 'express';
import {
  getAllEntries,
  getUserEntries,
  updateEntry,
  exportEntries,
  getDayStatus,
  getMyTodayEntry,
  getMyEntries,
  submitMyEntry
} from '../../controllers/shared/dailyTracker.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
router.use(protect);

// Self-service PMO tracker routes (must precede /:id and /user/:userId)
router.get('/my/today', getMyTodayEntry);
router.get('/my', getMyEntries);
router.post('/my', auditLog('Submit', 'Daily Tracker'), submitMyEntry);

// Management routes
router.get('/', requirePermission('Daily Tracker', 'read'), getAllEntries);
router.get('/export', requirePermission('Daily Tracker', 'read'), exportEntries);
router.get('/day-status', requirePermission('Daily Tracker', 'read'), getDayStatus);
router.get('/user/:userId', requirePermission('Daily Tracker', 'read'), getUserEntries);
router.patch('/:id', requirePermission('Daily Tracker', 'update'), auditLog('Update', 'Daily Tracker'), updateEntry);

export default router;
