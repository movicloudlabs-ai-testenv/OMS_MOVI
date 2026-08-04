import { Router } from 'express';
import { getMyTodayEOD, getMyEODs, submitMyEOD } from '../../controllers/shared/eodReport.controller.js';
import { protect } from '../../middleware/auth.js';
import { employeeScope } from '../../middleware/employeeScope.js';

const router = Router();
router.use(protect, employeeScope);

router.get('/today', getMyTodayEOD);
router.get('/', getMyEODs);
router.post('/', submitMyEOD);

export default router;
