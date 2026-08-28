import { Router } from 'express';
import {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
} from '../../controllers/admin/payments.controller.js';
import { protect } from '../../middleware/auth.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
router.use(protect);

router.get('/', getPayments);
router.post('/', auditLog('Create', 'Payments'), createPayment);
router.get('/:id', getPaymentById);
router.put('/:id', auditLog('Update', 'Payments'), updatePayment);
router.delete('/:id', auditLog('Delete', 'Payments'), deletePayment);

export default router;
