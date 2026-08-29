import { useState, useEffect, useRef } from 'react';
import {
  Clock, CheckCircle2, AlertCircle, Check, X,
  ChevronDown, Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HRLayout from '../../components/hr/HRLayout';
import { hrAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';

// ─── Task definitions with metadata ──────────────────────────────────────────
const PHASES = [
  {
    key: 'pre',
    label: 'Pre-Arrival',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    tasks: [
      {
        key: 'welcomeEmail',
        text: 'Send Welcome Email',
        desc: 'Official welcome email with first-day details, login credentials and office directions.',
        icon: 'mail',
      },
    ],
  },
  {
    key: 'day1',
    label: 'Day 1',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    tasks: [
      {
        key: 'idCardIssued',
        text: 'Issue Company ID Card',
        desc: 'Generate and hand over the company ID card and building access badge.',
        icon: 'badge',
      },
      {
        key: 'systemAccess',
        text: 'Set Up Workspace & System Access',
        desc: 'Configure email, Slack, OWMS account, and any role-specific software.',
        icon: 'computer',
      },
      {
        key: 'deptIntroduction',
        text: 'Department Introduction',
        desc: 'Introduce to the reporting manager, team lead, and department members.',
        icon: 'groups',
      },
      {
        key: 'equipmentAssigned',
        text: 'Assign Equipment & Laptop',
        desc: 'Hand over assigned laptop, peripherals, and any accessories from the asset register.',
        icon: 'devices',
      },
    ],
  },
  {
    key: 'week1',
    label: 'Week 1',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    tasks: [
      {
        key: 'hrDocumentation',
        text: 'Complete HR Documentation',
        desc: 'Collect signed offer letter, NDA, tax forms, and compliance documents.',
        icon: 'description',
      },
      {
        key: 'mentorAssigned',
        text: 'Assign Mentor',
        desc: 'Pair with a senior team member to guide them through their first few weeks.',
        icon: 'person_add',
      },
      {
        key: 'firstWeekSchedule',
        text: 'Share First Week Schedule',
        desc: 'Send the orientation calendar, training agenda, and first-week meeting invites.',
        icon: 'calendar_today',
      },
    ],
  },
];

const ALL_TASK_KEYS = PHASES.flatMap(p => p.tasks.map(t => t.key));

// ─── Circular progress ring ───────────────────────────────────────────────────
function ProgressRing({ pct, size = 80, stroke = 7, color = '#2563EB', trackColor = '#DBEAFE' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  );
}

// ─── Reassign HR Modal ────────────────────────────────────────────────────────
function ReassignModal({ employee, onClose, onSaved }) {
  const [hrList, setHrList] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    hrAPI.getHRList()
      .then(r => setHrList(r.data?.data || []))
      .catch(() => toast.error('Failed to load HR list'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await hrAPI.reassignHR(employee._id, selected);
      toast.success('HR reassigned successfully');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reassign');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden font-sans">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Reassign Onboarding HR</h2>
            <p className="text-xs text-[#64748B] mt-0.5">For: <span className="font-semibold text-[#0F172A]">{employee.name}</span></p>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:bg-[#F1F5F9] p-1.5 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="material-symbols-outlined text-[28px] text-[#2563EB] animate-spin">sync</span>
            </div>
          ) : hrList.length === 0 ? (
            <p className="text-sm text-[#64748B] text-center py-6">No HR users available.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {hrList.map(hr => (
                <button key={hr._id} onClick={() => setSelected(hr._id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    selected === hr._id ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E2E8F0] hover:border-[#94A3B8] bg-white'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-[11px] font-bold shrink-0">
                      {hr.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">{hr.name}</p>
                      <p className="text-[11px] text-[#64748B] font-mono">{hr.employeeId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${hr.atCap ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {hr.load}/{hr.cap}
                    </span>
                    {selected === hr._id && <Check size={14} className="text-[#2563EB]" />}
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3 mt-5 pt-4 border-t border-[#E2E8F0]">
            <button onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-bold text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!selected || saving}
              className="flex-1 px-4 py-2 text-sm font-bold bg-[#2563EB] text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
              {saving ? 'Saving…' : 'Confirm Reassign'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Checklist Drawer ─────────────────────────────────────────────────────────
function ChecklistDrawer({ person, onClose, onReassign, onTaskToggle }) {
  // optimistic local state — mirrors person.onboardingChecklist
  const [localChecklist, setLocalChecklist] = useState(person.onboardingChecklist || {});
  const [toggling, setToggling] = useState({});   // taskKey → true while in-flight
  const [collapsed, setCollapsed] = useState({});
  const [justDone, setJustDone] = useState(false);
  const prevPct = useRef(person.onboardingProgress || 0);

  // sync when parent refreshes the person object or changes selection
  useEffect(() => {
    setLocalChecklist(person.onboardingChecklist || {});
    prevPct.current = person.onboardingProgress || 0;
  }, [person?._id, person?.onboardingChecklist]);

  const completedKeys = ALL_TASK_KEYS.filter(k => localChecklist[k]);
  const totalDone = completedKeys.length;
  const totalAll = ALL_TASK_KEYS.length;
  const pct = Math.round((totalDone / totalAll) * 100);

  // detect 100% completion
  useEffect(() => {
    if (pct === 100 && prevPct.current < 100) {
      setJustDone(true);
      setTimeout(() => setJustDone(false), 3000);
    }
    prevPct.current = pct;
  }, [pct]);

  const toggle = async (taskKey, newValue) => {
    if (toggling[taskKey]) return;
    // optimistic
    setLocalChecklist(prev => ({ ...prev, [taskKey]: newValue }));
    setToggling(prev => ({ ...prev, [taskKey]: true }));
    try {
      await onTaskToggle(person._id, taskKey, newValue);
    } catch {
      // revert
      setLocalChecklist(prev => ({ ...prev, [taskKey]: !newValue }));
    } finally {
      setToggling(prev => ({ ...prev, [taskKey]: false }));
    }
  };

  const markAll = async () => {
    const undone = ALL_TASK_KEYS.filter(k => !localChecklist[k]);
    if (!undone.length) return;
    // optimistic all
    setLocalChecklist(prev => {
      const n = { ...prev };
      undone.forEach(k => { n[k] = true; });
      return n;
    });
    for (const k of undone) {
      try { await onTaskToggle(person._id, k, true); } catch { /* ignore per-item, reload will correct */ }
    }
  };

  // ring color by pct
  const ringColor = pct === 100 ? '#10B981' : pct >= 50 ? '#2563EB' : '#F59E0B';
  const ringTrack = pct === 100 ? '#D1FAE5' : pct >= 50 ? '#DBEAFE' : '#FEF3C7';

  return (
    <div className="flex flex-col h-full w-full">

      {/* ── Unified header card ─────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-[#E2E8F0]">

        {/* Single compact header row */}
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Progress ring — left anchor */}
          <div className="relative shrink-0">
            <AnimatePresence mode="wait">
              {justDone ? (
                <motion.div key="done" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                  className="w-[56px] h-[56px] rounded-full bg-[#ECFDF5] flex items-center justify-center">
                  <Sparkles size={22} className="text-[#10B981]" />
                </motion.div>
              ) : (
                <motion.div key="ring">
                  <ProgressRing pct={pct} size={56} stroke={5} color={ringColor} trackColor={ringTrack} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[12px] font-extrabold leading-none" style={{ color: ringColor }}>{pct}%</span>
                    <span className="text-[8px] text-[#CBD5E1] font-medium">{totalDone}/{totalAll}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Middle: name + phase bars */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#0F172A] truncate leading-tight">{person.name}</p>
                <p className="text-[10px] text-[#94A3B8] font-mono truncate">
                  {person.employeeId}{person.role?.name ? ` · ${person.role.name}` : ''}
                </p>
              </div>
              <button onClick={onClose}
                className="w-6 h-6 flex items-center justify-center rounded-full text-[#CBD5E1] hover:bg-[#F1F5F9] hover:text-[#64748B] transition-colors shrink-0 ml-2">
                <X size={13} />
              </button>
            </div>

            {/* Phase bars */}
            <div className="space-y-1">
              {PHASES.map(phase => {
                const done = phase.tasks.filter(t => localChecklist[t.key]).length;
                const total = phase.tasks.length;
                return (
                  <div key={phase.key} className="flex items-center gap-1.5">
                    <span className="text-[9px] font-semibold w-[46px] shrink-0" style={{ color: phase.color }}>{phase.label}</span>
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: phase.border }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((done / total) * 100)}%`, background: phase.color }} />
                    </div>
                    <span className="text-[9px] text-[#CBD5E1] tabular-nums shrink-0">{done}/{total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* HR + actions — hairline row */}
        <div className="px-4 py-2 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-[8px] font-bold shrink-0">
              {person.hrManager?.name ? person.hrManager.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
            </div>
            <span className="text-[11px] text-[#64748B] truncate">
              {person.hrManager?.name
                ? <><span className="text-[#94A3B8] font-medium">HR </span>{person.hrManager.name}</>
                : <span className="text-[#94A3B8]">No HR assigned</span>}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {totalDone < totalAll && (
              <button onClick={markAll}
                className="text-[10px] font-bold text-[#059669] border border-[#A7F3D0] bg-[#ECFDF5] hover:bg-[#D1FAE5] px-2 py-0.5 rounded transition-colors">
                Mark all
              </button>
            )}
            <button onClick={onReassign}
              className="text-[10px] font-bold text-[#2563EB] border border-[#BFDBFE] bg-[#EFF6FF] hover:bg-[#DBEAFE] px-2 py-0.5 rounded transition-colors">
              Reassign
            </button>
          </div>
        </div>

        {justDone && (
          <div className="px-4 py-2 bg-[#ECFDF5] border-t border-[#A7F3D0]">
            <p className="text-[12px] font-bold text-[#059669]">Onboarding Complete! 🎉</p>
            <p className="text-[11px] text-[#34D399]">{person.name} is fully onboarded.</p>
          </div>
        )}
      </div>

      {/* Task list grouped by phase */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {PHASES.map(phase => {
          const done = phase.tasks.filter(t => localChecklist[t.key]).length;
          const isCollapsed = !!collapsed[phase.key];
          const allDone = done === phase.tasks.length;

          return (
            <div key={phase.key} className="rounded-xl border overflow-hidden" style={{ borderColor: phase.border }}>
              {/* Phase header — click to collapse */}
              <button
                onClick={() => setCollapsed(prev => ({ ...prev, [phase.key]: !prev[phase.key] }))}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                style={{ background: phase.bg }}>
                <div className="flex items-center gap-2">
                  {allDone
                    ? <CheckCircle2 size={14} style={{ color: phase.color }} />
                    : <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0" style={{ borderColor: phase.color }} />
                  }
                  <span className="text-[12px] font-bold" style={{ color: phase.color }}>{phase.label}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: allDone ? phase.color : 'white', color: allDone ? 'white' : phase.color, border: `1px solid ${phase.border}` }}>
                    {done}/{phase.tasks.length}
                  </span>
                </div>
                <ChevronDown size={13} style={{ color: phase.color, transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>

              {/* Tasks */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden bg-white">
                    <div className="divide-y divide-[#F8FAFC]">
                      {phase.tasks.map((task, idx) => {
                        const checked = !!localChecklist[task.key];
                        const inFlight = !!toggling[task.key];
                        return (
                          <motion.div
                            key={task.key}
                            layout
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer group transition-colors ${
                              checked ? 'bg-[#FAFAFA]' : 'hover:bg-[#F8FAFC]'
                            }`}
                            onClick={() => !inFlight && toggle(task.key, !checked)}>

                            {/* Icon pill */}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              checked ? 'bg-[#ECFDF5]' : 'bg-[#F1F5F9] group-hover:bg-white'
                            }`}>
                              <span className={`material-symbols-outlined text-[16px] ${checked ? 'text-[#10B981]' : 'text-[#64748B]'}`}>
                                {task.icon}
                              </span>
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-[13px] font-semibold leading-snug transition-colors ${
                                checked ? 'text-[#94A3B8] line-through decoration-[#CBD5E1]' : 'text-[#0F172A]'
                              }`}>
                                {task.text}
                              </p>
                              <p className={`text-[11px] leading-snug mt-0.5 transition-colors ${
                                checked ? 'text-[#CBD5E1]' : 'text-[#94A3B8]'
                              }`}>
                                {task.desc}
                              </p>
                            </div>

                            {/* Toggle button */}
                            <div className="shrink-0 mt-1">
                              {inFlight ? (
                                <span className="material-symbols-outlined text-[18px] text-[#94A3B8] animate-spin">sync</span>
                              ) : (
                                <AnimatePresence mode="wait">
                                  {checked ? (
                                    <motion.div key="checked"
                                      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                      className="w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center">
                                      <Check size={13} strokeWidth={3} className="text-white" />
                                    </motion.div>
                                  ) : (
                                    <motion.div key="unchecked"
                                      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                                      className="w-6 h-6 rounded-full border-2 border-[#CBD5E1] group-hover:border-[#2563EB] transition-colors" />
                                  )}
                                </AnimatePresence>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HROnboarding() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Users', 'update');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedOnboardee, setSelectedOnboardee] = useState(null);
  const [pendingOnboarding, setPendingOnboarding] = useState([]);
  const [completedOnboarding, setCompletedOnboarding] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reassignTarget, setReassignTarget] = useState(null);

  const loadData = async () => {
    if (!canRead) return;
    try {
      setLoading(true);
      const [pendingRes, completedRes] = await Promise.all([
        hrAPI.getPendingOnboarding(),
        hrAPI.getCompletedOnboarding(),
      ]);
      setPendingOnboarding(pendingRes.data?.data || []);
      setCompletedOnboarding(completedRes.data?.data || []);
    } catch {
      toast.error('Failed to load onboarding records');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  if (!canRead) return <HRLayout bare><AccessDenied message="You don't have permission to manage onboarding." /></HRLayout>;

  const handleToggleTask = async (userId, taskKey, isChecked) => {
    await hrAPI.updateOnboardingChecklist(userId, { item: taskKey, completed: isChecked });
    // Reload silently in the background and update state
    const [pendingRes, completedRes] = await Promise.all([
      hrAPI.getPendingOnboarding(),
      hrAPI.getCompletedOnboarding(),
    ]);
    const newPending = pendingRes.data?.data || [];
    setPendingOnboarding(newPending);
    setCompletedOnboarding(completedRes.data?.data || []);
    const stillPending = newPending.find(u => u._id === userId);
    if (stillPending) {
      setSelectedOnboardee(stillPending);
    } else {
      // completed — keep drawer open briefly for the celebration, then close
      setTimeout(() => { setSelectedOnboardee(null); toast.success('Onboarding complete!'); }, 2800);
    }
  };

  const filteredPending = pendingOnboarding.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredCompleted = completedOnboarding.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <HRLayout bare>
      <div className="font-sans text-[#0F172A] flex h-full overflow-hidden">

        {/* ── LEFT: full-height scrollable column ───────────────────────── */}
        <div className="flex-1 min-w-0 overflow-y-auto flex flex-col bg-[#F8FAFC]">

        {/* HEADER */}
        <div className="px-6 py-6 border-b border-[#E2E8F0] bg-white shrink-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">Onboarding</h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            Track and complete physical onboarding checklists for new hires assigned to you.
          </p>
        </div>

        {/* TABS */}
        <div className="px-6 border-b border-[#E2E8F0] bg-white shrink-0 flex items-center gap-6">
          {[
            { key: 'pending',   label: 'In Progress', Icon: Clock,        count: filteredPending.length },
            { key: 'completed', label: 'Completed',   Icon: CheckCircle2, count: filteredCompleted.length },
          ].map(({ key, label, Icon, count }) => (
            <button key={key}
              onClick={() => { setActiveTab(key); setSelectedOnboardee(null); }}
              className={`py-3 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === key ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}>
              <Icon size={16} />
              {label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>{count}</span>
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="flex-1 p-6">

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                <input
                  className="w-full border border-[#E2E8F0] rounded-md py-1.5 pl-9 pr-3 text-[13px] focus:outline-none focus:border-[#2563EB] bg-white shadow-sm"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button onClick={loadData}
                className="border border-[#E2E8F0] text-[#0F172A] bg-white px-3 py-1.5 rounded-md text-[13px] font-medium hover:bg-[#F1F5F9] transition-colors flex items-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">sync</span> Refresh
              </button>
            </div>

            {loading && (
              <div className="text-center py-12 text-[14px] text-[#64748B]">Loading onboarding records…</div>
            )}

            {/* PENDING */}
            {!loading && activeTab === 'pending' && (
              <>
                {/* Stats + hint row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-3 py-1.5 flex items-center gap-2 whitespace-nowrap">
                      <Clock size={14} className="text-[#2563EB] shrink-0" />
                      <span className="text-[13px] font-medium text-[#2563EB]">In Progress: <strong>{pendingOnboarding.length}</strong></span>
                    </div>
                    <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-3 py-1.5 flex items-center gap-2 whitespace-nowrap">
                      <CheckCircle2 size={14} className="text-[#16A34A] shrink-0" />
                      <span className="text-[13px] font-medium text-[#16A34A]">Completed: <strong>{completedOnboarding.length}</strong></span>
                    </div>
                    <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-lg px-3 py-1.5 flex items-center gap-2 whitespace-nowrap">
                      <AlertCircle size={14} className="text-[#D97706] shrink-0" />
                      <span className="text-[13px] font-medium text-[#D97706]">Unassigned HR: <strong>{pendingOnboarding.filter(u => !u.hrManager?.name).length}</strong></span>
                    </div>
                  </div>
                  <span className="text-xs text-[#94A3B8] italic shrink-0 ml-4">Click any row to open the onboarding checklist</span>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Candidate</th>
                      <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Role & Dept</th>
                      <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Assigned HR</th>
                      <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Joined</th>
                      <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase text-right">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPending.length > 0 ? filteredPending.map(req => {
                      const done = Object.values(req.onboardingChecklist || {}).filter(Boolean).length;
                      const pct = req.onboardingProgress || 0;
                      const ringColor = pct === 100 ? '#10B981' : pct >= 50 ? '#2563EB' : '#F59E0B';
                      return (
                        <tr key={req._id} onClick={() => setSelectedOnboardee(req)}
                          className={`border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors last:border-0 cursor-pointer ${selectedOnboardee?._id === req._id ? 'bg-[#EFF6FF]' : ''}`}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold text-[11px] shrink-0">
                                {req.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <div className="text-[14px] font-medium text-[#0F172A]">{req.name}</div>
                                <div className="text-[12px] text-[#64748B] font-mono mt-0.5">{req.employeeId || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="text-[13px] text-[#0F172A]">{req.role?.name || '—'}</div>
                            <div className="text-[12px] text-[#64748B] mt-0.5">{req.department?.name || '—'}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            {req.hrManager?.name ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {req.hrManager.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <span className="text-[13px] text-[#0F172A]">{req.hrManager.name}</span>
                              </div>
                            ) : (
                              <span className="text-[12px] text-[#94A3B8]">Unassigned</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-[13px] text-[#64748B]">
                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-3">
                              <div className="relative w-8 h-8 shrink-0">
                                <ProgressRing pct={pct} size={32} stroke={3} color={ringColor} trackColor="#F1F5F9" />
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold" style={{ color: ringColor }}>{pct}%</span>
                              </div>
                              <span className="text-[11px] text-[#64748B] w-10 text-right">{done}/{ALL_TASK_KEYS.length}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle2 size={28} className="text-[#CBD5E1]" />
                            <p className="text-[14px] font-medium text-[#64748B]">All caught up!</p>
                            <p className="text-[12px] text-[#94A3B8]">No onboarding candidates in progress.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </>
            )}

            {/* COMPLETED */}
            {!loading && activeTab === 'completed' && (
              <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Employee</th>
                      <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Role</th>
                      <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase">HR</th>
                      <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompleted.length > 0 ? filteredCompleted.map(person => (
                      <tr key={person._id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors last:border-0">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center font-bold text-[12px] shrink-0">
                              {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <div className="text-[14px] font-medium text-[#0F172A]">{person.name}</div>
                              <div className="text-[12px] text-[#64748B] font-mono mt-0.5">{person.employeeId || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-[#64748B]">{person.role?.name || '—'}</td>
                        <td className="px-5 py-3.5 text-[13px] text-[#64748B]">{person.hrManager?.name || '—'}</td>
                        <td className="px-5 py-3.5 text-[13px] text-[#64748B]">
                          {person.updatedAt ? new Date(person.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center">
                          <p className="text-[14px] text-[#64748B]">No completed onboarding records.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
        </div>{/* end CONTENT */}
        </div>{/* end left column */}

        {/* ── RIGHT: drawer — full height, independent scroll ───────────── */}
        <AnimatePresence>
          {!loading && activeTab === 'pending' && selectedOnboardee && (
            <motion.div
              key={selectedOnboardee._id}
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="w-[380px] shrink-0 h-full border-l border-[#E2E8F0] bg-white overflow-hidden flex flex-col">
              <ChecklistDrawer
                person={selectedOnboardee}
                onClose={() => setSelectedOnboardee(null)}
                onReassign={() => setReassignTarget(selectedOnboardee)}
                onTaskToggle={handleToggleTask}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </div>{/* end outer flex row */}

      {/* Reassign Modal */}
      <AnimatePresence>
        {reassignTarget && (
          <ReassignModal
            employee={reassignTarget}
            onClose={() => setReassignTarget(null)}
            onSaved={() => { loadData(); setSelectedOnboardee(null); }}
          />
        )}
      </AnimatePresence>
    </HRLayout>
  );
}
