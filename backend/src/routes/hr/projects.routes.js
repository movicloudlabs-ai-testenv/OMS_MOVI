import { Router } from 'express';
import { getMyProjects, getProjectById } from '../../controllers/hr/projects.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/',    getMyProjects);
router.get('/:id', getProjectById);

export default router;
