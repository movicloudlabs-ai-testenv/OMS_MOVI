import { Router } from 'express';
import {
  getMyTasks, getMyTask, getInternTasks, getEmployeeTasks,
  updateMyTaskStatus, assignTask, addMyTaskComment, toggleMySubtask, addMyTaskAttachment,
} from '../../controllers/hr/tasks.controller.js';
import { protect } from '../../middleware/auth.js';
import { hrScope } from '../../middleware/hrScope.js';
import { upload, setUploadType } from '../../middleware/upload.js';

const router = Router();
router.use(protect);
router.use(hrScope);

// HR's own tasks — no permission gate needed, scoped to assignedTo: req.user._id
router.get('/my',            getMyTasks);
router.get('/my/:id',        getMyTask);
router.patch('/my/:id/status', updateMyTaskStatus);
router.patch('/my/:id/subtasks/:index', toggleMySubtask);
router.post('/my/:id/comments', addMyTaskComment);
router.post('/my/:id/attachments', setUploadType('attachments'), upload.single('file'), addMyTaskAttachment);

// View-only boards for team
router.get('/interns',   getInternTasks);
router.get('/employees', getEmployeeTasks);

// Assign task to team member
router.post('/assign', assignTask);

export default router;
