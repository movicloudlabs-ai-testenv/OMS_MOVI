import { NavLink } from 'react-router-dom';
import {
  Menu, LayoutDashboard, Users, Building2, Shield, Grid2X2, FileClock,
  BarChart3, Settings as SettingsIcon, LogOut, User, CreditCard,
} from 'lucide-react';

export const NAV_LINKS = [
  { to: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users',         icon: Users,           label: 'Users' },
  { to: '/admin/payments',      icon: CreditCard,      label: 'Payments' },
  { to: '/admin/departments',   icon: Building2,       label: 'Departments' },
  { to: '/admin/roles',         icon: Shield,          label: 'Roles' },
  { to: '/admin/access-matrix', icon: Grid2X2,         label: 'Access Matrix' },
  { to: '/admin/audit',         icon: FileClock,       label: 'Audit Logs' },
  { to: '/admin/reports',       icon: BarChart3,       label: 'Reports' },
  { to: '/admin/settings',      icon: SettingsIcon,    label: 'Settings' },
  { to: '/admin/profile',       icon: User,            label: 'My Profile' },
];

export default function AdminSidebar({ collapsed, setCollapsed, onLogout, user }) {
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'A';
  return (
    <aside className={`h-full shrink-0 bg-[#111111] text-white flex flex-col transition-all duration-300 ${collapsed ? 'w-[76px]' : 'w-[240px]'}`}>

      {/* Hamburger + brand (logo, OWMS, subtitle) */}
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
            <p className="text-[9px] text-slate-400">Office Workspace Management System</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 min-h-0 overflow-y-auto py-3 space-y-1 ${collapsed ? 'px-3' : 'px-3'}`}>
        {NAV_LINKS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : ''}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl transition-colors ${collapsed ? 'justify-center py-2.5' : 'px-3 py-2.5'} ${
                isActive
                  ? 'bg-[#EA580C] text-white font-medium'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={19} className="shrink-0" />
            {!collapsed && <span className="text-[13px] whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
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
            <p className="text-[13px] font-medium truncate">{user?.name || 'Admin'}</p>
            <p className="text-[11px] text-slate-400 truncate">Administrator</p>
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
