import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Check, ExternalLink, Mail, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI, hrAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calcTenure = (from, to = null) => {
  if (!from) return null;
  const start = new Date(from).getTime();
  const end   = to ? new Date(to).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  const days   = Math.floor(diffMs / 86400000);
  if (days < 1) {
    const hours = Math.floor(diffMs / 3600000);
    if (hours >= 1) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes >= 1) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    return 'Just now';
  }
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
  const years = Math.floor(months / 12);
  const rem   = months % 12;
  return rem > 0 ? `${years}y ${rem}m` : `${years} year${years !== 1 ? 's' : ''}`;
};

const fmtDate = (iso, opts = { year: 'numeric', month: 'long', day: 'numeric' }) =>
  iso ? new Date(iso).toLocaleDateString('en-US', opts) : '—';

const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }) : 'Never';

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

const ROLE_COLORS = {
  'super-admin': { bg: 'bg-red-100',     text: 'text-red-600',     ring: 'ring-red-200'     },
  'admin':       { bg: 'bg-orange-100',  text: 'text-orange-600',  ring: 'ring-orange-200'  },
  'hr-manager':  { bg: 'bg-violet-100',  text: 'text-violet-600',  ring: 'ring-violet-200'  },
  'pmo-lead':    { bg: 'bg-cyan-100',    text: 'text-cyan-700',    ring: 'ring-cyan-200'    },
  'employee':    { bg: 'bg-blue-100',    text: 'text-blue-600',    ring: 'ring-blue-200'    },
  'intern':      { bg: 'bg-emerald-100', text: 'text-emerald-600', ring: 'ring-emerald-200' },
};
const getRoleColor = (slug) => ROLE_COLORS[slug] || { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200' };

const actionBadge = (action = '') => {
  const a = action.toLowerCase();
  if (a.includes('create') || a.includes('login'))  return 'bg-blue-100 text-blue-700';
  if (a.includes('update') || a.includes('edit'))   return 'bg-amber-100 text-amber-700';
  if (a.includes('delete'))                         return 'bg-red-100 text-red-700';
  if (a.includes('export'))                         return 'bg-cyan-100 text-cyan-700';
  if (a.includes('logout'))                         return 'bg-gray-100 text-gray-500';
  return 'bg-slate-100 text-slate-600';
};

const resultDot = (r) =>
  r === 'SUCCESS' ? 'bg-[#16A34A]' : r === 'FAILED' ? 'bg-[#DC2626]' : r === 'WARNING' ? 'bg-[#D97706]' : 'bg-[#94A3B8]';

const CHECKLIST_LABELS = {
  welcomeEmail:      'Welcome email sent',
  idCardIssued:      'ID card issued',
  systemAccess:      'System access granted',
  deptIntroduction:  'Department introduction',
  equipmentAssigned: 'Equipment assigned',
  hrDocumentation:   'HR documentation complete',
  mentorAssigned:    'Mentor assigned',
  firstWeekSchedule: 'First-week schedule shared',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const InfoRow = ({ label, children }) => (
  <div>
    <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">{label}</p>
    <div className="text-[13px] font-medium text-[#0F172A]">{children || <span className="text-[#94A3B8]">Not provided</span>}</div>
  </div>
);

const SectionCard = ({ title, icon, children }) => (
  <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center gap-2">
      {icon && <span className="material-symbols-outlined text-[18px] text-[#64748B]">{icon}</span>}
      <h3 className="text-[14px] font-semibold text-[#0F172A]">{title}</h3>
    </div>
    <div className="px-5 py-5 space-y-4">{children}</div>
  </div>
);

const PersonChip = ({ person, label }) => {
  if (!person) return <span className="text-[13px] text-[#94A3B8]">Not assigned</span>;
  const name  = person.name || 'Unknown';
  const email = person.email || '';
  const init  = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center text-[11px] font-bold shrink-0">
        {init}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#0F172A] truncate">{name}</p>
        {email && <p className="text-[11px] text-[#64748B] truncate">{email}</p>}
        {label && <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">{label}</p>}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminUserDetails() {
  const navigate        = useNavigate();
  const { id }          = useParams();
  const { hasPermission } = useAuth();

  const canEdit   = hasPermission('Users', 'update');
  const canManage = hasPermission('Users', 'manage');
  const canDelete = hasPermission('Users', 'delete');

  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser]           = useState(null);
  const [logs, setLogs]           = useState([]);
  const [leaves, setLeaves]       = useState(null);
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [resetting, setResetting]         = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [tempPassword, setTempPassword]   = useState('');
  const [copied, setCopied]               = useState(false);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const canReadLogs = hasPermission('Audit Logs', 'read');
      const promises = [
        adminAPI.getUser(id),
        adminAPI.getUserProjects(id),
      ];
      const [uRes, pRes] = await Promise.all(promises);
      setUser(uRes.data.data);
      setProjects(pRes.data.data || []);

      if (canReadLogs) {
        adminAPI.getAuditLogs({ userId: id, limit: 20 })
          .then(r => setLogs(r.data.data || []))
          .catch(() => setLogs([]));
      } else {
        setLogs([]);
      }

      // Non-blocking HR data
      hrAPI.getEmployeeLeaves(id)
        .then(r => setLeaves(r.data.data || []))
        .catch(() => setLeaves([]));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  }, [id, hasPermission]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleToggleStatus = async () => {
    if (!user) return;
    const next = user.status === 'Active' ? 'Inactive' : 'Active';
    setTogglingStatus(true);
    try {
      await adminAPI.updateUserStatus(id, next);
      toast.success(`User ${next === 'Active' ? 'activated' : 'deactivated'}`);
      await fetchUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleResetPassword = async () => {
    setResetting(true);
    setTempPassword('');
    try {
      const res = await adminAPI.resetUserPassword(id);
      const tmp = res.data?.data?.tempPassword;
      if (tmp) setTempPassword(tmp);
      else toast.success('Password reset email sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (loading) return (
    <AdminLayout bare>
      <div className="flex items-center justify-center min-h-[400px] flex-col gap-3">
        <div className="w-8 h-8 border-2 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-[#64748B]">Loading profile…</p>
      </div>
    </AdminLayout>
  );

  if (error || !user) return (
    <AdminLayout bare>
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <span className="material-symbols-outlined text-[48px] text-[#DC2626]">error</span>
        <p className="text-[15px] text-[#0F172A] font-medium">{error || 'User not found'}</p>
        <button onClick={() => navigate('/admin/users')} className="text-[#EA580C] font-medium hover:underline text-[13px]">
          ← Back to Users
        </button>
      </div>
    </AdminLayout>
  );

  // ── Derived values ──────────────────────────────────────────────────────────
  const isActive   = user.status === 'Active';
  const isIntern   = user.employmentType === 'Intern' || user.role?.slug === 'intern';
  const roleName   = user.role?.name || '—';
  const roleSlug   = user.role?.slug || '';
  const deptName   = user.department?.name || '—';
  const roleColor  = getRoleColor(roleSlug);
  const initials   = user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const tenureFrom = isIntern ? (user.internshipStart || user.createdAt) : (user.joinDate || user.createdAt);
  const tenureTo   = isIntern && user.internshipEnd ? user.internshipEnd : null;
  const tenure     = calcTenure(tenureFrom, tenureTo);
  const tenureLabel = isIntern ? 'Intern duration' : 'Employee tenure';

  const checklist = user.onboardingChecklist || {};
  const checklistDone = Object.values(checklist).filter(Boolean).length;
  const checklistTotal = Object.keys(CHECKLIST_LABELS).length;

  const performanceRatings = user.performanceRatings || [];
  const avgRating = performanceRatings.length
    ? (performanceRatings.reduce((s, r) => s + (r.rating || 0), 0) / performanceRatings.length).toFixed(1)
    : null;

  const TABS = [
    { id: 'overview', label: 'Overview',         icon: 'person' },
    { id: 'work',     label: 'Work & Projects',  icon: 'work' },
    { id: 'hr',       label: 'HR Details',       icon: 'badge' },
    ...(hasPermission('Audit Logs', 'read') ? [{ id: 'activity', label: 'Activity',         icon: 'history', count: logs.length }] : []),
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AdminLayout bare>
      <div className="font-sans text-[#0F172A] w-full space-y-5 pb-16">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
          <button onClick={() => navigate('/admin/users')} className="hover:text-[#EA580C] transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">group</span>
            Users
          </button>
          <span className="material-symbols-outlined text-[15px]">chevron_right</span>
          <span className="text-[#0F172A] font-medium">{user.name}</span>
        </div>

        {/* ── HERO CARD ─────────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
          {/* Color top bar based on role */}
          <div className={`h-1.5 w-full ${
            roleSlug === 'super-admin' ? 'bg-red-500' :
            roleSlug === 'admin'       ? 'bg-orange-500' :
            roleSlug === 'hr-manager'  ? 'bg-violet-500' :
            roleSlug === 'pmo-lead'    ? 'bg-cyan-500' :
            roleSlug === 'intern'      ? 'bg-emerald-500' : 'bg-[#EA580C]'
          }`} />

          <div className="px-6 py-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
              {/* Avatar + Identity */}
              <div className="flex items-start gap-5">
                <div className="relative shrink-0">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-[28px] font-bold ring-4 ${roleColor.bg} ${roleColor.text} ${roleColor.ring}`}>
                    {initials}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-[#16A34A]' : 'bg-[#94A3B8]'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-[22px] font-bold tracking-tight text-[#0F172A] leading-none">{user.name}</h1>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${isActive ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                      {user.status}
                    </span>
                  </div>
                  <p className="text-[14px] text-[#475569] mt-1 font-medium">
                    {user.designation || 'No designation'} <span className="text-[#CBD5E1] mx-1.5">·</span> {deptName}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-[12px] text-[#64748B]">
                    {user.email && (
                      <a href={`mailto:${user.email}`} className="flex items-center gap-1 hover:text-[#EA580C] transition-colors">
                        <Mail size={12} /> {user.email}
                      </a>
                    )}
                    {user.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {user.phone}
                      </span>
                    )}
                    {user.linkedIn && (
                      <a href={user.linkedIn} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#EA580C] hover:underline">
                        <ExternalLink size={12} /> LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons — shown only when user has permission */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {canEdit && (
                  <button
                    onClick={() => navigate(`/admin/users/${id}/edit`)}
                    className="border border-[#E2E8F0] bg-white text-[#0F172A] px-3.5 py-1.5 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                  </button>
                )}
                {canManage && (
                  <button
                    onClick={handleToggleStatus}
                    disabled={togglingStatus}
                    className={`border px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-60 ${
                      isActive
                        ? 'border-[#E2E8F0] bg-white text-[#DC2626] hover:bg-[#FEF2F2]'
                        : 'border-[#16A34A]/40 bg-white text-[#16A34A] hover:bg-[#F0FDF4]'
                    }`}
                  >
                    {togglingStatus
                      ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : <span className="material-symbols-outlined text-[16px]">{isActive ? 'block' : 'check_circle'}</span>
                    }
                    {isActive ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </div>

            {/* Quick-stat chips */}
            <div className="mt-5 pt-5 border-t border-[#F1F5F9] grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: tenureLabel,
                  value: tenure || '—',
                  icon: 'schedule',
                  color: 'text-[#EA580C]',
                  bg: 'bg-[#FFF7ED]',
                },
                {
                  label: 'Employment type',
                  value: user.employmentType || 'Full-time',
                  icon: 'work',
                  color: 'text-[#7C3AED]',
                  bg: 'bg-[#EDE9FE]',
                },
                {
                  label: 'System role',
                  value: roleName,
                  icon: 'shield',
                  color: 'text-[#D97706]',
                  bg: 'bg-[#FEF3C7]',
                },
                {
                  label: 'Last active',
                  value: timeAgo(user.lastLogin),
                  icon: 'login',
                  color: 'text-[#64748B]',
                  bg: 'bg-[#F1F5F9]',
                },
              ].map(({ label, value, icon, color, bg }) => (
                <div key={label} className={`rounded-xl px-4 py-3 ${bg} flex items-center gap-2.5`}>
                  <span className={`material-symbols-outlined text-[18px] shrink-0 ${color}`}>{icon}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">{label}</p>
                    <p className={`text-[13px] font-bold truncate ${color}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Employee/Intern ID */}
            {user.employeeId && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">ID</span>
                <span className="font-mono text-[12px] font-bold text-[#475569] bg-[#F1F5F9] px-2.5 py-0.5 rounded-lg">{user.employeeId}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── TAB NAV ───────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-1.5 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#0F172A] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW                                                     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Left 2/3 */}
            <div className="lg:col-span-2 space-y-5">

              {/* Identity & Contact */}
              <SectionCard title="Identity & Contact" icon="badge">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow label="Full Name">{user.name}</InfoRow>
                  <InfoRow label="Employee ID">
                    {user.employeeId
                      ? <span className="font-mono text-[13px]">{user.employeeId}</span>
                      : null}
                  </InfoRow>
                  <InfoRow label="Email Address">
                    <a href={`mailto:${user.email}`} className="text-[#EA580C] hover:underline flex items-center gap-1">
                      {user.email} <ExternalLink size={11} />
                    </a>
                  </InfoRow>
                  <InfoRow label="Phone Number">
                    {user.phone || <span className="text-[#94A3B8] text-[12px]">Set via employee settings</span>}
                  </InfoRow>
                  <InfoRow label="Address">
                    {user.address
                      ? <span className="flex items-start gap-1"><MapPin size={13} className="mt-0.5 shrink-0 text-[#94A3B8]" /> {user.address}</span>
                      : <span className="text-[#94A3B8] text-[12px]">Set via employee settings</span>}
                  </InfoRow>
                  <InfoRow label="LinkedIn">
                    {user.linkedIn
                      ? <a href={user.linkedIn} target="_blank" rel="noreferrer" className="text-[#EA580C] hover:underline flex items-center gap-1">View Profile <ExternalLink size={11} /></a>
                      : <span className="text-[#94A3B8] text-[12px]">Set via employee settings</span>}
                  </InfoRow>
                  {isIntern && (
                    <InfoRow label="College / Institution">{user.college}</InfoRow>
                  )}
                </div>
                {user.bio && (
                  <div className="pt-4 border-t border-[#F1F5F9]">
                    <InfoRow label="Bio">
                      <p className="text-[13px] text-[#475569] leading-relaxed">{user.bio}</p>
                    </InfoRow>
                  </div>
                )}
                <div className="pt-3 border-t border-[#F1F5F9] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#94A3B8]">info</span>
                  <p className="text-[11px] text-[#94A3B8]">Contact details and LinkedIn are updated by the employee through their profile settings.</p>
                </div>
              </SectionCard>

              {/* Skills & Expertise — only shown when skills exist */}
              {user.skills?.length > 0 && (
                <SectionCard title="Skills & Expertise" icon="psychology">
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill, i) => (
                      <span key={i} className="bg-[#FFF7ED] text-[#EA580C] border border-[#BFDBFE] text-[12px] font-medium px-3 py-1 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#94A3B8] flex items-center gap-1 pt-2">
                    <span className="material-symbols-outlined text-[13px]">info</span>
                    Skills are added by the employee through their profile settings.
                  </p>
                </SectionCard>
              )}

            </div>

            {/* Right 1/3 */}
            <div className="space-y-5">

              {/* Corporate Structure */}
              <SectionCard title="Corporate Structure" icon="account_tree">
                <InfoRow label="Department">{deptName}</InfoRow>
                <InfoRow label="Job Title">{user.designation}</InfoRow>
                <InfoRow label="Employment Type">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                    {user.employmentType || 'Full-time'}
                  </span>
                </InfoRow>
                <InfoRow label="Reporting Manager">
                  <PersonChip person={user.manager} />
                </InfoRow>
                <InfoRow label="HR Manager">
                  <PersonChip person={user.hrManager} />
                </InfoRow>
                {isIntern && (
                  <>
                    <InfoRow label="Mentor"><PersonChip person={user.mentor} /></InfoRow>
                    <InfoRow label="PMO Lead"><PersonChip person={user.pmoLead} /></InfoRow>
                  </>
                )}
                <InfoRow label="Joined Organization">
                  {fmtDate(user.joinDate || user.internshipStart || user.createdAt)}
                </InfoRow>
              </SectionCard>

              {/* Access & Security */}
              <SectionCard title="Access & Security" icon="security">
                <InfoRow label="System Role">
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-[12px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                    {roleName}
                  </span>
                </InfoRow>
                <InfoRow label="Account Status">
                  <span className={`inline-flex items-center gap-1 text-[12px] font-semibold ${isActive ? 'text-[#16A34A]' : 'text-[#94A3B8]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#16A34A]' : 'bg-[#94A3B8]'}`} />
                    {user.status}
                  </span>
                </InfoRow>
                <InfoRow label="Last Login">{fmtDateTime(user.lastLogin)}</InfoRow>
                <InfoRow label="Account Created">{fmtDate(user.createdAt)}</InfoRow>

                {canManage && (
                <div className="pt-4 border-t border-[#F1F5F9]">
                  <button
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="w-full flex items-center justify-center gap-2 text-[13px] font-medium text-[#EA580C] border border-[#EA580C]/30 hover:border-[#EA580C] hover:bg-[#FFF7ED] py-2 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {resetting
                      ? <div className="w-3.5 h-3.5 border-2 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
                      : <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                    }
                    Reset Password
                  </button>
                  {tempPassword && (
                    <div className="mt-3 bg-[#F0FDF4] border border-[#16A34A]/30 rounded-lg p-3 space-y-1.5">
                      <p className="text-[10px] font-semibold text-[#16A34A] uppercase tracking-wider">Temporary Password</p>
                      <div className="flex items-center gap-2">
                        <span className="flex-1 font-mono text-[13px] font-bold text-[#0F172A] bg-white border border-[#E2E8F0] rounded px-3 py-1.5 select-all">
                          {tempPassword}
                        </span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(tempPassword); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                          className="p-1.5 rounded border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-colors text-[#64748B]"
                        >
                          {copied ? <Check size={13} className="text-[#16A34A]" /> : <Copy size={13} />}
                        </button>
                      </div>
                      <p className="text-[10px] text-[#64748B]">Share with the user — not shown again.</p>
                    </div>
                  )}
                </div>
                )}
              </SectionCard>

            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: WORK & PROJECTS                                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'work' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">

              {/* Projects */}
              <SectionCard title={`Projects & Assignments (${projects.length})`} icon="folder_open">
                {projects.length > 0 ? (
                  <div className="space-y-3">
                    {projects.map((proj) => {
                      const statusColor =
                        proj.status === 'Active'    ? 'bg-[#DCFCE7] text-[#16A34A]' :
                        proj.status === 'Completed' ? 'bg-[#FFF7ED] text-[#EA580C]' :
                        proj.status === 'On Hold'   ? 'bg-[#FEF3C7] text-[#D97706]' :
                        proj.status === 'Cancelled' ? 'bg-[#FEE2E2] text-[#DC2626]' :
                                                      'bg-[#F1F5F9] text-[#64748B]';
                      const roleColor =
                        proj.userRole === 'Manager'     ? 'bg-[#EDE9FE] text-[#7C3AED]' :
                        proj.userRole === 'Intern'      ? 'bg-[#D1FAE5] text-[#059669]' :
                                                          'bg-[#FFF7ED] text-[#EA580C]';
                      return (
                        <div key={proj._id} className="flex items-start gap-3.5 p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-[#FFF7ED] flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[#EA580C] text-[18px]">rocket_launch</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <p className="text-[14px] font-semibold text-[#0F172A]">{proj.name}</p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleColor}`}>{proj.userRole}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>{proj.status}</span>
                              </div>
                            </div>
                            {proj.description && (
                              <p className="text-[12px] text-[#64748B] mt-1 leading-snug line-clamp-2">{proj.description}</p>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                              {proj.code && <span className="text-[11px] font-mono text-[#94A3B8]">{proj.code}</span>}
                              {proj.priority && (
                                <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">flag</span>{proj.priority}
                                </span>
                              )}
                              {proj.startDate && (
                                <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                                  {new Date(proj.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  {proj.endDate && ` → ${new Date(proj.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <span className="material-symbols-outlined text-[36px] text-[#CBD5E1] block mb-2">folder_off</span>
                    <p className="text-[13px] text-[#94A3B8]">No projects found for this user</p>
                  </div>
                )}
              </SectionCard>

              {/* Intern-specific: Performance Ratings */}
              {isIntern && (
                <SectionCard title="Performance Ratings" icon="star">
                  {performanceRatings.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 pb-3 border-b border-[#F1F5F9]">
                        <div className="text-center">
                          <p className="text-[30px] font-bold text-[#0F172A] leading-none">{avgRating}</p>
                          <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mt-0.5">Avg. Rating</p>
                        </div>
                        <div className="flex-1">
                          <div className="flex gap-1 mb-1">
                            {[1, 2, 3, 4, 5].map(n => (
                              <div key={n} className={`flex-1 h-2 rounded-full ${parseFloat(avgRating) >= n ? 'bg-[#D97706]' : 'bg-[#F1F5F9]'}`} />
                            ))}
                          </div>
                          <p className="text-[11px] text-[#64748B]">Based on {performanceRatings.length} review{performanceRatings.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="space-y-2.5 max-h-52 overflow-y-auto">
                        {[...performanceRatings].reverse().map((r, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="text-[11px] font-semibold text-[#94A3B8] bg-[#F1F5F9] px-2 py-1 rounded shrink-0">W{r.week}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                {[1, 2, 3, 4, 5].map(n => (
                                  <span key={n} className={`text-[14px] ${r.rating >= n ? 'text-[#D97706]' : 'text-[#E2E8F0]'}`}>★</span>
                                ))}
                                <span className="text-[11px] font-medium text-[#0F172A] ml-1">{r.rating}/5</span>
                              </div>
                              {r.note && <p className="text-[12px] text-[#64748B] mt-0.5">{r.note}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#94A3B8] text-center py-4">No performance ratings recorded yet.</p>
                  )}
                </SectionCard>
              )}

            </div>

            {/* Right column */}
            <div className="space-y-5">

              {/* Intern Timeline */}
              {isIntern && (
                <SectionCard title="Internship Period" icon="calendar_today">
                  <InfoRow label="Start Date">
                    {fmtDate(user.internshipStart)}
                  </InfoRow>
                  <InfoRow label="End Date">
                    {user.internshipEnd ? fmtDate(user.internshipEnd) : <span className="text-[#16A34A] font-semibold">Ongoing</span>}
                  </InfoRow>
                  <InfoRow label="Duration">
                    <span className="text-[#EA580C] font-bold">{tenure || '—'}</span>
                  </InfoRow>
                  {user.college && (
                    <InfoRow label="College">{user.college}</InfoRow>
                  )}
                </SectionCard>
              )}

              {/* Onboarding Checklist */}
              <SectionCard title="Onboarding" icon="checklist">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#16A34A] rounded-full transition-all"
                      style={{ width: `${(checklistDone / checklistTotal) * 100}%` }}
                    />
                  </div>
                  <span className="text-[12px] font-bold text-[#0F172A] shrink-0">{checklistDone}/{checklistTotal}</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(CHECKLIST_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        checklist[key]
                          ? 'bg-[#16A34A] border-[#16A34A]'
                          : 'border-[#CBD5E1] bg-white'
                      }`}>
                        {checklist[key] && (
                          <span className="material-symbols-outlined text-white text-[12px] leading-none">check</span>
                        )}
                      </div>
                      <span className={`text-[12px] ${checklist[key] ? 'text-[#0F172A] font-medium' : 'text-[#94A3B8]'}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>

            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: HR DETAILS                                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'hr' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">

              {/* Reporting Chain */}
              <SectionCard title="Reporting Structure" icon="account_tree">
                <div className="space-y-4">
                  {[
                    { label: 'Direct Manager',    person: user.manager,   icon: 'manage_accounts' },
                    { label: 'HR Manager',        person: user.hrManager, icon: 'badge' },
                    ...(isIntern ? [
                      { label: 'Assigned Mentor', person: user.mentor,   icon: 'school' },
                      { label: 'PMO Lead',        person: user.pmoLead,  icon: 'engineering' },
                    ] : []),
                  ].map(({ label, person, icon }) => (
                    <div key={label} className="flex items-center gap-4 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <div className="w-9 h-9 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#64748B] text-[18px]">{icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">{label}</p>
                        <PersonChip person={person} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Leave Balance */}
              <SectionCard title="Leave Balance" icon="event_available">
                {leaves === null ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : leaves.length === 0 ? (
                  <p className="text-[13px] text-[#94A3B8] text-center py-4">
                    No leave records available. Leave data is managed in the HR module.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {leaves.map((lv, i) => {
                      const total  = lv.total || lv.allocated || 20;
                      const used   = lv.used || lv.taken || 0;
                      const balance = lv.balance ?? (total - used);
                      const pct   = Math.min(100, Math.round((used / total) * 100));
                      return (
                        <div key={i}>
                          <div className="flex justify-between mb-1">
                            <span className="text-[13px] font-medium text-[#0F172A]">{lv.type || lv.leaveType}</span>
                            <span className="text-[12px] text-[#64748B]">{balance} of {total} remaining</span>
                          </div>
                          <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct > 80 ? 'bg-[#DC2626]' : pct > 60 ? 'bg-[#D97706]' : 'bg-[#16A34A]'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              {/* Admin Notes */}
              {user.notes?.length > 0 && (
                <SectionCard title="Admin Notes" icon="note">
                  <div className="space-y-3">
                    {user.notes.map((note, i) => (
                      <div key={i} className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3">
                        <p className="text-[13px] text-[#0F172A] leading-snug">{note.text}</p>
                        <p className="text-[11px] text-[#94A3B8] mt-1.5">
                          {note.addedBy?.name || 'Admin'} · {fmtDate(note.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

            </div>

            {/* Right */}
            <div className="space-y-5">

              {/* Emergency Contact */}
              <SectionCard title="Emergency Contact" icon="emergency">
                {user.emergencyContact?.name ? (
                  <div className="space-y-3">
                    <InfoRow label="Name">{user.emergencyContact.name}</InfoRow>
                    <InfoRow label="Phone">{user.emergencyContact.phone}</InfoRow>
                    <InfoRow label="Relationship">{user.emergencyContact.relation}</InfoRow>
                  </div>
                ) : (
                  <p className="text-[13px] text-[#94A3B8] text-center py-4">
                    No emergency contact recorded.
                  </p>
                )}
              </SectionCard>

              {/* Employment Timeline */}
              <SectionCard title="Employment Timeline" icon="timeline">
                <div className="space-y-3">
                  {[
                    { label: 'Account Created', date: user.createdAt, dot: 'bg-[#EA580C]' },
                    { label: isIntern ? 'Internship Start' : 'Join Date', date: user.internshipStart || user.joinDate, dot: 'bg-[#16A34A]' },
                    { label: 'Last Login', date: user.lastLogin, dot: 'bg-[#D97706]' },
                    ...(user.internshipEnd ? [{ label: 'Internship End', date: user.internshipEnd, dot: 'bg-[#94A3B8]' }] : []),
                  ].filter(e => e.date).map((event, i, arr) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${event.dot}`} />
                        {i < arr.length - 1 && <div className="w-px flex-1 bg-[#E2E8F0] my-1" />}
                      </div>
                      <div className={`${i < arr.length - 1 ? 'pb-3' : ''}`}>
                        <p className="text-[12px] font-semibold text-[#0F172A]">{event.label}</p>
                        <p className="text-[11px] text-[#64748B]">{fmtDate(event.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: ACTIVITY                                                     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'activity' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-[#0F172A]">Audit Activity</h3>
                <p className="text-[13px] text-[#64748B] mt-0.5">
                  All recorded system actions for this account.
                </p>
              </div>
              <button
                onClick={() => navigate('/admin/audit')}
                className="text-[12px] font-medium text-[#EA580C] hover:underline flex items-center gap-1"
              >
                Full Audit Log <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>
            <div className="px-5 py-4">
              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-[40px] text-[#CBD5E1] block mb-2">history</span>
                  <p className="text-[13px] text-[#94A3B8]">No activity recorded for this account.</p>
                </div>
              ) : (
                logs.map((log, i) => {
                  const isLast = i === logs.length - 1;
                  const ts = log.createdAt || log.timestamp;
                  return (
                    <div key={log._id || i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${resultDot(log.result)}`} />
                        {!isLast && <div className="w-px flex-1 bg-[#E2E8F0] my-1" />}
                      </div>
                      <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-4'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${actionBadge(log.action)}`}>
                                {log.action || 'Action'}
                              </span>
                              {log.module && (
                                <span className="text-[11px] text-[#475569] bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                                  {log.module}
                                </span>
                              )}
                              {log.result && (
                                <span className={`text-[10px] font-bold uppercase ${
                                  log.result === 'SUCCESS' ? 'text-[#16A34A]' :
                                  log.result === 'FAILED'  ? 'text-[#DC2626]' : 'text-[#D97706]'
                                }`}>
                                  {log.result}
                                </span>
                              )}
                            </div>
                            {log.details && (
                              <p className="text-[13px] text-[#64748B] mt-0.5 leading-snug">
                                {log.details.length > 100 ? `${log.details.slice(0, 100)}…` : log.details}
                              </p>
                            )}
                          </div>
                          <span className="text-[11px] text-[#94A3B8] shrink-0 whitespace-nowrap">
                            {ts ? new Date(ts).toLocaleString('en-US', {
                              month: 'short', day: 'numeric',
                              hour: 'numeric', minute: '2-digit',
                            }) : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
