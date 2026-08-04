import { Router } from 'express';
import { getMyAttendance } from '../../controllers/hr/myAttendance.controller.js';
import { getTodayAttendance, checkIn, checkOut } from '../../controllers/shared/selfAttendance.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', getMyAttendance);
router.get('/today', getTodayAttendance);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

export default router;
