import { useState, useEffect } from 'react';
import PageWrapper from '../../components/PageWrapper';
import {
  Mail, Briefcase, User, Calendar, Pencil, Lock, Check, X, Eye, EyeOff, Phone, Link,
  Plus, CalendarDays, Coffee, Heart, AlertCircle, Trash2,
} from 'lucide-react';
import { meAPI, hrAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const fmt = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ── Leave helpers ───────────────────────────────────────────────────────────
const wDays = (from, to) => {
  if (!from || !to) return 0;
  let count = 0, cur = new Date(from), end = new Date(to);
  while (cur <= end) { if (cur.getDay() !== 0 && cur.getDay() !== 6) count++; cur.setDate(cur.getDate() + 1); }
  return count;
};
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const isUpcoming = (lv) => new Date(lv.fromDate) > startOfToday();

const LEAVE_TYPES = [
  { id: 'Annual',    icon: CalendarDays, color: 'text-green-600',  activeBg: 'bg-green-50',  border: 'border-green-500'  },
  { id: 'Casual',    icon: Coffee,       color: 'text-blue-600',   activeBg: 'bg-blue-50',   border: 'border-blue-500'   },
  { id: 'Sick',      icon: Heart,        color: 'text-red-600',    activeBg: 'bg-red-50',    border: 'border-red-500'    },
  { id: 'Emergency', icon: AlertCircle,  color: 'text-orange-600', activeBg: 'bg-orange-50', border: 'border-orange-500' },
];
const BAL_CARDS = [
  { key: 'annual',    label: 'Annual',    color: 'text-green-600',  bg: 'bg-green-50'  },
  { key: 'casual',    label: 'Casual',    color: 'text-blue-600',   bg: 'bg-blue-50'   },
  { key: 'sick',      label: 'Sick',      color: 'text-red-600',    bg: 'bg-red-50'    },
  { key: 'emergency', label: 'Emergency', color: 'text-orange-600', bg: 'bg-orange-50' },
];
const STATUS_BADGE = {
  Approved: 'bg-green-100 text-green-700',
  Pending:  'bg-amber-100 text-amber-700',
  Rejected: 'bg-red-100 text-red-700',
};

function LeaveApplyModal({ onClose, onSubmit, balance, submitting }) {
  const today = new Date().toISOString().split('T')[0];
  const [type,     setType]     = useState('');
  const [fromDate, setFromDate] = useState(today);
  const [toDate,   setToDate]   = useState(today);
  const [reason,   setReason]   = useState('');
  const days = wDays(fromDate, toDate);
  const bal  = balance?.[type?.toLowerCase()];
  const exceeds = bal && days > (bal.total - bal.used);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-lg font-bold text-[#0F172A]">Apply for Leave</h2>
          <button onClick={onClose} className="text-[#64748B] hover:bg-[#E2E8F0] p-1.5 rounded-full"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Leave Type *</label>
            <div className="grid grid-cols-4 gap-2">
              {LEAVE_TYPES.map(opt => {
                const Icon = opt.icon; const active = type === opt.id;
                return (
                  <button key={opt.id} type="button" onClick={() => setType(opt.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${active ? `${opt.activeBg} ${opt.border}` : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'}`}>
                    <Icon size={20} className={active ? opt.color : 'text-[#64748B]'} />
                    <span className={`text-[10px] font-bold ${active ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>{opt.id}</span>
                  </button>
                );
              })}
            </div>
            {bal && (
              <p className="text-[11px] text-[#64748B] mt-1.5">
                Balance: <span className="font-bold text-[#0F172A]">{bal.total - bal.used} days remaining</span> ({bal.used}/{bal.total} used)
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">From *</label>
              <input type="date" value={fromDate} min={today}
                onChange={e => { setFromDate(e.target.value); if (e.target.value > toDate) setToDate(e.target.value); }}
                className="w-full p-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">To *</label>
              <input type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)}
                className="w-full p-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB] text-sm" />
            </div>
          </div>
          {days > 0 && (
            <p className="text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-3 py-1.5 rounded-lg -mt-2">
              {days} working day{days !== 1 ? 's' : ''}
              {exceeds && <span className="ml-2 text-red-600"> · Exceeds your balance!</span>}
            </p>
          )}
          <div>
            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Reason *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Describe the reason for your leave…"
              className="w-full p-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#2563EB] resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F1F5F9] rounded-lg">Cancel</button>
            <button disabled={submitting || !type || days === 0 || !reason.trim() || exceeds}
              onClick={() => onSubmit({ type, fromDate, toDate, reason })}
              className="px-5 py-2 text-sm font-bold bg-[#2563EB] text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Applying…' : 'Apply Leave'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MyLeaveCard() {
  const [balance,   setBalance]   = useState(null);
  const [leaves,    setLeaves]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, lRes] = await Promise.all([hrAPI.getMyLeaveBalance(), hrAPI.getMyLeaves()]);
      setBalance(bRes.data?.data || bRes.data);
      setLeaves(lRes.data?.data || []);
    } catch { toast.error('Failed to load leave data'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleApply = async (form) => {
    setSubmitting(true);
    try {
      await hrAPI.applyMyLeave(form);
      toast.success('Leave applied');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply leave');
    } finally { setSubmitting(false); }
  };

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await hrAPI.deleteMyLeave(id);
      toast.success('Leave cancelled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel leave');
    } finally { setCancelling(null); }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[14px] font-bold text-[#0F172A] flex items-center gap-2">
          <CalendarDays size={15} className="text-[#64748B]" /> My Leave
        </h2>
        <button onClick={() => setModal(true)}
          className="text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
          <Plus size={13} /> Apply for Leave
        </button>
      </div>

      {/* Balance chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {BAL_CARDS.map(({ key, label, color, bg }) => {
          const b = balance?.[key] || { total: 0, used: 0 };
          const remaining = b.total - b.used;
          return (
            <div key={key} className={`${bg} border border-[#E2E8F0] rounded-lg px-3 py-2`}>
              <div className="flex items-baseline justify-between">
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">{label}</span>
                <span className={`text-lg font-black ${color}`}>{loading ? '–' : remaining}</span>
              </div>
              <p className="text-[9px] text-[#64748B] mt-0.5">{b.used}/{b.total} used</p>
            </div>
          );
        })}
      </div>

      {/* Leave list */}
      {loading ? (
        <div className="flex justify-center py-6">
          <span className="material-symbols-outlined text-[22px] text-[#2563EB] animate-spin">sync</span>
        </div>
      ) : leaves.length === 0 ? (
        <p className="text-center text-xs text-[#64748B] py-6 italic">No leave taken yet. Click "Apply for Leave" to add one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[480px]">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                {['Type', 'Duration', 'Days', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaves.map(lv => (
                <tr key={lv._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] last:border-0">
                  <td className="px-3 py-2.5"><span className="text-[10px] font-bold bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded uppercase">{lv.type}</span></td>
                  <td className="px-3 py-2.5 text-xs text-[#0F172A] whitespace-nowrap">{fmt(lv.fromDate)} → {fmt(lv.toDate)}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-[#0F172A]">{lv.days}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${STATUS_BADGE[lv.status] || ''}`}>{lv.status}</span>
                    {isUpcoming(lv) && <span className="ml-1 text-[9px] font-bold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded uppercase">Upcoming</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {isUpcoming(lv) && (
                      <button onClick={() => handleCancel(lv._id)} disabled={cancelling === lv._id}
                        className="text-[11px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1 ml-auto disabled:opacity-50 transition-colors">
                        <Trash2 size={12} /> {cancelling === lv._id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <LeaveApplyModal onClose={() => setModal(false)} onSubmit={handleApply} balance={balance} submitting={submitting} />
      )}
    </div>
  );
}

function PasswordStrength({ password }) {
  const rules = [
    { label: 'At least 8 characters',  valid: password.length >= 8 },
    { label: 'One uppercase letter',   valid: /[A-Z]/.test(password) },
    { label: 'One number',             valid: /[0-9]/.test(password) },
    { label: 'One special character',  valid: /[^A-Za-z0-9]/.test(password) },
  ];
  const n = rules.filter(r => r.valid).length;
  const bars  = ['bg-slate-200','bg-slate-200','bg-slate-200','bg-slate-200'];
  const label = ['','Weak','Fair','Good','Strong'][n];
  const tClr  = ['','text-red-600','text-amber-600','text-blue-600','text-green-600'][n];
  const bClr  = ['','bg-red-500','bg-amber-500','bg-blue-500','bg-green-500'][n];
  for (let i = 0; i < n; i++) bars[i] = bClr;
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1 h-1">{bars.map((c,i) => <div key={i} className={`flex-1 rounded-full ${c}`} />)}</div>
      {password && <p className={`text-[10px] font-bold ${tClr}`}>{label}</p>}
      {rules.map((r,i) => (
        <div key={i} className={`flex items-center gap-1.5 text-[10px] ${r.valid ? 'text-green-600' : 'text-slate-400'}`}>
          {r.valid ? <Check size={11} /> : <X size={11} />} {r.label}
        </div>
      ))}
    </div>
  );
}

export default function HRProfile() {
  const [profile,     setProfile]     = useState(null);
  const [counts,      setCounts]      = useState({ employees: 0, interns: 0 });
  const [loading,     setLoading]     = useState(true);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingBio,  setEditingBio]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [pwdSaving,   setPwdSaving]   = useState(false);

  const [form, setForm] = useState({
    phone: '', address: '', linkedIn: '',
    emergencyContact: { name: '', phone: '', relation: '' },
    bio: '',
  });

  const [pwd,  setPwd]  = useState({ current: '', new: '', confirm: '' });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });

  const load = async () => {
    setLoading(true);
    try {
      const [profileRes, empRes, intRes] = await Promise.all([
        meAPI.getProfile(),
        hrAPI.getEmployees({ page: 1, limit: 1 }),
        hrAPI.getInterns({ page: 1, limit: 1 }),
      ]);
      const u = profileRes.data?.data || profileRes.data;
      setProfile(u);
      setCounts({
        employees: empRes.data?.pagination?.total || 0,
        interns:   intRes.data?.pagination?.total || 0,
      });
      setForm({
        phone:   u.phone   || '',
        address: u.address || '',
        linkedIn: u.linkedIn || '',
        emergencyContact: {
          name:     u.emergencyContact?.name     || '',
          phone:    u.emergencyContact?.phone    || '',
          relation: u.emergencyContact?.relation || '',
        },
        bio: u.bio || '',
      });
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleInfoSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await meAPI.updateProfile({
        phone:            form.phone,
        address:          form.address,
        linkedIn:         form.linkedIn,
        emergencyContact: form.emergencyContact,
      });
      toast.success('Profile updated');
      setEditingInfo(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const handleBioSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await meAPI.updateProfile({ bio: form.bio });
      toast.success('Bio updated');
      setEditingBio(false);
      load();
    } catch { toast.error('Failed to update bio'); }
    finally { setSaving(false); }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (pwd.new !== pwd.confirm) { toast.error('Passwords do not match'); return; }
    setPwdSaving(true);
    try {
      await meAPI.changePassword({ currentPassword: pwd.current, newPassword: pwd.new, confirmPassword: pwd.confirm });
      toast.success('Password updated');
      setPwd({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally { setPwdSaving(false); }
  };

  const setF  = (field, value) => setForm(p => ({ ...p, [field]: value }));
  const setEC = (field, value) => setForm(p => ({ ...p, emergencyContact: { ...p.emergencyContact, [field]: value } }));

  if (loading) return (
    <PageWrapper>
      <div className="flex justify-center items-center py-24">
        <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
      </div>
    </PageWrapper>
  );

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'HR';

  return (
    <PageWrapper>
      <div className="w-full flex flex-col gap-5 max-w-[1200px] mx-auto pb-10 font-sans">

        <div className="mt-5 shrink-0">
          <h1 className="text-xl font-bold text-[#0F172A]">My Profile</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Manage your personal information and account settings</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* ── Left card ── */}
          <div className="w-full lg:w-[320px] shrink-0 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 sticky top-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#7C3AED] text-white text-xl font-bold flex items-center justify-center shadow-md">
                {initials}
              </div>
              <h2 className="text-[17px] font-bold text-[#0F172A] mt-3">{profile?.name}</h2>
              <p className="text-[11px] text-[#64748B] font-mono mt-0.5">{profile?.employeeId}</p>
              <div className="flex gap-1.5 mt-2.5 flex-wrap justify-center">
                <span className="bg-[#F5F3FF] text-[#7C3AED] px-2.5 py-0.5 rounded-full text-[10px] font-bold">HR Manager</span>
                <span className="bg-[#EFF6FF] text-[#2563EB] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  {profile?.department?.name || 'Human Resources'}
                </span>
              </div>
            </div>

            <hr className="border-[#E2E8F0] my-4" />

            <div className="space-y-2.5 text-[12px]">
              <div className="flex items-center gap-2.5">
                <Mail size={13} className="text-[#64748B] shrink-0" />
                <span className="text-[#0F172A] truncate">{profile?.email}</span>
              </div>
              {form.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone size={13} className="text-[#64748B] shrink-0" />
                  <span className="text-[#0F172A]">{form.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Briefcase size={13} className="text-[#64748B] shrink-0" />
                <span className="text-[#0F172A]">{profile?.designation || 'HR Manager'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <User size={13} className="text-[#64748B] shrink-0" />
                <span className="text-[#0F172A]">{counts.employees} employees · {counts.interns} interns</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar size={13} className="text-[#64748B] shrink-0" />
                <span className="text-[#0F172A]">Joined {fmt(profile?.joinDate || profile?.createdAt)}</span>
              </div>
              {form.linkedIn && (
                <div className="flex items-center gap-2.5">
                  <Link size={13} className="text-[#64748B] shrink-0" />
                  <a href={form.linkedIn} target="_blank" rel="noreferrer"
                    className="text-[#2563EB] truncate hover:underline">{form.linkedIn}</a>
                </div>
              )}
            </div>

            {form.bio && (
              <>
                <hr className="border-[#E2E8F0] my-4" />
                <p className="text-[12px] text-[#64748B] leading-relaxed">{form.bio}</p>
              </>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="flex-1 space-y-5 min-w-0">

            {/* Personal Information */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[14px] font-bold text-[#0F172A]">Personal Information</h2>
                {!editingInfo && (
                  <button onClick={() => setEditingInfo(true)}
                    className="text-xs font-bold text-[#2563EB] hover:bg-[#EFF6FF] px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                    <Pencil size={12} /> Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleInfoSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="First Name" value={profile?.name?.split(' ')[0] || ''} readOnly />
                  <Field label="Last Name"  value={profile?.name?.split(' ').slice(1).join(' ') || ''} readOnly />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Email"       value={profile?.email       || ''} readOnly />
                  <Field label="Employee ID" value={profile?.employeeId  || ''} readOnly />
                </div>

                <hr className="border-[#F1F5F9]" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Phone Number" value={form.phone}    disabled={!editingInfo} onChange={v => setF('phone', v)} />
                  <Field label="LinkedIn"     value={form.linkedIn} disabled={!editingInfo} onChange={v => setF('linkedIn', v)} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Address</label>
                  <textarea value={form.address} disabled={!editingInfo} rows={2}
                    onChange={e => setF('address', e.target.value)}
                    className="w-full p-2 border border-[#E2E8F0] rounded-lg text-[12px] text-[#0F172A] disabled:bg-[#F8FAFC] disabled:text-[#64748B] focus:border-[#2563EB] focus:outline-none resize-none" />
                </div>

                <div>
                  <p className="text-[11px] font-bold text-[#0F172A] mb-2">Emergency Contact</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Name"     value={form.emergencyContact.name}     disabled={!editingInfo} onChange={v => setEC('name', v)} />
                    <Field label="Relation" value={form.emergencyContact.relation} disabled={!editingInfo} onChange={v => setEC('relation', v)} />
                    <Field label="Phone"    value={form.emergencyContact.phone}    disabled={!editingInfo} onChange={v => setEC('phone', v)} />
                  </div>
                </div>

                {editingInfo && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                    <button type="button" onClick={() => setEditingInfo(false)}
                      className="px-3 py-1.5 text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9] rounded-lg">Cancel</button>
                    <button type="submit" disabled={saving}
                      className="px-4 py-1.5 text-xs font-bold bg-[#2563EB] text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* My Leave */}
            <MyLeaveCard />

            {/* Bio */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-[14px] font-bold text-[#0F172A]">Bio</h2>
                {!editingBio && (
                  <button onClick={() => setEditingBio(true)}
                    className="text-xs font-bold text-[#2563EB] hover:bg-[#EFF6FF] px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                    <Pencil size={12} /> Edit
                  </button>
                )}
              </div>
              <form onSubmit={handleBioSave}>
                {editingBio ? (
                  <>
                    <textarea value={form.bio} onChange={e => setF('bio', e.target.value)}
                      maxLength={500} rows={3} placeholder="Write a short bio…"
                      className="w-full p-2.5 border border-[#E2E8F0] rounded-lg text-[12px] focus:border-[#2563EB] focus:outline-none resize-none" />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-[#64748B]">{form.bio.length}/500</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEditingBio(false)}
                          className="px-3 py-1.5 text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9] rounded-lg">Cancel</button>
                        <button type="submit" disabled={saving}
                          className="px-3 py-1.5 text-xs font-bold bg-[#2563EB] text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Save</button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-[12px] text-[#0F172A] leading-relaxed">
                    {form.bio || <span className="text-[#94A3B8] italic">No bio yet.</span>}
                  </p>
                )}
              </form>
            </div>

            {/* Change Password */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
              <h2 className="text-[14px] font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <Lock size={14} className="text-[#64748B]" /> Change Password
              </h2>
              <form onSubmit={handlePasswordSave} className="space-y-4">
                <div className="max-w-[280px]">
                  <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Current Password</label>
                  <PwdInput value={pwd.current} show={show.current}
                    onChange={v => setPwd(p => ({ ...p, current: v }))}
                    onToggle={() => setShow(s => ({ ...s, current: !s.current }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">New Password</label>
                    <PwdInput value={pwd.new} show={show.new}
                      onChange={v => setPwd(p => ({ ...p, new: v }))}
                      onToggle={() => setShow(s => ({ ...s, new: !s.new }))} />
                    <PasswordStrength password={pwd.new} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Confirm New Password</label>
                    <PwdInput value={pwd.confirm} show={show.confirm}
                      error={pwd.confirm && pwd.confirm !== pwd.new}
                      onChange={v => setPwd(p => ({ ...p, confirm: v }))}
                      onToggle={() => setShow(s => ({ ...s, confirm: !s.confirm }))} />
                    {pwd.confirm && pwd.confirm !== pwd.new && (
                      <p className="text-[10px] text-red-600 mt-1 font-medium">Passwords do not match</p>
                    )}
                  </div>
                </div>
                <button type="submit" disabled={pwdSaving || !pwd.current || !pwd.new || pwd.new !== pwd.confirm}
                  className="px-4 py-2 text-xs font-bold bg-[#0F172A] text-white rounded-lg hover:bg-black disabled:opacity-40 transition-colors">
                  {pwdSaving ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function Field({ label, value, onChange, disabled = true, readOnly = false }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">{label}</label>
      <input type="text" value={value} readOnly={readOnly} disabled={disabled && !readOnly}
        onChange={e => onChange?.(e.target.value)}
        className="w-full p-2 border border-[#E2E8F0] rounded-lg text-[12px] text-[#0F172A] disabled:bg-[#F8FAFC] disabled:text-[#64748B] read-only:bg-[#F8FAFC] read-only:text-[#64748B] read-only:cursor-default focus:border-[#2563EB] focus:outline-none" />
    </div>
  );
}

function PwdInput({ value, show, onChange, onToggle, error }) {
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} required
        onChange={e => onChange(e.target.value)}
        className={`w-full p-2 pr-8 border rounded-lg text-[12px] text-[#0F172A] focus:outline-none ${
          error ? 'border-red-400 focus:border-red-400' : 'border-[#E2E8F0] focus:border-[#2563EB]'
        }`} />
      <button type="button" onClick={onToggle}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]">
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}
