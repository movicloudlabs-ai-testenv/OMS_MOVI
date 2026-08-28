import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import HRSidebar from './HRSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

function notifMeta(type) {
  const t = type || '';
  if (t.includes('approved') || t === 'milestone_reached') return { icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (t.includes('rejected') || t.includes('blocked')) return { icon: 'error', color: 'text-rose-600', bg: 'bg-rose-50' };
  if (t.includes('task')) return { icon: 'task_alt', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (t.includes('leave')) return { icon: 'event', color: 'text-amber-600', bg: 'bg-amber-50' };
  if (t.includes('project')) return { icon: 'work', color: 'text-indigo-600', bg: 'bg-indigo-50' };
  return { icon: 'notifications', color: 'text-slate-500', bg: 'bg-slate-100' };
}

function relTime(date) {
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); }
  catch { return ''; }
}

export default function HRLayout({ title, subtitle, actions, children, bare = false }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { enabled: notifEnabled, unreadCount, notifications, refresh, markRead, markAllRead } = useNotifications();

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, []);

  // Force reflow on mount to fix Chromium zoom layout bounds calculation issue
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleNotifToggle = (e) => {
    e.stopPropagation();
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) refresh();
  };

  const handleNotifClick = async (notif) => {
    setNotifOpen(false);
    markRead(notif);
    const link = notif.link || '';
    const target = (link === '/hr' || link.startsWith('/hr/') || link === '/profile') ? link : '/hr/dashboard';
    navigate(target);
  };

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
    // zoom 0.8 renders HR pages at the density of an 80%-zoomed browser;
    // 125vh/125vw compensate so the scaled layout still fills the full viewport.
    <div
      style={{ zoom: 0.8 }}
      className="h-[125vh] w-[125vw] overflow-hidden flex bg-[#FBF7F4] font-sans text-[#0F172A]"
    >
      <HRSidebar collapsed={collapsed} setCollapsed={handleSetCollapsed} onLogout={handleLogout} user={user} />

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
            {notifEnabled && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={handleNotifToggle}
                  className="relative w-10 h-10 rounded-xl bg-white border border-[#F1E8E2] flex items-center justify-center text-[#64748B] hover:text-orange-600 transition-colors"
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#EA580C] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none ring-2 ring-[#FBF7F4]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:w-[380px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-slate-800">
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
          </div>
        </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 h-0 overflow-y-auto custom-scrollbar pr-0.5">
          {children}
        </div>
      </main>
    </div>
  );
}
