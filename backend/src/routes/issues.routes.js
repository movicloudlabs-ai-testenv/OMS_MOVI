import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { createIssue, getIssues, updateIssue } from '../controllers/shared/issue.controller.js';

const router = Router();
router.use(protect);
router.get('/', getIssues);
router.post('/', createIssue);
router.patch('/:id', updateIssue);

export default router;
