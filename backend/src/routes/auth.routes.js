import { Router } from 'express';
import {
  login,
  getMe,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login — Login with email or employeeId
router.post('/login', login);

// POST /api/auth/forgot-password — Request a password reset link
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password — Set a new password using a reset token
router.post('/reset-password', resetPassword);

// POST /api/auth/refresh — Refresh access token
router.post('/refresh', refreshToken);

// POST /api/auth/logout — Invalidate refresh token
router.post('/logout', protect, logout);

// GET /api/auth/me — Get current authenticated user
router.get('/me', protect, getMe);

export default router;
