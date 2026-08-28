import { Router } from 'express';
import { getProfile, updateProfile, changePassword } from '../../controllers/employee/profile.controller.js';
import { protect } from '../../middleware/auth.js';
import { employeeScope } from '../../middleware/employeeScope.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
router.use(protect, employeeScope);

router.get('/', getProfile);
router.patch('/', auditLog('Update', 'Profile'), updateProfile);
router.post('/change-password', changePassword);

export default router;
