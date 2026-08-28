import { Router } from 'express';
import {
  getAuditLogs, getAuditLogById, exportAuditLogs,
} from '../../controllers/admin/auditLogs.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';

const router = Router();
router.use(protect);

router.get('/', requirePermission('Audit Logs', 'read'), getAuditLogs);
router.get('/export', requirePermission('Audit Logs', 'export'), exportAuditLogs);
router.get('/:id', requirePermission('Audit Logs', 'read'), getAuditLogById);

export default router;
