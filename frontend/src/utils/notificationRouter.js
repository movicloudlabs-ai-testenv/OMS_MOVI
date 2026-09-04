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
  'super-admin': ['/admin', '/pmo', '/hr', '/employee', '/intern', '/profile', '/support'],
  'admin':       ['/admin', '/pmo', '/hr', '/employee', '/intern', '/profile', '/support'],
  'hr-manager':  ['/hr', '/profile', '/support'],
  'hr':          ['/hr', '/profile', '/support'],
  'pmo-lead':    ['/pmo', '/profile', '/support'],
  'pmo':         ['/pmo', '/profile', '/support'],
  'employee':    ['/employee', '/profile', '/support'],
  'intern':      ['/intern', '/profile', '/support'],
};

/**
 * Normalizes any role input (string or object, with spaces or underscores)
 * into a standardized role slug (e.g. 'pmo-lead', 'hr-manager', 'employee', 'intern', 'super-admin').
 */
export function normalizeRoleSlug(roleInput) {
  if (!roleInput) return '';
  if (typeof roleInput === 'object') {
    if (roleInput.slug) return normalizeRoleSlug(roleInput.slug);
    if (typeof roleInput.role === 'object' && (roleInput.role?.slug || roleInput.role?.name)) {
      return normalizeRoleSlug(roleInput.role.slug || roleInput.role.name);
    }
    const roleCandidate =
      roleInput.designation ||
      (typeof roleInput.role === 'string' && !/^[0-9a-fA-F]{24}$/.test(roleInput.role) ? roleInput.role : '') ||
      (roleInput.employmentType && roleInput.employmentType !== 'Full-time' ? roleInput.employmentType : '') ||
      (typeof roleInput.name === 'string' && /admin|hr|pmo|intern|employee/i.test(roleInput.name) ? roleInput.name : '') ||
      '';
    if (roleCandidate) return normalizeRoleSlug(roleCandidate);
  }
  let str = String(roleInput).toLowerCase().trim();
  // If it's a 24-character hex ObjectId, it cannot be a role slug
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    return '';
  }
  str = str.replace(/_/g, '-').replace(/\s+/g, '-');

  if (str.includes('pmo')) return 'pmo-lead';
  if (str.includes('hr')) return 'hr-manager';
  if (str.includes('intern')) return 'intern';
  if (str.includes('super-admin') || str.includes('superadmin')) return 'super-admin';
  if (str.includes('admin')) return 'admin';
  if (str.includes('emp')) return 'employee';

  return str;
}

/**
 * Main Centralized Notification Routing Function
 * Resolves a notification into an exact authorized URL target.
 *
 * @param {Object|string} notif Notification object or link string
 * @param {string} roleSlug Logged-in user's role slug
 * @returns {string} Target URL route with query parameters if reference IDs exist
 */
export function getNotificationTarget(notif, roleSlug) {
  const normRole = normalizeRoleSlug(roleSlug);
  if (!notif) return ROLE_HOME[normRole] || '/';

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

  let issueId = metadata.issueId || metadata.ticketId || null;
  if (!issueId && link) {
    const matchIssue = link.match(/[?&](?:issueId|ticketId)=([^&]+)/);
    if (matchIssue) issueId = matchIssue[1];
    else {
      const matchTicket = link.match(/\b(ISS-\d+)\b/i);
      if (matchTicket) issueId = matchTicket[0].toUpperCase();
    }
  }
  if (!issueId && notifTitle) {
    const matchTitleTicket = notifTitle.match(/\b(ISS-\d+)\b/i);
    if (matchTitleTicket) issueId = matchTitleTicket[0].toUpperCase();
  }

  // ─── 0. Announcements (Viewed in-place via modal) ───────────────────────
  if (
    notifType === 'announcement' ||
    metadata.isAnnouncement ||
    notifTitle.includes('announcement') ||
    notifTitle.startsWith('📢')
  ) {
    return null;
  }

  // ─── 1. Task Review Submissions (task_submitted_for_review) ─────────────
  if (notifType === 'task_submitted_for_review' || notifTitle.includes('review') || notifMsg.includes('review')) {
    const base = DOMAIN_ROUTES.taskReview[normRole] || ROLE_HOME[normRole] || '/';
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
    const base = DOMAIN_ROUTES.task[normRole] || ROLE_HOME[normRole] || '/';
    if (!taskId) return base;

    const isCommentNotif = notifType === 'task_comment' || notifTitle.includes('comment') || notifMsg.includes('comment');
    return isCommentNotif ? `${base}?taskId=${taskId}&tab=comments` : `${base}?taskId=${taskId}`;
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
    const base = DOMAIN_ROUTES.leave[normRole] || ROLE_HOME[normRole] || '/';
    return leaveId ? `${base}?leaveId=${leaveId}` : base;
  }

  // ─── 3.5 Support Issue Notifications (issue_reported, issue_status_updated) ───
  if (
    notifType === 'issue_reported' ||
    notifType === 'issue_status_updated' ||
    link.includes('/support/issues') ||
    notifTitle.includes('issue') ||
    notifTitle.includes('support') ||
    notifMsg.includes('issue')
  ) {
    const base = '/support/issues';
    return issueId ? `${base}?issueId=${issueId}` : base;
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
    const base = DOMAIN_ROUTES.project[normRole] || ROLE_HOME[normRole] || '/';
    if (projectId && (normRole === 'pmo-lead' || normRole === 'pmo')) {
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
    return DOMAIN_ROUTES.attendance[normRole] || ROLE_HOME[normRole] || '/';
  }

  // ─── 6. Intern / Onboarding Notifications ────────────────────────────────
  if (
    notifType === 'user_created' ||
    link.includes('/onboarding') ||
    link.includes('/interns') ||
    /\binterns?\b/i.test(notifTitle) ||
    notifTitle.includes('onboarding') ||
    notifMsg.includes('onboarding')
  ) {
    const base = link.includes('/onboarding')
      ? (DOMAIN_ROUTES.onboarding[normRole] || ROLE_HOME[normRole] || '/')
      : (DOMAIN_ROUTES.intern[normRole] || ROLE_HOME[normRole] || '/');
    return internId && base.endsWith('/interns') ? `${base}/${internId}` : base;
  }

  // ─── 7. Direct Link Verification with Role Prefix Guard ─────────────────
  if (link) {
    if (normRole === 'super-admin' || normRole === 'admin') return link;

    const prefixes = ROLE_PREFIXES[normRole] || [];
    const isAllowed = prefixes.some((p) => link === p || link.startsWith(`${p}/`));
    if (isAllowed) return link;
  }

  // ─── 8. Final Fallback (only when no target module exists) ──────────────
  return ROLE_HOME[normRole] || '/';
}
