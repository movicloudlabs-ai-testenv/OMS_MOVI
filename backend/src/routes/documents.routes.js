import { Router } from 'express';
import {
  getDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
} from '../controllers/documents.controller.js';
import { protect } from '../middleware/auth.js';
import { upload, setUploadType } from '../middleware/upload.js';

const router = Router();

// All document operations require authentication
router.use(protect);

// GET /api/documents — List documents
router.get('/', getDocuments);

// POST /api/documents — Upload document
router.post('/', setUploadType('documents'), upload.single('file'), uploadDocument);

// GET /api/documents/:id/download — Download document
router.get('/:id/download', downloadDocument);

// DELETE /api/documents/:id — Delete document
router.delete('/:id', deleteDocument);

export default router;
