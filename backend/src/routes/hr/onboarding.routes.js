import { Router } from 'express';
import {
  getPendingOnboarding, getCompletedOnboarding, updateChecklist,
  getHRList, reassignHR,
} from '../../controllers/hr/onboarding.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { hrScope } from '../../middleware/hrScope.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
router.use(protect);
router.use(hrScope);

router.get('/pending',         requirePermission('Users', 'read'),   getPendingOnboarding);
router.get('/completed',       requirePermission('Users', 'read'),   getCompletedOnboarding);
router.get('/hr-list',         requirePermission('Users', 'read'),   getHRList);
router.patch('/:id/checklist', requirePermission('Users', 'update'), auditLog('Update', 'Users'), updateChecklist);
router.patch('/:id/reassign',  requirePermission('Users', 'update'), auditLog('Update', 'Users'), reassignHR);

export default router;
