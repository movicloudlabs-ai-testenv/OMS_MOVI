import { Router } from 'express';
import { getMyAttendance } from '../../controllers/hr/myAttendance.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', getMyAttendance);

export default router;
