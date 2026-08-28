import { Router } from 'express';
import { getMyAttendance } from '../../controllers/hr/myAttendance.controller.js';
import { protect } from '../../middleware/auth.js';
import { hrScope } from '../../middleware/hrScope.js';

const router = Router();

// This route applies to the logged-in HR
router.use(protect);
router.use(hrScope);

router.get('/', getMyAttendance);

export default router;
