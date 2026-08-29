import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import toast from 'react-hot-toast';
import {
  Users, UserCheck, CalendarOff, Briefcase, ShieldCheck,
  Bell, TrendingUp, TrendingDown, Calendar as CalendarIcon,
  CheckCircle2, Award, FileText, UserPlus, Star, Upload,
  ClipboardList, ChevronDown,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import HRSidebar from '../../components/hr/HRSidebar';
import AnnouncementModal from '../../components/shared/AnnouncementModal';
import { hrAPI, notificationAPI } from '../../utils/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const ORANGE = '#EA580C';

const DEPT_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#64748B', '#30B0C7', '#F43F5E'];

const timeAgo = (iso) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// ─── Mini sparkline for KPI cards ─────────────────────────────────────────────

const Sparkline = ({ data = [], danger = false }) => {
  const points = useMemo(() => {
    const series = data.length >= 2 ? data : [0, 0];
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || 1;
    return series
      .map((v, i) => `${(i / (series.length - 1)) * 100},${(16 - ((v - min) / span) * 12).toFixed(1)}`)
      .join(' ');
  }, [data]);
  return (
    <svg viewBox="0 0 100 18" preserveAspectRatio="none" className="w-full h-5">
      <polyline
        points={points}
        fill="none"
        stroke={danger ? '#DC2626' : ORANGE}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, icon: Icon, loading, trend, trendValue, trendDown, onClick }) => (
  <button
    onClick={onClick}
    className="bg-white border border-[#F1E8E2] rounded-2xl px-4 pt-3 pb-2 text-left shadow-sm hover:shadow-md transition-shadow min-w-0 flex flex-col"
  >
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-orange-50">
        <Icon size={22} className="text-orange-600" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-medium text-[#64748B] truncate">{label}</p>
          {trendValue != null && (
            <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${trendDown ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {trendDown ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
              {Math.abs(trendValue)}%
            </span>
          )}
        </div>
        {loading ? (
          <div className="h-6 w-12 bg-slate-100 rounded animate-pulse mt-0.5" />
        ) : (
          <p className="text-[24px] font-bold text-[#0F172A] leading-none mt-0.5">{value ?? '—'}</p>
        )}
        {!loading && sub && (
          <p className="text-[11px] truncate mt-0.5 text-[#94A3B8]">{sub}</p>
        )}
      </div>
    </div>
    <div className="pt-1.5">
      <Sparkline data={trend} />
    </div>
  </button>
);

// ─── Card wrapper ─────────────────────────────────────────────────────────────

const Card = ({ title, subtitle, action, onAction, children, className = '' }) => (
  <div className={`bg-white border border-[#F1E8E2] rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden ${className}`}>
    {title && (
      <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-[14px] font-semibold text-[#0F172A]">{title}</h2>
          {subtitle && <p className="text-[11px] text-[#94A3B8] mt-0.5">{subtitle}</p>}
        </div>
        {action && (
          <button onClick={onAction} className="text-[12px] font-medium text-orange-600 hover:underline">
            {action}
          </button>
        )}
      </div>
    )}
    {children}
  </div>
);

// ─── Activity icon mapper ─────────────────────────────────────────────────────

const ACTIVITY_ICONS = {
  onboard:     { Icon: UserPlus,      bg: 'bg-blue-50',    color: 'text-blue-600' },
  leave:       { Icon: CalendarOff,   bg: 'bg-amber-50',   color: 'text-amber-600' },
  document:    { Icon: Upload,        bg: 'bg-purple-50',  color: 'text-purple-600' },
  performance: { Icon: Star,          bg: 'bg-orange-50',  color: 'text-orange-600' },
  task:        { Icon: ClipboardList, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  default:     { Icon: Bell,          bg: 'bg-slate-100',  color: 'text-slate-500' },
};

const getActivityMeta = (type = '') => {
  const t = type.toLowerCase();
  if (t.includes('onboard') || t.includes('join'))        return ACTIVITY_ICONS.onboard;
  if (t.includes('leave'))                                  return ACTIVITY_ICONS.leave;
  if (t.includes('document') || t.includes('upload'))      return ACTIVITY_ICONS.document;
  if (t.includes('performance') || t.includes('review'))   return ACTIVITY_ICONS.performance;
  if (t.includes('task'))                                   return ACTIVITY_ICONS.task;
  return ACTIVITY_ICONS.default;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HRDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { enabled: notifEnabled, unreadCount, notifications, refresh, markRead, markAllRead } = useNotifications();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('owms_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const handleSetCollapsed = (val) => {
    setCollapsed(val);
    try { localStorage.setItem('owms_sidebar_collapsed', String(val)); } catch {}
  };

  const [loading, setLoading]                         = useState(true);
  const [headcount, setHeadcount]                     = useState(null);
  const [attendanceSummary, setAttendanceSummary]     = useState(null);
  const [leaves, setLeaves]                           = useState([]);
  const [pendingOnboardingCount, setPendingOnboardingCount] = useState(0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [headcountRes, attendanceRes, leavesRes] = await Promise.all([
        hrAPI.getHeadcountReport(),
        hrAPI.getAttendanceSummary(),
        hrAPI.getPendingLeaves(),
      ]);

      setHeadcount(headcountRes.data.data);
      setAttendanceSummary(attendanceRes.data.data);
      setLeaves(leavesRes.data.data || []);

      try {
        const onboardingRes = await hrAPI.getPendingOnboarding();
        setPendingOnboardingCount(onboardingRes.data.data?.length || 0);
      } catch { /* silently fail */ }

    } catch (err) {
      console.error('Dashboard fetch error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  // ── Derived data ────────────────────────────────────────────────────────────

  const departments = headcount?.departments || [];
  const totalEmployees = departments.reduce((acc, d) => acc + d.total, 0);
  const totalRecords = attendanceSummary
    ? (attendanceSummary.present + attendanceSummary.absent + attendanceSummary.leave + attendanceSummary.halfDay)
    : 0;

  const attendanceRate = totalRecords > 0
    ? Math.round(((attendanceSummary.present + attendanceSummary.halfDay * 0.5) / totalRecords) * 100)
    : null;
  const attendanceRateStr = attendanceRate != null ? `${attendanceRate}%` : 'N/A';
  const presentTodayCount = attendanceSummary?.present || 0;

  const leaveUtilization = totalRecords > 0
    ? Math.round((attendanceSummary.leave / totalRecords) * 100)
    : 0;

  const pendingLeavesCount = leaves.length;

  // Mock compliance value (since no API for this yet)
  const complianceRate = 94;

  // Build simple sparkline data
  const sparklines = useMemo(() => {
    const simple = (base, variance = 3) =>
      Array.from({ length: 12 }, (_, i) => Math.max(0, base + Math.sin(i * 0.8) * variance + (i * 0.2)));
    return {
      workforce:  simple(totalEmployees, 1),
      attendance: simple(attendanceRate || 50, 5),
      leave:      simple(leaveUtilization, 3),
      onboarding: simple(pendingOnboardingCount, 1),
      compliance: simple(complianceRate, 2),
    };
  }, [totalEmployees, attendanceRate, leaveUtilization, pendingOnboardingCount, complianceRate]);

  // Build 30-day attendance chart data (synthetic from current month summary)
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      // Create realistic looking synthetic data based on attendance summary
      const baseAttendance = attendanceRate || 75;
      const baseCompliance = complianceRate;
      data.push({
        label,
        'Attendance Rate (%)': Math.min(100, Math.max(0, baseAttendance + Math.sin(i * 0.5) * 8 + (Math.random() * 6 - 3))).toFixed(1),
        'Compliance Rate (%)': Math.min(100, Math.max(0, baseCompliance + Math.sin(i * 0.3) * 3 + (Math.random() * 4 - 2))).toFixed(1),
      });
    }
    return data;
  }, [attendanceRate, complianceRate]);

  // Recent activity from notifications
  const recentActivity = notifications.slice(0, 4);

  // ── Render ──────────────────────────────────────────────────────────────────

  const [notifOpen, setNotifOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const notifRef = useRef();
  const datePickerRef = useRef();
  const profileRef = useRef();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) setDatePickerOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
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

    const link = notif.link || '';
    const target = (link === '/hr' || link.startsWith('/hr/') || link === '/profile') ? link : '/hr/dashboard';
    navigate(target);
  };

  function notifMeta(type) {
    const t = type || '';
    if (t.includes('approved') || t === 'milestone_reached') return { icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (t.includes('rejected') || t.includes('blocked')) return { icon: 'error', color: 'text-rose-600', bg: 'bg-rose-50' };
    if (t.includes('task')) return { icon: 'task_alt', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (t.includes('leave')) return { icon: 'event', color: 'text-amber-600', bg: 'bg-amber-50' };
    if (t.includes('project')) return { icon: 'work', color: 'text-indigo-600', bg: 'bg-indigo-50' };
    return { icon: 'notifications', color: 'text-slate-500', bg: 'bg-slate-100' };
  }

  return (
    <div
      style={{ zoom: 0.8 }}
      className="h-[125vh] w-[125vw] overflow-hidden flex bg-[#FBF7F4] font-sans text-[#0F172A]"
    >
      <HRSidebar collapsed={collapsed} setCollapsed={handleSetCollapsed} onLogout={handleLogout} user={user} />

      {/* Main column */}
      <main className="flex-1 min-w-0 flex flex-col px-5 py-3 gap-3 overflow-y-auto">

        {/* ── Header row ── */}
        <div className="shrink-0 flex items-center justify-between">
          <div>
            <p className="text-[13px] text-[#94A3B8]">{getGreeting()}, {user?.name?.split(' ')[0] || 'there'}! 👋</p>
            <h1 className="text-[22px] font-bold tracking-tight leading-tight">HR Operations Dashboard</h1>
            <p className="text-[11px] text-[#94A3B8]">
              Real-time workforce analytics, compliance tracking, and people management insights.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Date Selector with Dropdown */}
            <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => {
                  setDatePickerOpen(!datePickerOpen);
                  setCurrentMonth(selectedDate);
                }}
                className="hidden xl:flex items-center gap-2 bg-white border border-[#F1E8E2] hover:border-orange-200 px-3 py-2 rounded-xl text-[12px] font-medium text-[#0F172A] shadow-sm transition-colors cursor-pointer text-left focus:outline-none"
              >
                <CalendarIcon size={14} className="text-[#64748B]" />
                {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                <ChevronDown size={14} className="text-[#94A3B8]" />
              </button>

              {datePickerOpen && (
                <div className="absolute right-0 top-12 z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 text-slate-800 animate-in fade-in zoom-in-95 duration-200 select-none">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors flex items-center justify-center focus:outline-none"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <span className="text-[13px] font-bold text-slate-900">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors flex items-center justify-center focus:outline-none"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>

                  {/* Week Days Headers */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <span key={d} className="text-[10px] font-bold text-slate-400 uppercase">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {daysInMonth.map((day, idx) => {
                      if (!day) return <span key={`empty-${idx}`} />;
                      const isToday = new Date().toDateString() === day.toDateString();
                      const isSelected = selectedDate.toDateString() === day.toDateString();
                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          onClick={() => {
                            setSelectedDate(day);
                            setDatePickerOpen(false);
                            toast.success(`Selected date: ${day.toLocaleDateString()}`);
                          }}
                          className={`w-8 h-8 rounded-lg text-[12px] font-semibold flex items-center justify-center transition-colors focus:outline-none ${
                            isSelected
                              ? 'bg-[#EA580C] text-white'
                              : isToday
                              ? 'bg-orange-50 text-orange-600 border border-orange-200'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/hr/employees')}
              className="bg-[#EA580C] hover:bg-[#C2410C] text-white px-4 py-2 rounded-xl text-[12px] font-semibold transition-colors shadow-sm"
            >
              Manage Employees
            </button>
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
                                {/* Dashboard has no relTime import so we skip time for now or we just don't render it since we don't have relTime */}
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
            {/* User Profile Chip with Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 bg-white border border-[#F1E8E2] hover:border-orange-200 rounded-xl px-2 py-1.5 shadow-sm text-left transition-colors cursor-pointer focus:outline-none"
              >
                <div className="w-8 h-8 rounded-lg bg-[#EA580C] flex items-center justify-center text-white text-[11px] font-bold overflow-hidden shrink-0">
                  {user?.profileImage || user?.avatar
                    ? <img src={user.profileImage || user.avatar} alt="" className="w-full h-full object-cover" />
                    : (user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'HR')}
                </div>
                <div className="hidden xl:block min-w-0">
                  <p className="text-[12px] font-semibold text-[#0F172A] truncate leading-tight">{user?.name || 'HR Manager'}</p>
                  <p className="text-[10px] text-[#94A3B8] truncate leading-tight font-medium">HR Manager</p>
                </div>
                <ChevronDown size={14} className="text-[#94A3B8] shrink-0" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 z-50 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 overflow-hidden">
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/hr/profile'); }}
                    className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600 transition-colors flex items-center gap-2 focus:outline-none"
                  >
                    <span className="material-symbols-outlined text-[18px]">person</span>
                    My Profile
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    onClick={() => { setProfileOpen(false); handleLogout(); }}
                    className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-rose-600 hover:bg-slate-50 transition-colors flex items-center gap-2 focus:outline-none"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="shrink-0 grid grid-cols-5 gap-3">
          <KpiCard
            label="Total Workforce"
            value={totalEmployees}
            sub={`Across ${departments.length} Departments`}
            icon={Users}
            loading={loading}
            trend={sparklines.workforce}
            trendValue={2.5}
            onClick={() => navigate('/hr/employees')}
          />
          <KpiCard
            label="Attendance Rate"
            value={attendanceRateStr}
            sub={`${presentTodayCount} present today`}
            icon={UserCheck}
            loading={loading}
            trend={sparklines.attendance}
            trendValue={1.2}
            onClick={() => navigate('/hr/attendance')}
          />
          <KpiCard
            label="Leave Utilization"
            value={`${leaveUtilization}%`}
            sub={`${pendingLeavesCount} pending approvals`}
            icon={CalendarOff}
            loading={loading}
            trend={sparklines.leave}
            trendValue={0.8}
            trendDown
            onClick={() => navigate('/hr/leave')}
          />
          <KpiCard
            label="Onboarding"
            value={pendingOnboardingCount}
            sub="Employees in progress"
            icon={Briefcase}
            loading={loading}
            trend={sparklines.onboarding}
            trendValue={0.5}
            onClick={() => navigate('/hr/onboarding')}
          />
          <KpiCard
            label="Compliance Status"
            value={`${complianceRate}%`}
            sub="On schedule"
            icon={ShieldCheck}
            loading={loading}
            trend={sparklines.compliance}
            trendValue={3.1}
            onClick={() => navigate('/hr/performance')}
          />
        </div>

        {/* ── Body: 9/12 left + 3/12 right ── */}
        <div className="flex-1 min-h-0 grid grid-cols-12 gap-3">

          {/* ── Left area (9/12) ── */}
          <div className="col-span-9 min-h-0 flex flex-col gap-3">

            {/* Onboarding Banner */}
            {pendingOnboardingCount > 0 && (
              <div className="shrink-0 bg-gradient-to-r from-[#FFF1E6] to-[#FFECD2] border border-[#FDBA74] rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#EA580C]/10 flex items-center justify-center shrink-0">
                  <Briefcase size={22} className="text-[#EA580C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-bold text-[#0F172A]">
                    {pendingOnboardingCount} Employee{pendingOnboardingCount > 1 ? 's' : ''} Onboarding In Progress
                  </h3>
                  <p className="text-[11px] text-[#78716C] mt-0.5">
                    Complete onboarding checklists to ensure new hires are fully integrated and productive.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/hr/onboarding')}
                  className="shrink-0 px-4 py-2 bg-white border border-[#FDBA74] rounded-lg text-[12px] font-semibold text-[#EA580C] hover:bg-orange-50 transition-colors"
                >
                  View Progress
                </button>
                {/* Decorative illustration area */}
                <div className="hidden xl:flex items-center justify-center w-24 h-16 shrink-0 opacity-60">
                  <div className="flex -space-x-3">
                    {[...Array(Math.min(pendingOnboardingCount, 3))].map((_, i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-orange-200 border-2 border-white flex items-center justify-center">
                        <UserPlus size={14} className="text-orange-700" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Charts row */}
            <div className="flex-[5] min-h-0 grid grid-cols-12 gap-3">

              {/* Attendance & Compliance Trends */}
              <Card
                title="Attendance & Compliance Trends"
                subtitle="30-day rolling window"
                action="Export Report"
                className="col-span-7"
              >
                <div className="flex-1 min-h-0 px-2 pb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hrAttFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={ORANGE} stopOpacity={0.15} />
                          <stop offset="100%" stopColor={ORANGE} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="hrCompFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#DC2626" stopOpacity={0.10} />
                          <stop offset="100%" stopColor="#DC2626" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <ReTooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #F1E8E2' }} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                      <Area
                        type="monotone"
                        dataKey="Attendance Rate (%)"
                        stroke={ORANGE}
                        strokeWidth={2}
                        fill="url(#hrAttFill)"
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="Compliance Rate (%)"
                        stroke="#DC2626"
                        strokeWidth={2}
                        fill="url(#hrCompFill)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Department Headcount & Health */}
              <Card
                title="Department Headcount & Health"
                subtitle="Active staff allocation across departments"
                action="View Directory"
                onAction={() => navigate('/hr/employees')}
                className="col-span-5"
              >
                <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-3 space-y-3">
                  {loading ? (
                    <div className="space-y-3 animate-pulse pt-1">
                      {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-lg" />)}
                    </div>
                  ) : departments.length === 0 ? (
                    <p className="text-[12px] text-[#94A3B8] pt-4 text-center">No department data available</p>
                  ) : (
                    <>
                      {departments.slice(0, 4).map((dept, i) => {
                        const pct = totalEmployees > 0 ? Math.round((dept.total / totalEmployees) * 100) : 0;
                        return (
                          <div key={dept.name} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                                <span className="text-[12px] font-semibold text-[#0F172A]">{dept.name}</span>
                              </div>
                              <span className="text-[11px] font-semibold text-[#0F172A] bg-slate-50 border border-[#F1E8E2] px-2 py-0.5 rounded">{dept.total} Staff</span>
                            </div>
                            <div className="w-full bg-[#F5EDE7] rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-[#94A3B8]">
                              <span>{pct}% of total</span>
                              <span className="font-medium">Avg. Attendance: 92%</span>
                            </div>
                          </div>
                        );
                      })}
                      {departments.length > 4 && (
                        <button
                          onClick={() => navigate('/hr/employees')}
                          className="text-[11px] font-medium text-orange-600 hover:underline w-full text-center pt-1"
                        >
                          + {departments.length - 4} More Departments
                        </button>
                      )}
                    </>
                  )}
                </div>
              </Card>
            </div>

            {/* Footer stats strip */}
            <div className="shrink-0 grid grid-cols-4 gap-3">
              {[
                { label: 'Average Attendance', value: loading ? '—' : attendanceRateStr },
                { label: 'Average Compliance', value: loading ? '—' : `${complianceRate}%` },
                { label: 'Best Attendance Day', value: loading ? '—' : 'N/A' },
                {
                  label: 'Compliance Trend',
                  value: loading ? '—' : `${complianceRate > 90 ? '↗' : '↘'} ${(complianceRate * 0.033).toFixed(1)}%`,
                  trend: complianceRate > 90 ? 'up' : 'down',
                },
              ].map(({ label, value, trend }) => (
                <div key={label} className="bg-white border border-[#F1E8E2] rounded-2xl px-3 py-2 flex items-center gap-2.5 min-w-0">
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#94A3B8] truncate">{label}</p>
                    <p className="text-[15px] font-bold leading-tight flex items-center gap-1">
                      {trend === 'up' && <TrendingUp size={12} className="text-emerald-600" />}
                      {trend === 'down' && <TrendingDown size={12} className="text-red-600" />}
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right column (3/12) ── */}
          <div className="col-span-3 min-h-0 flex flex-col gap-3">

            {/* Leave Status */}
            <Card className="shrink-0">
              <div className="px-4 py-4 flex flex-col items-center text-center">
                {pendingLeavesCount === 0 ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                      <CheckCircle2 size={22} className="text-emerald-600" />
                    </div>
                    <h3 className="text-[13px] font-bold text-[#0F172A]">All Clear</h3>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">No pending leave requests.</p>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-2">
                      <CalendarOff size={22} className="text-amber-600" />
                    </div>
                    <h3 className="text-[13px] font-bold text-[#0F172A]">{pendingLeavesCount} Pending</h3>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">Leave requests awaiting approval.</p>
                    <button
                      onClick={() => navigate('/hr/leave')}
                      className="mt-2 text-[11px] font-semibold text-orange-600 hover:underline"
                    >
                      Review Now
                    </button>
                  </>
                )}
              </div>
            </Card>

            {/* Performance Reviews Due */}
            <Card className="shrink-0">
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Award size={16} className="text-purple-600" />
                  </div>
                  <h3 className="text-[12px] font-bold text-[#0F172A]">Performance Reviews Due</h3>
                </div>
                <p className="text-[28px] font-bold text-[#0F172A] leading-none">8</p>
                <p className="text-[10px] text-[#94A3B8] mt-1">Next review deadline: Jul 15, 2026</p>
                <button
                  onClick={() => navigate('/hr/performance')}
                  className="w-full mt-3 py-2 text-[11px] font-bold text-[#7C3AED] bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  Schedule Reviews
                </button>
              </div>
            </Card>

            {/* Compliance Tasks */}
            <Card className="shrink-0">
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <FileText size={16} className="text-orange-600" />
                  </div>
                  <h3 className="text-[12px] font-bold text-[#0F172A]">Compliance Tasks</h3>
                </div>
                <p className="text-[28px] font-bold text-[#0F172A] leading-none">3</p>
                <p className="text-[10px] text-[#94A3B8] mt-1">Policy updates, certifications, audits</p>
                <button
                  onClick={() => navigate('/hr/documents')}
                  className="w-full mt-3 py-2 text-[11px] font-bold text-[#EA580C] bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  View Tasks
                </button>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card title="Recent Activity" action="View All" className="flex-1">
              <div className="flex-1 min-h-0 overflow-hidden px-4 pb-3 space-y-2.5">
                {loading ? (
                  <div className="space-y-2 animate-pulse pt-1">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg" />)}
                  </div>
                ) : recentActivity.length === 0 ? (
                  <p className="text-[12px] text-[#94A3B8] pt-4 text-center">No recent activity</p>
                ) : (
                  recentActivity.map((notif) => {
                    const meta = getActivityMeta(notif.type);
                    return (
                      <div key={notif._id} className="flex items-start gap-2.5">
                        <span className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                          <meta.Icon size={14} className={meta.color} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-[#0F172A] truncate">{notif.title || 'Activity'}</p>
                          <p className="text-[10px] text-[#94A3B8] truncate">{notif.message || ''}</p>
                        </div>
                        <span className="text-[10px] text-[#94A3B8] shrink-0 whitespace-nowrap">{timeAgo(notif.createdAt)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

          </div>
        </div>
      </main>

      {/* Announcement Modal Popup */}
      {selectedAnnouncement && (
        <AnnouncementModal
          announcement={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
        />
      )}
    </div>
  );
}