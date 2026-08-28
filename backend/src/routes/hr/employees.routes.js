import { Router } from 'express';
import {
  getEmployees, getEmployeeById,
  getEmployeeAttendance, getEmployeeLeaves,
  addEmployeeNote, addEmployeePerformance,
} from '../../controllers/hr/employees.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { hrScope } from '../../middleware/hrScope.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
router.use(protect);
router.use(hrScope);

router.get('/', requirePermission('Users', 'read'), getEmployees);
router.get('/:id', requirePermission('Users', 'read'), getEmployeeById);
router.get('/:id/attendance', requirePermission('Attendance', 'read'), getEmployeeAttendance);
router.get('/:id/leaves', requirePermission('Leave', 'read'), getEmployeeLeaves);
router.post('/:id/notes', requirePermission('Users', 'update'), auditLog('Update', 'Users'), addEmployeeNote);
router.post('/:id/performance', requirePermission('Users', 'update'), addEmployeePerformance);

export default router;
