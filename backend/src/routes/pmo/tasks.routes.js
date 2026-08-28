import { Router } from 'express';
import {
  getTasks, getTaskById, createTask,
  updateTask, updateTaskStatus, addTaskComment,
  addTaskAttachment, deleteTask,
} from '../../controllers/pmo/tasks.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { pmoScope } from '../../middleware/pmoScope.js';
import { auditLog } from '../../middleware/audit.js';
import { upload, setUploadType } from '../../middleware/upload.js';

const router = Router();
router.use(protect);
router.use(pmoScope);

router.get('/', requirePermission('Tasks', 'read'), getTasks);
router.post('/', requirePermission('Tasks', 'create'), auditLog('Create', 'Tasks'), createTask);
router.get('/:id', requirePermission('Tasks', 'read'), getTaskById);
router.put('/:id', requirePermission('Tasks', 'update'), auditLog('Update', 'Tasks'), updateTask);
router.patch('/:id/status', requirePermission('Tasks', 'update'), auditLog('Update', 'Tasks'), updateTaskStatus);
router.post('/:id/comments', requirePermission('Tasks', 'update'), addTaskComment);
router.post('/:id/attachments', requirePermission('Tasks', 'update'), setUploadType('attachments'), upload.single('file'), auditLog('Update', 'Tasks'), addTaskAttachment);
router.delete('/:id', requirePermission('Tasks', 'delete'), auditLog('Delete', 'Tasks'), deleteTask);

export default router;
