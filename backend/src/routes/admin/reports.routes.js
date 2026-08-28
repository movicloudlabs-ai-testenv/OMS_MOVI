import { Router } from 'express';
import {
  listReports,
  triggerRun,
  getRunStatus,
  exportReport,
  deleteReport,
  archiveReport,
} from '../../controllers/admin/reports.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';

const router = Router();
router.use(protect);

router.get('/',                             requirePermission('Reports', 'read'),   listReports);
router.post('/:id/run',                     requirePermission('Reports', 'read'),   triggerRun);
router.get('/:id/runs/:runId/status',       requirePermission('Reports', 'read'),   getRunStatus);
router.get('/:id/export',                   requirePermission('Reports', 'read'),   exportReport);
router.delete('/:id',                       requirePermission('Reports', 'read'),   deleteReport);
router.patch('/:id/archive',                requirePermission('Reports', 'read'),   archiveReport);

export default router;
