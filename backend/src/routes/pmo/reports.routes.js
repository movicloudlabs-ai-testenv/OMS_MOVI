import { Router } from 'express';
import { getProjectHealth, getResourceWarnings, getReportsList } from '../../controllers/pmo/reports.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { pmoScope } from '../../middleware/pmoScope.js';

const router = Router();
router.use(protect);
router.use(pmoScope);

router.get('/', requirePermission('Reports', 'read'), getReportsList);
router.get('/health', requirePermission('Projects', 'read'), getProjectHealth);
router.get('/warnings', requirePermission('Users', 'read'), getResourceWarnings);

export default router;
