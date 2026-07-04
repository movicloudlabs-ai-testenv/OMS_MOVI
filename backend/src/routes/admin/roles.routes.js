import { Router } from 'express';
import {
  getRoles, createRole, getRoleById,
  updateRole, deleteRole, getRoleUsers, updateRolePermissions,
} from '../../controllers/admin/roles.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
router.use(protect);

router.get('/', requirePermission('Roles', 'read'), getRoles);
router.post('/', requirePermission('Roles', 'create'), auditLog('Create', 'Roles'), createRole);
router.get('/:id', requirePermission('Roles', 'read'), getRoleById);
router.put('/:id', requirePermission('Roles', 'update'), auditLog('Update', 'Roles'), updateRole);
router.delete('/:id', requirePermission('Roles', 'delete'), auditLog('Delete', 'Roles'), deleteRole);
router.get('/:id/users', requirePermission('Roles', 'read'), getRoleUsers);
router.post('/:id/permissions', requirePermission('Roles', 'update'), auditLog('Update', 'Roles'), updateRolePermissions);

export default router;
