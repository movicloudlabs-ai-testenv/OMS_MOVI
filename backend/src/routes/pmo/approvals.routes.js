import { Router } from 'express';
import { getPendingLeaves, getLeaveOverview, getTasksInReview, updateApproval, getPendingOnboarding, approveOnboarding } from '../../controllers/pmo/approvals.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { pmoScope } from '../../middleware/pmoScope.js';

const router = Router();
router.use(protect);
router.use(pmoScope);

router.get('/leaves', requirePermission('Leave', 'read'), getPendingLeaves);
router.get('/leave-overview', requirePermission('Leave', 'read'), getLeaveOverview);
router.get('/tasks', requirePermission('Tasks', 'read'), getTasksInReview);
router.get('/onboarding', requirePermission('Users', 'read'), getPendingOnboarding);
router.post('/onboarding/:id/approve', requirePermission('Users', 'update'), approveOnboarding);
router.put('/:id', requirePermission('Tasks', 'update'), updateApproval);

export default router;
