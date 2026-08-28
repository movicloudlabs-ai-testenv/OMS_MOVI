import { Router } from 'express';
import {
  getDashboardStats, createAnnouncement, deleteAnnouncement,
} from '../../controllers/admin/dashboard.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();
router.use(protect);

// Admin-only — same restriction as the dashboard page itself.
const adminOnly = (req, res, next) => {
  const slug = req.user?.role?.slug;
  if (slug === 'admin' || slug === 'super-admin') return next();
  return res.status(403).json({ success: false, message: 'Access denied — admin only' });
};

router.get('/stats', adminOnly, getDashboardStats);
router.post('/announcements', adminOnly, createAnnouncement);
router.delete('/announcements/:id', adminOnly, deleteAnnouncement);

export default router;
