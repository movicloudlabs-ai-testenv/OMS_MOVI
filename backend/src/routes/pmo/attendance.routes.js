import { Router } from 'express';
import { getMyAttendance } from '../../controllers/employee/attendance.controller.js';
import { protect } from '../../middleware/auth.js';
import { pmoScope } from '../../middleware/pmoScope.js';

const router = Router();
router.use(protect, pmoScope);

router.get('/', getMyAttendance);

export default router;
