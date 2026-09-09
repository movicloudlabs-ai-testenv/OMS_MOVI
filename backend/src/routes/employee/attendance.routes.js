import { Router } from 'express';
import { getMyAttendance } from '../../controllers/hr/myAttendance.controller.js';
import {
  getTodayAttendance,
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  submitRegularization,
  getMyRegularizations,
  resetTodayAttendance,
} from '../../controllers/shared/selfAttendance.controller.js';
import { protect } from '../../middleware/auth.js';
import { employeeScope } from '../../middleware/employeeScope.js';

const router = Router();
router.use(protect);

router.get('/', getMyAttendance);
router.get('/today', getTodayAttendance);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.post('/reset-today', resetTodayAttendance);
router.delete('/today', resetTodayAttendance);

// Break management
router.post('/break/start', startBreak);
router.post('/break/end', endBreak);

// Regularization routes
router.post('/regularize', submitRegularization);
router.get('/regularize/my', getMyRegularizations);

export default router;

