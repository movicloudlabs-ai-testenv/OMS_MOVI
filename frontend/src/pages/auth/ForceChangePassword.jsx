import { useState } from 'react';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { meAPI } from '../../utils/api';
import { ROLE_HOME } from '../../routes/ProtectedRoute';

// Password strength checker
function getStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score; // 0-5
}

const STRENGTH_LABEL = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLOR = ['', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#16A34A'];

const RULES = [
  { label: 'At least 8 characters',        test: (p) => p.length >= 8 },
  { label: 'At least one uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'At least one number',           test: (p) => /[0-9]/.test(p) },
  { label: 'At least one special character',test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function ForceChangePassword() {
  const { user } = useAuth();

  const [current,  setCurrent]  = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showCon,  setShowCon]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  const strength = getStrength(password);
  const allRulesPassed = RULES.every(r => r.test(password));
  const canSubmit = current && password && confirm && password === confirm && allRulesPassed && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await meAPI.changePassword({ currentPassword: current, newPassword: password, confirmPassword: confirm });
      // Store the new token pair returned by the server
      const { token: newToken, refreshToken: newRefresh } = res?.data?.data || {};
      if (newToken) {
        localStorage.setItem('owms_token', newToken);
        if (newRefresh) localStorage.setItem('owms_refresh_token', newRefresh);
      }
      // Clear mustChangePassword in stored user so ProtectedRoute lets us through
      const freshUser = { ...user, mustChangePassword: false };
      localStorage.setItem('owms_user', JSON.stringify(freshUser));
      setDone(true);
      setTimeout(() => {
        // Reload so AuthContext re-reads localStorage with the fresh token + user
        window.location.href = ROLE_HOME[user?.role?.slug || ''] || '/';
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EFF6FF] via-[#F8FAFC] to-[#E0E7FF] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[440px]">

        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2563EB] mb-3">
            <Lock size={22} className="text-white" />
          </div>
          <h1 className="text-[22px] font-bold text-[#0F172A] tracking-tight">Set Your Password</h1>
          <p className="text-[13px] text-[#64748B] mt-1">
            Your account was created with a temporary password.<br />
            You must set a new one before continuing.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-[#E2E8F0] overflow-hidden">

          {/* User info strip */}
          <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-[12px] font-bold shrink-0">
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#0F172A]">{user?.name}</p>
              <p className="text-[11px] text-[#64748B] font-mono">{user?.employeeId} · {user?.role?.name}</p>
            </div>
          </div>

          {done ? (
            <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-[#ECFDF5] flex items-center justify-center">
                <CheckCircle2 size={28} className="text-[#16A34A]" />
              </div>
              <p className="text-[15px] font-bold text-[#0F172A]">Password Updated!</p>
              <p className="text-[13px] text-[#64748B]">Taking you to your dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">

              {/* Current (temp) password */}
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                  Temporary Password <span className="text-[#94A3B8] font-normal">(from your welcome email)</span>
                </label>
                <div className="relative">
                  <input
                    type={showCur ? 'text' : 'password'}
                    value={current}
                    onChange={e => setCurrent(e.target.value)}
                    placeholder="OWMS@######"
                    autoComplete="current-password"
                    className="w-full border border-[#D1D5DB] rounded-lg px-3 py-2.5 pr-10 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 font-mono"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowCur(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">
                    {showCur ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Choose a strong password"
                    autoComplete="new-password"
                    className="w-full border border-[#D1D5DB] rounded-lg px-3 py-2.5 pr-10 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength bar */}
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                          style={{ background: i <= strength ? STRENGTH_COLOR[strength] : '#E2E8F0' }} />
                      ))}
                    </div>
                    <p className="text-[11px] font-medium" style={{ color: STRENGTH_COLOR[strength] }}>
                      {STRENGTH_LABEL[strength]}
                    </p>
                  </div>
                )}

                {/* Rules checklist */}
                {password && (
                  <div className="mt-2 space-y-1">
                    {RULES.map(rule => (
                      <div key={rule.label} className="flex items-center gap-1.5">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${rule.test(password) ? 'bg-[#22C55E]' : 'bg-[#E2E8F0]'}`}>
                          {rule.test(password) && <CheckCircle2 size={10} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className={`text-[11px] ${rule.test(password) ? 'text-[#16A34A]' : 'text-[#94A3B8]'}`}>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showCon ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    autoComplete="new-password"
                    className={`w-full border rounded-lg px-3 py-2.5 pr-10 text-[13px] text-[#0F172A] focus:outline-none focus:ring-2 transition-colors ${
                      confirm && password !== confirm
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                        : confirm && password === confirm
                        ? 'border-green-400 focus:border-green-400 focus:ring-green-100'
                        : 'border-[#D1D5DB] focus:border-[#2563EB] focus:ring-blue-100'
                    }`}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowCon(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">
                    {showCon ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirm && password !== confirm && (
                  <p className="text-[11px] text-red-500 mt-1">Passwords do not match.</p>
                )}
                {confirm && password === confirm && allRulesPassed && (
                  <p className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Passwords match
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-700">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={!canSubmit}
                className="w-full bg-[#2563EB] hover:bg-blue-700 disabled:bg-[#93C5FD] disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg text-[14px] transition-colors flex items-center justify-center gap-2">
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                ) : (
                  'Set New Password & Continue'
                )}
              </button>

            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-[#94A3B8] mt-4">
          This is a one-time step. Your temporary password cannot be reused.
        </p>
      </div>
    </div>
  );
}
