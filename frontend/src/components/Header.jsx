import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

// Each role's own (working) profile page.
const PROFILE_PATH = {
  'super-admin': '/profile',
  'admin':       '/profile',
  'hr-manager':  '/hr/profile',
  'pmo-lead':    '/pmo/profile',
  'employee':    '/employee/profile',
  'intern':      '/intern/profile',
};

// Visual accent + icon per notification type, for quick scanning.
function notifMeta(type) {
  const t = type || '';
  if (t.includes('approved') || t === 'milestone_reached')
    return { icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (t.includes('rejected') || t.includes('blocked'))
    return { icon: 'error', color: 'text-rose-600', bg: 'bg-rose-50' };
  if (t.includes('task'))
    return { icon: 'task_alt', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (t.includes('leave'))
    return { icon: 'event', color: 'text-amber-600', bg: 'bg-amber-50' };
  if (t.includes('project'))
    return { icon: 'work', color: 'text-indigo-600', bg: 'bg-indigo-50' };
  return { icon: 'notifications', color: 'text-slate-500', bg: 'bg-slate-100' };
}

// Compact relative time, e.g. "2h ago".
function relTime(date) {
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); }
  catch { return ''; }
}

// Dashboard fallback per role — used when a notification link is outside the
// user's accessible namespace (prevents landing on an "Access Denied" page).
const ROLE_HOME = {
  'super-admin': '/admin/dashboard',
  'admin':       '/admin/dashboard',
  'hr-manager':  '/hr/dashboard',
  'pmo-lead':    '/pmo/dashboard',
  'employee':    '/employee/dashboard',
  'intern':      '/intern/dashboard',
};

// Base route maps per role for every notification domain
const DOMAIN_ROUTES = {
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
  onboarding: {
    'hr-manager': '/hr/onboarding',
    'hr':         '/hr/onboarding',
    'pmo-lead':   '/pmo/interns',
    'pmo':        '/pmo/interns',
    'admin':      '/hr/onboarding',
    'super-admin':'/hr/onboarding',
  },
};

// Path prefixes each role is allowed to open directly.
const ROLE_PREFIXES = {
  'hr-manager': ['/hr', '/profile'],
  'pmo-lead':   ['/pmo', '/profile'],
  'employee':   ['/employee', '/profile'],
  'intern':     ['/intern', '/profile'],
};

// Resolve ANY notification to the exact authorized target route for the user's role.
function resolveSafeLink(notif, roleSlug) {
  if (!notif) return null;
  const link = typeof notif === 'string' ? notif : (notif.link || '');
  const notifType = typeof notif === 'object' ? (notif.type || '') : '';
  const metadata = typeof notif === 'object' ? (notif.metadata || {}) : {};

  // Extract task ID if present
  let taskId = metadata.taskId || metadata.id || null;
  if (!taskId && link) {
    const matchParam = link.match(/[?&]taskId=([^&]+)/);
    if (matchParam) taskId = matchParam[1];
    else {
      const matchPath = link.match(/\/tasks\/([a-fA-F0-9]{24})/);
      if (matchPath) taskId = matchPath[1];
    }
  }

  // Extract project ID if present
  let projectId = metadata.projectId || null;
  if (!projectId && link) {
    const matchProj = link.match(/\/projects\/([a-fA-F0-9]{24})/);
    if (matchProj) projectId = matchProj[1];
  }

  // 1. Task Review (task_submitted_for_review)
  if (notifType === 'task_submitted_for_review') {
    const base = DOMAIN_ROUTES.taskReview[roleSlug] || ROLE_HOME[roleSlug] || '/';
    return taskId && base.includes('/tasks') ? `${base}?taskId=${taskId}` : base;
  }

  // 2. Task Notifications (task_assigned, task_approved, task_rejected, task_blocked, task_comment, intern_assigned)
  if (
    notifType === 'task_assigned' ||
    notifType === 'task_approved' ||
    notifType === 'task_rejected' ||
    notifType === 'task_blocked' ||
    notifType === 'task_comment' ||
    notifType === 'intern_assigned' ||
    link.includes('/tasks')
  ) {
    const base = DOMAIN_ROUTES.task[roleSlug] || ROLE_HOME[roleSlug] || '/';
    return taskId ? `${base}?taskId=${taskId}` : base;
  }

  // 3. Leave Notifications (leave_requested, leave_approved, leave_rejected)
  if (
    notifType === 'leave_requested' ||
    notifType === 'leave_approved' ||
    notifType === 'leave_rejected' ||
    link.includes('/leave')
  ) {
    return DOMAIN_ROUTES.leave[roleSlug] || ROLE_HOME[roleSlug] || '/';
  }

  // 4. Project Notifications (project_assigned, project_updated, milestone_reached)
  if (
    notifType === 'project_assigned' ||
    notifType === 'project_updated' ||
    notifType === 'milestone_reached' ||
    link.includes('/projects')
  ) {
    const base = DOMAIN_ROUTES.project[roleSlug] || ROLE_HOME[roleSlug] || '/';
    return (projectId && (roleSlug === 'pmo-lead' || roleSlug === 'pmo'))
      ? `${base}/${projectId}`
      : base;
  }

  // 5. Attendance Notifications (attendance_marked)
  if (notifType === 'attendance_marked' || link.includes('/attendance')) {
    return DOMAIN_ROUTES.attendance[roleSlug] || ROLE_HOME[roleSlug] || '/';
  }

  // 6. User / Onboarding Notifications
  if (notifType === 'user_created' || link.includes('/onboarding')) {
    return DOMAIN_ROUTES.onboarding[roleSlug] || ROLE_HOME[roleSlug] || '/';
  }

  // 7. General fallback: Check if existing link starts with allowed prefix for this role
  if (!link) return ROLE_HOME[roleSlug] || '/';
  if (roleSlug === 'super-admin' || roleSlug === 'admin') return link;

  const prefixes = ROLE_PREFIXES[roleSlug] || [];
  const allowed = prefixes.some((p) => link === p || link.startsWith(`${p}/`));
  return allowed ? link : (ROLE_HOME[roleSlug] || '/');
}

export default function Header({ sidebarCollapsed }) {
  const { user, logout } = useAuth();
  const { enabled: notifEnabled, notifications, unreadCount, refresh, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const popupRef = useRef();
  const notifRef = useRef();

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  // user.role from real backend is a populated object — extract slug
  const roleSlug = user?.role?.slug || user?.role || '';

  useEffect(() => {
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const handleNotifClick = async (notif) => {
    setNotifOpen(false);
    markRead(notif);
    const target = resolveSafeLink(notif, roleSlug);
    if (target) navigate(target);
  };

  const handleNotifToggle = (e) => {
    e.stopPropagation();
    const next = !notifOpen;
    setNotifOpen(next);
    setProfileOpen(false);
    if (next) refresh(); // freshen on open
  };

  const handleProfileToggle = (e) => {
    e.stopPropagation();
    setProfileOpen(p => !p);
    setNotifOpen(false);
  };

  const goToProfile = () => {
    setProfileOpen(false);
    navigate(PROFILE_PATH[roleSlug] || '/profile');
  };

  const displayRole = roleSlug === 'super-admin' || roleSlug === 'admin' ? 'Administrator' :
                      roleSlug === 'hr-manager' || roleSlug === 'hr' ? 'HR Manager' :
                      roleSlug === 'pmo-lead'   || roleSlug === 'pmo' ? 'PMO Lead' :
                      roleSlug === 'intern'     ? 'Intern' :
                      roleSlug === 'employee'   ? 'Employee' :
                      user?.role?.name          || 'User';

  return (
    <header className={`fixed top-0 right-0 ${sidebarCollapsed ? 'left-20' : 'left-[260px]'} h-16 flex justify-between items-center px-6 lg:px-8 z-40 bg-[#1E293B] text-white shadow-sm font-sans text-[13px] transition-all duration-300`}>
      
      {/* Left side: Logo & Title (Enterprise Style) */}
      <div className="flex items-center gap-4">
        <img src="/assets/company_logo/movi%20logo.png" alt="OWMS Logo" className="h-7 w-auto" />
        <span className="font-semibold tracking-wide text-[14px]">Office Workspace Management System</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-5">
        
        {/* Notifications bell */}
        {notifEnabled && (
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleNotifToggle}
            className="relative flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none ring-2 ring-[#1E293B]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-11 z-50 w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:w-[380px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-slate-800">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[14px] text-slate-900">Notifications</p>
                  {unreadCount > 0 && (
                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 rounded-full px-2 py-0.5 leading-none">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[12px] font-medium text-blue-600 hover:text-blue-700">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[min(70vh,26rem)] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4 gap-2">
                    <span className="material-symbols-outlined text-[32px] text-slate-300">notifications_off</span>
                    <p className="text-[13px] text-slate-500">You're all caught up</p>
                  </div>
                ) : (
                  notifications.slice(0, 12).map(notif => {
                    const isUnread = !notif.read;
                    const meta = notifMeta(notif.type);
                    const preview = (notif.message || '').replace(/\s*\n\s*/g, ' · ');
                    return (
                      <button
                        key={notif._id}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors ${isUnread ? 'bg-blue-50/40' : ''}`}
                        onClick={() => handleNotifClick(notif)}
                      >
                        <span className={`flex-shrink-0 w-9 h-9 rounded-full ${meta.bg} flex items-center justify-center`}>
                          <span className={`material-symbols-outlined text-[18px] ${meta.color}`}>{meta.icon}</span>
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <p className={`flex-1 text-[13px] leading-snug ${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                              {notif.title || 'Notification'}
                            </p>
                            {isUnread && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                          </div>
                          <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{preview}</p>
                          <p className="text-[11px] text-slate-400 mt-1">{relTime(notif.createdAt)}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        )}

        {notifEnabled && <div className="w-px h-5 bg-slate-700 mx-1" />}

        {/* Profile */}
        <div className="relative" ref={popupRef}>
          <button
            className="flex items-center gap-3 cursor-pointer hover:bg-slate-800 p-1.5 pr-3 rounded transition-colors"
            onClick={handleProfileToggle}
          >
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-medium text-[12px] overflow-hidden">
              {user?.profileImage || user?.avatar ? (
                <img src={user.profileImage || user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[13px] font-medium text-slate-100 leading-tight">{user?.name}</p>
              <p className="text-[11px] text-slate-400 font-medium">{displayRole}</p>
            </div>
            <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
          </button>

          {/* Profile popup */}
          {profileOpen && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded shadow-lg border border-slate-200 z-50 overflow-hidden py-1 text-slate-800">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="font-semibold text-[13px] text-slate-900 truncate">{user?.name}</p>
                <p className="text-[12px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={goToProfile}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-slate-700 hover:bg-slate-100 text-[13px] transition-colors"
              >
                My Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 text-[13px] transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
