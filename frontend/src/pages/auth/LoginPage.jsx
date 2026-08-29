import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ChevronDown, Sparkles,
} from 'lucide-react';

const ROLE_HOME = {
  'super-admin': '/admin/dashboard',
  'admin':       '/admin/dashboard',
  'hr-manager':  '/hr/dashboard',
  'pmo-lead':    '/pmo/dashboard',
  'employee':    '/employee/dashboard',
  'intern':      '/intern/dashboard',
};

const ACCOUNTS = [
  { label: 'Admin',    email: 'aswanthksv@gmail.com', pass: 'Admin@123' },
  { label: 'HR',       email: 'sarah.hr@owms.com', pass: 'HR@123456' },
  { label: 'PMO',      email: 'pmo@owms.com',   pass: 'PMO@12345' },
  { label: 'Employee', email: 'alex.emp@owms.com', pass: 'Emp@12345' },
  { label: 'Intern',   email: 'rahul.intern@owms.com', pass: 'Int@12345' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [errorShake, setErrorShake] = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');
  const [filledEmail, setFilledEmail] = useState('');
  const [showDemo, setShowDemo]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const user = await login(identifier, password);
      const slug = user.role?.slug || user.role || '';
      navigate(ROLE_HOME[slug] || '/unauthorized');
    } catch (err) {
      if (err.message === 'Network Error' || !err.response) {
        setErrorMsg('Cannot connect to backend server (http://localhost:5000). Please ensure backend and MongoDB are running.');
      } else {
        setErrorMsg(err.response?.data?.message || 'Invalid credentials.');
      }
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const fill = (email, pass) => {
    setIdentifier(email);
    setPassword(pass);
    setFilledEmail(email);
    setErrorMsg('');
    setShowDemo(false);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#FBF7F4] font-body text-[#0F172A] antialiased">

      {/* ── LEFT: Brand panel (dark, matches admin sidebar) ─────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-[#0D0D0D] text-white flex-col justify-between p-11">
        {/* Refined ambient light */}
        <div className="pointer-events-none absolute -top-40 -right-20 w-[460px] h-[460px] rounded-full bg-[#EA580C]/20 blur-[130px]" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <img src="/assets/company_logo/movi%20logo.png" alt="Movi" className="h-10 w-10 object-contain" />
          <div className="leading-tight">
            <p className="text-[17px] font-bold tracking-wide font-headline">OWMS</p>
            <p className="text-[10px] text-slate-500">by Movi Cloud Labs</p>
          </div>
        </div>

        {/* Headline + product preview */}
        <div className="relative z-10 -mt-4">
          <h1 className="font-headline text-[32px] xl:text-[38px] font-bold leading-[1.12] tracking-tight max-w-md">
            One workspace for your<br />
            <span className="text-[#FB923C]">people, projects &amp; time.</span>
          </h1>
          <p className="text-slate-400 text-[14px] mt-4 max-w-sm leading-relaxed">
            Role-based access, real-time attendance and a complete audit trail — everything your team needs, in one secure place.
          </p>

          {/* Product preview (live mock in a browser frame) */}
          <div className="mt-10 relative max-w-[460px]">
            <div className="rounded-xl bg-white shadow-2xl shadow-black/50 border border-white/10 overflow-hidden ring-1 ring-white/5">
              {/* Window chrome */}
              <div className="h-8 bg-[#F1F5F9] border-b border-[#E2E8F0] flex items-center px-3 gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                <div className="ml-3 h-4 flex-1 max-w-[180px] rounded bg-white border border-[#E2E8F0] flex items-center px-2">
                  <span className="text-[8px] text-[#94A3B8] truncate">owms.movicloudlabs.com/dashboard</span>
                </div>
              </div>
              {/* App body */}
              <div className="flex h-[188px] text-[#0F172A]">
                {/* mini sidebar */}
                <div className="w-10 bg-[#111111] flex flex-col items-center py-2 gap-2 shrink-0">
                  <div className="w-5 h-5 rounded-md bg-[#EA580C]" />
                  {[0,1,2,3,4].map(i => <div key={i} className={`w-4 h-1.5 rounded-full ${i===0?'bg-[#EA580C]':'bg-white/15'}`} />)}
                </div>
                {/* content */}
                <div className="flex-1 bg-[#FBF7F4] p-2.5 overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-2 w-16 rounded-full bg-[#0F172A]/80" />
                    <div className="h-3 w-3 rounded-full bg-orange-200" />
                  </div>
                  {/* KPI row */}
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[0,1,2,3].map(i => (
                      <div key={i} className="bg-white rounded-md border border-[#F1E8E2] p-1.5">
                        <div className="w-3.5 h-3.5 rounded bg-orange-100 mb-1" />
                        <div className="h-2 w-5 rounded bg-[#0F172A]/70 mb-0.5" />
                        <div className="h-1 w-6 rounded bg-slate-200" />
                      </div>
                    ))}
                  </div>
                  {/* chart + donut */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="col-span-2 bg-white rounded-md border border-[#F1E8E2] p-2">
                      <div className="h-1.5 w-10 rounded bg-slate-200 mb-1.5" />
                      <svg viewBox="0 0 120 40" className="w-full h-[46px]" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="mockArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#EA580C" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,30 L20,26 L40,28 L60,16 L80,18 L100,8 L120,10 L120,40 L0,40 Z" fill="url(#mockArea)" />
                        <path d="M0,30 L20,26 L40,28 L60,16 L80,18 L100,8 L120,10" fill="none" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="bg-white rounded-md border border-[#F1E8E2] p-2 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full" style={{ background: 'conic-gradient(#EA580C 0turn 0.4turn, #FB923C 0.4turn 0.6turn, #FDBA74 0.6turn 0.8turn, #E2E8F0 0.8turn 1turn)' }}>
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full bg-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-[11px] text-slate-500">
          &copy; {new Date().getFullYear()} Movi Cloud Labs. All rights reserved.
        </p>
      </div>

      {/* ── RIGHT: Login form ───────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <motion.div
          animate={errorShake ? { x: [-8, 8, -8, 8, 0] } : {}}
          transition={{ duration: 0.35 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <img src="/assets/company_logo/movi%20logo.png" alt="Movi" className="h-10 w-10 object-contain" />
            <span className="text-[18px] font-bold tracking-wide">OWMS</span>
          </div>

          <div className="mb-7">
            <h2 className="font-headline text-[27px] font-bold tracking-tight text-[#0F172A]">Welcome back</h2>
            <p className="text-[14px] text-[#64748B] mt-1">Sign in to your workspace to continue.</p>
          </div>

          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-[13px] text-[#DC2626] font-medium text-center"
              >
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-[#0F172A]">Employee ID or Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={identifier}
                  onChange={e => { setIdentifier(e.target.value); setFilledEmail(''); }}
                  placeholder="EMP-2025-001 or email@owms.com"
                  required
                  className="w-full h-11 pl-10 pr-3 text-[14px] bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[13px] font-medium text-[#0F172A]">Password</label>
                <Link to="/forgot-password" className="text-[12px] font-medium text-[#EA580C] hover:text-[#C2410C] transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 pl-10 pr-10 text-[14px] bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition-colors"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#CBD5E1] accent-[#EA580C]" />
              <span className="text-[13px] text-[#64748B]">Keep me signed in</span>
            </label>

            <button type="submit" disabled={loading}
              className="w-full h-11 bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-[14px] rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-orange-600/20 disabled:opacity-70">
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (<>Sign In <ArrowRight size={16} /></>)}
            </button>
          </form>

          {/* ── Compact demo autofill (collapsed by default) ─────────────── */}
          <div className="mt-6 pt-5 border-t border-[#EDE4DD]">
            <button
              type="button"
              onClick={() => setShowDemo(v => !v)}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[#94A3B8] hover:text-[#64748B] transition-colors mx-auto"
            >
              <Sparkles size={12} />
              Demo accounts
              <ChevronDown size={13} className={`transition-transform ${showDemo ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showDemo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap justify-center gap-2 pt-3">
                    {ACCOUNTS.map(acc => {
                      const isActive = filledEmail === acc.email;
                      return (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => fill(acc.email, acc.pass)}
                          className={`text-[12px] font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                            isActive
                              ? 'bg-[#EA580C] border-[#EA580C] text-white'
                              : 'bg-white border-[#E2E8F0] text-[#475569] hover:border-[#EA580C] hover:text-[#EA580C]'
                          }`}
                        >
                          {acc.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[#B8AEA6] text-center mt-2.5">
                    Click a role to auto-fill its credentials
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
