import { Router } from 'express';
import {
  getDocuments, uploadDocument, downloadDocument, deleteDocument,
} from '../controllers/documents.controller.js';
import { protect } from '../middleware/auth.js';
import { upload, setUploadType } from '../middleware/upload.js';

const router = Router();
router.use(protect);

router.get('/', getDocuments);
router.post('/', setUploadType('documents'), upload.single('file'), uploadDocument);
router.get('/:id/download', downloadDocument);
router.delete('/:id', deleteDocument);

export default router;
