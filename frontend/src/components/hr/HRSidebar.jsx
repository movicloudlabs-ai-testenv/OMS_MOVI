import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  Menu, LayoutDashboard, Users, GraduationCap, UserPlus,
  CalendarCheck, CalendarOff, FolderKanban, TrendingUp,
  ClipboardList, User, LogOut, Building2, Shield, BarChart3, ClipboardCheck, MessageSquare, FileText,
} from 'lucide-react';

// Primary nav links (always visible)
const NAV_LINKS = [
  { to: '/hr/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hr/employees',    icon: Users,           label: 'Employees',   permission: { resource: 'Users', action: 'read' } },
  { to: '/hr/interns',      icon: GraduationCap,   label: 'Interns',     permission: { resource: 'Interns', action: 'read' } },
  { to: '/hr/recruitment',  icon: ClipboardCheck,  label: 'Recruitment', permission: { resource: 'Recruitment', action: 'read' } },
  { to: '/hr/daily-tracker', icon: ClipboardList,  label: 'Daily Tracker', permission: { resource: 'Daily Tracker', action: 'read' } },
  { to: '/hr/eod-reports',  icon: MessageSquare,   label: 'EOD Reports', permission: { resource: 'Daily Tracker', action: 'read' } },
  { to: '/hr/leave-approval', icon: CalendarOff,   label: 'Leave Approval', permission: { resource: 'Leave', action: 'read' } },
  { to: '/hr/onboarding',   icon: UserPlus,        label: 'Onboarding',  permission: { resource: 'Users', action: 'update' } },
  { to: '/hr/attendance',   icon: CalendarCheck,    label: 'Attendance',  permission: { resource: 'Attendance', action: 'read' } },
  { to: '/hr/documents',    icon: FileText,         label: 'Documents' },
  { to: '/hr/projects',     icon: FolderKanban,     label: 'Projects' },
  { to: '/hr/performance',  icon: TrendingUp,       label: 'Performance' },
  { to: '/hr/tasks',        icon: ClipboardList,    label: 'Task Board',  permission: { resource: 'Tasks', action: 'read' } },
  { to: '/hr/communication', icon: MessageSquare,    label: 'Communication' },
  { to: '/hr/profile',      icon: User,            label: 'My Profile' },
];

// Cross-role links shown in "Granted Access" section — route to shared admin pages
const GRANTED_LINKS = [
  { to: '/admin/users',       icon: Users,      label: 'Users',       resource: 'Users',       action: 'read' },
  { to: '/admin/departments', icon: Building2,  label: 'Departments', resource: 'Departments', action: 'read' },
  { to: '/admin/roles',       icon: Shield,     label: 'Roles',       resource: 'Roles',       action: 'read' },
  { to: '/admin/reports',     icon: BarChart3,  label: 'Reports',     resource: 'Reports',     action: 'read' },
];

export default function HRSidebar({ collapsed, setCollapsed, onLogout, user }) {
  const { hasPermission } = useAuth();
  const { hasActivity } = useNotifications();

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'H';

  // Show all primary links unconditionally; route guards will handle unauthorized access
  const visibleLinks = NAV_LINKS;

  // Only show granted links that the user actually has permission for
  // and that aren't already in the primary nav
  const existingPaths = new Set(visibleLinks.map(l => l.to));
  const grantedLinks = GRANTED_LINKS.filter(
    l => !existingPaths.has(l.to) && hasPermission(l.resource, l.action)
  );

  return (
    <aside className={`h-full shrink-0 bg-[#111111] text-white flex flex-col transition-all duration-300 ${collapsed ? 'w-[76px]' : 'w-[240px]'}`}>

      {/* Hamburger + brand */}
      <div className={`shrink-0 ${collapsed ? 'py-3 flex flex-col items-center gap-3' : 'px-4 py-3 flex items-center gap-3'}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu size={20} />
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
      <nav className={`flex-1 min-h-0 overflow-y-auto py-3 space-y-1 ${collapsed ? 'px-3' : 'px-3'}`}>
        {visibleLinks.map(({ to, icon: Icon, label }) => {
          const showDot = hasActivity(to);
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
              <Icon size={19} className="shrink-0" />
              {!collapsed && <span className="text-[13px] whitespace-nowrap">{label}</span>}
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
            {collapsed && <div className="h-px bg-white/10 mb-3" />}
            {grantedLinks.map(({ to, icon: Icon, label }) => (
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
                <Icon size={19} className="shrink-0" />
                {!collapsed && (
                  <>
                    <span className="text-[13px] whitespace-nowrap flex-1">{label}</span>
                    <span className="text-[9px] font-bold text-[#EA580C] bg-[#EA580C]/15 border border-[#EA580C]/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      Read
                    </span>
                  </>
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
            <p className="text-[13px] font-medium truncate">{user?.name || 'HR Manager'}</p>
            <p className="text-[11px] text-slate-400 truncate">HR Manager</p>
          </div>
        )}
        <button
          onClick={onLogout}
          title="Logout"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600/80 transition-colors shrink-0"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
