import { useState, useEffect } from 'react';
import PageWrapper from '../../components/PageWrapper';
import {
  Mail, Briefcase, User, Calendar, Pencil, Lock, Check, X, Eye, EyeOff, Phone, Link,
} from 'lucide-react';
import { meAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const fmt = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function PasswordStrength({ password }) {
  const rules = [
    { label: 'At least 8 characters',  valid: password.length >= 8 },
    { label: 'One uppercase letter',   valid: /[A-Z]/.test(password) },
    { label: 'One number',             valid: /[0-9]/.test(password) },
    { label: 'One special character',  valid: /[^A-Za-z0-9]/.test(password) },
  ];
  const n    = rules.filter(r => r.valid).length;
  const bClr = ['','bg-red-500','bg-amber-500','bg-blue-500','bg-green-500'][n];
  const tClr = ['','text-red-600','text-amber-600','text-blue-600','text-green-600'][n];
  const label = ['','Weak','Fair','Good','Strong'][n];
  const bars  = Array(4).fill('bg-slate-200').map((_, i) => i < n ? bClr : 'bg-slate-200');
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1 h-1">{bars.map((c, i) => <div key={i} className={`flex-1 rounded-full ${c}`} />)}</div>
      {password && <p className={`text-[10px] font-bold ${tClr}`}>{label}</p>}
      {rules.map((r, i) => (
        <div key={i} className={`flex items-center gap-1.5 text-[10px] ${r.valid ? 'text-green-600' : 'text-slate-400'}`}>
          {r.valid ? <Check size={11} /> : <X size={11} />} {r.label}
        </div>
      ))}
    </div>
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

export default function EmployeeProfile() {
  const [profile,     setProfile]     = useState(null);
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
      const res = await meAPI.getProfile();
      const u   = res.data?.data || res.data;
      setProfile(u);
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
    } catch { toast.error('Failed to load profile'); }
    finally { setLoading(false); }
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
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
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
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update password'); }
    finally { setPwdSaving(false); }
  };

  const setF  = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setEC = (k, v) => setForm(p => ({ ...p, emergencyContact: { ...p.emergencyContact, [k]: v } }));

  if (loading) return (
    <PageWrapper>
      <div className="flex justify-center items-center py-24">
        <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
      </div>
    </PageWrapper>
  );

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'ME';

  return (
    <PageWrapper>
      <div className="w-full flex flex-col gap-5 max-w-[1200px] mx-auto pb-10 font-sans">

        <div className="mt-5 shrink-0 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">My Profile</h1>
            <p className="text-xs text-[#64748B] mt-0.5">Manage your personal information and account settings</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.location.href = '/employee/leave'}
              className="text-sm font-bold text-white bg-[#2563EB] hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow-sm">
              Apply Leave
            </button>
            <button onClick={() => window.location.href = '/employee/attendance'}
              className="text-sm font-bold text-white bg-[#2563EB] hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow-sm">
              My Attendance
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* ── Left card ── */}
          <div className="w-full lg:w-[320px] shrink-0 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 sticky top-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#2563EB] text-white text-xl font-bold flex items-center justify-center shadow-md">
                {initials}
              </div>
              <h2 className="text-[17px] font-bold text-[#0F172A] mt-3">{profile?.name}</h2>
              <p className="text-[11px] text-[#64748B] font-mono mt-0.5">{profile?.employeeId}</p>
              <div className="flex gap-1.5 mt-2.5 flex-wrap justify-center">
                <span className="bg-[#EFF6FF] text-[#2563EB] px-2.5 py-0.5 rounded-full text-[10px] font-bold">Employee</span>
                {profile?.department?.name && (
                  <span className="bg-[#F0FDF4] text-[#16A34A] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    {profile.department.name}
                  </span>
                )}
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
                <span className="text-[#0F172A]">{profile?.designation || 'Employee'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <User size={13} className="text-[#64748B] shrink-0" />
                <span className="text-[#0F172A]">{profile?.employmentType || 'Full-time'}</span>
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
                  <Field label="Email"       value={profile?.email      || ''} readOnly />
                  <Field label="Employee ID" value={profile?.employeeId || ''} readOnly />
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
                <button type="submit"
                  disabled={pwdSaving || !pwd.current || !pwd.new || pwd.new !== pwd.confirm}
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
