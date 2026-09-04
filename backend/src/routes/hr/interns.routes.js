import { Router } from 'express';
import {
  getInterns, getInternById,
  addPerformanceRating, assignMentor,
  uploadInternDocument, deleteInternDocument,
  exportInterns, sendMessageToIntern,
} from '../../controllers/hr/interns.controller.js';
import {
  getInternLearning, assignLearning, deleteLearning,
} from '../../controllers/hr/learning.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { hrScope } from '../../middleware/hrScope.js';
import { auditLog } from '../../middleware/audit.js';
import { upload, setUploadType } from '../../middleware/upload.js';

const router = Router();
router.use(protect);
router.use(hrScope);

router.get('/', requirePermission('Interns', 'read'), getInterns);
router.get('/export', requirePermission('Interns', 'read'), exportInterns);
router.get('/:id', requirePermission('Interns', 'read'), getInternById);
router.post('/:id/performance', requirePermission('Interns', 'manage'), auditLog('Update', 'Interns'), addPerformanceRating);
router.patch('/:id/assign-mentor', requirePermission('Interns', 'manage'), auditLog('Update', 'Interns'), assignMentor);
router.post('/:id/message', requirePermission('Interns', 'read'), auditLog('Create', 'Notifications'), sendMessageToIntern);
router.post('/:internId/message', requirePermission('Interns', 'read'), auditLog('Create', 'Notifications'), sendMessageToIntern);

// Document management (Resume, Offer Letter, NDA, ID Proof, Educational Certificate)
router.post(
  '/:id/documents/:docType',
  requirePermission('Interns', 'manage'),
  setUploadType('documents'),
  upload.single('file'),
  auditLog('Update', 'Interns'),
  uploadInternDocument
);
router.delete(
  '/:id/documents/:docType',
  requirePermission('Interns', 'manage'),
  auditLog('Update', 'Interns'),
  deleteInternDocument
);

// Learning management
router.get('/:id/learning', requirePermission('Interns', 'read'), getInternLearning);
router.post('/:id/learning', requirePermission('Interns', 'manage'), auditLog('Create', 'Learning'), assignLearning);
router.delete('/:id/learning/:resourceId', requirePermission('Interns', 'manage'), auditLog('Delete', 'Learning'), deleteLearning);

export default router;
