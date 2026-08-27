import { Router } from 'express';
import { getMyPayments } from '../../controllers/admin/payments.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', getMyPayments);

export default router;
