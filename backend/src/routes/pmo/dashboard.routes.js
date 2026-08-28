import { Router } from 'express';
import { getDashboardStats } from '../../controllers/pmo/dashboard.controller.js';
import { protect } from '../../middleware/auth.js';
import { pmoScope } from '../../middleware/pmoScope.js';
import { requirePermission } from '../../middleware/rbac.js';

const router = Router();
router.use(protect);
router.use(pmoScope);

router.get('/', requirePermission('Projects', 'read'), getDashboardStats);

export default router;
