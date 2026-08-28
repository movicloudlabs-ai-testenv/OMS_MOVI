import { Router } from 'express';
import { getMyProjects, getProjectById, getMyTeam } from '../../controllers/employee/projects.controller.js';
import { protect } from '../../middleware/auth.js';
import { employeeScope } from '../../middleware/employeeScope.js';

const router = Router();
router.use(protect, employeeScope);

router.get('/', getMyProjects);
router.get('/team', getMyTeam);
router.get('/:id', getProjectById);

export default router;
