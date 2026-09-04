import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import AnnouncementModal from './shared/AnnouncementModal';
import WelcomeMessageModal from './shared/WelcomeMessageModal';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { getNotificationTarget } from '../utils/notificationRouter';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

export default function PageWrapper({ children }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enabled: notifEnabled, unreadCount, notifications, refresh, markRead, markAllRead } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [selectedWelcomeNotif, setSelectedWelcomeNotif] = useState(null);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('owms_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const notifRef = useRef();

  const handleSetCollapsed = (val) => {
    setCollapsed(val);
    try { localStorage.setItem('owms_sidebar_collapsed', String(val)); } catch {}
  };

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

    const isAnnouncement =
      notif.type === 'announcement' ||
      notif.metadata?.isAnnouncement ||
      (notif.title || '').toLowerCase().includes('announcement') ||
      (notif.title || '').startsWith('📢');

    if (isAnnouncement) {
      setSelectedAnnouncement(notif);
      return;
    }

    const isWelcomeNotif =
      (notif.title || '').toLowerCase().includes('onboarding') ||
      (notif.title || '').toLowerCase().includes('welcome') ||
      (notif.message || '').toLowerCase().includes('welcome to movi');

    if (isWelcomeNotif) {
      setSelectedWelcomeNotif(notif);
      return;
    }

    const target = getNotificationTarget(notif, user?.role || user?.employmentType);
    if (target) navigate(target);
  };

  return (
    // zoom 0.8 matches AdminLayout/HRLayout
    <div
      style={{ zoom: 0.8 }}
      className="h-[125vh] w-[125vw] overflow-hidden flex bg-[#FBF7F4] font-sans text-[#0F172A]"
    >
      <Sidebar collapsed={collapsed} setCollapsed={handleSetCollapsed} />
      
      <main className="flex-1 min-w-0 flex flex-col relative overflow-hidden">
        {/* Notifications Icon (placed top right above scroll area) */}
        {notifEnabled && (
          <div className="absolute top-5 right-5 z-50" ref={notifRef}>
            <button
              onClick={handleNotifToggle}
              className="relative w-10 h-10 rounded-xl bg-white border border-[#F1E8E2] flex items-center justify-center text-[#64748B] hover:text-orange-600 transition-colors shadow-sm"
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
              <div className="absolute right-0 top-12 w-[380px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-slate-800">
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
                <div className="max-h-[26rem] overflow-y-auto">
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
                      const senderDisp = notif.sender?.name
                        ? `${notif.sender.name}${notif.sender.designation ? ` (${notif.sender.designation})` : ''}`
                        : (notif.metadata?.senderName ? `${notif.metadata.senderName}${notif.metadata.senderDesignation ? ` (${notif.metadata.senderDesignation})` : ''}` : '');
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
                            <div className="flex items-center justify-between gap-2 mt-1">
                              {senderDisp ? (
                                <p className="text-[11px] text-slate-400 font-medium truncate">
                                  {senderDisp}
                                </p>
                              ) : <span />}
                              <p className="text-[11px] text-slate-400 shrink-0">{relTime(notif.createdAt)}</p>
                            </div>
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

        <div className="flex-1 h-0 overflow-y-auto custom-scrollbar px-5 py-3 pt-6">
          {children}
        </div>
      </main>

      {/* Announcement Modal Popup */}
      {selectedAnnouncement && (
        <AnnouncementModal
          announcement={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
        />
      )}

      {/* Welcome Message Modal Popup */}
      {selectedWelcomeNotif && (
        <WelcomeMessageModal
          notification={selectedWelcomeNotif}
          onClose={() => setSelectedWelcomeNotif(null)}
        />
      )}
    </div>
  );
}
