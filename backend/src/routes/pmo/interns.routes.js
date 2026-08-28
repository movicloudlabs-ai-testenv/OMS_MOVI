import { Router } from 'express';
import { getInterns, getInternById, addPerformanceRating, requestInterns } from '../../controllers/pmo/interns.controller.js';
import { getInternLearning, assignLearning, deleteLearning } from '../../controllers/hr/learning.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { pmoScope } from '../../middleware/pmoScope.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
router.use(protect);
router.use(pmoScope);

router.get('/', requirePermission('Interns', 'read'), getInterns);
router.get('/:id', requirePermission('Interns', 'read'), getInternById);
router.post('/:id/performance', requirePermission('Interns', 'manage'), addPerformanceRating);
router.post('/request', requirePermission('Interns', 'manage'), auditLog('Create', 'Interns'), requestInterns);

// Learning management
router.get('/:id/learning', requirePermission('Interns', 'read'), getInternLearning);
router.post('/:id/learning', requirePermission('Interns', 'manage'), auditLog('Create', 'Learning'), assignLearning);
router.delete('/:id/learning/:resourceId', requirePermission('Interns', 'manage'), auditLog('Delete', 'Learning'), deleteLearning);

export default router;
