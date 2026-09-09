import { Router } from 'express';
import {
  getAttendance,
  markAttendance,
  updateAttendanceRecord,
  exportAttendance,
  getTodayRoster,
  getPendingRegularizations,
  reviewRegularization,
  overrideAttendance,
} from '../../controllers/hr/attendance.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { hrScope } from '../../middleware/hrScope.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
router.use(protect);
router.use(hrScope);

// Standard monthly register & mark
router.get('/', requirePermission('Attendance', 'read'), getAttendance);
router.post('/mark', requirePermission('Attendance', 'update'), auditLog('Create', 'Attendance'), markAttendance);
router.get('/export', requirePermission('Attendance', 'export'), exportAttendance);

// Real-time Today Roster
router.get('/today-roster', requirePermission('Attendance', 'read'), getTodayRoster);

// Regularization approvals queue
router.get('/regularizations', requirePermission('Attendance', 'read'), getPendingRegularizations);
router.patch('/regularize/:id', requirePermission('Attendance', 'update'), auditLog('Update', 'Attendance Regularization'), reviewRegularization);

// Manual attendance override
router.post('/override', requirePermission('Attendance', 'update'), auditLog('Create', 'Attendance Override'), overrideAttendance);

// Record update by ID
router.patch('/:id', requirePermission('Attendance', 'update'), auditLog('Update', 'Attendance'), updateAttendanceRecord);

export default router;
