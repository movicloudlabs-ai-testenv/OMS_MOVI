import { Router } from 'express';
import {
  getAccessMatrix, updateAccessMatrix,
} from '../../controllers/admin/accessMatrix.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
router.use(protect);

router.get('/', requirePermission('Roles', 'update'), getAccessMatrix);
router.put('/', requirePermission('Roles', 'update'), auditLog('Update', 'Access Matrix'), updateAccessMatrix);

export default router;
