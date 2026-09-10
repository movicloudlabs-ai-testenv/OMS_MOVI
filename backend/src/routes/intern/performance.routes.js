import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { getMonthlyPerformance, getPerformanceHistory } from '../../controllers/intern/performance.controller.js';
const router = Router();
router.use(protect);
router.get('/monthly', getMonthlyPerformance);
router.get('/', getPerformanceHistory);
export default router;
