import { Router } from 'express';
import { getTeam, getTeamMember } from '../../controllers/employee/team.controller.js';
import { protect } from '../../middleware/auth.js';
import { employeeScope } from '../../middleware/employeeScope.js';

const router = Router();
router.use(protect, employeeScope);

router.get('/', getTeam);
router.get('/:userId', getTeamMember);

export default router;
