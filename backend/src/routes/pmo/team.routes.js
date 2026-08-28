import { Router } from 'express';
import { getTeam, getMemberById, getAvailableMembers, getTeamLeaves } from '../../controllers/pmo/team.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { pmoScope } from '../../middleware/pmoScope.js';

const router = Router();
router.use(protect);
router.use(pmoScope);

router.get('/', requirePermission('Projects', 'read'), getTeam);
router.get('/available', getAvailableMembers);
router.get('/leaves', requirePermission('Projects', 'read'), getTeamLeaves);
router.get('/:id', requirePermission('Projects', 'read'), getMemberById);

export default router;
