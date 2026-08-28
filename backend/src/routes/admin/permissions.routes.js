import { Router } from 'express';
import { getPermissions, getPermissionById } from '../../controllers/admin/permissions.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';

const router = Router();
router.use(protect);

router.get('/',    requirePermission('Roles', 'read'), getPermissions);
router.get('/:id', requirePermission('Roles', 'read'), getPermissionById);

export default router;
