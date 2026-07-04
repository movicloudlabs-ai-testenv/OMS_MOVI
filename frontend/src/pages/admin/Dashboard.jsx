import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import toast from 'react-hot-toast';
import {
  Users, Building2, Shield, Bell, UserPlus,
  AlertTriangle, UserCheck, History, Megaphone, ShieldCheck, LayoutGrid,
  Monitor, Database, HardDrive, TrendingUp, TrendingDown,
  Settings as SettingsIcon,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie,
} from 'recharts';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { adminAPI } from '../../utils/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const ORANGE = '#EA580C';

// Donut slice colors — orange scale + grays, matching the reference design.
const ROLE_COLORS = ['#EA580C', '#FB923C', '#FDBA74', '#9CA3AF', '#6B7280', '#D1D5DB'];

const ANNOUNCEMENT_ICONS = {
  maintenance: Megaphone,
  security:    ShieldCheck,
  feature:     LayoutGrid,
  general:     Bell,
};

const formatBytes = (bytes) => {
  if (bytes == null) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const dayKey = (d) => d.toISOString().slice(0, 10);

// Cumulative running total over the last `days` days from item creation dates.
const cumulativeSeries = (items, days = 12) => {
  const total = items.length;
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const cutoff = new Date(); cutoff.setHours(23, 59, 59, 999); cutoff.setDate(cutoff.getDate() - i);
    series.push(items.filter(it => it.createdAt && new Date(it.createdAt) <= cutoff).length || 0);
  }
  // Items missing createdAt still count toward today's total
  if (series.length) series[series.length - 1] = total;
  return series;
};

// Events per day over the last `days` days from a list of ISO dates.
const dailySeries = (dates, days = 12) => {
  const counts = {};
  dates.forEach(d => {
    const k = dayKey(new Date(d));
    counts[k] = (counts[k] || 0) + 1;
  });
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    series.push(counts[dayKey(d)] || 0);
  }
  return series;
};

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

const actionBadge = (action = '') => {
  const a = action.toLowerCase();
  if (a.includes('create') || a.includes('login')) return 'bg-orange-100 text-orange-700';
  if (a.includes('update') || a.includes('edit'))  return 'bg-amber-100 text-amber-700';
  if (a.includes('delete'))                        return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-600';
};

// ─── Small pieces ─────────────────────────────────────────────────────────────

// Mini sparkline for KPI cards, plotting a real 12-point daily series.
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

const KpiCard = ({ label, value, sub, subRed, icon: Icon, danger, loading, trend, onClick }) => (
  <button
    onClick={onClick}
    className="bg-white border border-[#F1E8E2] rounded-2xl px-4 pt-3 pb-2 text-left shadow-sm hover:shadow-md transition-shadow min-w-0 flex flex-col"
  >
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-50' : 'bg-orange-50'}`}>
        <Icon size={22} className={danger ? 'text-red-600' : 'text-orange-600'} />
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-[#64748B] truncate">{label}</p>
        {loading ? (
          <div className="h-6 w-12 bg-slate-100 rounded animate-pulse mt-0.5" />
        ) : (
          <p className="text-[24px] font-bold text-[#0F172A] leading-none mt-0.5">{value ?? '—'}</p>
        )}
        {!loading && sub && (
          <p className={`text-[11px] truncate mt-0.5 ${subRed ? 'text-red-600' : 'text-[#94A3B8]'}`}>{sub}</p>
        )}
      </div>
    </div>
    <div className="pt-1.5">
      <Sparkline data={trend} danger={danger} />
    </div>
  </button>
);

const Card = ({ title, action, onAction, headerRight, children, className = '' }) => (
  <div className={`bg-white border border-[#F1E8E2] rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden ${className}`}>
    {title && (
      <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
        <h2 className="text-[14px] font-semibold text-[#0F172A]">{title}</h2>
        {headerRight}
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuth();
  const { enabled: notifEnabled, unreadCount } = useNotifications();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('owms_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const handleSetCollapsed = (val) => {
    setCollapsed(val);
    try { localStorage.setItem('owms_sidebar_collapsed', String(val)); } catch {}
  };

  const [growthRange, setGrowthRange] = useState(7);
  const [loading, setLoading]         = useState(true);
  const [totalUsers, setTotalUsers]   = useState(null);
  const [activeUsers, setActiveUsers] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles]             = useState([]);
  const [logs, setLogs]               = useState([]);
  const [failedTotal, setFailedTotal] = useState(null);
  const [stats, setStats]             = useState(null);

  const canReadLogs = hasPermission('Audit Logs', 'read');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const promises = [
        adminAPI.getUsers({ limit: 1 }),
        adminAPI.getUsers({ status: 'Active', limit: 1 }),
        adminAPI.getDepartments(),
        adminAPI.getRoles(),
        adminAPI.getDashboardStats(),
      ];
      if (canReadLogs) {
        promises.push(adminAPI.getAuditLogs({ limit: 300 }));
        promises.push(adminAPI.getAuditLogs({ result: 'FAILED', limit: 1 }));
      }
      const results = await Promise.all(promises);
      setTotalUsers(results[0].data.pagination?.total ?? results[0].data.total ?? 0);
      setActiveUsers(results[1].data.pagination?.total ?? results[1].data.total ?? 0);
      setDepartments(results[2].data.data || []);
      setRoles(results[3].data.data || []);
      setStats(results[4].data.data || null);
      if (canReadLogs) {
        setLogs(results[5].data.data || []);
        setFailedTotal(results[6].data.pagination?.total ?? results[6].data.total ?? 0);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [canReadLogs]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  // ── Derived data ────────────────────────────────────────────────────────────

  const inactiveUsers = (totalUsers != null && activeUsers != null) ? totalUsers - activeUsers : null;
  const activePct = (totalUsers && activeUsers) ? Math.round((activeUsers / totalUsers) * 100) : null;
  const systemRoles = roles.filter(r => r.isSystem).length;

  // Real user growth: cumulative total users per day, built from the backend's
  // new-users-per-day counts, working backwards from today's total.
  const growthData = useMemo(() => {
    const perDay = stats?.newUsersPerDay || {};
    const days = [];
    for (let i = growthRange - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push({
        key: dayKey(d),
        label: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      });
    }
    let running = totalUsers ?? 0;
    for (let i = days.length - 1; i >= 0; i--) {
      days[i].count = running;
      running -= perDay[days[i].key] || 0;
    }
    return days;
  }, [stats, totalUsers, growthRange]);

  // Real 12-day trend series for the KPI sparklines
  const trends = useMemo(() => {
    const perDay = stats?.newUsersPerDay || {};
    const userSeries = [];
    let running = totalUsers ?? 0;
    for (let i = 0; i < 12; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      userSeries.unshift(running);
      running -= perDay[dayKey(d)] || 0;
    }
    return {
      users:       userSeries,
      logins:      dailySeries(logs.filter(l => (l.action || '').toLowerCase().includes('login')).map(l => l.createdAt)),
      departments: cumulativeSeries(departments),
      roles:       cumulativeSeries(roles),
      failed:      dailySeries(logs.filter(l => l.result === 'FAILED').map(l => l.createdAt)),
    };
  }, [stats, totalUsers, logs, departments, roles]);

  const rolesWithUsers = useMemo(() =>
    [...roles].filter(r => (r.userCount || 0) > 0).sort((a, b) => (b.userCount || 0) - (a.userCount || 0)),
  [roles]);
  const roleTotal = rolesWithUsers.reduce((s, r) => s + (r.userCount || 0), 0);

  const topModules = useMemo(() => {
    const counts = {};
    logs.forEach(l => { if (l.module) counts[l.module] = (counts[l.module] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [logs]);
  const maxModuleCount = topModules[0]?.[1] || 1;

  const timeline = logs.slice(0, 5);
  const hasAlerts = failedTotal != null && failedTotal > 0;

  const todayLogins = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return logs.filter(l => (l.action || '').toLowerCase().includes('login') && new Date(l.createdAt) >= start).length;
  }, [logs]);

  const quickActions = [
    { label: 'New User',      Icon: UserPlus,     path: '/admin/users/new' },
    { label: 'Access Matrix', Icon: LayoutGrid,   path: '/admin/access-matrix' },
    { label: 'Audit Logs',    Icon: History,      path: '/admin/audit' },
    { label: 'Settings',      Icon: SettingsIcon, path: '/admin/settings' },
  ];

  const storagePct = stats?.storage?.quotaBytes
    ? Math.min(100, Math.round((stats.storage.storageBytes / stats.storage.quotaBytes) * 100))
    : null;

  const footerStats = [
    { Icon: Users,         label: 'Users Online',    value: loading ? '—' : String(stats?.usersOnline ?? 0),    sub: 'Last 15 min' },
    { Icon: UserCheck,     label: "Today's Logins",  value: loading ? '—' : String(todayLogins),                sub: 'Since midnight', trend: todayLogins > 0 ? 'up' : undefined },
    { Icon: Monitor,       label: 'Active Sessions', value: loading ? '—' : String(stats?.activeSessions ?? 0), sub: 'Last hour' },
    { Icon: AlertTriangle, label: 'Failed Logins',   value: loading ? '—' : String(failedTotal ?? 0),           sub: 'All time', trend: hasAlerts ? 'down' : undefined },
    { Icon: Database,      label: 'Data Usage',      value: loading ? '—' : formatBytes(stats?.storage?.dataBytes),  sub: 'Database size' },
    { Icon: HardDrive,     label: 'Storage Usage',   value: loading ? '—' : storagePct != null ? `${storagePct}%` : '—', sub: `of ${formatBytes(stats?.storage?.quotaBytes)}` },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    // zoom 0.8 renders the dashboard at the density of an 80%-zoomed browser;
    // 125vh/125vw compensate so the scaled layout still fills the full viewport.
    <div
      style={{ zoom: 0.8 }}
      className="h-[125vh] w-[125vw] overflow-hidden flex bg-[#FBF7F4] font-sans text-[#0F172A]"
    >

      <AdminSidebar collapsed={collapsed} setCollapsed={handleSetCollapsed} onLogout={handleLogout} user={user} />

      {/* Main column */}
      <main className="flex-1 min-w-0 flex flex-col px-5 py-3 gap-3">

        {/* Header row */}
        <div className="shrink-0 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight leading-tight">Dashboard</h1>
            <p className="text-[12px] text-[#94A3B8]">
              Welcome back, {user?.name || 'Admin'} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats && (
              <span className={`hidden xl:flex items-center gap-1.5 text-[11px] font-medium rounded-full px-3 py-1.5 border ${
                stats.health?.dbConnected && !stats.health?.maintenanceMode
                  ? 'text-orange-700 bg-orange-50 border-orange-100'
                  : 'text-red-700 bg-red-50 border-red-100'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  stats.health?.dbConnected && !stats.health?.maintenanceMode ? 'bg-[#EA580C]' : 'bg-red-500'
                }`} />
                {stats.health?.maintenanceMode ? 'Maintenance mode active'
                  : stats.health?.dbConnected ? 'All systems operational'
                  : 'Database disconnected'}
              </span>
            )}
            <button
              onClick={() => canReadLogs && navigate('/admin/audit')}
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

        {/* KPI row */}
        <div className="shrink-0 grid grid-cols-5 gap-3">
          <KpiCard label="Total Users"     value={totalUsers}   sub={inactiveUsers != null ? `${inactiveUsers} inactive` : null} icon={Users}        loading={loading} trend={trends.users} onClick={() => navigate('/admin/users')} />
          <KpiCard label="Active Users"    value={activeUsers}  sub={activePct != null ? `${activePct}% of workforce` : null}    icon={UserCheck}    loading={loading} trend={trends.logins} onClick={() => navigate('/admin/users?status=Active')} />
          <KpiCard label="Departments"     value={departments.length} sub="Across the organization"                              icon={Building2}    loading={loading} trend={trends.departments} onClick={() => navigate('/admin/departments')} />
          <KpiCard label="Roles"           value={roles.length} sub={systemRoles > 0 ? `${systemRoles} system defaults` : null}  icon={Shield}       loading={loading} trend={trends.roles} onClick={() => navigate('/admin/roles')} />
          <KpiCard label="Security Alerts" value={failedTotal}  sub="Failed access attempts" subRed={hasAlerts}                  icon={AlertTriangle} danger={hasAlerts} loading={loading} trend={trends.failed} onClick={() => navigate('/admin/audit?result=FAILED')} />
        </div>

        {/* Body: left = charts + activity rows, right = quick actions / health / modules */}
        <div className="flex-1 min-h-0 grid grid-cols-12 gap-3">

          {/* ── Left area (9/12) ── */}
          <div className="col-span-9 min-h-0 flex flex-col gap-3">

            {/* Charts row */}
            <div className="flex-[5] min-h-0 grid grid-cols-12 gap-3">

          {/* User Growth (activity over last 7 days) */}
          <Card
            title={
              <span className="flex items-baseline gap-2">
                User Growth
                <span className="text-[11px] font-medium text-orange-600">Last {growthRange} Days</span>
              </span>
            }
            headerRight={
              <select
                value={growthRange}
                onChange={(e) => setGrowthRange(Number(e.target.value))}
                className="text-[11px] font-medium text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-orange-100 transition-colors"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
              </select>
            }
            className="col-span-7"
          >
            <div className="flex-1 min-h-0 px-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ORANGE} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={ORANGE} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                         interval={growthRange > 7 ? 4 : 0} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <ReTooltip
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #F1E8E2' }}
                    formatter={(v) => [v, 'Total Users']}
                  />
                  <Area type="monotone" dataKey="count" stroke={ORANGE} strokeWidth={2} fill="url(#growthFill)"
                        dot={growthRange > 7 ? false : { r: 3, fill: ORANGE, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* User Distribution by Role */}
          <Card title="User Distribution by Role" className="col-span-5">
            <div className="flex-1 min-h-0 flex items-center justify-center px-4 pb-3 gap-5">
              <div className="relative h-full max-h-[230px] aspect-square shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rolesWithUsers.map((r, i) => ({
                        name: r.name,
                        value: r.userCount || 0,
                        fill: ROLE_COLORS[i % ROLE_COLORS.length],
                      }))}
                      dataKey="value" nameKey="name"
                      innerRadius="70%" outerRadius="92%"
                      paddingAngle={2} stroke="#fff" strokeWidth={2}
                    />
                    <ReTooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #F1E8E2' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[26px] font-bold text-[#0F172A] leading-none tracking-tight">{loading ? '—' : roleTotal}</span>
                  <span className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wider mt-0.5">Total Users</span>
                </div>
              </div>
              <div className="flex-1 min-w-0 max-w-[220px] space-y-2.5 overflow-hidden">
                {rolesWithUsers.map((r, i) => {
                  const pct = roleTotal ? Math.round(((r.userCount || 0) / roleTotal) * 100) : 0;
                  return (
                    <div key={r._id} className="flex items-center gap-2 text-[12px]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ROLE_COLORS[i % ROLE_COLORS.length] }} />
                      <span className="text-[#475569] truncate flex-1">{r.name}</span>
                      <span className="text-[#0F172A] font-semibold shrink-0">{r.userCount} <span className="font-normal text-[#94A3B8]">({pct}%)</span></span>
                    </div>
                  );
                })}
                {!loading && rolesWithUsers.length === 0 && (
                  <p className="text-[11px] text-[#94A3B8]">No role data</p>
                )}
              </div>
            </div>
          </Card>

            </div>

            {/* Activity row */}
            <div className="flex-[4] min-h-0 grid grid-cols-12 gap-3">

          <Card title="Recent Activity" action="View All" onAction={() => navigate('/admin/audit')} className="col-span-7">
            <div className="flex-1 min-h-0 overflow-hidden px-4 pb-2 space-y-2">
              {loading ? (
                <div className="space-y-2 animate-pulse pt-1">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-7 bg-slate-100 rounded-lg" />)}
                </div>
              ) : timeline.length === 0 ? (
                <p className="text-[12px] text-[#94A3B8] pt-4 text-center">No recent activity</p>
              ) : (
                timeline.map((log) => (
                  <div key={log._id} className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                      <UserCheck size={13} className="text-orange-600" />
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${actionBadge(log.action)}`}>
                      {log.action || 'Action'}
                    </span>
                    <p className="text-[12px] text-[#475569] truncate flex-1">
                      <span className="font-medium text-[#0F172A]">{log.user?.name || log.performedBy?.name || 'System'}</span>
                      {log.details ? ` — ${log.details}` : ''}
                    </p>
                    <span className="text-[11px] text-[#94A3B8] shrink-0">{timeAgo(log.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="Announcements" action="View All" className="col-span-5">
            <div className="flex-1 min-h-0 overflow-hidden px-4 pb-2 space-y-2.5">
              {loading ? (
                <div className="space-y-2 animate-pulse pt-1">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded-lg" />)}
                </div>
              ) : !stats?.announcements?.length ? (
                <p className="text-[12px] text-[#94A3B8] pt-4 text-center">No announcements yet</p>
              ) : (
                stats.announcements.slice(0, 3).map((a) => {
                  const Icon = ANNOUNCEMENT_ICONS[a.type] || Bell;
                  return (
                    <div key={a._id} className="flex items-start gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                        <Icon size={15} className="text-orange-600" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[12px] font-semibold text-[#0F172A] truncate">{a.title}</p>
                          <span className="text-[10px] text-[#94A3B8] shrink-0">{timeAgo(a.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-[#64748B] truncate">{a.body}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

            </div>
          </div>

          {/* ── Right column (3/12): quick actions / system health / top modules ── */}
          <div className="col-span-3 min-h-0 flex flex-col gap-3">

            <Card title="Quick Actions" className="shrink-0">
              <div className="px-3 pb-3 grid grid-cols-2 gap-1.5">
                {quickActions.map(({ label, Icon, path }) => (
                  <button
                    key={label}
                    onClick={() => navigate(path)}
                    className="rounded-lg bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors flex items-center justify-center gap-1.5 px-2 py-1.5 min-w-0"
                  >
                    <Icon size={13} className="text-orange-600 shrink-0" />
                    <span className="text-[11px] font-semibold text-orange-700 leading-none truncate">{label}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card title="System Health" className="shrink-0">
              <div className="px-4 pb-3 flex flex-col gap-2 text-[12px]">
                {[
                  stats?.health?.apiServer !== false && stats
                    ? { label: 'API Server', value: 'Online',  dot: 'bg-emerald-500', text: 'text-emerald-600' }
                    : { label: 'API Server', value: loading ? '…' : 'Unreachable', dot: 'bg-red-500', text: 'text-red-600' },
                  stats?.health?.dbConnected
                    ? { label: 'Database', value: 'Connected',    dot: 'bg-emerald-500', text: 'text-emerald-600' }
                    : { label: 'Database', value: loading ? '…' : 'Disconnected', dot: 'bg-red-500', text: 'text-red-600' },
                  stats?.health?.maintenanceMode
                    ? { label: 'Maintenance', value: 'Enabled',  dot: 'bg-red-500',     text: 'text-red-600' }
                    : { label: 'Maintenance', value: 'Disabled', dot: 'bg-emerald-500', text: 'text-emerald-600' },
                  { label: 'Last Activity', value: loading ? '—' : logs[0] ? timeAgo(logs[0].createdAt) : '—', dot: '', text: 'text-[#0F172A]' },
                ].map(({ label, value, dot, text }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[#64748B]">{label}</span>
                    <span className={`font-medium flex items-center gap-1.5 ${text}`}>
                      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}{value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Top Modules" action="View Logs" onAction={() => navigate('/admin/audit')} className="flex-1">
              <div className="flex-1 min-h-0 overflow-hidden px-4 pb-2 space-y-1.5">
              {loading ? (
                <div className="space-y-2 animate-pulse pt-1">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-5 bg-slate-100 rounded" />)}
                </div>
              ) : topModules.length === 0 ? (
                <p className="text-[12px] text-[#94A3B8] pt-4 text-center">No activity data</p>
              ) : (
                topModules.map(([module, count]) => (
                  <div key={module}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-medium text-[#0F172A]">{module}</span>
                      <span className="text-[10px] text-[#94A3B8]">{count}</span>
                    </div>
                    <div className="h-1.5 bg-[#F5EDE7] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#EA580C] to-[#FB923C]"
                           style={{ width: `${Math.round((count / maxModuleCount) * 100)}%` }} />
                    </div>
                  </div>
                ))
              )}
              </div>
            </Card>
          </div>
        </div>

        {/* Footer stats strip */}
        <div className="shrink-0 grid grid-cols-6 gap-3">
          {footerStats.map(({ Icon, label, value, sub, trend }) => (
            <div key={label} className="bg-white border border-[#F1E8E2] rounded-2xl px-3 py-2 flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <Icon size={15} className="text-orange-600" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-[#94A3B8] truncate">{label}</p>
                <p className="text-[15px] font-bold leading-tight">{value}</p>
                <p className="text-[10px] text-[#94A3B8] truncate flex items-center gap-1">
                  {trend === 'up' && <TrendingUp size={10} className="text-emerald-600" />}
                  {trend === 'down' && <TrendingDown size={10} className="text-red-600" />}
                  {sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
