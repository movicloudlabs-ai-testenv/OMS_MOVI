import { Router } from 'express';
import { getMyTodayEntry, getMyEntries, submitMyEntry } from '../../controllers/shared/dailyTracker.controller.js';
import { protect } from '../../middleware/auth.js';
import { employeeScope } from '../../middleware/employeeScope.js';

const router = Router();
router.use(protect, employeeScope);

router.get('/today', getMyTodayEntry);
router.get('/', getMyEntries);
router.post('/', submitMyEntry);

export default router;
