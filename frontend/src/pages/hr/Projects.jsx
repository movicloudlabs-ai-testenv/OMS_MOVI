import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Users, Flag, CheckCircle2, Clock, AlertCircle, Layers } from 'lucide-react';
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
      className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#2563EB] transition-all cursor-pointer group">

      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold text-[#94A3B8]">{project.code}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pr}`}>{project.priority}</span>
          </div>
          <h3 className="text-[15px] font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-[12px] text-[#64748B] mt-0.5 line-clamp-1">{project.description}</p>
          )}
        </div>
        <ChevronRight size={16} className="text-[#CBD5E1] group-hover:text-[#2563EB] transition-colors shrink-0 mt-1" />
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
        <div className="flex justify-between text-[11px] font-bold mb-1.5">
          <span className="text-[#64748B]">Completion</span>
          <span className="text-[#0F172A]">{stats.completion || 0}%</span>
        </div>
        <div className="h-1.5 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${
            (stats.completion || 0) >= 80 ? 'bg-[#059669]' :
            (stats.completion || 0) >= 50 ? 'bg-[#2563EB]' : 'bg-[#D97706]'
          }`} style={{ width: `${stats.completion || 0}%` }} />
        </div>
      </div>

      {/* Task mini stats */}
      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {[
          { label: 'Total',    val: stats.total    || 0, color: 'text-[#0F172A]',  bg: 'bg-[#F8FAFC]' },
          { label: 'Done',     val: stats.done     || 0, color: 'text-[#059669]',  bg: 'bg-[#ECFDF5]' },
          { label: 'Blocked',  val: stats.blocked  || 0, color: 'text-[#DC2626]',  bg: 'bg-[#FEF2F2]' },
          { label: 'Overdue',  val: stats.overdue  || 0, color: 'text-[#EA580C]',  bg: 'bg-[#FFF7ED]' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-lg p-2 text-center`}>
            <p className={`text-[16px] font-black ${s.color} leading-none`}>{s.val}</p>
            <p className="text-[9px] font-bold text-[#94A3B8] uppercase mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
        {/* Team avatars */}
        <div className="flex items-center gap-1">
          {(project.team || []).slice(0, 5).map((member, idx) => {
            const u = member.user;
            if (!u) return null;
            const initial = u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={idx} title={u.name}
                className="w-6 h-6 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-[9px] font-bold border-2 border-white -ml-1 first:ml-0">
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

  return (
    <HRLayout bare>
      <div className="font-sans text-[#0F172A] w-full flex flex-col gap-5 max-w-[1400px] mx-auto pb-12">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">My Projects</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">Projects you are assigned to as HR Representative</p>
          </div>
          <button onClick={fetchProjects}
            className="border border-[#E2E8F0] text-[#0F172A] px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-1.5 self-start">
            <span className="material-symbols-outlined text-[16px]">sync</span> Refresh
          </button>
        </div>

        {/* Stats bar */}
        {!loading && projects.length > 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl px-6 py-3 flex items-center overflow-x-auto shadow-sm gap-0">
            {[
              { icon: 'folder_open',   value: projects.length, label: 'Projects',       color: 'text-[#2563EB]' },
              { icon: 'task_alt',      value: totalTasks,      label: 'Total Tasks',    color: 'text-[#0F172A]' },
              { icon: 'check_circle',  value: completedTasks,  label: 'Completed',      color: 'text-[#059669]' },
              { icon: 'block',         value: blockedTasks,    label: 'Blocked',        color: 'text-[#DC2626]' },
              { icon: 'schedule',      value: overdueTasks,    label: 'Overdue',        color: 'text-[#D97706]' },
            ].map((s, idx) => (
              <div key={s.label} className="flex items-center">
                {idx > 0 && <div className="w-px h-8 bg-[#E2E8F0] mx-4 shrink-0" />}
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={`material-symbols-outlined text-[20px] ${s.color}`}>{s.icon}</span>
                  <div>
                    <p className={`text-[18px] font-bold ${s.color} leading-none`}>{s.value}</p>
                    <p className="text-[11px] text-[#64748B]">{s.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">search</span>
            <input type="text" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[13px] focus:outline-none focus:border-[#2563EB] transition-colors" />
          </div>
          <div className="flex gap-1">
            {[
              { id: 'all',       label: 'All' },
              { id: 'active',    label: 'Active' },
              { id: 'planning',  label: 'Planning' },
              { id: 'on-hold',   label: 'On Hold' },
              { id: 'completed', label: 'Completed' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  filter === f.id ? 'bg-[#2563EB] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-[#E2E8F0] rounded-2xl py-20 flex flex-col items-center justify-center text-center">
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(project => (
              <ProjectCard key={project._id} project={project} onClick={() => setOpenId(project._id)} />
            ))}
          </div>
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
