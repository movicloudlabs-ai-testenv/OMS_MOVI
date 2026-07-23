import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

// Route imports
import authRoutes from './routes/auth.routes.js';
import meRoutes from './routes/me.routes.js';
import adminUserRoutes from './routes/admin/users.routes.js';
import adminDeptRoutes from './routes/admin/departments.routes.js';
import adminRoleRoutes from './routes/admin/roles.routes.js';
import adminPermRoutes from './routes/admin/permissions.routes.js';
import adminMatrixRoutes from './routes/admin/accessMatrix.routes.js';
import adminAuditRoutes from './routes/admin/auditLogs.routes.js';
import adminReportsRoutes from './routes/admin/reports.routes.js';
import adminSettingsRoutes from './routes/admin/settings.routes.js';
import adminDashboardRoutes from './routes/admin/dashboard.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import logsRoutes from './routes/logs.routes.js';

// Part 2 Route Imports
import hrEmployeesRoutes from './routes/hr/employees.routes.js';
import hrOnboardingRoutes from './routes/hr/onboarding.routes.js';
import hrAttendanceRoutes from './routes/hr/attendance.routes.js';
import hrLeavesRoutes from './routes/hr/leaves.routes.js';
import hrInternsRoutes from './routes/hr/interns.routes.js';
import hrReportsRoutes from './routes/hr/reports.routes.js';
import hrTasksRoutes from './routes/hr/tasks.routes.js';
import hrProjectsRoutes from './routes/hr/projects.routes.js';

import pmoProjectsRoutes from './routes/pmo/projects.routes.js';
import pmoTasksRoutes from './routes/pmo/tasks.routes.js';
import pmoTeamRoutes from './routes/pmo/team.routes.js';
import pmoInternsRoutes from './routes/pmo/interns.routes.js';
import pmoApprovalsRoutes from './routes/pmo/approvals.routes.js';
import pmoReportsRoutes from './routes/pmo/reports.routes.js';
import pmoDashboardRoutes from './routes/pmo/dashboard.routes.js';

import empProfileRoutes from './routes/employee/profile.routes.js';
import empTasksRoutes from './routes/employee/tasks.routes.js';
import empProjectsRoutes from './routes/employee/projects.routes.js';
import empTeamRoutes from './routes/employee/team.routes.js';
import empAttendanceRoutes from './routes/employee/attendance.routes.js';
import empLeaveRoutes from './routes/employee/leave.routes.js';
import empNotificationsRoutes from './routes/employee/notifications.routes.js';

import internProfileRoutes from './routes/intern/profile.routes.js';
import internTasksRoutes from './routes/intern/tasks.routes.js';
import internAttendanceRoutes from './routes/intern/attendance.routes.js';
import internLeaveRoutes from './routes/intern/leave.routes.js';
import internLearningRoutes from './routes/intern/learning.routes.js';
// Middleware
import { errorHandler } from './middleware/errorHandler.js';
import { apiLogger } from './middleware/apiLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── Trust Proxy ──────────────────────────────────────────────────────────────
// Behind a reverse proxy / load balancer (Nginx, Render, Vercel, Cloudflare),
// req.ip and X-Forwarded-For resolve to the real client IP instead of the proxy.
app.set('trust proxy', 1);

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── UA Client Hints ──────────────────────────────────────────────────────────
// Ask Chromium browsers to send high-entropy hints so audit logs can tell
// Windows 11 from Windows 10 (both share "Windows NT 10.0" in the UA string).
app.use((req, res, next) => {
  res.setHeader('Accept-CH', 'Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version');
  next();
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
const defaultFrontendOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (defaultFrontendOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV === 'development') {
      try {
        const url = new URL(origin);
        const isLocalHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        const port = Number(url.port);
        if (isLocalHost && port >= 5173 && port <= 5199) {
          return callback(null, true);
        }
      } catch {
        // Ignore malformed origins and fall through to the denial below.
      }
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id', 'Sec-CH-UA-Platform', 'Sec-CH-UA-Platform-Version'],
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── API Request Logger ───────────────────────────────────────────────────────
app.use(apiLogger);

// ─── Request Logging (dev only) ───────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 2000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/api/health',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Health Check Routes ──────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OWMS API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    mongoConnection: mongoose.connection.readyState === 1
      ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/departments', adminDeptRoutes);
app.use('/api/admin/roles', adminRoleRoutes);
app.use('/api/admin/permissions', adminPermRoutes);
app.use('/api/admin/access-matrix', adminMatrixRoutes);
app.use('/api/admin/audit-logs', adminAuditRoutes);
app.use('/api/admin/reports', adminReportsRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/logs', logsRoutes);

// HR Module
app.use('/api/hr/employees', hrEmployeesRoutes);
app.use('/api/hr/onboarding', hrOnboardingRoutes);
app.use('/api/hr/attendance', hrAttendanceRoutes);
app.use('/api/hr/leaves', hrLeavesRoutes);
app.use('/api/hr/interns', hrInternsRoutes);
app.use('/api/hr/reports', hrReportsRoutes);
app.use('/api/hr/tasks', hrTasksRoutes);
app.use('/api/hr/projects', hrProjectsRoutes);

// PMO Module
app.use('/api/pmo/dashboard', pmoDashboardRoutes);
app.use('/api/pmo/projects', pmoProjectsRoutes);
app.use('/api/pmo/tasks', pmoTasksRoutes);
app.use('/api/pmo/team', pmoTeamRoutes);
app.use('/api/pmo/interns', pmoInternsRoutes);
app.use('/api/pmo/approvals', pmoApprovalsRoutes);
app.use('/api/pmo/reports', pmoReportsRoutes);

// Employee Module
app.use('/api/employee/profile', empProfileRoutes);
app.use('/api/employee/tasks', empTasksRoutes);
app.use('/api/employee/projects', empProjectsRoutes);
app.use('/api/employee/team', empTeamRoutes);
app.use('/api/employee/attendance', empAttendanceRoutes);
app.use('/api/employee/leave', empLeaveRoutes);
app.use('/api/employee/notifications', empNotificationsRoutes);

// Intern Module
app.use('/api/intern/profile', internProfileRoutes);
app.use('/api/intern/tasks', internTasksRoutes);
app.use('/api/intern/attendance', internAttendanceRoutes);
app.use('/api/intern/leave', internLeaveRoutes);
app.use('/api/intern/learning', internLearningRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
