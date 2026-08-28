import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { authAPI } from '../../utils/api';

// Password strength (0-5)
function getStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

const STRENGTH_LABEL = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLOR = ['', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#16A34A'];

const RULES = [
  { label: 'At least 8 characters',         test: (p) => p.length >= 8 },
  { label: 'At least one uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'At least one number',           test: (p) => /[0-9]/.test(p) },
  { label: 'At least one special character',test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showNew,  setShowNew]  = useState(false);
  const [showCon,  setShowCon]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  const strength = getStrength(password);
  const allRulesPassed = RULES.every(r => r.test(password));
  const canSubmit = token && password && confirm && password === confirm && allRulesPassed && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, newPassword: password, confirmPassword: confirm });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2200);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset your password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#1E293B] text-white flex items-center justify-center font-bold text-2xl leading-none">M</div>
        </div>
        <h2 className="text-center text-2xl font-semibold text-[#0F172A] tracking-tight">
          Choose a new password
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-[#E2E8F0] sm:rounded-xl sm:px-10">

          {/* No token in the URL → dead end */}
          {!token ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-[#0F172A] mb-2">Invalid reset link</h3>
              <p className="text-sm text-[#64748B] mb-6">
                This link is missing its security token. Please request a new password reset.
              </p>
              <Link to="/forgot-password" className="w-full inline-flex justify-center py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 transition-colors">
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-[#0F172A] mb-2">Password reset</h3>
              <p className="text-sm text-[#64748B] mb-6">
                Your password has been updated. Redirecting you to the login page…
              </p>
              <Link to="/login" className="w-full inline-flex justify-center py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 transition-colors">
                Go to Login
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <p className="text-sm text-[#64748B] text-center">
                Set a new password for your account. Make it strong and unique.
              </p>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-red-700">{error}</p>
                </div>
              )}

              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">New password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[#64748B]" />
                  </div>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Choose a strong password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors"
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

                {/* Rules */}
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

              {/* Confirm */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Confirm new password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[#64748B]" />
                  </div>
                  <input
                    type={showCon ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Repeat your new password"
                    className={`w-full pl-10 pr-10 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      confirm && password !== confirm
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                        : confirm && password === confirm
                        ? 'border-green-400 focus:border-green-400 focus:ring-green-100'
                        : 'border-[#E2E8F0] focus:border-[#2563EB] focus:ring-[#2563EB]/20'
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

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 transition-colors disabled:bg-[#93C5FD] disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Resetting…</>
                ) : (
                  'Reset Password'
                )}
              </button>

              <div className="flex items-center justify-center">
                <Link to="/login" className="flex items-center text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back to login
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
