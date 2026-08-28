import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Users, Flag, CheckCircle2, Clock, Layers, Search, Plus, ArrowUpRight, CircleSlash, CheckCircle, AlertTriangle } from 'lucide-react';
import HRLayout from '../../components/hr/HRLayout';
import { hrAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  Active:    { bg: 'bg-[#ECFDF5]', text: 'text-[#059669]', dot: 'bg-[#059669]' },
  Planning:  { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]', dot: 'bg-[#2563EB]' },
  'On Hold': { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', dot: 'bg-[#D97706]' },
  Completed: { bg: 'bg-[#F1F5F9]', text: 'text-[#64748B]', dot: 'bg-[#64748B]' },
  Cancelled: { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', dot: 'bg-[#DC2626]' },
};

const HEALTH_STYLES = {
  'On Track': { bg: 'bg-[#ECFDF5]', text: 'text-[#059669]', icon: 'check_circle' },
  'At Risk':  { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', icon: 'warning'      },
  'Delayed':  { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', icon: 'cancel'       },
};

const PRIORITY_STYLES = {
  Critical: 'bg-[#FEF2F2] text-[#DC2626]',
  High:     'bg-[#FFF7ED] text-[#EA580C]',
  Medium:   'bg-[#FFFBEB] text-[#D97706]',
  Low:      'bg-[#F1F5F9] text-[#64748B]',
};

const MILESTONE_STYLES = {
  completed: { icon: 'check_circle',     color: 'text-[#059669]', line: 'bg-[#059669]' },
  current:   { icon: 'radio_button_checked', color: 'text-[#2563EB]', line: 'bg-[#2563EB]' },
  upcoming:  { icon: 'radio_button_unchecked', color: 'text-[#94A3B8]', line: 'bg-[#E2E8F0]' },
  overdue:   { icon: 'cancel',           color: 'text-[#DC2626]', line: 'bg-[#DC2626]' },
};

const TASK_STATUS_COLORS = {
  'Todo':        'bg-[#F1F5F9] text-[#64748B]',
  'In Progress': 'bg-[#EFF6FF] text-[#2563EB]',
  'In Review':   'bg-[#FFFBEB] text-[#D97706]',
  'Blocked':     'bg-[#FEF2F2] text-[#DC2626]',
  'Done':        'bg-[#ECFDF5] text-[#059669]',
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, color: 'text-[#DC2626]' };
  if (diff === 0) return { label: 'Due today',    color: 'text-[#D97706]' };
  if (diff <= 7) return { label: `${diff}d left`, color: 'text-[#D97706]' };
  return { label: `${diff}d`,  color: 'text-[#64748B]' };
}

function ProgressRing({ pct, size = 64 }) {
  const r  = (size - 8) / 2;
  const c  = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E2E8F0" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2563EB" strokeWidth="6"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
    </svg>
  );
}

function TinyTrend({ color = '#F97316' }) {
  // Dotted-point sparkline like the reference UI
  const points = [
    { x: 2, y: 18 },
    { x: 18, y: 12 },
    { x: 34, y: 15 },
    { x: 50, y: 22 },
    { x: 66, y: 12 },
    { x: 82, y: 10 },
    { x: 98, y: 22 },
    { x: 118, y: 8 },
  ];
  const d = `M${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L${p.x} ${p.y}`).join(' ');
  return (
    <svg viewBox="0 0 120 24" className="h-6 w-full">
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {points.map((p, idx) => (
        <circle key={idx} cx={p.x} cy={p.y} r="2.4" fill="white" stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
}

function SummaryCard({ icon, value, label, accent, trendColor }) {
  const Icon = icon;
  return (
    <div className="rounded-[24px] border border-[#F1E8E0] bg-white px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}>
          <Icon size={20} className="text-[#F97316]" />
        </div>
        <div className="min-w-0 text-right">
          <div className="text-[26px] font-bold leading-none text-[#111827]">{value}</div>
          <div className="mt-1 text-[12px] text-[#6B7280]">{label}</div>
        </div>
      </div>
      <div className="mt-4">
        <TinyTrend color={trendColor} />
      </div>
    </div>
  );
}

function DonutChart({ values, colors, size = 92, stroke = 12 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = values.reduce((a, v) => a + v, 0) || 1;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={stroke} />
      {values.map((v, i) => {
        const seg = (v / total) * c;
        const dash = `${seg} ${c - seg}`;
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={colors[i]}
            strokeWidth={stroke}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            strokeLinecap="round"
          />
        );
        offset += seg;
        return el;
      })}
    </svg>
  );
}

function SectionCard({ title, right, children }) {
  return (
    <div className="rounded-[28px] border border-[#F3E8DE] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-[#111827]">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// ─── Project Detail Drawer ─────────────────────────────────────────────────────
function ProjectDrawer({ projectId, onClose }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [taskTab, setTaskTab] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await hrAPI.getMyProject(projectId);
        setProject(res.data.data);
      } catch {
        toast.error('Failed to load project details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const filteredTasks = project?.tasks?.filter(t => {
    if (taskTab === 'all') return true;
    if (taskTab === 'blocked')  return t.status === 'Blocked';
    if (taskTab === 'overdue')  return t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done';
    if (taskTab === 'done')     return t.status === 'Done';
    return true;
  }) || [];

  const stats = project?.taskStats || {};

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onClose} />

      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="fixed right-0 top-0 bottom-0 w-[600px] bg-white z-50 shadow-2xl border-l border-[#E2E8F0] flex flex-col overflow-hidden">

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : !project ? (
          <div className="flex-1 flex items-center justify-center text-[#94A3B8]">Project not found</div>
        ) : (
          <>
            {/* ── Drawer Header ── */}
            <div className="shrink-0 border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold text-[#94A3B8] font-mono">{project.code}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[project.priority]}`}>
                      {project.priority}
                    </span>
                  </div>
                  <h2 className="text-[18px] font-bold text-[#0F172A] leading-tight">{project.name}</h2>
                  {project.description && (
                    <p className="text-[12px] text-[#64748B] mt-1 leading-relaxed line-clamp-2">{project.description}</p>
                  )}
                </div>
                <button onClick={onClose} className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded-lg transition-colors shrink-0">
                  <X size={18} />
                </button>
              </div>

              {/* Status + health badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const s = STATUS_STYLES[project.status] || STATUS_STYLES.Planning;
                  return (
                    <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {project.status}
                    </span>
                  );
                })()}
                {(() => {
                  const h = HEALTH_STYLES[project.healthStatus] || HEALTH_STYLES['On Track'];
                  return (
                    <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${h.bg} ${h.text}`}>
                      <span className="material-symbols-outlined text-[13px]">{h.icon}</span>
                      {project.healthStatus}
                    </span>
                  );
                })()}
                {project.department && (
                  <span className="text-[11px] font-medium text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded-full">
                    {project.department.name}
                  </span>
                )}
                {project.startDate && (
                  <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                    {new Date(project.startDate).toLocaleDateString()} –{' '}
                    {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'TBD'}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-[11px] font-bold mb-1.5">
                  <span className="text-[#64748B]">Overall Completion</span>
                  <span className="text-[#0F172A]">{stats.completion || 0}%</span>
                </div>
                <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${stats.completion || 0}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      (stats.completion || 0) >= 80 ? 'bg-[#059669]' :
                      (stats.completion || 0) >= 50 ? 'bg-[#2563EB]' : 'bg-[#D97706]'
                    }`} />
                </div>
              </div>
            </div>

            {/* ── Scrollable Body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Task Stats */}
              <section>
                <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Task Overview</h3>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: 'Total',       value: stats.total   || 0, color: 'text-[#0F172A]',  bg: 'bg-[#F8FAFC]',  border: 'border-[#E2E8F0]' },
                    { label: 'Done',        value: stats.done    || 0, color: 'text-[#059669]',  bg: 'bg-[#ECFDF5]',  border: 'border-[#BBF7D0]' },
                    { label: 'In Progress', value: stats.inProg  || 0, color: 'text-[#2563EB]',  bg: 'bg-[#EFF6FF]',  border: 'border-[#BFDBFE]' },
                    { label: 'In Review',   value: stats.inReview|| 0, color: 'text-[#D97706]',  bg: 'bg-[#FFFBEB]',  border: 'border-[#FDE68A]' },
                    { label: 'Blocked',     value: stats.blocked || 0, color: 'text-[#DC2626]',  bg: 'bg-[#FEF2F2]',  border: 'border-[#FECACA]' },
                    { label: 'Overdue',     value: stats.overdue || 0, color: 'text-[#DC2626]',  bg: 'bg-[#FFF7ED]',  border: 'border-[#FED7AA]' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center`}>
                      <p className={`text-[22px] font-black ${s.color} leading-none`}>{s.value}</p>
                      <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Team */}
              <section>
                <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users size={13} /> Team Members
                </h3>
                <div className="space-y-2">
                  {(project.team || []).map((member, idx) => {
                    const u = member.user;
                    if (!u) return null;
                    const initial = u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    const isMe = u.name === project.team.find(t => t.role === 'HR Representative')?.user?.name;
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-[11px] font-bold shrink-0">
                            {initial}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-[#0F172A]">{u.name}</p>
                            <p className="text-[11px] text-[#64748B]">{u.designation || '—'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                          {member.role}
                        </span>
                      </div>
                    );
                  })}
                  {(project.team || []).length === 0 && (
                    <p className="text-[12px] text-[#94A3B8] italic">No team members yet</p>
                  )}
                </div>
              </section>

              {/* Interns */}
              {(project.interns || []).length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">school</span> Interns
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.interns.map((intern, idx) => {
                      const u = intern.user;
                      if (!u) return null;
                      const initial = u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                      return (
                        <div key={idx} className="flex items-center gap-2 bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg px-2.5 py-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center text-[10px] font-bold shrink-0">
                            {initial}
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-[#0F172A]">{u.name}</p>
                            {u.college && <p className="text-[10px] text-[#94A3B8]">{u.college}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Milestones */}
              {(project.milestones || []).length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Flag size={13} /> Milestones
                  </h3>
                  <div className="space-y-0">
                    {project.milestones.map((m, idx) => {
                      const ms = MILESTONE_STYLES[m.status] || MILESTONE_STYLES.upcoming;
                      const isLast = idx === project.milestones.length - 1;
                      return (
                        <div key={m._id || idx} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className={`material-symbols-outlined text-[20px] ${ms.color} shrink-0`}>{ms.icon}</span>
                            {!isLast && <div className={`w-0.5 flex-1 ${ms.line} my-1 min-h-[20px]`} />}
                          </div>
                          <div className={`pb-4 flex-1 ${isLast ? '' : ''}`}>
                            <div className="flex items-center justify-between">
                              <p className={`text-[13px] font-semibold ${m.status === 'completed' ? 'text-[#64748B] line-through' : 'text-[#0F172A]'}`}>
                                {m.name}
                              </p>
                              {m.date && (
                                <span className="text-[11px] text-[#94A3B8]">
                                  {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                              m.status === 'completed' ? 'text-[#059669]' :
                              m.status === 'current'   ? 'text-[#2563EB]' :
                              m.status === 'overdue'   ? 'text-[#DC2626]' : 'text-[#94A3B8]'
                            }`}>{m.status}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Tasks */}
              {(project.tasks || []).length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> Tasks
                  </h3>

                  {/* Task filter tabs */}
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {[
                      { id: 'all',     label: 'All',      count: project.tasks.length },
                      { id: 'blocked', label: 'Blocked',  count: stats.blocked || 0 },
                      { id: 'overdue', label: 'Overdue',  count: stats.overdue || 0 },
                      { id: 'done',    label: 'Done',     count: stats.done    || 0 },
                    ].map(tab => (
                      <button key={tab.id} onClick={() => setTaskTab(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          taskTab === tab.id
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                        }`}>
                        {tab.label} {tab.count > 0 && <span className="ml-0.5 opacity-80">({tab.count})</span>}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {filteredTasks.slice(0, 20).map(task => {
                      const due = daysUntil(task.dueDate);
                      return (
                        <div key={task._id} className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-[#0F172A] truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-[#64748B]">
                                {task.assignedTo?.name || 'Unassigned'}
                              </span>
                              {due && <span className={`text-[10px] font-medium ${due.color}`}>{due.label}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-3">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TASK_STATUS_COLORS[task.status]}`}>
                              {task.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {filteredTasks.length === 0 && (
                      <p className="text-[12px] text-[#94A3B8] italic text-center py-4">No tasks in this filter</p>
                    )}
                  </div>
                </section>
              )}

              {/* Budget */}
              {project.budget > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Budget</h3>
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-[13px] text-[#64748B]">Allocated</span>
                      <span className="text-[13px] font-bold text-[#0F172A]">₹{project.budget?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-3">
                      <span className="text-[13px] text-[#64748B]">Spent</span>
                      <span className="text-[13px] font-bold text-[#DC2626]">₹{(project.budgetSpent || 0).toLocaleString()}</span>
                    </div>
                    {(() => {
                      const pct = Math.min(Math.round(((project.budgetSpent || 0) / project.budget) * 100), 100);
                      return (
                        <>
                          <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${pct > 85 ? 'bg-[#DC2626]' : pct > 60 ? 'bg-[#D97706]' : 'bg-[#059669]'}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[11px] text-[#94A3B8] mt-1 text-right">{pct}% utilized</p>
                        </>
                      );
                    })()}
                  </div>
                </section>
              )}

            </div>
          </>
        )}
      </motion.div>
    </>
  );
}

// ─── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick }) {
  const s    = STATUS_STYLES[project.status] || STATUS_STYLES.Planning;
  const h    = HEALTH_STYLES[project.healthStatus] || HEALTH_STYLES['On Track'];
  const pr   = PRIORITY_STYLES[project.priority] || PRIORITY_STYLES.Medium;
  const stats = project.taskStats || {};
  const due  = daysUntil(project.endDate);

  return (
    <div onClick={onClick}
      className="group rounded-[26px] border border-[#F3E8DE] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] cursor-pointer">

      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-[#FFF1E8] px-2 py-0.5 text-[10px] font-mono font-bold text-[#D97706]">{project.code}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pr}`}>{project.priority}</span>
          </div>
          <h3 className="text-[18px] font-bold text-[#111827] group-hover:text-[#F97316] transition-colors truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[#6B7280]">{project.description}</p>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#F3E8DE] bg-[#FFF8F3]">
          <ChevronRight size={16} className="text-[#F97316] transition-colors shrink-0" />
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {project.status}
        </span>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${h.bg} ${h.text}`}>
          <span className="material-symbols-outlined text-[12px]">{h.icon}</span> {project.healthStatus}
        </span>
        {project.department && (
          <span className="text-[10px] text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
            {project.department.name}
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="mb-1.5 flex justify-between text-[11px] font-bold">
          <span className="text-[#64748B]">Completion</span>
          <span className="text-[#0F172A]">{stats.completion || 0}%</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
          <div className={`h-full rounded-full transition-all ${
            (stats.completion || 0) >= 80 ? 'bg-[#22C55E]' :
            (stats.completion || 0) >= 50 ? 'bg-[#F59E0B]' : 'bg-[#60A5FA]'
          }`} style={{ width: `${stats.completion || 0}%` }} />
        </div>
      </div>

      {/* Task mini stats */}
      <div className="mb-4 grid grid-cols-4 gap-2 rounded-[20px] bg-[#FFFDFC] p-3">
        {[
          { label: 'Total',    val: stats.total    || 0, color: 'text-[#0F172A]',  bg: 'bg-[#F8FAFC]' },
          { label: 'Done',     val: stats.done     || 0, color: 'text-[#059669]',  bg: 'bg-[#ECFDF5]' },
          { label: 'Blocked',  val: stats.blocked  || 0, color: 'text-[#DC2626]',  bg: 'bg-[#FEF2F2]' },
          { label: 'Overdue',  val: stats.overdue  || 0, color: 'text-[#EA580C]',  bg: 'bg-[#FFF7ED]' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-2.5 text-center`}>
            <p className={`text-[16px] font-black ${s.color} leading-none`}>{s.val}</p>
            <p className="text-[9px] font-bold text-[#94A3B8] uppercase mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#F3E8DE] pt-3">
        {/* Team avatars */}
        <div className="flex items-center gap-1">
          {(project.team || []).slice(0, 5).map((member, idx) => {
            const u = member.user;
            if (!u) return null;
            const initial = u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={idx} title={u.name}
                className="w-7 h-7 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center text-[10px] font-bold border-2 border-white -ml-1 first:ml-0">
                {initial}
              </div>
            );
          })}
          {(project.team || []).length > 5 && (
            <span className="text-[10px] text-[#64748B] ml-1">+{project.team.length - 5}</span>
          )}
        </div>
        {due && (
          <span className={`text-[11px] font-medium flex items-center gap-1 ${due.color}`}>
            <Clock size={11} /> {due.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HRProjects() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Projects', 'read');
  const [projects, setProjects]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [openId,   setOpenId]     = useState(null);
  const [search,   setSearch]     = useState('');
  const [filter,   setFilter]     = useState('all');

  const fetchProjects = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const res = await hrAPI.getMyProjects();
      setProjects(res.data.data || []);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  if (!canRead) return <HRLayout bare><AccessDenied message="You don't have permission to view projects." /></HRLayout>;

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status.toLowerCase().replace(' ', '-') === filter;
    return matchSearch && matchFilter;
  });

  const totalTasks     = projects.reduce((a, p) => a + (p.taskStats?.total     || 0), 0);
  const completedTasks = projects.reduce((a, p) => a + (p.taskStats?.done      || 0), 0);
  const blockedTasks   = projects.reduce((a, p) => a + (p.taskStats?.blocked   || 0), 0);
  const overdueTasks   = projects.reduce((a, p) => a + (p.taskStats?.overdue   || 0), 0);

  // Project overview (status buckets)
  const statusCounts = {
    Planning: projects.filter(p => p.status === 'Planning').length,
    Active: projects.filter(p => p.status === 'Active').length,
    'On Hold': projects.filter(p => p.status === 'On Hold').length,
    Completed: projects.filter(p => p.status === 'Completed').length,
  };

  // Upcoming deadlines: pick earliest of milestone date or project end date
  const upcomingDeadlines = projects
    .flatMap((p) => {
      const items = [];
      (p.milestones || []).forEach((m) => {
        if (!m?.date) return;
        const dt = new Date(m.date);
        if (Number.isNaN(dt.getTime())) return;
        if (m.status === 'completed') return;
        items.push({
          type: 'milestone',
          title: m.name,
          projectName: p.name,
          date: dt,
        });
      });
      if (p.endDate) {
        const dt = new Date(p.endDate);
        if (!Number.isNaN(dt.getTime())) {
          items.push({
            type: 'project',
            title: 'Project deadline',
            projectName: p.name,
            date: dt,
          });
        }
      }
      return items;
    })
    .filter((i) => i.date >= new Date(Date.now() - 86400000))
    .sort((a, b) => a.date - b.date)
    .slice(0, 4);

  // Recent activity: lightweight feed from createdAt and milestone scheduling
  const recentActivity = projects
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 4)
    .flatMap((p) => {
      const rows = [
        {
          icon: 'rocket_launch',
          color: 'text-[#2563EB]',
          bg: 'bg-[#EFF6FF]',
          text: `Project created:`,
          target: p.name,
          time: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Recently',
        },
      ];

      const ms = (p.milestones || []).filter(m => m?.date && m.status !== 'completed').slice(0, 1);
      ms.forEach((m) => {
        rows.push({
          icon: 'flag',
          color: 'text-[#F59E0B]',
          bg: 'bg-[#FFFBEB]',
          text: `Milestone scheduled:`,
          target: `${m.name} · ${p.name}`,
          time: m.date ? new Date(m.date).toLocaleDateString() : 'Upcoming',
        });
      });
      return rows;
    })
    .slice(0, 5);

  return (
    <HRLayout bare>
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 pb-12 font-sans text-[#0F172A]">

        {/* Header */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">My Projects</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">Projects you are assigned to as HR Representative</p>
          </div>
          <div className="flex items-center gap-3 self-start">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[#F97316] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-[#EA580C]"
            >
              <Plus size={16} />
              New Project
            </button>
            <button onClick={fetchProjects}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-[13px] font-medium text-[#111827] transition hover:bg-[#F9FAFB]">
              <span className="material-symbols-outlined text-[16px]">sync</span>
              Refresh
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {!loading && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { icon: Layers, value: projects.length, label: 'Total Projects', accent: 'bg-[#FFF7ED]', trendColor: '#F59E0B' },
              { icon: ArrowUpRight, value: totalTasks, label: 'Total Tasks', accent: 'bg-[#EEF2FF]', trendColor: '#60A5FA' },
              { icon: CheckCircle, value: completedTasks, label: 'Completed', accent: 'bg-[#ECFDF5]', trendColor: '#22C55E' },
              { icon: CircleSlash, value: blockedTasks, label: 'Blocked', accent: 'bg-[#FEF2F2]', trendColor: '#F43F5E' },
              { icon: AlertTriangle, value: overdueTasks, label: 'Overdue', accent: 'bg-[#FFF7ED]', trendColor: '#EAB308' },
            ].map((stat) => (
              <SummaryCard key={stat.label} {...stat} />
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-3 rounded-[26px] border border-[#F3E8DE] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full max-w-[520px]">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input type="text" placeholder="Search projects by name, code, or description..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[#EEE5DB] bg-[#FFFDFC] py-3 pl-11 pr-4 text-[13px] focus:border-[#F97316] focus:outline-none" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all',       label: 'All' },
              { id: 'active',    label: 'Active' },
              { id: 'planning',  label: 'Planning' },
              { id: 'on-hold',   label: 'On Hold' },
              { id: 'completed', label: 'Completed' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`rounded-xl px-4 py-2 text-[12px] font-medium transition-colors ${
                  filter === f.id ? 'bg-[#F97316] text-white shadow-[0_8px_20px_rgba(249,115,22,0.2)]' : 'border border-[#EEE5DB] bg-white text-[#6B7280] hover:bg-[#FFF7ED]'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 self-start xl:self-auto">
            <span className="text-[12px] text-[#9CA3AF]">Sort by:</span>
            <div className="rounded-xl border border-[#EEE5DB] bg-white px-3 py-2 text-[12px] font-medium text-[#374151]">
              Recent
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-[#E5DCD3] bg-white py-20 text-center">
            <Layers size={40} className="text-[#CBD5E1] mb-3" />
            <p className="text-[15px] font-medium text-[#0F172A] mb-1">
              {projects.length === 0 ? 'No projects assigned yet' : 'No projects match your filter'}
            </p>
            <p className="text-[13px] text-[#64748B]">
              {projects.length === 0
                ? 'You will appear here once a PMO Lead assigns you to a project.'
                : 'Try clearing your search or filter.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map(project => (
                <ProjectCard key={project._id} project={project} onClick={() => setOpenId(project._id)} />
              ))}
            </div>

            {/* Lower dashboard cards like reference */}
            {!loading && projects.length > 0 && (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                {/* Project Overview */}
                <SectionCard
                  title="Project Overview"
                  right={
                    <div className="text-[12px] font-semibold text-[#9CA3AF]">
                      {projects.length} total
                    </div>
                  }
                >
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <DonutChart
                        values={[statusCounts.Planning, statusCounts.Active, statusCounts['On Hold'], statusCounts.Completed]}
                        colors={['#60A5FA', '#F59E0B', '#A78BFA', '#22C55E']}
                        size={96}
                        stroke={12}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-[20px] font-bold text-[#111827]">{projects.length}</div>
                        <div className="text-[11px] text-[#9CA3AF]">Projects</div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2.5">
                      {[
                        { label: 'Planning', val: statusCounts.Planning, dot: 'bg-[#60A5FA]' },
                        { label: 'In Progress', val: statusCounts.Active, dot: 'bg-[#F59E0B]' },
                        { label: 'On Hold', val: statusCounts['On Hold'], dot: 'bg-[#A78BFA]' },
                        { label: 'Completed', val: statusCounts.Completed, dot: 'bg-[#22C55E]' },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${row.dot}`} />
                            <span className="text-[12px] font-medium text-[#6B7280]">{row.label}</span>
                          </div>
                          <span className="text-[12px] font-semibold text-[#111827]">{row.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                {/* Upcoming Deadlines */}
                <SectionCard title="Upcoming Deadlines" right={<span className="text-[12px] font-semibold text-[#F97316]">View All</span>}>
                  {upcomingDeadlines.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingDeadlines.map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 rounded-2xl border border-[#F6EADF] bg-[#FFFEFD] p-3">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-[#111827]">
                              {d.type === 'milestone' ? d.title : d.projectName}
                            </p>
                            <p className="truncate text-[12px] text-[#9CA3AF]">
                              {d.type === 'milestone' ? d.projectName : 'Project deadline'}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-xl bg-[#FFF1E8] px-2.5 py-1.5 text-[11px] font-semibold text-[#F97316]">
                            {d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-[13px] text-[#9CA3AF]">No upcoming deadlines.</p>
                  )}
                </SectionCard>

                {/* Recent Activity */}
                <SectionCard title="Recent Activity" right={<span className="text-[12px] font-semibold text-[#F97316]">View All</span>}>
                  {recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {recentActivity.slice(0, 4).map((a, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border-2 border-white ${a.bg} ${a.color}`}>
                            <span className="material-symbols-outlined text-[16px]">{a.icon}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] text-[#374151]">
                              <span className="font-semibold">{a.text}</span>{' '}
                              <span className="font-semibold text-[#2563EB]">{a.target}</span>
                            </p>
                            <p className="mt-0.5 text-[11px] font-medium text-[#9CA3AF]">{a.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-[13px] text-[#9CA3AF]">No recent activity.</p>
                  )}
                </SectionCard>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {openId && (
          <ProjectDrawer projectId={openId} onClose={() => setOpenId(null)} />
        )}
      </AnimatePresence>
    </HRLayout>
  );
}
