import { Router } from 'express';
import {
  getDepartments, createDepartment, getDepartmentById,
  updateDepartment, deleteDepartment, getDepartmentMembers,
} from '../../controllers/admin/departments.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
router.use(protect);

router.get('/', requirePermission('Departments', 'read'), getDepartments);
router.post('/', requirePermission('Departments', 'create'), auditLog('Create', 'Departments'), createDepartment);
router.get('/:id', requirePermission('Departments', 'read'), getDepartmentById);
router.put('/:id', requirePermission('Departments', 'update'), auditLog('Update', 'Departments'), updateDepartment);
router.delete('/:id', requirePermission('Departments', 'delete'), auditLog('Delete', 'Departments'), deleteDepartment);
router.get('/:id/members', requirePermission('Departments', 'read'), getDepartmentMembers);

export default router;
