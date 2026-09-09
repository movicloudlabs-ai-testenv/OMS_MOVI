import { Router } from 'express';
import {
  getAssessmentDrives,
  createAssessmentDrive,
  updateAssessmentDrive,
  addQuestions,
  deleteQuestion,
  getDriveSubmissions,
  startCandidateSession,
  submitCandidateSession,
  recordTabSwitch,
  getActiveDrivesStatus,
} from '../../controllers/hr/assessments.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();

// ─── PUBLIC CANDIDATE PORTAL ROUTES (No Auth Required) ───────────────────────
router.get('/session/active-status', getActiveDrivesStatus);
router.post('/session/start', startCandidateSession);
router.post('/session/submit', submitCandidateSession);
router.post('/session/tab-switch', recordTabSwitch);

// ─── PROTECTED HR ROUTES ─────────────────────────────────────────────────────
router.use(protect);

router.get('/', requirePermission('Recruitment', 'read'), getAssessmentDrives);
router.post('/', requirePermission('Recruitment', 'create'), auditLog('Create', 'AssessmentDrive'), createAssessmentDrive);
router.patch('/:id', requirePermission('Recruitment', 'update'), auditLog('Update', 'AssessmentDrive'), updateAssessmentDrive);
router.post('/:id/questions', requirePermission('Recruitment', 'update'), auditLog('Update', 'AssessmentDrive'), addQuestions);
router.delete('/:id/questions/:questionId', requirePermission('Recruitment', 'update'), auditLog('Delete', 'AssessmentDrive'), deleteQuestion);
router.get('/:id/submissions', requirePermission('Recruitment', 'read'), getDriveSubmissions);

export default router;
