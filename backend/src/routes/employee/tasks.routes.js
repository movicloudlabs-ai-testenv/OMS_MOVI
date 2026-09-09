import { Router } from 'express';
import {
  getMyTasks, getTask, updateTaskStatus,
  addTaskComment, uploadAttachment, toggleSubtask,
  createPersonalTask, getMyProjects, getProjectTeamMembers,
  createProjectTask, sendToTesting, testSubtask,
} from '../../controllers/employee/tasks.controller.js';
import { protect } from '../../middleware/auth.js';
import { employeeScope } from '../../middleware/employeeScope.js';
import { auditLog } from '../../middleware/audit.js';
import { upload, setUploadType } from '../../middleware/upload.js';

const router = Router();
router.use(protect, employeeScope);

// Named routes MUST come before /:id to avoid being treated as IDs
router.get('/my-projects', getMyProjects);
router.get('/project-members/:projectId', getProjectTeamMembers);
router.post('/create-task', auditLog('Create', 'Tasks'), createProjectTask);
router.post('/personal', createPersonalTask);

router.get('/', getMyTasks);
router.get('/:id', getTask);
router.patch('/:id/status', auditLog('Update', 'Tasks'), updateTaskStatus);
router.post('/:id/comments', addTaskComment);
router.post('/:id/attachments', setUploadType('attachments'), upload.single('file'), uploadAttachment);
router.patch('/:id/subtasks/:subtaskId', toggleSubtask);

// QA & Testing workflow
router.post('/:id/send-to-testing', auditLog('Update', 'Tasks'), sendToTesting);
router.patch('/:id/test-subtask/:subtaskId', testSubtask);

export default router;

