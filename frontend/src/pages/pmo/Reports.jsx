import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, Play, Download, Clock, History, MoreVertical,
  CheckCircle2, XCircle, Search, X, CalendarDays,
  Briefcase, Users, CheckSquare,
} from 'lucide-react';
import PageWrapper from '../../components/PageWrapper';
import { pmoAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';
import toast from 'react-hot-toast';

// ─── PMO Report Definitions ───────────────────────────────────────────────────

const CATEGORIES = ['All', 'Project Reports', 'Resource Reports', 'Task Reports', 'Financial Reports'];

const ICON_MAP = {
  'Project Reports':  { Icon: Briefcase,     bg: 'bg-[#FEF3C7]', color: 'text-[#D97706]' },
  'Resource Reports': { Icon: Users,         bg: 'bg-[#DBEAFE]', color: 'text-[#2563EB]' },
  'Task Reports':     { Icon: CheckSquare,   bg: 'bg-[#DCFCE7]', color: 'text-[#16A34A]' },
  'Financial Reports':{ Icon: BarChart2,     bg: 'bg-[#EDE9FE]', color: 'text-[#7C3AED]' },
};

const SCHEDULE_COLORS = {
  Daily:   'bg-[#DBEAFE] text-[#2563EB]',
  Weekly:  'bg-[#EDE9FE] text-[#7C3AED]',
  Monthly: 'bg-[#D1FAE5] text-[#065F46]',
  Manual:  'bg-[#F1F5F9] text-[#64748B]',
};

const RUN_STAGES = [
  { label: '⏳ Queued...',             color: 'text-[#D97706]', barColor: 'bg-[#D97706]', trackBg: 'bg-[#FEF3C7]', progress: 5  },
  { label: '🔍 Querying database...', color: 'text-[#2563EB]', barColor: 'bg-[#2563EB]', trackBg: 'bg-[#DBEAFE]', progress: 30 },
  { label: '⚙ Formatting output...',  color: 'text-[#7C3AED]', barColor: 'bg-[#7C3AED]', trackBg: 'bg-[#EDE9FE]', progress: 65 },
  { label: '📄 Generating file...',    color: 'text-[#16A34A]', barColor: 'bg-[#16A34A]', trackBg: 'bg-[#DCFCE7]', progress: 85 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getIconConfig(category) {
  return ICON_MAP[category] || { Icon: BarChart2, bg: 'bg-[#F1F5F9]', color: 'text-[#64748B]' };
}

function getHealthBorder(lastRun) {
  if (!lastRun) return 'border-l-[#E2E8F0]';
  if (lastRun.status === 'SUCCESS') return 'border-l-[#16A34A]';
  if (lastRun.status === 'FAILED')  return 'border-l-[#DC2626]';
  return 'border-l-[#E2E8F0]';
}

function relativeTime(dateStr) {
  if (!dateStr) return 'Never';
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function downloadCSV(data, filename) {
  if (!data?.length) { toast.error('No data to export'); return; }
  const keys = Object.keys(data[0]);
  const csv  = [keys.join(','), ...data.map(row =>
    keys.map(k => {
      let v = row[k] == null ? '' : String(row[k]).replace(/"/g, '""');
      return v.search(/("|,|\n)/g) >= 0 ? `"${v}"` : v;
    }).join(',')
  )].join('\n');
  const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a    = document.createElement('a');
  a.href     = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ─── MiniDots ─────────────────────────────────────────────────────────────────
function MiniDots({ runHistory }) {
  const recent7 = (runHistory || []).slice(0, 7).reverse();
  const empties = Math.max(0, 7 - recent7.length);
  return (
    <div className="flex gap-1 mt-2">
      {[...Array(empties).fill(null), ...recent7].map((run, i) => {
        const color = !run ? 'bg-[#E2E8F0]'
          : run.status === 'SUCCESS' ? 'bg-[#16A34A]'
          : run.status === 'FAILED'  ? 'bg-[#DC2626]'
          : 'bg-[#D97706]';
        return (
          <div key={i} className="relative group">
            <div className={`w-2 h-2 rounded-full ${color} cursor-default`} />
            {run && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-[#0F172A] text-white text-[10px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                {new Date(run.executedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {run.status}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── RunProgressBar ───────────────────────────────────────────────────────────
function RunProgressBar({ stage, recordCount }) {
  const isDone   = stage === 4;
  const isFailed = stage === 5;
  const current  = isDone || isFailed ? null : RUN_STAGES[stage] || RUN_STAGES[0];
  const progress = isDone ? 100 : isFailed ? 100 : (current?.progress ?? 5);
  const barColor = isFailed ? 'bg-[#DC2626]' : isDone ? 'bg-[#16A34A]' : current?.barColor;
  return (
    <div className={`rounded-lg px-3 py-2 text-xs w-full ${isFailed ? 'bg-[#FEE2E2]' : isDone ? 'bg-[#DCFCE7]' : current?.trackBg}`}>
      {isDone ? (
        <div className="flex items-center gap-1.5 text-[#16A34A] font-medium">
          <CheckCircle2 size={13} />
          <span>Complete!{recordCount != null ? ` ${Number(recordCount).toLocaleString()} records` : ''}</span>
        </div>
      ) : isFailed ? (
        <div className="flex items-center gap-1.5 text-[#DC2626] font-medium">
          <XCircle size={13} /> <span>Failed. Try again.</span>
        </div>
      ) : (
        <div className={`font-medium mb-1.5 ${current?.color}`}>{current?.label}</div>
      )}
      <div className="h-1 bg-white/50 rounded-full overflow-hidden mt-1">
        <motion.div className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

// ─── MoreMenu ─────────────────────────────────────────────────────────────────
function MoreMenu({ onView, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return (
    <motion.div ref={ref} initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.12 }}
      className="absolute right-0 top-full mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-30 min-w-[140px] py-1">
      <button onClick={() => { onView(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-[#F8FAFC] text-[#0F172A]">
        <History size={14} /> View Details
      </button>
    </motion.div>
  );
}

// ─── ReportCard ───────────────────────────────────────────────────────────────
function ReportCard({ report, runState, onRunNow, onViewDetail, moreMenuOpen, onMoreMenuToggle }) {
  const { Icon, bg, color } = getIconConfig(report.category);
  const healthBorder = getHealthBorder(report.lastRun);
  const isRunning    = !!runState;

  return (
    <div
      className={`bg-white rounded-xl border border-[#E2E8F0] border-l-4 ${healthBorder} p-5 hover:shadow-md hover:border-[#2563EB] transition-all duration-200 cursor-pointer flex flex-col`}
      onClick={() => onViewDetail(report)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
            <Icon size={18} className={color} />
          </div>
          <div className="min-w-0">
            <span className="text-[14px] font-semibold text-[#0F172A] truncate block">{report.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
              SYSTEM
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${SCHEDULE_COLORS[report.schedule] || SCHEDULE_COLORS.Manual}`}>
            {report.schedule}
          </span>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => onMoreMenuToggle(report._id)}
              className="p-1 rounded text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors">
              <MoreVertical size={15} />
            </button>
            <AnimatePresence>
              {moreMenuOpen && <MoreMenu onView={() => onViewDetail(report)} onClose={() => onMoreMenuToggle(null)} />}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[12px] text-[#64748B] mt-2 line-clamp-2 leading-relaxed">{report.description}</p>

      {/* Last run */}
      <div className="flex items-center gap-3 mt-3">
        {!report.lastRun ? (
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-[#94A3B8]" />
            <span className="text-[12px] text-[#94A3B8]">Never run</span>
          </div>
        ) : report.lastRun.status === 'SUCCESS' ? (
          <>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-[#16A34A]" />
              <span className="text-[12px] text-[#16A34A]">Last run: {relativeTime(report.lastRun.executedAt)}</span>
            </div>
            {report.lastRun.recordCount != null && (
              <span className="text-[11px] text-[#64748B] ml-auto shrink-0">
                {Number(report.lastRun.recordCount).toLocaleString()} records · {report.lastRun.fileSize}
              </span>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <XCircle size={13} className="text-[#DC2626]" />
            <span className="text-[12px] text-[#DC2626]">Last run failed: {relativeTime(report.lastRun.executedAt)}</span>
          </div>
        )}
      </div>

      <MiniDots runHistory={report.runHistory} />

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <RunProgressBar stage={runState.stage} recordCount={runState.recordCount} />
          ) : (
            <button onClick={() => onRunNow(report)}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1.5 transition-colors">
              <Play size={12} className="fill-white" /> Run & Export
            </button>
          )}
          {!isRunning && (
            <button onClick={() => onViewDetail(report)}
              className="border border-[#E2E8F0] text-[#64748B] px-3 py-1.5 rounded-lg text-[12px] flex items-center gap-1.5 hover:bg-[#F8FAFC] transition-colors">
              <History size={12} /> History
            </button>
          )}
        </div>
        {!isRunning && (
          <button onClick={() => onRunNow(report)}
            className="bg-[#EFF6FF] text-[#2563EB] px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1.5 hover:bg-[#DBEAFE] transition-colors">
            <Download size={12} /> Export
          </button>
        )}
      </div>
    </div>
  );
}

// ─── DetailDrawer ─────────────────────────────────────────────────────────────
function DetailDrawer({ report, onClose, onRunNow, runState }) {
  const { Icon, bg, color } = getIconConfig(report.category);
  const isRunning = !!runState;
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <motion.div initial={{ x: 480, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 480, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed right-0 top-0 h-full w-[460px] bg-white z-50 border-l border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-[#E2E8F0] px-6 py-4 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-[#0F172A] leading-tight">{report.name}</h2>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {report.lastRun?.status && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      report.lastRun.status === 'SUCCESS' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#FEE2E2] text-[#DC2626]'
                    }`}>{report.lastRun.status}</span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SCHEDULE_COLORS[report.schedule] || SCHEDULE_COLORS.Manual}`}>
                    {report.schedule}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section>
            <h3 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Report Details</h3>
            <p className="text-[13px] text-[#64748B] leading-relaxed mb-4">{report.description}</p>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-[#64748B] uppercase mb-1.5">Data Sources</p>
                <div className="flex flex-wrap gap-1.5">
                  {(report.dataSource || []).map(src => (
                    <span key={src} className="bg-[#EFF6FF] text-[#2563EB] text-[11px] font-medium px-2 py-0.5 rounded">{src}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#64748B] uppercase mb-1.5">Output Formats</p>
                <div className="flex gap-1.5">
                  {(report.outputFormats || ['CSV']).map(f => (
                    <span key={f} className="bg-[#F1F5F9] text-[#64748B] text-[11px] font-medium px-2 py-0.5 rounded">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-[#E2E8F0]" />

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Run History</h3>
              {(report.runHistory || []).length > 0 && (
                <span className="text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded-full">
                  {report.runHistory.length} run{report.runHistory.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {(report.runHistory || []).length === 0 ? (
              <div className="text-center py-8 text-[#94A3B8]">
                <History size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-[13px]">No runs yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {report.runHistory.map((run, idx) => (
                  <div key={idx} className="flex gap-3 pb-4 relative">
                    {idx < report.runHistory.length - 1 && (
                      <div className="absolute left-[9px] top-5 bottom-0 w-px bg-[#E2E8F0]" />
                    )}
                    <div className={`w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                      run.status === 'SUCCESS' ? 'bg-[#DCFCE7]' : 'bg-[#FEE2E2]'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${run.status === 'SUCCESS' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#0F172A]">
                        {new Date(run.executedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        {new Date(run.executedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        {[run.duration, run.recordCount != null && `${Number(run.recordCount).toLocaleString()} records`].filter(Boolean).join(' · ')}
                      </p>
                      {run.status === 'FAILED' && run.errorMessage && (
                        <p className="text-[11px] text-[#DC2626] mt-0.5">{run.errorMessage}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-[#F8FAFC] border-t border-[#E2E8F0] p-4 space-y-2">
          {isRunning ? (
            <RunProgressBar stage={runState.stage} recordCount={runState.recordCount} />
          ) : (
            <button onClick={() => onRunNow(report)}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors">
              <Play size={14} className="fill-white" /> Run & Export CSV
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PMOReports() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Reports', 'read');

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery]       = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeStatusFilter, setActiveStatusFilter] = useState(null);
  const [runningReports, setRunningReports] = useState({});
  const [moreMenu, setMoreMenu]             = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      if (!canRead) return;
      try {
        const res = await pmoAPI.getReports();
        setReports(res.data.data || []);
      } catch (err) {
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [canRead]);

  const successCount = reports.filter(r => r.lastRun?.status === 'SUCCESS').length;
  const failedCount  = reports.filter(r => r.lastRun?.status === 'FAILED').length;

  const filteredReports = reports.filter(r => {
    if (activeCategory !== 'All' && r.category !== activeCategory) return false;
    if (activeStatusFilter && r.lastRun?.status !== activeStatusFilter) return false;
    const q = searchQuery.toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
  });

  // ── Run handler: visual animation + real API call + CSV download ──
  const handleRunNow = async (report) => {
    const id = report._id;
    if (runningReports[id]) return;

    setRunningReports(prev => ({ ...prev, [id]: { stage: 0, recordCount: null } }));
    const stageTimers = [1, 2, 3].map(s =>
      setTimeout(() => {
        setRunningReports(prev => {
          const cur = prev[id];
          if (!cur || cur.stage >= 4) return prev;
          return { ...prev, [id]: { ...cur, stage: s } };
        });
      }, s * 800)
    );

    try {
      let data = [];
      let filename = 'report.csv';

      if (report._id === 'r1') {
        const res = await pmoAPI.getProjectHealth();
        data = (res.data.data || []).map(p => ({
          ProjectName: p.name, Health: p.health,
          TotalTasks: p.metrics?.totalTasks || 0,
          OverdueTasks: p.metrics?.overdueTasks || 0,
          BlockedTasks: p.metrics?.blockedTasks || 0,
          CompletionPercent: `${p.metrics?.completionPercent || 0}%`,
        }));
        filename = 'project_health.csv';
      } else if (report._id === 'r2') {
        const res = await pmoAPI.getTeam();
        data = (res.data.data || []).map(m => ({
          Name: m.user?.name, Designation: m.user?.designation,
          ActiveTasks: m.stats?.activeTasks || 0,
          CompletedTasks: m.stats?.completedTasks || 0,
          Workload: `${m.stats?.workload || 0}%`,
        }));
        filename = 'resource_utilization.csv';
      } else if (report._id === 'r3' || report._id === 'r4') {
        const res = await pmoAPI.getTasks({});
        data = (res.data.data || []).map(t => ({
          Title: t.title, Project: t.project?.name,
          Assignee: t.assignedTo?.name, Status: t.status,
          Priority: t.priority,
          DueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A',
        }));
        filename = report._id === 'r3' ? 'task_velocity.csv' : 'milestone_tracker.csv';
      } else if (report._id === 'r5') {
        const res = await pmoAPI.getInterns();
        data = (res.data.data || []).map(i => ({
          Name: i.user?.name, College: i.user?.college,
          Project: i.project?.name,
          Ratings: i.user?.performanceRatings?.length || 0,
          LatestRating: i.user?.performanceRatings?.at(-1)?.rating || '—',
        }));
        filename = 'intern_performance.csv';
      } else if (report._id === 'r6') {
        const res = await pmoAPI.getProjects();
        data = (res.data.data || []).map(p => ({
          Project: p.name, Status: p.status,
          Budget: p.budget || 0, Spent: p.budgetSpent || 0,
          Remaining: (p.budget || 0) - (p.budgetSpent || 0),
        }));
        filename = 'budget_utilization.csv';
      } else if (report._id === 'r7') {
        const res = await pmoAPI.getTasks({ status: 'Blocked' });
        data = (res.data.data || []).map(t => ({
          Title: t.title, Project: t.project?.name,
          Assignee: t.assignedTo?.name,
          BlockedReason: t.blockedReason || 'Unspecified',
          CreatedDate: new Date(t.createdAt).toLocaleDateString(),
        }));
        filename = 'blocker_resolution.csv';
      }

      stageTimers.forEach(clearTimeout);
      setRunningReports(prev => ({ ...prev, [id]: { stage: 4, recordCount: data.length } }));
      downloadCSV(data, filename);
      toast.success('Report exported successfully!');

      setTimeout(() => {
        setRunningReports(prev => { const n = { ...prev }; delete n[id]; return n; });
      }, 2000);

    } catch {
      stageTimers.forEach(clearTimeout);
      setRunningReports(prev => ({ ...prev, [id]: { stage: 5, recordCount: null } }));
      toast.error('Failed to generate report');
      setTimeout(() => {
        setRunningReports(prev => { const n = { ...prev }; delete n[id]; return n; });
      }, 2000);
    }
  };

  if (!canRead) return <PageWrapper><AccessDenied message="You don't have permission to view reports." /></PageWrapper>;

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] w-full flex flex-col gap-5 pb-12 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">PMO Reports</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">Run and export project performance reports from live data.</p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl px-6 py-3 flex items-center overflow-x-auto shadow-sm">
          <div className="flex items-center gap-2.5 px-4 shrink-0">
            <BarChart2 size={18} className="text-[#2563EB]" />
            <div>
              <div className="text-xl font-bold text-[#0F172A]">{reports.length}</div>
              <div className="text-[11px] text-[#64748B]">Total Reports</div>
            </div>
          </div>
          <div className="w-px h-8 bg-[#E2E8F0] mx-1 shrink-0" />
          <button
            onClick={() => setActiveStatusFilter(f => f === 'SUCCESS' ? null : 'SUCCESS')}
            className={`flex items-center gap-2.5 px-4 shrink-0 rounded-lg py-1 transition-colors ${activeStatusFilter === 'SUCCESS' ? 'bg-[#F0FDF4]' : 'hover:bg-[#F8FAFC]'}`}
          >
            <CheckCircle2 size={18} className="text-[#16A34A]" />
            <div className="text-left">
              <div className="text-xl font-bold text-[#16A34A]">{successCount}</div>
              <div className="text-[11px] text-[#64748B]">Successful</div>
            </div>
          </button>
          <div className="w-px h-8 bg-[#E2E8F0] mx-1 shrink-0" />
          <button
            onClick={() => setActiveStatusFilter(f => f === 'FAILED' ? null : 'FAILED')}
            className={`flex items-center gap-2.5 px-4 shrink-0 rounded-lg py-1 transition-colors ${activeStatusFilter === 'FAILED' ? 'bg-[#FEF2F2]' : 'hover:bg-[#F8FAFC]'}`}
          >
            <XCircle size={18} className="text-[#DC2626]" />
            <div className="text-left">
              <div className="flex items-center gap-1">
                <span className="text-xl font-bold text-[#DC2626]">{failedCount}</span>
                {failedCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />}
              </div>
              <div className="text-[11px] text-[#64748B]">Failed</div>
            </div>
          </button>
          <div className="w-px h-8 bg-[#E2E8F0] mx-1 shrink-0" />
          <div className="flex items-center gap-2.5 px-4 shrink-0">
            <CalendarDays size={18} className="text-[#D97706]" />
            <div>
              <div className="text-xl font-bold text-[#D97706]">CSV</div>
              <div className="text-[11px] text-[#64748B]">Export Format</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reports by name or description..."
              className="w-full bg-white border border-[#E2E8F0] rounded-lg pl-11 pr-10 py-2.5 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] transition-colors" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]">
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat ? 'bg-[#2563EB] text-white' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}>
                {cat}
              </button>
            ))}
            {activeStatusFilter && (
              <button onClick={() => setActiveStatusFilter(null)}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap bg-[#FEE2E2] text-[#DC2626] flex items-center gap-1">
                <X size={11} /> {activeStatusFilter}
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredReports.map(report => (
              <ReportCard
                key={report._id}
                report={report}
                runState={runningReports[report._id] || null}
                onRunNow={handleRunNow}
                onViewDetail={setSelectedReport}
                moreMenuOpen={moreMenu === report._id}
                onMoreMenuToggle={(id) => setMoreMenu(m => m === id ? null : id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-xl py-20 flex flex-col items-center justify-center text-center">
            <Search size={40} className="text-[#CBD5E1] mb-3" />
            <p className="text-[15px] font-medium text-[#0F172A] mb-1">No reports found</p>
            <p className="text-[13px] text-[#64748B] mb-4">Try adjusting your search or category filter.</p>
            <button onClick={() => { setSearchQuery(''); setActiveCategory('All'); setActiveStatusFilter(null); }}
              className="text-[#2563EB] text-[13px] hover:underline">Clear filters</button>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedReport && (
          <DetailDrawer
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onRunNow={handleRunNow}
            runState={runningReports[selectedReport._id] || null}
          />
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
