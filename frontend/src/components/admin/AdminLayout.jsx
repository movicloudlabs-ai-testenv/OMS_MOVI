import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

/**
 * AdminLayout — the shared shell for every admin page.
 * Mirrors the Dashboard frame exactly: dark AdminSidebar, compact zoom:0.8
 * canvas, and a header row (title + subtitle + optional actions + bell).
 * Page content is passed as children and scrolls inside the main column.
 */
export default function AdminLayout({ title, subtitle, actions, children, bare = false }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { enabled: notifEnabled, unreadCount } = useNotifications();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('owms_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const handleSetCollapsed = (val) => {
    setCollapsed(val);
    try { localStorage.setItem('owms_sidebar_collapsed', String(val)); } catch {}
  };

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  return (
    // zoom 0.8 renders admin pages at the density of an 80%-zoomed browser;
    // 125vh/125vw compensate so the scaled layout still fills the full viewport.
    <div
      style={{ zoom: 0.8 }}
      className="h-[125vh] w-[125vw] overflow-hidden flex bg-[#FBF7F4] font-sans text-[#0F172A]"
    >
      <AdminSidebar collapsed={collapsed} setCollapsed={handleSetCollapsed} onLogout={handleLogout} user={user} />

      {/* Main column */}
      <main className="flex-1 min-w-0 flex flex-col px-5 py-3 gap-3 overflow-hidden">

        {/* Header row */}
        {!bare && (
        <div className="shrink-0 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold tracking-tight leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-[12px] text-[#94A3B8] truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {actions}
            <button
              onClick={() => navigate('/admin/audit')}
              className="relative w-10 h-10 rounded-xl bg-white border border-[#F1E8E2] flex items-center justify-center text-[#64748B] hover:text-orange-600 transition-colors"
              title="Notifications"
            >
              <Bell size={18} />
              {notifEnabled && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#EA580C] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none ring-2 ring-[#FBF7F4]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
          {children}
        </div>
      </main>
    </div>
  );
}
