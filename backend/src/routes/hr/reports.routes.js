import { Router } from 'express';
import {
  getHeadcountReport, getAttendanceSummary, getLeaveSummary,
} from '../../controllers/hr/reports.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { hrScope } from '../../middleware/hrScope.js';

const router = Router();
router.use(protect);
router.use(hrScope);

router.get('/headcount', requirePermission('Users', 'read'), getHeadcountReport);
router.get('/attendance-summary', requirePermission('Attendance', 'read'), getAttendanceSummary);
router.get('/leave-summary', requirePermission('Leave', 'read'), getLeaveSummary);

export default router;
