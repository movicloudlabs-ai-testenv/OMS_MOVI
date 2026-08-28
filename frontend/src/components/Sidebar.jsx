import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Grid2X2, CheckSquare, Users, GraduationCap, BarChart2, LayoutDashboard, CalendarDays, Clock, BookOpen, User, Briefcase, MessageSquare } from 'lucide-react';
import { pmoAPI } from '../utils/api';

// Pages that can be unlocked for any role via the Access Matrix.
// Shown in "Granted Access" sidebar section when a non-native role has the permission.
const CROSS_ROLE_LINKS = [
  { resource: 'Users',      action: 'read',   to: '/admin/users',       icon: 'group',     label: 'Users'       },
  { resource: 'Users',      action: 'read',   to: '/hr/employees',      icon: 'badge',     label: 'Employees'   },
  { resource: 'Departments',action: 'read',   to: '/admin/departments', icon: 'domain',    label: 'Departments' },
  { resource: 'Roles',      action: 'read',   to: '/admin/roles',       icon: 'badge',     label: 'Roles'       },
  { resource: 'Audit Logs', action: 'read',   to: '/admin/audit',       icon: 'history',   label: 'Audit Logs'  },
  { resource: 'Reports',    action: 'read',   to: '/admin/reports',     icon: 'analytics', label: 'Reports'     },
  // BUG-020 FIX: Removed Interns entry (/hr/interns) — PMO and HR already have
  // native Interns links in their primary nav. Routing PMO to /hr/interns caused
  // hrScope middleware rejection ("HR access required") and HR sidebar rendering.
  { resource: 'Settings',   action: 'update', to: '/admin/settings',    icon: 'settings',  label: 'Settings'    },
];

const NAV_CONFIG = {
  employee: [
    { to: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard', isLucide: true },
    { to: '/employee/tasks', icon: CheckSquare, label: 'My Tasks', isLucide: true },
    { to: '/employee/projects', icon: Briefcase, label: 'My Projects', isLucide: true },
    { to: '/employee/team', icon: Users, label: 'My Team', isLucide: true },

    { to: '/employee/leave', icon: Clock, label: 'Leave', isLucide: true },
    { to: '/employee/profile', icon: User, label: 'My Profile', isLucide: true },
  ],
  intern: [
    { to: '/intern/dashboard', icon: LayoutDashboard, label: 'Dashboard', isLucide: true },
    { to: '/intern/tasks', icon: CheckSquare, label: 'My Tasks', isLucide: true },
    { to: '/intern/daily-tracker', icon: CalendarDays, label: 'Daily Tracker', isLucide: true },
    { to: '/intern/eod-report', icon: MessageSquare, label: 'EOD Report', isLucide: true },

    { to: '/intern/leave', icon: Clock, label: 'Leave', isLucide: true },
    { to: '/intern/learning', icon: BookOpen, label: 'Learning', isLucide: true },
    { to: '/intern/profile', icon: User, label: 'My Profile', isLucide: true },
  ],
  hr: [
    { to: '/hr/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/hr/employees', icon: 'badge', label: 'Employees', permission: { resource: 'Users', action: 'read' } },
    { to: '/hr/interns', icon: 'school', label: 'Interns', permission: { resource: 'Interns', action: 'read' } },
    { to: '/hr/onboarding', icon: 'person_add', label: 'Onboarding', permission: { resource: 'Users', action: 'update' } },
    { to: '/hr/attendance', icon: 'event_available', label: 'Attendance', permission: { resource: 'Attendance', action: 'read' } },
    { to: '/hr/documents', icon: 'folder_shared', label: 'Documents' },
    { to: '/hr/leave', icon: 'event_note', label: 'Leave' },
    { to: '/hr/projects', icon: 'folder_open', label: 'Projects' },
    { to: '/hr/performance', icon: 'grade', label: 'Performance' },
    { to: '/hr/tasks', icon: 'view_kanban', label: 'Task Board', permission: { resource: 'Tasks', action: 'read' } },
    { to: '/hr/tasks/new', icon: CheckSquare, label: 'Assign Task', isLucide: true, permission: { resource: 'Tasks', action: 'create' } },
    { to: '/hr/communication', icon: MessageSquare, label: 'Communication', isLucide: true },
    { to: '/hr/profile', icon: User, label: 'My Profile', isLucide: true },
  ],
  pmo: [
    { to: '/pmo/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/pmo/employees', icon: 'badge', label: 'Employees', permission: { resource: 'Users', action: 'read' } },
    { to: '/pmo/projects', icon: 'work', label: 'Projects', permission: { resource: 'Projects', action: 'read' } },
    { to: '/pmo/tasks', icon: 'task_alt', label: 'Task Assignment', permission: { resource: 'Tasks', action: 'read' } },
    { to: '/pmo/team', icon: Users, label: 'Team', isLucide: true, permission: { resource: 'Users', action: 'read' } },
    { to: '/pmo/interns', icon: GraduationCap, label: 'Interns', isLucide: true, permission: { resource: 'Interns', action: 'read' } },
    { to: '/pmo/daily-tracker', icon: CalendarDays, label: 'Daily Tracker', isLucide: true, permission: { resource: 'Daily Tracker', action: 'read' } },
    { to: '/pmo/eod-reports', icon: MessageSquare, label: 'EOD Reports', isLucide: true, permission: { resource: 'Daily Tracker', action: 'read' } },
    { to: '/pmo/monitoring', icon: 'monitoring', label: 'Monitoring' },
    { to: '/pmo/timeline', icon: 'timeline', label: 'Timeline' },
    { to: '/pmo/approvals', icon: 'approval', label: 'Approvals', permission: { resource: 'Tasks', action: 'read' } },
    { to: '/pmo/reports', icon: BarChart2, label: 'Reports', isLucide: true, permission: { resource: 'Reports', action: 'read' } },
    { to: '/pmo/profile', icon: User, label: 'My Profile', isLucide: true },
  ],
  admin: [
    { to: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/admin/users', icon: 'group', label: 'Users', permission: { resource: 'Users', action: 'read' } },
    { to: '/admin/departments', icon: 'domain', label: 'Departments', permission: { resource: 'Departments', action: 'read' } },
    { to: '/admin/roles', icon: 'badge', label: 'Roles', permission: { resource: 'Roles', action: 'read' } },
    { to: '/admin/access-matrix', icon: Grid2X2, label: 'Access Matrix', isLucide: true, permission: { resource: 'Roles', action: 'update' } },
    { to: '/admin/audit', icon: 'history', label: 'Audit Logs', permission: { resource: 'Audit Logs', action: 'read' } },
    { to: '/admin/reports', icon: 'analytics', label: 'Reports', permission: { resource: 'Reports', action: 'read' } },
    { to: '/admin/settings', icon: 'settings', label: 'Settings', permission: { resource: 'Settings', action: 'read' } },
  ],
};

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, hasPermission, logout } = useAuth();
  const { hasActivity, notifications } = useNotifications();
  const navigate = useNavigate();

  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // user.role from real backend is a populated object { slug, name, ... }
  // Resolve to the NAV_CONFIG key (legacy short slugs)
  const resolveNavKey = (role) => {
    const slug = role?.slug || (typeof role === 'string' ? role : '');
    // Map real backend slugs → sidebar config keys
    const slugMap = {
      'super-admin': 'admin',
      'admin': 'admin',
      'hr-manager': 'hr',
      'pmo-lead': 'pmo',
      'employee': 'employee',
      'intern': 'intern',
      // legacy short slugs (pass-through)
      'hr': 'hr',
      'pmo': 'pmo',
    };
    return slugMap[slug] || slug;
  };

  const navKey = resolveNavKey(user?.role);
  // Show all primary links unconditionally; route guards will handle unauthorized access
  const visibleLinks = NAV_CONFIG[navKey] || [];

  const fetchPendingApprovalsCount = useCallback(async () => {
    if (navKey !== 'pmo') return;
    try {
      const res = await pmoAPI.getTasksInReview();
      const count = res.data?.data?.length || 0;
      setPendingApprovalsCount(count);
    } catch (err) {
      // silent
    }
  }, [navKey]);

  useEffect(() => {
    if (navKey === 'pmo') {
      fetchPendingApprovalsCount();
    }
  }, [navKey, notifications, fetchPendingApprovalsCount]);

  const existingPaths = new Set(visibleLinks.map(l => l.to));
  const grantedLinks = (navKey === 'admin') ? [] : CROSS_ROLE_LINKS.filter(
    l => !existingPaths.has(l.to) && hasPermission(l.resource, l.action)
  );

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`h-full shrink-0 bg-[#111111] text-white flex flex-col transition-all duration-300 ${collapsed ? 'w-[76px]' : 'w-[240px]'}`}>
      
      {/* Hamburger + brand */}
      <div className={`shrink-0 ${collapsed ? 'py-3 flex flex-col items-center gap-3' : 'px-4 py-3 flex items-center gap-3'}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>
        <img src="/assets/company_logo/movi%20logo.png" alt="Movi logo" className="h-9 w-9 object-contain shrink-0" />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="text-[16px] font-bold tracking-wide">OWMS</p>
            <p className="text-[9px] text-slate-400">Office Workspace<br />Management System</p>
          </div>
        )}
      </div>

      {/* Primary Nav */}
      <nav className={`flex-1 min-h-0 overflow-y-auto hide-scrollbar py-3 space-y-1 ${collapsed ? 'px-3' : 'px-3'}`}>
        {visibleLinks.map(({ to, icon, label, isLucide }) => {
          const showDot = to === '/pmo/approvals' ? false : hasActivity(to);
          const showCountBadge = to === '/pmo/approvals' && pendingApprovalsCount > 0;
          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : ''}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-xl transition-colors ${collapsed ? 'justify-center py-2.5' : 'px-3 py-2.5'} ${
                  isActive
                    ? 'bg-[#EA580C] text-white font-medium'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {isLucide ? (
                <span className="flex-shrink-0 flex items-center justify-center w-[19px]">
                  {(() => { const Icon = icon; return <Icon size={19} />; })()}
                </span>
              ) : (
                <span className="material-symbols-outlined text-[19px] flex-shrink-0">{icon}</span>
              )}
              {!collapsed && <span className="text-[13px] whitespace-nowrap">{label}</span>}
              {showCountBadge && !collapsed && (
                <span className="ml-auto bg-[#EA580C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 animate-in fade-in zoom-in duration-200">
                  {pendingApprovalsCount}
                </span>
              )}
              {showCountBadge && collapsed && (
                <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 bg-[#EA580C] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none ring-2 ring-[#111111]">
                  {pendingApprovalsCount}
                </span>
              )}
              {showDot && (
                collapsed ? (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EA580C] ring-2 ring-[#111111]" />
                ) : (
                  <span className="ml-auto w-2 h-2 rounded-full bg-[#EA580C] flex-shrink-0" />
                )
              )}
            </NavLink>
          );
        })}

        {/* Granted Access section */}
        {grantedLinks.length > 0 && (
          <div className={`${collapsed ? 'pt-3' : 'pt-4'}`}>
            {!collapsed && (
              <div className="flex items-center gap-1.5 px-3 mb-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Granted Access</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            )}
            {collapsed && <div className="h-px bg-white/10 mb-3 mx-2" />}
            {grantedLinks.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : ''}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl transition-colors ${collapsed ? 'justify-center py-2.5' : 'px-3 py-2.5'} ${
                    isActive
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[19px] flex-shrink-0">{icon}</span>
                {!collapsed && (
                  <span className="text-[13px] whitespace-nowrap flex-1">{label}</span>
                )}
                {!collapsed && (
                  <span className="text-[9px] font-bold text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    Read
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Profile + logout */}
      <div className={`shrink-0 border-t border-white/10 p-3 flex items-center gap-3 ${collapsed ? 'flex-col' : ''}`}>
        <div className="w-9 h-9 rounded-full bg-[#EA580C] flex items-center justify-center text-[12px] font-semibold shrink-0 overflow-hidden">
          {user?.profileImage || user?.avatar
            ? <img src={user.profileImage || user.avatar} alt="" className="w-full h-full object-cover" />
            : initials}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-slate-400 truncate capitalize">{user?.role?.name || navKey}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          title="Logout"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600/80 transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
        </button>
      </div>

    </aside>
  );
}
