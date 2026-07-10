import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Grid2X2, CheckSquare, Users, GraduationCap, BarChart2, LayoutDashboard, CalendarDays, Clock, BookOpen, User, Briefcase } from 'lucide-react';

// Pages that can be unlocked for any role via the Access Matrix.
// Shown in "Granted Access" sidebar section when a non-native role has the permission.
const CROSS_ROLE_LINKS = [
  { resource: 'Users',      action: 'read',   to: '/admin/users',       icon: 'group',     label: 'Users'       },
  { resource: 'Users',      action: 'read',   to: '/hr/employees',      icon: 'badge',     label: 'Employees'   },
  { resource: 'Departments',action: 'read',   to: '/admin/departments', icon: 'domain',    label: 'Departments' },
  { resource: 'Roles',      action: 'read',   to: '/admin/roles',       icon: 'badge',     label: 'Roles'       },
  { resource: 'Audit Logs', action: 'read',   to: '/admin/audit',       icon: 'history',   label: 'Audit Logs'  },
  { resource: 'Reports',    action: 'read',   to: '/admin/reports',     icon: 'analytics', label: 'Reports'     },
  { resource: 'Interns',    action: 'read',   to: '/hr/interns',        icon: 'school',    label: 'Interns'     },
  { resource: 'Settings',   action: 'update', to: '/admin/settings',    icon: 'settings',  label: 'Settings'    },
];

const NAV_CONFIG = {
  employee: [
    { to: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard', isLucide: true },
    { to: '/employee/tasks', icon: CheckSquare, label: 'My Tasks', isLucide: true },
    { to: '/employee/projects', icon: Briefcase, label: 'My Projects', isLucide: true },
    { to: '/employee/team', icon: Users, label: 'My Team', isLucide: true },
    { to: '/employee/attendance', icon: CalendarDays, label: 'Attendance', isLucide: true },
    { to: '/employee/leave', icon: Clock, label: 'Leave', isLucide: true },
    { to: '/employee/profile', icon: User, label: 'My Profile', isLucide: true },
  ],
  intern: [
    { to: '/intern/dashboard', icon: LayoutDashboard, label: 'Dashboard', isLucide: true },
    { to: '/intern/tasks', icon: CheckSquare, label: 'My Tasks', isLucide: true },
    { to: '/intern/attendance', icon: CalendarDays, label: 'Attendance', isLucide: true },
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
    { to: '/hr/leave', icon: 'event_note', label: 'Leave' },
    { to: '/hr/projects', icon: 'folder_open', label: 'Projects' },
    { to: '/hr/performance', icon: 'grade', label: 'Performance' },
    { to: '/hr/tasks', icon: 'view_kanban', label: 'Task Board', permission: { resource: 'Tasks', action: 'read' } },
    { to: '/hr/tasks/new', icon: CheckSquare, label: 'Assign Task', isLucide: true, permission: { resource: 'Tasks', action: 'create' } },
    { to: '/hr/profile', icon: User, label: 'My Profile', isLucide: true },
  ],
  pmo: [
    { to: '/pmo/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/pmo/employees', icon: 'badge', label: 'Employees', permission: { resource: 'Users', action: 'read' } },
    { to: '/pmo/projects', icon: 'work', label: 'Projects', permission: { resource: 'Projects', action: 'read' } },
    { to: '/pmo/tasks', icon: 'task_alt', label: 'Task Assignment', permission: { resource: 'Tasks', action: 'read' } },
    { to: '/pmo/team', icon: Users, label: 'Team', isLucide: true, permission: { resource: 'Users', action: 'read' } },
    { to: '/pmo/interns', icon: GraduationCap, label: 'Interns', isLucide: true, permission: { resource: 'Interns', action: 'read' } },
    { to: '/pmo/leaves', icon: 'event_note', label: 'Leaves', permission: { resource: 'Projects', action: 'read' } },
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
  const { user, hasPermission } = useAuth();
  const { hasActivity } = useNotifications();
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
  const links = NAV_CONFIG[navKey] || [];

  // Extra links unlocked via Access Matrix for this user's role
  const existingPaths = new Set(links.map(l => l.to));
  const grantedLinks = (navKey === 'admin') ? [] : CROSS_ROLE_LINKS.filter(
    l => !existingPaths.has(l.to) && hasPermission(l.resource, l.action)
  );

  const isIntern = navKey === 'intern';

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 flex flex-col ${collapsed ? 'w-20' : 'w-[260px]'} hidden lg:flex font-sans ${isIntern ? 'bg-[#1E293B] border-r border-[#1E293B]' : 'bg-[#F8FAFC] border-r border-[#E2E8F0]'}`}>
      
      {/* Spacer for Header */}
      <div className="h-16 flex-shrink-0" />

      <button 
        onClick={() => setCollapsed(!collapsed)}
        className={`absolute -right-3 top-20 w-6 h-6 border rounded-full flex items-center justify-center shadow-sm z-50 transition-colors ${
          isIntern 
            ? 'bg-[#334155] border-[#475569] text-slate-300 hover:text-white hover:border-[#2563EB]' 
            : 'bg-white border-[#E2E8F0] text-slate-500 hover:text-blue-600 hover:border-blue-600'
        }`}
      >
        <span className="material-symbols-outlined text-[14px]">{collapsed ? 'chevron_right' : 'chevron_left'}</span>
      </button>

      {/* Nav links */}
      <nav className={`flex-1 py-6 space-y-1 overflow-y-auto custom-scrollbar ${collapsed ? 'px-3' : 'px-4'}`}>
        {links.map(({ to, icon, label, isLucide }) => {
          const showDot = hasActivity(to);
          return (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : ''}
            className={({ isActive }) => {
              let activeClass = '';
              let idleClass = '';

              if (isIntern) {
                activeClass = 'bg-[#2563EB] text-white font-medium';
                idleClass = 'text-slate-300 hover:bg-[#334155] hover:text-white';
              } else {
                activeClass = 'bg-[#E2E8F0] text-[#0F172A] font-medium';
                idleClass = 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]';
              }

              return `relative flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? activeClass : idleClass} ${collapsed ? 'justify-center px-0 py-3' : ''}`;
            }}
          >
            {isLucide ? (
              <span className="flex-shrink-0 flex items-center justify-center w-[20px]">
                {(() => { const Icon = icon; return <Icon size={18} />; })()}
              </span>
            ) : (
              <span className="material-symbols-outlined text-[20px] flex-shrink-0">{icon}</span>
            )}
            {!collapsed && <span className="text-[13px] whitespace-nowrap">{label}</span>}
            {showDot && (collapsed ? (
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            ) : (
              <span className="ml-auto w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" title="New activity" />
            ))}
          </NavLink>
          );
        })}

        {/* Granted Access — links unlocked via Access Matrix */}
        {grantedLinks.length > 0 && (
          <div className={`${collapsed ? 'pt-3' : 'pt-4'}`}>
            {!collapsed && (
              <div className="flex items-center gap-1.5 px-3 mb-2">
                <div className="flex-1 h-px bg-[#E2E8F0]" />
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider whitespace-nowrap">Granted Access</span>
                <div className="flex-1 h-px bg-[#E2E8F0]" />
              </div>
            )}
            {collapsed && <div className="h-px bg-[#E2E8F0] mb-3" />}
            {grantedLinks.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : ''}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] ${isActive ? 'bg-[#EFF6FF] text-[#2563EB] font-medium' : ''} ${collapsed ? 'justify-center px-0 py-3' : ''}`
                }
              >
                <span className="material-symbols-outlined text-[20px] flex-shrink-0">{icon}</span>
                {!collapsed && (
                  <span className="text-[13px] whitespace-nowrap flex-1">{label}</span>
                )}
                {!collapsed && (
                  <span className="text-[9px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    Read
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

    </aside>
  );
}
