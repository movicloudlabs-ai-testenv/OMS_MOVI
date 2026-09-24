import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { createBug, getBugs, getNextIds } from '../controllers/shared/bug.controller.js';

const router = Router();
router.use(protect);

router.get('/preview', getNextIds);
router.get('/', getBugs);
router.post('/', createBug);

export default router;
