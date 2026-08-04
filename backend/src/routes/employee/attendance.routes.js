import { Router } from 'express';
import { getMyAttendance } from '../../controllers/hr/myAttendance.controller.js';
import { getTodayAttendance, checkIn, checkOut } from '../../controllers/shared/selfAttendance.controller.js';
import { protect } from '../../middleware/auth.js';
import { employeeScope } from '../../middleware/employeeScope.js';

const router = Router();
router.use(protect, employeeScope);

router.get('/', getMyAttendance);
router.get('/today', getTodayAttendance);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

export default router;
