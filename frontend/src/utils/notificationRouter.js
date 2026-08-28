/**
 * Global Notification Router
 * Centralized, role-aware routing for all notifications in OWMS.
 * Resolves notification objects into exact authorized target URLs.
 */

// 1. Role-specific home dashboards (true fallback only when no target module exists)
export const ROLE_HOME = {
  'super-admin': '/admin/dashboard',
  'admin':       '/admin/dashboard',
  'hr-manager':  '/hr/dashboard',
  'hr':          '/hr/dashboard',
  'pmo-lead':    '/pmo/dashboard',
  'pmo':         '/pmo/dashboard',
  'employee':    '/employee/dashboard',
  'intern':      '/intern/dashboard',
};

// 2. Domain Base Routes per Role
export const DOMAIN_ROUTES = {
  task: {
    'pmo-lead':   '/pmo/tasks',
    'pmo':        '/pmo/tasks',
    'hr-manager': '/hr/tasks',
    'hr':         '/hr/tasks',
    'employee':   '/employee/tasks',
    'intern':     '/intern/tasks',
    'admin':      '/pmo/tasks',
    'super-admin':'/pmo/tasks',
  },
  taskReview: {
    'pmo-lead':   '/pmo/approvals',
    'pmo':        '/pmo/approvals',
    'admin':      '/pmo/approvals',
    'super-admin':'/pmo/approvals',
    'employee':   '/employee/tasks',
    'intern':     '/intern/tasks',
    'hr-manager': '/hr/tasks',
    'hr':         '/hr/tasks',
  },
  leave: {
    'hr-manager': '/hr/leave-approval',
    'hr':         '/hr/leave-approval',
    'pmo-lead':   '/pmo/approvals',
    'pmo':        '/pmo/approvals',
    'employee':   '/employee/leave',
    'intern':     '/intern/leave',
    'admin':      '/hr/leave-approval',
    'super-admin':'/hr/leave-approval',
  },
  project: {
    'pmo-lead':   '/pmo/projects',
    'pmo':        '/pmo/projects',
    'employee':   '/employee/projects',
    'intern':     '/intern/dashboard',
    'hr-manager': '/hr/projects',
    'hr':         '/hr/projects',
    'admin':      '/pmo/projects',
    'super-admin':'/pmo/projects',
  },
  attendance: {
    'hr-manager': '/hr/attendance',
    'hr':         '/hr/attendance',
    'pmo-lead':   '/pmo/attendance',
    'pmo':        '/pmo/attendance',
    'employee':   '/employee/attendance',
    'intern':     '/intern/attendance',
    'admin':      '/hr/attendance',
    'super-admin':'/hr/attendance',
  },
  intern: {
    'hr-manager': '/hr/interns',
    'hr':         '/hr/interns',
    'pmo-lead':   '/pmo/interns',
    'pmo':        '/pmo/interns',
    'admin':      '/hr/interns',
    'super-admin':'/hr/interns',
    'employee':   '/employee/dashboard',
    'intern':     '/intern/profile',
  },
  onboarding: {
    'hr-manager': '/hr/onboarding',
    'hr':         '/hr/onboarding',
    'pmo-lead':   '/pmo/approvals',
    'pmo':        '/pmo/approvals',
    'admin':      '/hr/onboarding',
    'super-admin':'/hr/onboarding',
    'employee':   '/employee/dashboard',
    'intern':     '/intern/dashboard',
  },
  admin: {
    'super-admin': '/admin/dashboard',
    'admin':       '/admin/dashboard',
    'hr-manager':  '/hr/dashboard',
    'pmo-lead':    '/pmo/dashboard',
    'employee':    '/employee/dashboard',
    'intern':      '/intern/dashboard',
  }
};

// 3. Allowed Path Prefixes per Role (for direct link authorization check)
export const ROLE_PREFIXES = {
  'super-admin': ['/admin', '/pmo', '/hr', '/employee', '/intern', '/profile'],
  'admin':       ['/admin', '/pmo', '/hr', '/employee', '/intern', '/profile'],
  'hr-manager':  ['/hr', '/profile'],
  'hr':          ['/hr', '/profile'],
  'pmo-lead':    ['/pmo', '/profile'],
  'pmo':         ['/pmo', '/profile'],
  'employee':    ['/employee', '/profile'],
  'intern':      ['/intern', '/profile'],
};

/**
 * Main Centralized Notification Routing Function
 * Resolves a notification into an exact authorized URL target.
 *
 * @param {Object|string} notif Notification object or link string
 * @param {string} roleSlug Logged-in user's role slug
 * @returns {string} Target URL route with query parameters if reference IDs exist
 */
export function getNotificationTarget(notif, roleSlug) {
  if (!notif) return ROLE_HOME[roleSlug] || '/';

  const link = typeof notif === 'string' ? notif : (notif.link || '');
  const notifType = typeof notif === 'object' ? (notif.type || '') : '';
  const metadata = typeof notif === 'object' ? (notif.metadata || {}) : {};
  const notifTitle = typeof notif === 'object' ? (notif.title || '').toLowerCase() : '';
  const notifMsg = typeof notif === 'object' ? (notif.message || '').toLowerCase() : '';

  // Extract reference IDs
  let taskId = metadata.taskId || metadata.id || null;
  if (!taskId && link) {
    const matchParam = link.match(/[?&]taskId=([^&]+)/);
    if (matchParam) taskId = matchParam[1];
    else {
      const matchPath = link.match(/\/tasks\/([a-fA-F0-9]{24})/);
      if (matchPath) taskId = matchPath[1];
    }
  }

  let projectId = metadata.projectId || null;
  if (!projectId && link) {
    const matchProj = link.match(/\/projects\/([a-fA-F0-9]{24})/);
    if (matchProj) projectId = matchProj[1];
  }

  let internId = metadata.internId || metadata.userId || null;
  if (!internId && link) {
    const matchIntern = link.match(/\/interns\/([a-fA-F0-9]{24})/);
    if (matchIntern) internId = matchIntern[1];
  }

  let leaveId = metadata.leaveId || null;
  if (!leaveId && link) {
    const matchLeave = link.match(/[?&]leaveId=([^&]+)/);
    if (matchLeave) leaveId = matchLeave[1];
  }

  // ─── 1. Task Review Submissions (task_submitted_for_review) ─────────────
  if (notifType === 'task_submitted_for_review' || notifTitle.includes('review') || notifMsg.includes('review')) {
    const base = DOMAIN_ROUTES.taskReview[roleSlug] || ROLE_HOME[roleSlug] || '/';
    return taskId && base.includes('/tasks') ? `${base}?taskId=${taskId}` : base;
  }

  // ─── 2. Task Notifications (task_assigned, task_approved, task_rejected, task_blocked, task_comment, intern_assigned) ───
  if (
    notifType === 'task_assigned' ||
    notifType === 'task_approved' ||
    notifType === 'task_rejected' ||
    notifType === 'task_blocked' ||
    notifType === 'task_comment' ||
    notifType === 'intern_assigned' ||
    link.includes('/tasks') ||
    notifTitle.includes('task') ||
    notifMsg.includes('task')
  ) {
    const base = DOMAIN_ROUTES.task[roleSlug] || ROLE_HOME[roleSlug] || '/';
    return taskId ? `${base}?taskId=${taskId}` : base;
  }

  // ─── 3. Leave Notifications (leave_requested, leave_approved, leave_rejected) ───
  if (
    notifType === 'leave_requested' ||
    notifType === 'leave_approved' ||
    notifType === 'leave_rejected' ||
    link.includes('/leave') ||
    notifTitle.includes('leave') ||
    notifMsg.includes('leave')
  ) {
    const base = DOMAIN_ROUTES.leave[roleSlug] || ROLE_HOME[roleSlug] || '/';
    return leaveId ? `${base}?leaveId=${leaveId}` : base;
  }

  // ─── 4. Project Notifications (project_assigned, project_updated, milestone_reached) ───
  if (
    notifType === 'project_assigned' ||
    notifType === 'project_updated' ||
    notifType === 'milestone_reached' ||
    link.includes('/projects') ||
    notifTitle.includes('project') ||
    notifMsg.includes('project')
  ) {
    const base = DOMAIN_ROUTES.project[roleSlug] || ROLE_HOME[roleSlug] || '/';
    if (projectId && (roleSlug === 'pmo-lead' || roleSlug === 'pmo')) {
      return `${base}/${projectId}`;
    }
    return projectId ? `${base}?projectId=${projectId}` : base;
  }

  // ─── 5. Attendance Notifications (attendance_marked) ────────────────────
  if (
    notifType === 'attendance_marked' ||
    link.includes('/attendance') ||
    notifTitle.includes('attendance') ||
    notifMsg.includes('attendance')
  ) {
    return DOMAIN_ROUTES.attendance[roleSlug] || ROLE_HOME[roleSlug] || '/';
  }

  // ─── 6. Intern / Onboarding Notifications ────────────────────────────────
  if (
    notifType === 'user_created' ||
    link.includes('/onboarding') ||
    link.includes('/interns') ||
    notifTitle.includes('intern') ||
    notifMsg.includes('intern')
  ) {
    const base = link.includes('/onboarding')
      ? (DOMAIN_ROUTES.onboarding[roleSlug] || ROLE_HOME[roleSlug] || '/')
      : (DOMAIN_ROUTES.intern[roleSlug] || ROLE_HOME[roleSlug] || '/');
    return internId && base.endsWith('/interns') ? `${base}/${internId}` : base;
  }

  // ─── 7. Direct Link Verification with Role Prefix Guard ─────────────────
  if (link) {
    if (roleSlug === 'super-admin' || roleSlug === 'admin') return link;

    const prefixes = ROLE_PREFIXES[roleSlug] || [];
    const isAllowed = prefixes.some((p) => link === p || link.startsWith(`${p}/`));
    if (isAllowed) return link;
  }

  // ─── 8. Final Fallback (only when no target module exists) ──────────────
  return ROLE_HOME[roleSlug] || '/';
}
