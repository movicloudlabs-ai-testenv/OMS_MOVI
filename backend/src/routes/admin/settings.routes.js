import express from 'express';
import {
  getSettings,
  updateSettings,
  resetSettings,
  testEmail,
  uploadLogo,
} from '../../controllers/admin/settings.controller.js';
import { protect }            from '../../middleware/auth.js';
import { requirePermission }  from '../../middleware/rbac.js';
import { upload, setUploadType } from '../../middleware/upload.js';

const router = express.Router();
router.use(protect);

router.get('/',              requirePermission('Settings', 'read'),   getSettings);
router.put('/',              requirePermission('Settings', 'update'), updateSettings);
router.post('/reset',        requirePermission('Settings', 'update'), resetSettings);
router.post('/test-email',   requirePermission('Settings', 'update'), testEmail);
router.post('/upload-logo',  requirePermission('Settings', 'update'), setUploadType('avatars'), upload.single('logo'), uploadLogo);

export default router;
