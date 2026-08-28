import { Router } from 'express';
import {
  getMyLeaveBalance, getMyLeaves, applyForLeave, cancelLeave,
} from '../../controllers/employee/leave.controller.js';
import { protect } from '../../middleware/auth.js';
import { employeeScope } from '../../middleware/employeeScope.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
router.use(protect, employeeScope);

router.get('/balance', getMyLeaveBalance);
router.get('/requests', getMyLeaves);
router.post('/apply', auditLog('Create', 'Leave'), applyForLeave);
router.delete('/:id', cancelLeave);

export default router;
