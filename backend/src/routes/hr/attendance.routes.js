import { Router } from 'express';
import {
  getAttendance, markAttendance, updateAttendanceRecord, exportAttendance,
} from '../../controllers/hr/attendance.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { hrScope } from '../../middleware/hrScope.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
router.use(protect);
router.use(hrScope);

router.get('/', requirePermission('Attendance', 'read'), getAttendance);
router.post('/mark', requirePermission('Attendance', 'manage'), auditLog('Create', 'Attendance'), markAttendance);
router.get('/export', requirePermission('Attendance', 'export'), exportAttendance);
router.patch('/:id', requirePermission('Attendance', 'manage'), auditLog('Update', 'Attendance'), updateAttendanceRecord);

export default router;
