import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal, Shield, Bell, Palette, Server, Users,
  Save, CheckCircle2, AlertTriangle,
  Eye, EyeOff, Upload, Mail, Lock, RefreshCw,
  AlertCircle, X,
  Archive, RotateCcw, Trash2, ChevronLeft, ChevronRight, GraduationCap, Search,
} from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';
import DynamicLayout from '../../components/shared/DynamicLayout';

// ─── Primitive: Toggle ────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative inline-flex shrink-0 rounded-full transition-colors duration-150 focus:outline-none
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    style={{ width: 36, height: 20, background: checked ? '#EA580C' : '#CBD5E1' }}
  >
    <span
      className="inline-block rounded-full bg-white shadow-sm transition-transform duration-150"
      style={{ width: 14, height: 14, margin: 3, transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
    />
  </button>
);

// ─── Primitive: Input ─────────────────────────────────────────────────────────
const Input = ({ error, className = '', ...props }) => (
  <input
    className={`border rounded-md px-2.5 py-1.5 text-[13px] text-[#0F172A] bg-white
      focus:outline-none focus:ring-1 transition-colors
      ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
               : 'border-[#D1D5DB] focus:border-[#EA580C] focus:ring-orange-100'}
      disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] disabled:cursor-not-allowed
      ${className}`}
    {...props}
  />
);

// ─── Primitive: Select ────────────────────────────────────────────────────────
const Sel = ({ error, children, className = '', ...props }) => (
  <select
    className={`border rounded-md px-2.5 py-1.5 text-[13px] text-[#0F172A] bg-white
      focus:outline-none focus:ring-1 transition-colors
      ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
               : 'border-[#D1D5DB] focus:border-[#EA580C] focus:ring-orange-100'}
      disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] disabled:cursor-not-allowed
      ${className}`}
    {...props}
  >
    {children}
  </select>
);

// ─── Primitive: Section heading inside a card ─────────────────────────────────
const SectionHead = ({ title, desc }) => (
  <div className="mb-4 pb-3 border-b border-[#F1F5F9]">
    <p className="text-[13px] font-semibold text-[#0F172A]">{title}</p>
    {desc && <p className="text-[11px] text-[#94A3B8] mt-0.5">{desc}</p>}
  </div>
);

// ─── Primitive: Row (label left, control right) ───────────────────────────────
const Row = ({ label, helper, error, children, col = false }) => (
  <div className={`${col ? 'flex flex-col gap-1' : 'flex items-start justify-between gap-6'} py-2.5 border-b border-[#F9FAFB] last:border-0`}>
    <div className={col ? '' : 'w-48 shrink-0'}>
      <p className="text-[13px] font-medium text-[#374151]">{label}</p>
      {helper && <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-snug">{helper}</p>}
      {error  && <p className="text-[11px] text-red-500 mt-0.5">{error}</p>}
    </div>
    <div className={col ? 'w-full' : 'flex-1 flex flex-col gap-1'}>{children}</div>
  </div>
);

// ─── Primitive: Toggle row ────────────────────────────────────────────────────
const ToggleRow = ({ label, sub, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-[#F9FAFB] last:border-0">
    <div>
      <p className="text-[13px] text-[#374151]">{label}</p>
      {sub && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{sub}</p>}
    </div>
    <Toggle checked={!!checked} onChange={onChange} disabled={disabled} />
  </div>
);

// ─── Primitive: Segment buttons ───────────────────────────────────────────────
const Seg = ({ options, value, onChange, disabled }) => (
  <div className="inline-flex rounded-md border border-[#D1D5DB] overflow-hidden">
    {options.map(o => (
      <button
        key={o.value}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(o.value)}
        className={`px-3 py-1.5 text-[12px] font-medium transition-colors border-r border-[#D1D5DB] last:border-0
          ${value === o.value
            ? 'bg-[#EA580C] text-white'
            : 'bg-white text-[#6B7280] hover:bg-[#F3F4F6]'}
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const previewDate = (fmt) => {
  const d = new Date(), dd = String(d.getDate()).padStart(2,'0'),
    mm = String(d.getMonth()+1).padStart(2,'0'), yyyy = d.getFullYear(),
    mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  return fmt === 'DD/MM/YYYY' ? `${dd}/${mm}/${yyyy}`
    : fmt === 'MM/DD/YYYY'   ? `${mm}/${dd}/${yyyy}`
    : fmt === 'YYYY-MM-DD'   ? `${yyyy}-${mm}-${dd}`
    : `${dd} ${mon} ${yyyy}`;
};

const ZONES = [
  ['Asia/Kolkata','(GMT+05:30) India Standard Time'],
  ['UTC','(GMT+00:00) UTC'],
  ['America/New_York','(GMT-05:00) Eastern Time'],
  ['America/Chicago','(GMT-06:00) Central Time'],
  ['America/Los_Angeles','(GMT-08:00) Pacific Time'],
  ['Europe/London','(GMT+00:00) London'],
  ['Europe/Paris','(GMT+01:00) Paris / Berlin'],
  ['Asia/Dubai','(GMT+04:00) Dubai'],
  ['Asia/Singapore','(GMT+08:00) Singapore'],
  ['Asia/Tokyo','(GMT+09:00) Tokyo'],
  ['Australia/Sydney','(GMT+11:00) Sydney'],
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="flex bg-white rounded-lg border border-[#E5E7EB] min-h-[500px]">
    <div className="w-44 bg-[#F9FAFB] border-r border-[#E5E7EB] p-3">
      {[...Array(5)].map((_,i) => (
        <div key={i} className="h-8 bg-[#E5E7EB] rounded mb-1.5 animate-pulse"/>
      ))}
    </div>
    <div className="flex-1 p-6 space-y-3">
      {[...Array(8)].map((_,i) => (
        <div key={i} className={`h-3 bg-[#F3F4F6] rounded animate-pulse ${i%4===3?'w-1/3 mb-4':'w-full'}`}/>
      ))}
    </div>
  </div>
);

// ─── Danger Modal ─────────────────────────────────────────────────────────────
const DangerModal = ({ action, onCancel, onConfirm, loading }) => {
  const [text, setText] = useState('');
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 60); }, []);

  const cfg = {
    'factory-reset':    { title: 'Reset to factory defaults?', body: 'All settings (SMTP, branding, security, system) will be permanently restored to defaults. User data is not affected.', btn: 'Reset Settings' },
    'reset-passwords':  { title: 'Force password reset for all users?', body: 'Every user will be required to set a new password on next login.', btn: 'Reset Passwords' },
  }[action] || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.14 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-500"/>
          </div>
          <p className="text-[14px] font-semibold text-[#0F172A]">{cfg.title}</p>
        </div>
        <p className="text-[12px] text-[#6B7280] mb-4 leading-relaxed">{cfg.body}</p>
        <p className="text-[12px] text-[#374151] mb-2">Type <strong>CONFIRM</strong> to proceed:</p>
        <input
          ref={ref} value={text} onChange={e => setText(e.target.value)}
          placeholder="CONFIRM"
          className="w-full border border-[#D1D5DB] rounded-md px-3 py-2 text-[13px] mb-4 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-[13px] border border-[#D1D5DB] text-[#6B7280] rounded-md hover:bg-[#F9FAFB] transition">Cancel</button>
          <button
            onClick={() => text === 'CONFIRM' && !loading && onConfirm()}
            disabled={text !== 'CONFIRM' || loading}
            className={`px-3 py-1.5 text-[13px] rounded-md text-white font-medium transition
              ${text === 'CONFIRM' && !loading ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 cursor-not-allowed'}`}
          >
            {loading ? <span className="flex items-center gap-1.5"><RefreshCw size={12} className="animate-spin"/>Working…</span> : cfg.btn}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB CONTENT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── General ──────────────────────────────────────────────────────────────────
function GeneralTab({ s, upd, err, canEdit }) {
  return (
    <div className="space-y-0">
      <SectionHead title="Application Identity" desc="Names used across the UI, emails, and reports"/>
      <Row label="Application Name" helper="Browser tab & page header">
        <Input value={s.appName||''} onChange={e=>upd('appName',e.target.value)} disabled={!canEdit} error={err['general.appName']} className="w-full"/>
      </Row>
      <Row label="Organization Name" helper="Used in emails & generated reports">
        <Input value={s.orgName||''} onChange={e=>upd('orgName',e.target.value)} disabled={!canEdit} className="w-full"/>
      </Row>

      <div className="pt-4 mt-2">
        <SectionHead title="Localization" desc="Controls timestamps, date displays, and scheduled reports"/>
      </div>
      <Row label="Timezone">
        <Sel value={s.timezone||'Asia/Kolkata'} onChange={e=>upd('timezone',e.target.value)} disabled={!canEdit} className="w-full">
          {ZONES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </Sel>
      </Row>
      <Row label="Date Format">
        <div className="flex items-center gap-3">
          <Sel value={s.dateFormat||'DD/MM/YYYY'} onChange={e=>upd('dateFormat',e.target.value)} disabled={!canEdit}>
            {['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD','DD MMM YYYY'].map(f=><option key={f} value={f}>{f}</option>)}
          </Sel>
          <span className="text-[11px] text-[#EA580C] font-medium">e.g. {previewDate(s.dateFormat||'DD/MM/YYYY')}</span>
        </div>
      </Row>
      <Row label="Time Format">
        <Seg
          options={[{value:'12',label:'12-hour'},{value:'24',label:'24-hour'}]}
          value={s.timeFormat||'24'} onChange={v=>upd('timeFormat',v)} disabled={!canEdit}
        />
      </Row>
      <Row label="Items Per Page" helper="Default pagination for all list views" error={err['general.itemsPerPage']}>
        <Seg
          options={[10,25,50,100].map(n=>({value:n,label:String(n)}))}
          value={s.itemsPerPage||25} onChange={v=>upd('itemsPerPage',v)} disabled={!canEdit}
        />
      </Row>
    </div>
  );
}

// ─── Security ─────────────────────────────────────────────────────────────────
function SecurityTab({ s, upd, err, canEdit }) {
  const reqs = [
    s.requireUppercase && 'uppercase',
    s.requireLowercase && 'lowercase',
    s.requireNumbers   && 'numbers',
    s.requireSpecial   && 'special chars',
  ].filter(Boolean);

  return (
    <div>
      <SectionHead title="Password Policy" desc="Applied when users create or update their password"/>
      <Row label="Min. Password Length" error={err['security.minPasswordLength']}>
        <div className="flex items-center gap-3">
          <input type="range" min={6} max={32} step={1}
            value={s.minPasswordLength||8}
            onChange={e=>upd('minPasswordLength',parseInt(e.target.value))}
            disabled={!canEdit}
            className="w-36 accent-[#EA580C] disabled:opacity-40"
          />
          <span className="text-[13px] font-semibold text-[#EA580C] w-16">{s.minPasswordLength||8} chars</span>
        </div>
      </Row>
      <Row label="Requirements">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {[
            ['requireUppercase','Uppercase (A–Z)'],
            ['requireLowercase','Lowercase (a–z)'],
            ['requireNumbers','Numbers (0–9)'],
            ['requireSpecial','Special (!@#$)'],
          ].map(([f,l]) => (
            <label key={f} className="flex items-center gap-2 cursor-pointer select-none">
              <Toggle checked={!!s[f]} onChange={v=>upd(f,v)} disabled={!canEdit}/>
              <span className="text-[12px] text-[#374151]">{l}</span>
            </label>
          ))}
        </div>
        {reqs.length > 0 && (
          <p className="text-[11px] text-[#6B7280] mt-2 bg-[#F9FAFB] rounded px-2.5 py-1.5 border border-[#E5E7EB]">
            Password must be ≥{s.minPasswordLength||8} chars and contain {reqs.join(', ')}.
          </p>
        )}
      </Row>
      <Row label="Password Expiry">
        <div className="flex items-center gap-3">
          <Toggle checked={!!s.passwordExpiryEnabled} onChange={v=>upd('passwordExpiryEnabled',v)} disabled={!canEdit}/>
          <AnimatePresence>
            {s.passwordExpiryEnabled && (
              <motion.div initial={{opacity:0,width:0}} animate={{opacity:1,width:'auto'}} exit={{opacity:0,width:0}} className="overflow-hidden">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-[12px] text-[#6B7280]">Expire after</span>
                  <Input type="number" min={30} max={365} value={s.passwordExpiryDays||90}
                    onChange={e=>upd('passwordExpiryDays',parseInt(e.target.value))}
                    disabled={!canEdit} className="w-20"/>
                  <span className="text-[12px] text-[#6B7280]">days</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Row>

      <div className="pt-4 mt-2">
        <SectionHead title="Session & Lockout"/>
      </div>
      <Row label="Session Timeout">
        <div className="flex flex-col gap-1.5">
          <Sel value={s.sessionTimeout||'1hour'} onChange={e=>upd('sessionTimeout',e.target.value)} disabled={!canEdit} className="w-44">
            {[['15min','15 minutes'],['30min','30 minutes'],['1hour','1 hour'],['2hours','2 hours'],['4hours','4 hours'],['8hours','8 hours'],['never','Never (not recommended)']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </Sel>
          {s.sessionTimeout==='never' && (
            <p className="text-[11px] text-amber-600 flex items-center gap-1"><AlertTriangle size={11}/>Not recommended for enterprise environments.</p>
          )}
        </div>
      </Row>
      <Row label="Max Failed Logins" helper="Account locked after N consecutive failures" error={err['security.maxFailedLogins']}>
        <Input type="number" min={3} max={10} value={s.maxFailedLogins||5}
          onChange={e=>upd('maxFailedLogins',parseInt(e.target.value))}
          disabled={!canEdit} className="w-20"/>
      </Row>
      <Row label="Lockout Duration">
        <Sel value={s.lockoutDuration||'15min'} onChange={e=>upd('lockoutDuration',e.target.value)} disabled={!canEdit} className="w-52">
          {[['5min','5 minutes'],['15min','15 minutes'],['30min','30 minutes'],['1hour','1 hour'],['until_admin_unlock','Until admin unlocks']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </Sel>
      </Row>

      <div className="pt-4 mt-2">
        <SectionHead title="Two-Factor Authentication"/>
      </div>
      <Row label="2FA Policy" col>
        <div className="flex gap-2">
          {[
            {v:'disabled', icon:<EyeOff size={13}/>, label:'Disabled',  sub:'No 2FA required'},
            {v:'optional', icon:<Shield  size={13}/>, label:'Optional',  sub:'Users choose'},
            {v:'required', icon:<Lock    size={13}/>, label:'Required',  sub:'All users must'},
          ].map(o => {
            const active = (s.twoFactorPolicy||'optional')===o.v;
            return (
              <button key={o.v} type="button" disabled={!canEdit}
                onClick={()=>canEdit&&upd('twoFactorPolicy',o.v)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-lg border text-center transition
                  ${active?'border-[#EA580C] bg-[#FFF7ED] text-[#EA580C]':'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'}
                  ${!canEdit?'opacity-40 cursor-not-allowed':'cursor-pointer'}`}
              >
                {o.icon}
                <span className="text-[12px] font-medium">{o.label}</span>
                <span className="text-[10px] opacity-75">{o.sub}</span>
              </button>
            );
          })}
        </div>
        {s.twoFactorPolicy==='required' && (
          <p className="text-[11px] text-red-600 mt-2 bg-red-50 border border-red-100 rounded px-2.5 py-1.5 flex items-start gap-1.5">
            <AlertTriangle size={11} className="mt-0.5 shrink-0"/>
            All users will be blocked from logging in until they complete 2FA setup.
          </p>
        )}
      </Row>
    </div>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────
function NotificationsTab({ s, upd, err, canEdit, userEmail }) {
  const [showPass, setShowPass] = useState(false);
  const [testing, setTesting]   = useState(false);
  const [testRes, setTestRes]   = useState(null);

  const runTest = async () => {
    setTesting(true); setTestRes(null);
    try {
      const r = await adminAPI.testEmail();
      setTestRes({ ok: true, msg: r.data.message || `Sent to ${userEmail}` });
      setTimeout(() => setTestRes(null), 5000);
    } catch(e) {
      setTestRes({ ok: false, msg: e.response?.data?.message || 'SMTP connection failed.' });
    } finally { setTesting(false); }
  };

  return (
    <div>
      <SectionHead title="SMTP Configuration" desc="Used to send all system-generated emails"/>
      <Row label="Host & Port">
        <div className="flex gap-2">
          <Input value={s.smtpHost||''} onChange={e=>upd('smtpHost',e.target.value)} disabled={!canEdit} placeholder="smtp.gmail.com" className="flex-1"/>
          <Input type="number" value={s.smtpPort||587} onChange={e=>upd('smtpPort',parseInt(e.target.value))} disabled={!canEdit} className="w-20"/>
        </div>
      </Row>
      <Row label="Credentials">
        <div className="flex gap-2">
          <Input value={s.smtpUser||''} onChange={e=>upd('smtpUser',e.target.value)} disabled={!canEdit} placeholder="SMTP username" className="flex-1"/>
          <div className="relative flex-1">
            <Input type={showPass?'text':'password'} value={s.smtpPass||''} onChange={e=>upd('smtpPass',e.target.value)}
              disabled={!canEdit} placeholder="Leave blank to keep" className="w-full pr-8"/>
            <button type="button" onClick={()=>setShowPass(p=>!p)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
              {showPass?<EyeOff size={13}/>:<Eye size={13}/>}
            </button>
          </div>
        </div>
      </Row>
      <Row label="Encryption">
        <Seg options={[{value:'none',label:'None'},{value:'TLS',label:'TLS'},{value:'SSL',label:'SSL'}]}
          value={s.smtpEncryption||'TLS'} onChange={v=>upd('smtpEncryption',v)} disabled={!canEdit}/>
      </Row>
      <Row label="Default From" helper="Used when a sender identity below is left blank">
        <div className="flex gap-2">
          <Input type="email" value={s.fromEmail||''} onChange={e=>upd('fromEmail',e.target.value)}
            disabled={!canEdit} placeholder="noreply@domain.com" error={err['notifications.fromEmail']} className="flex-1"/>
          <Input value={s.fromName||''} onChange={e=>upd('fromName',e.target.value)}
            disabled={!canEdit} placeholder="Display name" className="flex-1"/>
        </div>
        {err['notifications.fromEmail'] && <p className="text-[11px] text-red-500">{err['notifications.fromEmail']}</p>}
      </Row>
      <Row label="Test Connection">
        {!testRes ? (
          <button onClick={runTest} disabled={testing||!canEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-[#D1D5DB] rounded-md text-[#374151] hover:bg-[#F9FAFB] transition disabled:opacity-40">
            {testing ? <><RefreshCw size={12} className="animate-spin"/>Sending…</> : <><Mail size={12}/>Send Test Email</>}
          </button>
        ) : (
          <div className={`flex items-center gap-1.5 text-[12px] font-medium ${testRes.ok?'text-green-600':'text-red-500'}`}>
            {testRes.ok ? <CheckCircle2 size={13}/> : <AlertCircle size={13}/>}
            {testRes.msg}
          </div>
        )}
      </Row>

      <div className="pt-4 mt-2">
        <SectionHead title="Sender Identities"
          desc="One SMTP connection, three senders. Leave a field blank to fall back to the Default From above. On Gmail the From address is forced to the SMTP account, but the display name and Reply-To still apply."/>
      </div>
      {[
        ['onboarding', 'Onboarding',          'Welcome emails for new users'],
        ['alerts',     'Alerts',              'Project assignments, tasks & system notifications'],
        ['support',    'Support & Helpline',  'Password reset emails — set Reply-To to a monitored inbox'],
      ].map(([key, label, helper]) => (
        <Row key={key} label={label} helper={helper}
          error={err[`notifications.${key}FromEmail`] || err[`notifications.${key}ReplyTo`]}>
          <div className="flex flex-col gap-2">
            <Input value={s[`${key}FromName`]||''} onChange={e=>upd(`${key}FromName`, e.target.value)}
              disabled={!canEdit} placeholder="Display name (e.g. OWMS Support)"/>
            <Input type="email" value={s[`${key}FromEmail`]||''} onChange={e=>upd(`${key}FromEmail`, e.target.value)}
              disabled={!canEdit} placeholder="From address — blank uses Default From"
              error={err[`notifications.${key}FromEmail`]}/>
            <Input type="email" value={s[`${key}ReplyTo`]||''} onChange={e=>upd(`${key}ReplyTo`, e.target.value)}
              disabled={!canEdit} placeholder="Reply-To — blank means no reply address"
              error={err[`notifications.${key}ReplyTo`]}/>
          </div>
        </Row>
      ))}

      <div className="pt-4 mt-2">
        <SectionHead title="Event Notifications" desc="Which events trigger admin email alerts"/>
      </div>
      {[
        ['notifyNewUser',          'New user created',         'When an Admin creates a new user account'],
        ['notifyUserDeactivated',  'User deactivated',         'When a user account is disabled or removed'],
        ['notifyFailedLogin',      'Failed login attempts',    'When an account hits 3+ consecutive failures'],
        ['notifyPermissionChange', 'Permission changes',       'When the Access Matrix is modified'],
        ['notifySystemError',      'System errors',            'When critical backend errors occur'],
        ['notifyLeaveRequest',     'Leave requests',           'When employees submit leave requests'],
        ['notifyReportGenerated',  'Report generated',         'When a scheduled report completes'],
      ].map(([f,l,sub]) => (
        <ToggleRow key={f} label={l} sub={sub} checked={!!s[f]} onChange={v=>upd(f,v)} disabled={!canEdit}/>
      ))}
    </div>
  );
}

// ─── Branding ─────────────────────────────────────────────────────────────────
function BrandingTab({ s, upd, canEdit }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const [preview,   setPreview]   = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > 2*1024*1024) { setUploadMsg({ok:false,msg:'Max 2 MB'}); return; }
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);
    setUploading(true); setUploadMsg(null);
    try {
      const fd = new FormData(); fd.append('logo', file);
      const r = await adminAPI.uploadLogo(fd);
      upd('logoPath', r.data.data?.logoUrl?.replace('/uploads/avatars/',''));
      setUploadMsg({ok:true,msg:'Uploaded successfully'});
    } catch(e) { setUploadMsg({ok:false,msg:e.response?.data?.message||'Upload failed'}); }
    finally { setUploading(false); }
  };

  const logoSrc = preview || (s.logoPath ? `/uploads/avatars/${s.logoPath}` : null);

  return (
    <div>
      <SectionHead title="Company Logo" desc="Shown in the app header and generated reports"/>
      <Row label="Logo" col>
        {logoSrc && (
          <div className="flex items-center gap-3 mb-3 p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
            <img src={logoSrc} alt="Logo" className="h-8 object-contain"/>
            {canEdit && (
              <button onClick={()=>{upd('logoPath',null);setPreview(null);}}
                className="text-[11px] text-red-500 hover:text-red-700 ml-auto">Remove</button>
            )}
          </div>
        )}
        <div onClick={()=>canEdit&&!uploading&&fileRef.current?.click()}
          className={`border-2 border-dashed border-[#D1D5DB] rounded-lg p-5 text-center transition
            ${canEdit&&!uploading?'cursor-pointer hover:border-[#EA580C] hover:bg-[#FFF7ED]':'opacity-50 cursor-not-allowed'}`}>
          {uploading
            ? <div className="flex flex-col items-center gap-1"><RefreshCw size={18} className="text-[#EA580C] animate-spin"/><p className="text-[11px] text-[#6B7280]">Uploading…</p></div>
            : <><Upload size={18} className="text-[#9CA3AF] mx-auto mb-1"/><p className="text-[12px] text-[#6B7280]">Click to upload — SVG, PNG, JPG · Max 2 MB</p></>
          }
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/svg+xml" className="hidden"
          onChange={e=>handleFile(e.target.files[0])}/>
        {uploadMsg && <p className={`text-[11px] mt-1.5 ${uploadMsg.ok?'text-green-600':'text-red-500'}`}>{uploadMsg.msg}</p>}
      </Row>

      <div className="pt-4 mt-2">
        <SectionHead title="Login Page" desc="Text shown to users on the sign-in screen"/>
      </div>
      <Row label="Title">
        <Input value={s.loginTitle||''} onChange={e=>upd('loginTitle',e.target.value)}
          disabled={!canEdit} placeholder="Welcome to OWMS" className="w-full"/>
      </Row>
      <Row label="Subtitle">
        <Input value={s.loginSubtitle||''} onChange={e=>upd('loginSubtitle',e.target.value)}
          disabled={!canEdit} placeholder="Office Workspace Management System" className="w-full"/>
      </Row>
      <Row label="Preview" col>
        <div className="bg-[#1E293B] rounded-lg p-6 text-center">
          <div className="w-9 h-9 rounded-full bg-[#334155] mx-auto mb-3 flex items-center justify-center">
            <span className="text-[10px] font-bold text-[#94A3B8]">OW</span>
          </div>
          <p className="text-[15px] font-bold text-white mb-1">{s.loginTitle||'Welcome to OWMS'}</p>
          <p className="text-[11px] text-[#94A3B8]">{s.loginSubtitle||'Office Workspace Management System'}</p>
        </div>
      </Row>
    </div>
  );
}

// ─── System ───────────────────────────────────────────────────────────────────
function SystemTab({ s, upd, err, canEdit, isSuperAdmin, onDanger, updatedAt }) {
  return (
    <div>
      <SectionHead title="System Information" desc="Read-only — runtime status of this installation"/>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          ['Version',      '1.0.0'],
          ['Platform',     'OWMS — Movi Cloud Labs'],
          ['API Status',   s.apiEnabled ? 'Active' : 'Disabled'],
          ['Last Updated', updatedAt ? new Date(updatedAt).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'}) : '—'],
        ].map(([k,v]) => (
          <div key={k} className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2.5">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">{k}</p>
            <p className={`text-[13px] font-medium mt-0.5 ${k==='API Status'?(s.apiEnabled?'text-green-600':'text-red-500'):'text-[#111827]'}`}>{v}</p>
          </div>
        ))}
      </div>

      <SectionHead title="Maintenance Mode" desc="Temporarily blocks non-admin users from accessing the system"/>
      <div className={`rounded-lg border p-4 mb-4 transition-colors ${s.maintenanceMode?'bg-red-50 border-red-200':'bg-[#F9FAFB] border-[#E5E7EB]'}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {s.maintenanceMode
              ? <AlertTriangle size={14} className="text-red-500"/>
              : <Shield size={14} className="text-green-500"/>}
            <span className={`text-[13px] font-semibold ${s.maintenanceMode?'text-red-600':'text-[#111827]'}`}>
              {s.maintenanceMode ? 'Maintenance — ACTIVE' : 'Maintenance — Off'}
            </span>
          </div>
          <Toggle checked={!!s.maintenanceMode} onChange={v=>upd('maintenanceMode',v)} disabled={!canEdit}/>
        </div>
        <p className="text-[11px] text-[#6B7280]">
          {s.maintenanceMode ? 'All non-admin users are blocked.' : 'All users can access normally.'}
        </p>
        <AnimatePresence>
          {s.maintenanceMode && (
            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.15}} className="overflow-hidden mt-3">
              <p className="text-[11px] text-[#374151] mb-1.5 font-medium">Message shown to blocked users:</p>
              <textarea rows={2} value={s.maintenanceMessage||''}
                onChange={e=>upd('maintenanceMessage',e.target.value)}
                disabled={!canEdit}
                placeholder="System is under maintenance. Please check back soon."
                className="w-full border border-[#D1D5DB] rounded-md px-2.5 py-1.5 text-[12px] text-[#374151] resize-none bg-white
                  focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-orange-100
                  disabled:bg-[#F3F4F6] disabled:cursor-not-allowed"/>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SectionHead title="API Access"/>
      <ToggleRow label="Enable external API access" sub="Allow third-party systems to call OWMS endpoints"
        checked={!!s.apiEnabled} onChange={v=>upd('apiEnabled',v)} disabled={!canEdit}/>
      <AnimatePresence>
        {s.apiEnabled && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.15}} className="overflow-hidden">
            <Row label="Rate Limit" helper="Max requests/min per IP" error={err['system.apiRateLimit']}>
              <div className="flex items-center gap-2">
                <Input type="number" min={10} max={1000} value={s.apiRateLimit||100}
                  onChange={e=>upd('apiRateLimit',parseInt(e.target.value))}
                  disabled={!canEdit} error={err['system.apiRateLimit']} className="w-24"/>
                <span className="text-[11px] text-[#9CA3AF]">requests / minute</span>
              </div>
            </Row>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <AlertTriangle size={13} className="text-red-500"/>
          <p className="text-[13px] font-semibold text-red-600">Danger Zone</p>
        </div>
        <p className="text-[11px] text-[#9CA3AF] mb-4">These actions are irreversible. Proceed with extreme caution.</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#111827]">Force Password Reset</p>
              <p className="text-[11px] text-[#6B7280]">All users must set a new password on next login.</p>
            </div>
            <button onClick={()=>onDanger('reset-passwords')} disabled={!canEdit}
              className="text-[12px] border border-red-300 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50 transition disabled:opacity-40 shrink-0 ml-4">
              Reset Passwords
            </button>
          </div>
          {isSuperAdmin && (
            <div className="flex items-center justify-between pt-3 border-t border-red-100">
              <div>
                <p className="text-[13px] font-medium text-[#111827]">Factory Reset</p>
                <p className="text-[11px] text-[#6B7280]">Restore all settings to defaults. User data is unaffected.</p>
              </div>
              <button onClick={()=>onDanger('factory-reset')} disabled={!canEdit}
                className="text-[12px] border border-red-300 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50 transition disabled:opacity-40 shrink-0 ml-4">
                Factory Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── HR ───────────────────────────────────────────────────────────────────────
function HRTab({ s, upd, err, canEdit }) {
  return (
    <div>
      <SectionHead title="Onboarding" desc="Controls how HR is auto-assigned when Admin creates a new employee or intern"/>
      <Row
        label="HR Onboarding Cap"
        helper="Max employees one HR can handle for physical onboarding at a time"
        error={err['hr.onboardingHRCap']}
      >
        <div className="flex items-center gap-3">
          <input
            type="range" min={1} max={50} step={1}
            value={s?.onboardingHRCap ?? 10}
            onChange={e => upd('onboardingHRCap', parseInt(e.target.value))}
            disabled={!canEdit}
            className="w-40 accent-[#EA580C] disabled:opacity-40"
          />
          <span className="text-[13px] font-semibold text-[#EA580C] w-24">
            {s?.onboardingHRCap ?? 10} employees
          </span>
        </div>
        <p className="text-[11px] text-[#9CA3AF] mt-1">
          When all HRs are at capacity, the system still auto-assigns to the least-loaded HR and warns Admin.
        </p>
      </Row>
      <Row
        label="Assignment Logic"
        helper="Priority order when auto-assigning an HR"
      >
        <ol className="text-[12px] text-[#374151] space-y-1 list-none">
          <li className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[#FFF7ED] text-[#EA580C] text-[10px] font-bold flex items-center justify-center shrink-0">1</span> Same department HR under cap</li>
          <li className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[#FFF7ED] text-[#EA580C] text-[10px] font-bold flex items-center justify-center shrink-0">2</span> Any HR under cap (least-loaded first)</li>
          <li className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold flex items-center justify-center shrink-0">3</span> Least-loaded HR (soft cap — Admin warned)</li>
        </ol>
      </Row>
    </div>
  );
}

// ─── Retention Tab ────────────────────────────────────────────────────────────
function RetentionTab({ archivedUsers, loading, pagination, stats, search: _search, setSearch,
  page, setPage, onRestore, onPermDelete, isSuperAdmin }) {

  const [localSearch, setLocalSearch] = useState(_search || '');
  const total = stats.reduce((s, x) => s + x.count, 0);
  const empCount = stats.find(s => s._id === 'Full-time')?.count || 0;
  const intCount = stats.find(s => s._id === 'Intern')?.count || 0;

  const relTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const initials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const typeBadge = (t) => {
    const map = {
      'Full-time': { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
      'Part-time': { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
      'Contract':  { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
      'Intern':    { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
    };
    const c = map[t] || map['Full-time'];
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium"
        style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
        {t || 'N/A'}
      </span>
    );
  };

  const from = pagination?.total ? (page - 1) * (pagination?.limit || 15) + 1 : 0;
  const to = Math.min(page * (pagination?.limit || 15), pagination?.total || 0);

  return (
    <div>
      <p className="text-sm font-semibold text-[#0F172A] mb-1">Data Retention & Archive</p>
      <p className="text-xs text-[#64748B] mb-5">Deleted users are archived here. You can restore them or permanently remove their records.</p>

      {/* Stats Strip */}
      <div className="flex gap-3 mb-5">
        <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-4 py-2.5 flex items-center gap-2">
          <Archive size={14} className="text-[#64748B]" />
          <span className="text-sm font-medium text-[#0F172A]">Total Archived: {total}</span>
        </div>
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-4 py-2.5 flex items-center gap-2">
          <Users size={14} className="text-[#2563EB]" />
          <span className="text-sm font-medium text-[#2563EB]">Employees: {empCount}</span>
        </div>
        <div className="bg-[#EDE9FE] border border-[#DDD6FE] rounded-lg px-4 py-2.5 flex items-center gap-2">
          <GraduationCap size={14} className="text-[#7C3AED]" />
          <span className="text-sm font-medium text-[#7C3AED]">Interns: {intCount}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by name, email, or employee ID..."
            value={localSearch}
            onChange={e => { setLocalSearch(e.target.value); setSearch(e.target.value); }}
            className="bg-white border border-[#E2E8F0] rounded-lg pl-9 pr-4 py-2 text-sm w-72 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-orange-100 transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          /* Loading Skeleton */
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-[#E2E8F0] animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-[#E2E8F0] rounded animate-pulse w-1/3" />
                  <div className="h-2.5 bg-[#F1F5F9] rounded animate-pulse w-1/4" />
                </div>
                <div className="h-3 bg-[#E2E8F0] rounded animate-pulse w-24" />
                <div className="h-3 bg-[#E2E8F0] rounded animate-pulse w-20" />
                <div className="h-3 bg-[#E2E8F0] rounded animate-pulse w-16" />
              </div>
            ))}
          </div>
        ) : archivedUsers.length === 0 ? (
          /* Empty State */
          <div className="py-16 flex flex-col items-center justify-center">
            <Archive size={40} className="text-[#CBD5E1] mb-3" />
            <p className="text-base font-medium text-[#0F172A] mb-1">No archived users</p>
            <p className="text-sm text-[#64748B]">Deleted users will appear here for easy restoration.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Role & Dept</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Archived On</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Archived By</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {archivedUsers.map(u => (
                  <tr key={u._id} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] transition-colors">
                    {/* Employee */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#94A3B8] flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-bold text-white">{initials(u.name)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A] leading-tight">{u.name}</p>
                          <p className="text-xs font-mono text-[#64748B]">{u.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-[#64748B] font-mono">{u.email}</span>
                    </td>
                    {/* Role & Dept */}
                    <td className="px-4 py-3">
                      {u.role ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: (u.role.color || '#6B7280') + '18', color: u.role.color || '#6B7280', border: `1px solid ${(u.role.color || '#6B7280')}30` }}>
                          {u.role.name}
                        </span>
                      ) : <span className="text-xs text-[#94A3B8]">—</span>}
                      {u.department && <p className="text-xs text-[#64748B] mt-0.5">{u.department.name}</p>}
                    </td>
                    {/* Employment Type */}
                    <td className="px-4 py-3">{typeBadge(u.employmentType)}</td>
                    {/* Archived On */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-[#0F172A]">{fmtDate(u.archivedAt)}</p>
                      <p className="text-xs text-[#64748B]">{relTime(u.archivedAt)}</p>
                    </td>
                    {/* Archived By */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-[#64748B]">{u.archivedByName || u.archivedBy?.name || 'System'}</span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onRestore(u)}
                          className="flex items-center gap-1.5 border border-[#16A34A] text-[#16A34A] hover:bg-[#DCFCE7] text-xs px-3 py-1.5 rounded-lg transition font-medium"
                        >
                          <RotateCcw size={14} /> Restore
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => onPermDelete(u)}
                            title="Permanently delete all records"
                            className="text-[#DC2626] hover:bg-[#FEE2E2] p-1.5 rounded-lg transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination && pagination.total > 0 && (
              <div className="flex justify-between items-center px-4 py-3 border-t border-[#E2E8F0]">
                <span className="text-sm text-[#64748B]">
                  Showing {from}–{to} of {pagination.total} archived users
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={!pagination.hasPrev}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-md border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={!pagination.hasNext}
                    onClick={() => setPage(p => p + 1)}
                    className="p-1.5 rounded-md border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { key: 'general',       label: 'General',       Icon: SlidersHorizontal },
  { key: 'security',      label: 'Security',      Icon: Shield },
  { key: 'notifications', label: 'Notifications', Icon: Bell },
  { key: 'branding',      label: 'Branding',      Icon: Palette },
  { key: 'system',        label: 'System',        Icon: Server },
  { key: 'hr',            label: 'HR',            Icon: Users },
  { key: 'retention',     label: 'Retention',     Icon: Archive },
];

export default function Settings() {
  const { hasPermission, user } = useAuth();
  const canRead      = hasPermission('Settings', 'read');
  const canEdit      = hasPermission('Settings', 'update');
  const isSuperAdmin = user?.role?.slug === 'super-admin';

  const [settings,  setSettings]  = useState(null);
  const [original,  setOriginal]  = useState(null);
  const [tab,       setTab]       = useState('general');
  const [dirty,     setDirty]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [saveErr,   setSaveErr]   = useState('');
  const [saved,     setSaved]     = useState(false);
  const [valErrs,   setValErrs]   = useState({});

  // ── Retention tab state (independent from settings form) ──────────────
  const [archivedUsers,      setArchivedUsers]      = useState([]);
  const [archivedLoading,    setArchivedLoading]    = useState(false);
  const [archivedPagination, setArchivedPagination] = useState({});
  const [archiveSearch,      setArchiveSearch]      = useState('');
  const [archivePage,        setArchivePage]        = useState(1);
  const [archiveStats,       setArchiveStats]       = useState([]);
  const [restoreTarget,      setRestoreTarget]      = useState(null);
  const [restoreBusy,        setRestoreBusy]        = useState(false);
  const [permDeleteTarget,   setPermDeleteTarget]   = useState(null);
  const [permDeleteConfirm,  setPermDeleteConfirm]  = useState('');
  const [permDeleteBusy,     setPermDeleteBusy]     = useState(false);
  const [danger,    setDanger]    = useState(null);
  const [dangerBusy,setDangerBusy]= useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canRead) return;
    (async () => {
      setLoading(true);
      try {
        const r = await adminAPI.getSettings();
        setSettings(r.data.data);
        setOriginal(JSON.parse(JSON.stringify(r.data.data)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [canRead]);

  // ── Fetch archived users when Retention tab is active ─────────────────
  const fetchArchivedUsers = useCallback(async () => {
    setArchivedLoading(true);
    try {
      const res = await adminAPI.getArchivedUsers({
        page: archivePage,
        limit: 15,
        search: archiveSearch || undefined,
      });
      setArchivedUsers(res.data.data.archived);
      setArchiveStats(res.data.data.stats);
      setArchivedPagination(res.data.data.pagination);
    } catch (err) {
      console.error('Failed to load archive', err);
    } finally {
      setArchivedLoading(false);
    }
  }, [archivePage, archiveSearch]);

  useEffect(() => {
    if (tab === 'retention') fetchArchivedUsers();
  }, [tab, fetchArchivedUsers]);

  // Debounce archive search
  const searchTimer = useRef(null);
  const handleArchiveSearch = (val) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setArchiveSearch(val);
      setArchivePage(1);
    }, 300);
  };

  // Restore handler
  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoreBusy(true);
    try {
      await adminAPI.restoreUser(restoreTarget._id);
      setRestoreTarget(null);
      fetchArchivedUsers();
    } catch (e) {
      setSaveErr(e.response?.data?.message || 'Restore failed');
    } finally {
      setRestoreBusy(false);
    }
  };

  // Permanent delete handler
  const handlePermDelete = async () => {
    if (!permDeleteTarget || permDeleteConfirm !== 'DELETE') return;
    setPermDeleteBusy(true);
    try {
      await adminAPI.permanentlyDelete(permDeleteTarget._id);
      setPermDeleteTarget(null);
      setPermDeleteConfirm('');
      fetchArchivedUsers();
    } catch (e) {
      setSaveErr(e.response?.data?.message || 'Permanent delete failed');
    } finally {
      setPermDeleteBusy(false);
    }
  };

  // ── updateField ───────────────────────────────────────────────────────────
  const updateField = (section, field, value) => {
    setSettings(p => ({ ...p, [section]: { ...p[section], [field]: value } }));
    setDirty(true); setSaveErr('');
    const k = `${section}.${field}`;
    if (valErrs[k]) setValErrs(p => { const n={...p}; delete n[k]; return n; });
  };
  const upd = (section) => (field, value) => updateField(section, field, value);

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    const { security: s, general: g, system: sys, notifications: n, hr: h } = settings;
    if ((s.minPasswordLength??8)<6||(s.minPasswordLength??8)>32)    e['security.minPasswordLength']='Must be 6–32';
    if ((g.itemsPerPage??25)<10||(g.itemsPerPage??25)>100)           e['general.itemsPerPage']='Must be 10–100';
    if ((sys.apiRateLimit??100)<10||(sys.apiRateLimit??100)>1000)    e['system.apiRateLimit']='Must be 10–1000';
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (n.fromEmail&&!emailRe.test(n.fromEmail)) e['notifications.fromEmail']='Invalid email';
    ['onboarding','alerts','support'].forEach(k => {
      if (n[`${k}FromEmail`]&&!emailRe.test(n[`${k}FromEmail`])) e[`notifications.${k}FromEmail`]='Invalid email';
      if (n[`${k}ReplyTo`]  &&!emailRe.test(n[`${k}ReplyTo`]))   e[`notifications.${k}ReplyTo`]='Invalid email';
    });
    if ((h?.onboardingHRCap??10)<1||(h?.onboardingHRCap??10)>50)     e['hr.onboardingHRCap']='Must be 1–50';
    setValErrs(e);
    return Object.keys(e).length === 0;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) {
      const first = Object.keys(valErrs)[0];
      if (first) setTab(first.split('.')[0]);
      return;
    }
    setSaving(true); setSaveErr('');
    try {
      const payload = JSON.parse(JSON.stringify(settings));
      if (!payload.notifications?.smtpPass) delete payload.notifications.smtpPass;
      const r = await adminAPI.saveSettings(payload);
      const d = r.data.data;
      setSettings(d); setOriginal(JSON.parse(JSON.stringify(d)));
      setDirty(false); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveErr(e.response?.data?.message || 'Save failed. Please try again.');
    } finally { setSaving(false); }
  };

  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    try {
      const r = await adminAPI.getSettings();
      setSettings(r.data.data);
      setOriginal(JSON.parse(JSON.stringify(r.data.data)));
    } catch { setSettings(JSON.parse(JSON.stringify(original))); }
    setDirty(false); setSaveErr(''); setValErrs({});
  };

  // ── Danger ────────────────────────────────────────────────────────────────
  const handleDangerConfirm = async () => {
    setDangerBusy(true);
    try {
      if (danger === 'factory-reset') {
        await adminAPI.resetSettings();
        const r = await adminAPI.getSettings();
        const d = r.data.data;
        setSettings(d); setOriginal(JSON.parse(JSON.stringify(d)));
        setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveErr('Force password reset is not yet available.');
      }
    } catch(e) { setSaveErr(e.response?.data?.message||'Action failed.'); }
    finally { setDangerBusy(false); setDanger(null); }
  };

  // ── Tab state ─────────────────────────────────────────────────────────────
  const tabDirty = (k) => settings && original && JSON.stringify(settings[k]) !== JSON.stringify(original[k]);
  const tabErr   = (k) => Object.keys(valErrs).some(e => e.startsWith(k+'.'));

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!canRead) return <DynamicLayout title="Settings"><AccessDenied /></DynamicLayout>;
  if (loading || !settings) return (
    <DynamicLayout title="Settings" subtitle="System-wide configuration for your OWMS installation">
      <Skeleton/>
    </DynamicLayout>
  );

  return (
    <DynamicLayout
      title="Settings"
      subtitle="System-wide configuration for your OWMS installation"
      actions={tab !== 'retention' ? (
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="flex items-center gap-1.5 text-[12px] text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"/>
              Unsaved changes
            </span>
          )}
          <button onClick={handleCancel} disabled={!dirty}
            className="px-3 py-2 text-[13px] border border-[#D1D5DB] text-[#6B7280] rounded-md hover:bg-[#F9FAFB] transition disabled:opacity-40 disabled:cursor-not-allowed">
            Discard
          </button>
          <button onClick={handleSave} disabled={!dirty||saving||!canEdit}
            className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white rounded-md transition
              ${dirty&&!saving&&canEdit ? 'bg-[#EA580C] hover:bg-[#C2410C]' : 'bg-[#94A3B8] cursor-not-allowed'}`}>
            {saving ? <><RefreshCw size={12} className="animate-spin"/>Saving…</> : <><Save size={12}/>Save Changes</>}
          </button>
        </div>
      ) : null}
    >
      {/* Main panel — zoom 1.1 enlarges the settings content ~110% without
          affecting the sidebar or page header. */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] flex overflow-hidden" style={{ minHeight: 560, zoom: 1.1 }}>
        {/* Left nav */}
        <div className="w-44 shrink-0 bg-[#F9FAFB] border-r border-[#E5E7EB] p-2.5">
          <p className="text-[10px] font-semibold text-[#9CA3AF] tracking-widest px-2 py-1.5 mb-1">CONFIGURATION</p>
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            const hasErr = tabErr(key);
            const hasDiff = tabDirty(key);
            return (
              <button key={key} onClick={() => setTab(key)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors text-left mb-0.5
                  ${active ? 'bg-white border border-[#E5E7EB] text-[#111827] font-medium shadow-sm'
                           : 'text-[#6B7280] hover:bg-white hover:text-[#111827]'}`}
              >
                <Icon size={14} className={active ? 'text-[#EA580C]' : 'text-[#9CA3AF]'}/>
                <span className="flex-1">{label}</span>
                {hasErr  && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"/>}
                {!hasErr && hasDiff && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"/>}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{opacity:0,x:6}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-6}} transition={{duration:0.12}}>
              {tab === 'general'       && <GeneralTab       s={settings.general}       upd={upd('general')}       err={valErrs} canEdit={canEdit}/>}
              {tab === 'security'      && <SecurityTab      s={settings.security}      upd={upd('security')}      err={valErrs} canEdit={canEdit}/>}
              {tab === 'notifications' && <NotificationsTab s={settings.notifications} upd={upd('notifications')} err={valErrs} canEdit={canEdit} userEmail={user?.email||''}/>}
              {tab === 'branding'      && <BrandingTab      s={settings.branding}      upd={upd('branding')}      canEdit={canEdit}/>}
              {tab === 'system'        && <SystemTab        s={settings.system}        upd={upd('system')}        err={valErrs} canEdit={canEdit} isSuperAdmin={isSuperAdmin} onDanger={setDanger} updatedAt={settings.updatedAt}/>}
              {tab === 'hr'           && <HRTab            s={settings.hr}            upd={upd('hr')}            err={valErrs} canEdit={canEdit}/>}
              {tab === 'retention'    && <RetentionTab
                archivedUsers={archivedUsers} loading={archivedLoading}
                pagination={archivedPagination} stats={archiveStats}
                search={archiveSearch} setSearch={handleArchiveSearch}
                page={archivePage} setPage={setArchivePage}
                onRestore={setRestoreTarget} onPermDelete={setPermDeleteTarget}
                isSuperAdmin={isSuperAdmin}
              />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Status bar — hidden on Retention tab */}
      {tab !== 'retention' && (
        <div className="mt-3 flex items-center gap-3 text-[13px]">
          {saved    && <span className="flex items-center gap-1.5 text-green-600 font-medium"><CheckCircle2 size={14}/>Saved successfully</span>}
          {!saved && !dirty && <span className="text-[#9CA3AF]">All settings saved</span>}
          {saveErr && (
            <div className="flex items-center gap-1.5 text-[12px] text-red-500 max-w-xs truncate ml-auto">
              <AlertCircle size={13} className="shrink-0"/>
              <span className="truncate">{saveErr}</span>
              <button onClick={()=>setSaveErr('')}><X size={12}/></button>
            </div>
          )}
        </div>
      )}

      {/* Error toast for retention actions */}
      {tab === 'retention' && saveErr && (
        <div className="mt-3 flex items-center gap-1.5 text-[12px] text-red-500">
          <AlertCircle size={13} className="shrink-0"/>
          <span>{saveErr}</span>
          <button onClick={()=>setSaveErr('')}><X size={12}/></button>
        </div>
      )}

      {danger && (
        <DangerModal action={danger} onCancel={()=>setDanger(null)} onConfirm={handleDangerConfirm} loading={dangerBusy}/>
      )}

      {/* Restore Confirmation Modal */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.14 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
          >
            <div className="flex justify-center mb-3">
              <div className="bg-[#DCFCE7] rounded-full p-3">
                <RotateCcw size={24} className="text-[#16A34A]" />
              </div>
            </div>
            <p className="text-lg font-bold text-[#0F172A] text-center">Restore {restoreTarget.name}?</p>

            <div className="bg-[#F8FAFC] rounded-lg p-4 my-4 space-y-1.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Employee ID</span>
                <span className="font-mono text-[#0F172A]">{restoreTarget.employeeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Email</span>
                <span className="font-mono text-[#0F172A]">{restoreTarget.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Role</span>
                <span className="text-[#0F172A]">{restoreTarget.role?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Archived on</span>
                <span className="text-[#0F172A]">{restoreTarget.archivedAt ? new Date(restoreTarget.archivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
              </div>
            </div>

            <p className="text-xs text-[#64748B] text-center mb-5">
              Their account will be restored with Active status. They will be required to change their password on first login.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setRestoreTarget(null)}
                className="flex-1 px-3 py-2 text-[13px] border border-[#D1D5DB] text-[#6B7280] rounded-lg hover:bg-[#F9FAFB] transition">
                Cancel
              </button>
              <button onClick={handleRestore} disabled={restoreBusy}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition disabled:opacity-60">
                {restoreBusy ? <><RefreshCw size={12} className="animate-spin"/>Restoring…</> : 'Restore Account'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal (Super Admin only) */}
      {permDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.14 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
          >
            <div className="flex justify-center mb-3">
              <div className="bg-[#FEE2E2] rounded-full p-3">
                <Trash2 size={24} className="text-[#DC2626]" />
              </div>
            </div>
            <p className="text-lg font-bold text-[#DC2626] text-center">Permanently Delete All Records?</p>

            <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-lg p-3 my-4">
              <p className="text-xs text-[#DC2626] leading-relaxed">
                This will completely erase <strong>{permDeleteTarget.name}</strong>'s data from OWMS forever.
                All associated audit logs, tasks, and history will lose this user reference.
                This cannot be undone.
              </p>
            </div>

            <p className="text-[13px] text-[#374151] mb-2">Type <strong>DELETE</strong> to confirm:</p>
            <input
              value={permDeleteConfirm}
              onChange={e => setPermDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full border border-[#D1D5DB] rounded-lg px-3 py-2 text-[13px] mb-4 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100"
            />

            <div className="flex gap-3">
              <button onClick={() => { setPermDeleteTarget(null); setPermDeleteConfirm(''); }}
                className="flex-1 px-3 py-2 text-[13px] border border-[#D1D5DB] text-[#6B7280] rounded-lg hover:bg-[#F9FAFB] transition">
                Cancel
              </button>
              <button onClick={handlePermDelete} disabled={permDeleteConfirm !== 'DELETE' || permDeleteBusy}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium text-white rounded-lg transition
                  ${permDeleteConfirm === 'DELETE' && !permDeleteBusy ? 'bg-[#DC2626] hover:bg-[#B91C1C]' : 'bg-red-300 cursor-not-allowed'}`}>
                {permDeleteBusy ? <><RefreshCw size={12} className="animate-spin"/>Deleting…</> : 'Delete Forever'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </DynamicLayout>
  );
}
