import { Router } from 'express';
import { getMyTodayEOD, getMyEODs, submitMyEOD } from '../../controllers/shared/eodReport.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/today', getMyTodayEOD);
router.get('/', getMyEODs);
router.post('/', submitMyEOD);

export default router;
