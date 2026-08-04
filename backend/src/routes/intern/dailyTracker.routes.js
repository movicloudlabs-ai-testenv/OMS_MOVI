import { Router } from 'express';
import { getMyTodayEntry, getMyEntries, submitMyEntry } from '../../controllers/shared/dailyTracker.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/today', getMyTodayEntry);
router.get('/', getMyEntries);
router.post('/', submitMyEntry);

export default router;
