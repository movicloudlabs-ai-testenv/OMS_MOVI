import { Router } from 'express';
import {
  getMyTasks, getTask, updateTaskStatus,
  addTaskComment, uploadAttachment, toggleSubtask,
} from '../../controllers/employee/tasks.controller.js';
import { protect } from '../../middleware/auth.js';
import { employeeScope } from '../../middleware/employeeScope.js';
import { auditLog } from '../../middleware/audit.js';
import { upload, setUploadType } from '../../middleware/upload.js';

const router = Router();
router.use(protect, employeeScope);

router.get('/', getMyTasks);
router.get('/:id', getTask);
router.patch('/:id/status', auditLog('Update', 'Tasks'), updateTaskStatus);
router.post('/:id/comments', addTaskComment);
router.post('/:id/attachments', setUploadType('attachments'), upload.single('file'), uploadAttachment);
router.patch('/:id/subtasks/:subtaskId', toggleSubtask);

export default router;
