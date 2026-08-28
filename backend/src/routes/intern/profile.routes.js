import { Router } from 'express';
import { getProfile, updateProfile } from '../../controllers/intern/profile.controller.js';
import { changePassword } from '../../controllers/employee/profile.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', getProfile);
router.patch('/', updateProfile);
router.post('/change-password', changePassword);

export default router;
