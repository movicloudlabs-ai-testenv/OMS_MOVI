import { Router } from 'express';
import {
  getCandidates, getCandidateStats, getCandidateById,
  createCandidate, updateCandidate, deleteCandidate,
  addCandidateNote,
  uploadCandidateDocument, deleteCandidateDocument,
  convertCandidateToUser,
} from '../../controllers/hr/candidates.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { auditLog } from '../../middleware/audit.js';
import { upload, setUploadType } from '../../middleware/upload.js';

const router = Router();
router.use(protect);

router.get('/stats', requirePermission('Recruitment', 'read'), getCandidateStats);

router.get('/', requirePermission('Recruitment', 'read'), getCandidates);
router.post('/', requirePermission('Recruitment', 'create'), auditLog('Create', 'Recruitment'), createCandidate);

router.get('/:id', requirePermission('Recruitment', 'read'), getCandidateById);
router.patch('/:id', requirePermission('Recruitment', 'update'), auditLog('Update', 'Recruitment'), updateCandidate);
router.delete('/:id', requirePermission('Recruitment', 'delete'), auditLog('Delete', 'Recruitment'), deleteCandidate);

router.post('/:id/convert-to-user', requirePermission('Recruitment', 'update'), auditLog('Create', 'Users'), convertCandidateToUser);
router.post('/:id/notes', requirePermission('Recruitment', 'update'), auditLog('Update', 'Recruitment'), addCandidateNote);

// Document management (Resume, Offer Letter, NDA)
router.post(
  '/:id/documents/:docType',
  requirePermission('Recruitment', 'update'),
  setUploadType('documents'),
  upload.single('file'),
  auditLog('Update', 'Recruitment'),
  uploadCandidateDocument
);
router.delete(
  '/:id/documents/:docType',
  requirePermission('Recruitment', 'update'),
  auditLog('Update', 'Recruitment'),
  deleteCandidateDocument
);

export default router;
