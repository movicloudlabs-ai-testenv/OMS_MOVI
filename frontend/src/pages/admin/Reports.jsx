import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, Play, Download, Clock, History, MoreVertical,
  CheckCircle2, XCircle, AlertCircle, RefreshCw, Plus,
  Users, Shield, ScrollText, Briefcase, CheckSquare,
  Search, X, CalendarDays, Zap, HardDrive,
  Eye, Archive, Copy, Trash2, Building2, ShieldX,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'All', 'User Reports', 'Department Reports', 'Role Reports',
  'Security Reports', 'Audit Reports', 'Project Reports', 'Task Reports',
];

const ICON_CONFIG = {
  'User Reports':       { Icon: Users,       bg: 'bg-[#DBEAFE]', color: 'text-[#2563EB]' },
  'Department Reports': { Icon: Building2,   bg: 'bg-[#EDE9FE]', color: 'text-[#7C3AED]' },
  'Role Reports':       { Icon: Shield,      bg: 'bg-[#D1FAE5]', color: 'text-[#065F46]' },
  'Permission Reports': { Icon: Shield,      bg: 'bg-[#D1FAE5]', color: 'text-[#065F46]' },
  'Security Reports':   { Icon: ShieldX,     bg: 'bg-[#FEE2E2]', color: 'text-[#DC2626]' },
  'Audit Reports':      { Icon: ScrollText,  bg: 'bg-[#F1F5F9]', color: 'text-[#64748B]' },
  'Project Reports':    { Icon: Briefcase,   bg: 'bg-[#FEF3C7]', color: 'text-[#D97706]' },
  'Task Reports':       { Icon: CheckSquare, bg: 'bg-[#DCFCE7]', color: 'text-[#16A34A]' },
};

const SCHEDULE_COLORS = {
  Daily:   'bg-[#DBEAFE] text-[#2563EB]',
  Weekly:  'bg-[#EDE9FE] text-[#7C3AED]',
  Monthly: 'bg-[#D1FAE5] text-[#065F46]',
  Manual:  'bg-[#F1F5F9] text-[#64748B]',
};

const RUN_STAGES = [
  { key: 'queued',      label: '⏳ Queued...',             color: 'text-[#D97706]', barColor: 'bg-[#D97706]', trackBg: 'bg-[#FEF3C7]', progress: 5  },
  { key: 'querying',   label: '🔍 Querying database...', color: 'text-[#2563EB]', barColor: 'bg-[#2563EB]', trackBg: 'bg-[#DBEAFE]', progress: 30 },
  { key: 'formatting', label: '⚙ Formatting output...',  color: 'text-[#7C3AED]', barColor: 'bg-[#7C3AED]', trackBg: 'bg-[#EDE9FE]', progress: 65 },
  { key: 'generating', label: '📄 Generating file...',    color: 'text-[#16A34A]', barColor: 'bg-[#16A34A]', trackBg: 'bg-[#DCFCE7]', progress: 85 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getIconConfig(category) {
  return ICON_CONFIG[category] || { Icon: BarChart2, bg: 'bg-[#F1F5F9]', color: 'text-[#64748B]' };
}

function getHealthBorder(lastRun) {
  if (!lastRun) return 'border-l-[#E2E8F0]';
  if (lastRun.status === 'SUCCESS') return 'border-l-[#16A34A]';
  if (lastRun.status === 'FAILED')  return 'border-l-[#DC2626]';
  if (lastRun.status === 'PENDING') return 'border-l-[#D97706]';
  return 'border-l-[#E2E8F0]';
}

function relativeTime(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
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

function formatNextRun(dateStr) {
  if (!dateStr) return null;
  const date     = new Date(dateStr);
  const now      = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (date.toDateString() === now.toDateString())       return `Tonight at ${time}`;
  if (date.toDateString() === tomorrow.toDateString())  return `Tomorrow at ${time}`;
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  return `${dayName} at ${time}`;
}

function useDebounce(value, ms) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return deb;
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 border-l-4 border-l-[#E2E8F0] animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E2E8F0]" />
          <div className="space-y-1.5">
            <div className="h-4 w-40 bg-[#E2E8F0] rounded" />
            <div className="h-3 w-16 bg-[#E2E8F0] rounded" />
          </div>
        </div>
        <div className="h-5 w-16 bg-[#E2E8F0] rounded-full" />
      </div>
      <div className="space-y-1.5 mb-4">
        <div className="h-3 w-full bg-[#E2E8F0] rounded" />
        <div className="h-3 w-3/4 bg-[#E2E8F0] rounded" />
      </div>
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-[#E2E8F0]" />
        ))}
      </div>
      <div className="flex gap-2 pt-3 border-t border-[#E2E8F0]">
        <div className="h-8 w-20 bg-[#E2E8F0] rounded-lg" />
        <div className="h-8 w-24 bg-[#E2E8F0] rounded-lg" />
        <div className="h-8 w-24 bg-[#E2E8F0] rounded-lg ml-auto" />
      </div>
    </div>
  );
}

// ─── MiniDots ─────────────────────────────────────────────────────────────────
function MiniDots({ runHistory }) {
  const recent7  = (runHistory || []).slice(0, 7).reverse();
  const empties  = Math.max(0, 7 - recent7.length);
  const dotsData = [...Array(empties).fill(null), ...recent7];

  return (
    <div className="flex gap-1 mt-2">
      {dotsData.map((run, i) => {
        const color = !run ? 'bg-[#E2E8F0]'
          : run.status === 'SUCCESS' ? 'bg-[#16A34A]'
          : run.status === 'FAILED'  ? 'bg-[#DC2626]'
          : 'bg-[#D97706]';

        return (
          <div key={i} className="relative group">
            <div className={`w-2 h-2 rounded-full ${color} cursor-default`} />
            {run && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-[#0F172A] text-white text-[10px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                {new Date(run.executedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' · '}{run.status}
                {run.duration ? ` · ${run.duration}` : ''}
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
  // stage: 0-3 = animation stages, 4 = done, 5 = failed
  const isDone   = stage === 4;
  const isFailed = stage === 5;
  const current  = isDone || isFailed ? null : RUN_STAGES[stage] || RUN_STAGES[0];
  const progress = isDone ? 100 : isFailed ? 100 : (current?.progress ?? 5);
  const barColor = isFailed ? 'bg-[#DC2626]' : (isDone ? 'bg-[#16A34A]' : current?.barColor);

  return (
    <div className={`rounded-lg px-3 py-2 text-xs w-full ${isFailed ? 'bg-[#FEE2E2]' : isDone ? 'bg-[#DCFCE7]' : current?.trackBg}`}>
      {isDone ? (
        <div className="flex items-center gap-1.5 text-[#16A34A] font-medium">
          <CheckCircle2 size={13} />
          <span>Complete!{recordCount != null ? ` ${Number(recordCount).toLocaleString()} records` : ''}</span>
        </div>
      ) : isFailed ? (
        <div className="flex items-center gap-1.5 text-[#DC2626] font-medium">
          <XCircle size={13} />
          <span>Failed. Try again.</span>
        </div>
      ) : (
        <div className={`font-medium mb-1.5 ${current?.color}`}>{current?.label}</div>
      )}
      <div className="h-1 bg-white/50 rounded-full overflow-hidden mt-1">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ─── ExportDropdown ───────────────────────────────────────────────────────────
function ExportDropdown({ report, onExport, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const formats = [
    { fmt: 'pdf',  label: 'PDF',  icon: '📄', size: report.fileSizes?.pdf  || '—' },
    { fmt: 'xlsx', label: 'XLSX', icon: '📊', size: report.fileSizes?.xlsx || '—' },
    { fmt: 'csv',  label: 'CSV',  icon: '📝', size: report.fileSizes?.csv  || '—' },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.12 }}
      className="absolute right-0 top-full mt-1.5 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-30 min-w-[200px]"
    >
      {formats.map(({ fmt, label, icon, size }) => (
        <button
          key={fmt}
          onClick={() => { onExport(report._id, fmt); onClose(); }}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left text-[13px] hover:bg-[#F8FAFC] transition-colors first:rounded-t-lg last:rounded-b-lg"
        >
          <span className="flex items-center gap-2 text-[#0F172A] font-medium">
            <span>{icon}</span>{label}
          </span>
          <span className="text-[11px] text-[#94A3B8]">{size}</span>
        </button>
      ))}
    </motion.div>
  );
}

// ─── MoreMenu ─────────────────────────────────────────────────────────────────
function MoreMenu({ report, onView, onDelete, onArchive, canCreate, canSchedule, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items = [
    { icon: Eye,     label: 'View Details',   action: onView,    always: true },
    { icon: Clock,   label: 'Edit Schedule',  action: () => toast('Schedule editing coming soon'), show: canSchedule },
    { icon: Copy,    label: 'Duplicate',      action: () => toast('Duplicate coming soon'),        show: canCreate },
    { icon: Archive, label: 'Archive',        action: onArchive, show: canCreate },
    { icon: Trash2,  label: 'Delete',         action: onDelete,  show: canCreate, danger: true },
  ].filter(item => item.always || item.show);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.12 }}
      className="absolute right-0 top-full mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-30 min-w-[160px] py-1"
    >
      {items.map(({ icon: Icon, label, action, danger }) => (
        <button
          key={label}
          onClick={() => { action(); onClose(); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-[#F8FAFC] ${danger ? 'text-[#DC2626]' : 'text-[#0F172A]'}`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </motion.div>
  );
}

// ─── ReportCard ───────────────────────────────────────────────────────────────
function ReportCard({
  report, runState, onRunNow, onExport, onViewDetail,
  onDelete, onArchive, exportDropdownOpen, onExportToggle,
  moreMenuOpen, onMoreMenuToggle, canExport, canCreate, canSchedule,
}) {
  const { Icon, bg, color } = getIconConfig(report.category);
  const healthBorder = getHealthBorder(report.lastRun);
  const isRunning    = !!runState;
  const nextRunStr   = formatNextRun(report.nextRun);

  return (
    <div
      className={`bg-white rounded-xl border border-[#E2E8F0] border-l-4 ${healthBorder} p-5 hover:shadow-md hover:border-[#EA580C] transition-all duration-200 cursor-pointer flex flex-col gap-0`}
      onClick={() => onViewDetail(report)}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
            <Icon size={18} className={color} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[14px] font-semibold text-[#0F172A] truncate">{report.name}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${report.type === 'custom' ? 'bg-orange-50 text-[#EA580C]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                {report.type === 'custom' ? 'CUSTOM' : 'SYSTEM'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${SCHEDULE_COLORS[report.schedule] || SCHEDULE_COLORS.Manual}`}>
            {report.schedule}
          </span>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onMoreMenuToggle(report._id)}
              className="p-1 rounded text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              <MoreVertical size={15} />
            </button>
            <AnimatePresence>
              {moreMenuOpen && (
                <MoreMenu
                  report={report}
                  onView={() => onViewDetail(report)}
                  onDelete={() => onDelete(report)}
                  onArchive={() => onArchive(report)}
                  canCreate={canCreate}
                  canSchedule={canSchedule}
                  onClose={() => onMoreMenuToggle(null)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Description ── */}
      <p className="text-[12px] text-[#64748B] mt-2 line-clamp-2 leading-relaxed">
        {report.description}
      </p>

      {/* ── Last run status ── */}
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
        ) : report.lastRun.status === 'FAILED' ? (
          <div className="flex items-center gap-1.5">
            <XCircle size={13} className="text-[#DC2626]" />
            <span className="text-[12px] text-[#DC2626]">Last run failed: {relativeTime(report.lastRun.executedAt)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <RefreshCw size={13} className="text-[#D97706] animate-spin" />
            <span className="text-[12px] text-[#D97706]">Running now...</span>
          </div>
        )}
      </div>

      {/* ── Mini history dots ── */}
      <MiniDots runHistory={report.runHistory || []} />

      {/* ── Next run ── */}
      {nextRunStr && report.schedule !== 'Manual' && (
        <div className="flex items-center gap-1.5 mt-2">
          <CalendarDays size={11} className="text-[#94A3B8]" />
          <span className="text-[11px] text-[#64748B]">Next: {nextRunStr}</span>
        </div>
      )}

      {/* ── Footer ── */}
      <div
        className="mt-3 pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {/* Run Now */}
          {isRunning ? (
            <RunProgressBar stage={runState.stage} recordCount={runState.recordCount} />
          ) : (
            <button
              onClick={() => onRunNow(report)}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Play size={12} className="fill-white" /> Run
            </button>
          )}

          {/* History */}
          {!isRunning && (
            <button
              onClick={() => onViewDetail(report)}
              className="border border-[#E2E8F0] text-[#64748B] px-3 py-1.5 rounded-lg text-[12px] flex items-center gap-1.5 hover:bg-[#F8FAFC] transition-colors"
            >
              <History size={12} /> History
            </button>
          )}
        </div>

        {/* Export */}
        {canExport && !isRunning && (
          <div className="relative">
            <button
              onClick={() => onExportToggle(report._id)}
              className="bg-orange-50 text-[#EA580C] px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1.5 hover:bg-[#DBEAFE] transition-colors"
            >
              <Download size={12} /> Export
            </button>
            <AnimatePresence>
              {exportDropdownOpen && (
                <ExportDropdown
                  report={report}
                  onExport={onExport}
                  onClose={() => onExportToggle(null)}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DetailDrawer ─────────────────────────────────────────────────────────────
function DetailDrawer({ report, onClose, onRunNow, onExport, runState, canExport }) {
  const { Icon, bg, color } = getIconConfig(report.category);
  const isRunning = !!runState;
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: 480, opacity: 0 }}
        animate={{ x: 0,   opacity: 1 }}
        exit={{ x: 480,    opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed right-0 top-0 h-full w-[480px] bg-white z-50 border-l border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden"
      >
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
                      report.lastRun.status === 'SUCCESS' ? 'bg-[#DCFCE7] text-[#16A34A]' :
                      report.lastRun.status === 'FAILED'  ? 'bg-[#FEE2E2] text-[#DC2626]' :
                      'bg-[#FEF3C7] text-[#D97706]'
                    }`}>
                      {report.lastRun.status}
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SCHEDULE_COLORS[report.schedule] || SCHEDULE_COLORS.Manual}`}>
                    {report.schedule}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] uppercase">
                    {report.type}
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

          {/* Report Details */}
          <section>
            <h3 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Report Details</h3>
            <p className="text-[13px] text-[#64748B] leading-relaxed mb-4">{report.description}</p>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-[#64748B] uppercase mb-1.5">Data Sources</p>
                <div className="flex flex-wrap gap-1.5">
                  {(report.dataSource || []).map(src => (
                    <span key={src} className="bg-orange-50 text-[#EA580C] text-[11px] font-medium px-2 py-0.5 rounded">
                      {src}
                    </span>
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
              {report.parameters && (
                <div>
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase mb-1">Parameters</p>
                  <p className="text-[13px] text-[#64748B]">{report.parameters}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] font-semibold text-[#64748B] uppercase mb-1">Created</p>
                <p className="text-[13px] text-[#64748B]">
                  {report.createdAt
                    ? new Date(report.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '—'}
                </p>
              </div>
            </div>
          </section>

          <div className="border-t border-[#E2E8F0]" />

          {/* Run History */}
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
                    {/* Timeline line */}
                    {idx < report.runHistory.length - 1 && (
                      <div className="absolute left-[9px] top-5 bottom-0 w-px bg-[#E2E8F0]" />
                    )}
                    {/* Dot */}
                    <div className={`w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                      run.status === 'SUCCESS' ? 'bg-[#DCFCE7]' :
                      run.status === 'FAILED'  ? 'bg-[#FEE2E2]' :
                      'bg-[#FEF3C7]'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        run.status === 'SUCCESS' ? 'bg-[#16A34A]' :
                        run.status === 'FAILED'  ? 'bg-[#DC2626]' :
                        'bg-[#D97706]'
                      }`} />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#0F172A]">
                        {new Date(run.executedAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                        {' · '}
                        {new Date(run.executedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        {[run.duration, run.recordCount != null && `${Number(run.recordCount).toLocaleString()} records`, run.fileSize]
                          .filter(Boolean).join(' · ')}
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

        {/* Quick Actions (sticky footer) */}
        <div className="shrink-0 bg-[#F8FAFC] border-t border-[#E2E8F0] p-4 space-y-2">
          {isRunning ? (
            <RunProgressBar stage={runState.stage} recordCount={runState.recordCount} />
          ) : (
            <button
              onClick={() => onRunNow(report)}
              className="w-full bg-[#EA580C] hover:bg-[#C2410C] text-white py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Play size={14} className="fill-white" /> Run Now
            </button>
          )}
          {canExport && (
            <div className="relative">
              <button
                onClick={() => setExportOpen(o => !o)}
                className="w-full border border-[#E2E8F0] bg-white text-[#0F172A] py-2 rounded-lg text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-[#F1F5F9] transition-colors"
              >
                <Download size={14} /> Export Latest
              </button>
              <AnimatePresence>
                {exportOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-1">
                    <ExportDropdown
                      report={report}
                      onExport={onExport}
                      onClose={() => setExportOpen(false)}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminReports() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canRead     = hasPermission('Reports', 'read');
  const canExport   = hasPermission('Reports', 'export');
  const canCreate   = hasPermission('Reports', 'create');
  const canSchedule = hasPermission('Reports', 'schedule');

  // Data
  const [reports, setReports]   = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [pagination, setPagination] = useState({});

  // Filters
  const [searchQuery, setSearchQuery]         = useState('');
  const [activeCategory, setActiveCategory]   = useState('All');
  const [activeStatusFilter, setActiveStatusFilter] = useState(null); // 'SUCCESS'|'FAILED'|null
  const debouncedSearch = useDebounce(searchQuery, 300);

  // UI State
  const [runningReports, setRunningReports] = useState({});   // { id: { stage, runId, recordCount } }
  const [exportDropdown, setExportDropdown] = useState(null); // reportId or null
  const [moreMenu, setMoreMenu]             = useState(null); // reportId or null
  const [selectedReport, setSelectedReport] = useState(null); // for drawer

  // ── Fetch ──
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getReports({
        search:   debouncedSearch || undefined,
        category: activeCategory !== 'All' ? activeCategory : undefined,
        limit:    50,
      });
      const { reports: list, stats: s, pagination: p } = res.data?.data || {};
      setReports(list || []);
      setStats(s || null);
      setPagination(p || {});
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, activeCategory]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Derived filtered list ──
  const filteredReports = reports.filter(r => {
    if (activeStatusFilter && r.lastRun?.status !== activeStatusFilter) return false;
    return true;
  });

  // ── Run simulation ──
  const handleRunNow = async (report) => {
    const id = report._id;
    if (runningReports[id]) return; // already running

    // Start visual simulation
    setRunningReports(prev => ({ ...prev, [id]: { stage: 0, runId: null, recordCount: null } }));

    // Auto-advance stages 0→3 every 800ms
    const stageTimers = [1, 2, 3].map(stageIdx =>
      setTimeout(() => {
        setRunningReports(prev => {
          const cur = prev[id];
          if (!cur || cur.stage >= 4) return prev;
          return { ...prev, [id]: { ...cur, stage: stageIdx } };
        });
      }, stageIdx * 800)
    );

    try {
      const res    = await adminAPI.triggerRun(id);
      const runId  = res.data?.data?.runId;
      setRunningReports(prev => ({ ...prev, [id]: { ...prev[id], runId } }));

      // Poll for real status
      const poll = setInterval(async () => {
        try {
          const statusRes = await adminAPI.getRunStatus(id, runId);
          const { status, recordCount } = statusRes.data?.data || {};
          if (status === 'SUCCESS') {
            clearInterval(poll);
            stageTimers.forEach(clearTimeout);
            setRunningReports(prev => ({ ...prev, [id]: { stage: 4, runId, recordCount } }));
            // Refresh and revert after 2s
            setTimeout(() => {
              setRunningReports(prev => { const n = { ...prev }; delete n[id]; return n; });
              fetchReports();
              // Update selectedReport if drawer is open for this report
              setSelectedReport(prev => prev?._id === id ? null : prev);
            }, 2000);
          } else if (status === 'FAILED') {
            clearInterval(poll);
            stageTimers.forEach(clearTimeout);
            setRunningReports(prev => ({ ...prev, [id]: { stage: 5, runId, recordCount: null } }));
            setTimeout(() => {
              setRunningReports(prev => { const n = { ...prev }; delete n[id]; return n; });
            }, 2000);
          }
        } catch {
          // ignore poll errors
        }
      }, 2000);
    } catch {
      stageTimers.forEach(clearTimeout);
      setRunningReports(prev => ({ ...prev, [id]: { stage: 5, runId: null, recordCount: null } }));
      toast.error('Failed to start report run');
      setTimeout(() => {
        setRunningReports(prev => { const n = { ...prev }; delete n[id]; return n; });
      }, 2000);
    }
  };

  // ── Export ──
  const handleExport = async (reportId, format) => {
    try {
      const res = await adminAPI.exportReportFile(reportId, format);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a');
      a.href    = url;
      a.setAttribute('download', `report-${reportId}-${Date.now()}.${format}`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloading ${format.toUpperCase()} report…`);
    } catch {
      toast.error('Export failed. Please try again.');
    }
  };

  // ── Delete ──
  const handleDelete = async (report) => {
    if (!window.confirm(`Delete "${report.name}"? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteReport(report._id);
      toast.success('Report deleted');
      fetchReports();
      if (selectedReport?._id === report._id) setSelectedReport(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  // ── Archive ──
  const handleArchive = async (report) => {
    if (!window.confirm(`Archive "${report.name}"?`)) return;
    try {
      await adminAPI.archiveReport(report._id);
      toast.success('Report archived');
      fetchReports();
      if (selectedReport?._id === report._id) setSelectedReport(null);
    } catch {
      toast.error('Archive failed');
    }
  };

  // ── Permission gate ──
  if (!canRead) {
    return <AdminLayout title="Reports"><AccessDenied message="You don't have permission to view reports." /></AdminLayout>;
  }

  return (
    <AdminLayout
      title="Reports"
      subtitle="Monitor, run, and export administrative reports from live system data."
      actions={(
        <button
          onClick={fetchReports}
          className="border border-[#E2E8F0] bg-white text-[#0F172A] px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      )}
    >
      <div className="font-sans text-[#0F172A] w-full flex flex-col gap-5 pb-2 max-w-[1400px] mx-auto">

        {/* ── Stats Bar ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl px-6 py-3 flex items-center gap-0 overflow-x-auto shadow-sm">
          {loading && !stats ? (
            <div className="flex gap-6 w-full">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  {i > 0 && <div className="w-px h-8 bg-[#E2E8F0] shrink-0" />}
                  <div className="space-y-1.5">
                    <div className="h-6 w-12 bg-[#E2E8F0] rounded" />
                    <div className="h-3 w-20 bg-[#E2E8F0] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats ? (
            <>
              {/* Total */}
              <div className="flex items-center gap-2.5 px-4 shrink-0">
                <BarChart2 size={18} className="text-orange-600" />
                <div>
                  <div className="text-xl font-bold text-[#0F172A]">{stats.total}</div>
                  <div className="text-[11px] text-[#64748B]">Total Reports</div>
                </div>
              </div>
              <div className="w-px h-8 bg-[#E2E8F0] mx-1 shrink-0" />

              {/* Success */}
              <button
                onClick={() => setActiveStatusFilter(f => f === 'SUCCESS' ? null : 'SUCCESS')}
                className={`flex items-center gap-2.5 px-4 shrink-0 rounded-lg py-1 transition-colors ${activeStatusFilter === 'SUCCESS' ? 'bg-[#F0FDF4]' : 'hover:bg-[#F8FAFC]'}`}
              >
                <CheckCircle2 size={18} className="text-[#16A34A]" />
                <div className="text-left">
                  <div className="text-xl font-bold text-[#16A34A]">{stats.successLast24h}</div>
                  <div className="text-[11px] text-[#64748B]">Successful (24h)</div>
                </div>
              </button>
              <div className="w-px h-8 bg-[#E2E8F0] mx-1 shrink-0" />

              {/* Failed */}
              <button
                onClick={() => setActiveStatusFilter(f => f === 'FAILED' ? null : 'FAILED')}
                className={`flex items-center gap-2.5 px-4 shrink-0 rounded-lg py-1 transition-colors ${activeStatusFilter === 'FAILED' ? 'bg-[#FEF2F2]' : 'hover:bg-[#F8FAFC]'}`}
              >
                <XCircle size={18} className="text-[#DC2626]" />
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-bold text-[#DC2626]">{stats.failed}</span>
                    {stats.failed > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />
                    )}
                  </div>
                  <div className="text-[11px] text-[#64748B]">Failed</div>
                </div>
              </button>
              <div className="w-px h-8 bg-[#E2E8F0] mx-1 shrink-0" />

              {/* Scheduled Today */}
              <div className="flex items-center gap-2.5 px-4 shrink-0">
                <Zap size={18} className="text-[#D97706]" />
                <div>
                  <div className="text-xl font-bold text-[#D97706]">{stats.scheduledToday}</div>
                  <div className="text-[11px] text-[#64748B]">Scheduled Today</div>
                </div>
              </div>
              <div className="w-px h-8 bg-[#E2E8F0] mx-1 shrink-0" />

              {/* Storage */}
              <div className="flex items-center gap-2.5 px-4 shrink-0">
                <HardDrive size={18} className="text-[#64748B]" />
                <div>
                  <div className="text-xl font-bold text-[#64748B]">{stats.storageUsed}</div>
                  <div className="text-[11px] text-[#64748B]">Storage Used</div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* ── Toolbar ── */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reports by name, category, or data source..."
              className="w-full bg-white border border-[#E2E8F0] rounded-lg pl-11 pr-10 py-2.5 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#EA580C] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Category Tabs + Actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1 overflow-x-auto">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? 'bg-[#EA580C] text-white'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {cat}
                </button>
              ))}
              {activeStatusFilter && (
                <button
                  onClick={() => setActiveStatusFilter(null)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap bg-[#FEE2E2] text-[#DC2626] flex items-center gap-1"
                >
                  <X size={11} /> {activeStatusFilter}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canSchedule && (
                <button
                  onClick={() => toast('Scheduled reports panel coming soon')}
                  className="border border-[#E2E8F0] text-[#0F172A] px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-1.5"
                >
                  <Clock size={13} /> Schedule
                </button>
              )}
              {canCreate && (
                <button
                  onClick={() => navigate('/admin/reports/new')}
                  className="bg-[#EA580C] text-white px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-[#EA580C] transition-colors flex items-center gap-1.5"
                >
                  <Plus size={13} /> Create Custom Report
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Report Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredReports.map(report => (
              <ReportCard
                key={report._id}
                report={report}
                runState={runningReports[report._id] || null}
                onRunNow={handleRunNow}
                onExport={handleExport}
                onViewDetail={setSelectedReport}
                onDelete={handleDelete}
                onArchive={handleArchive}
                exportDropdownOpen={exportDropdown === report._id}
                onExportToggle={(id) => setExportDropdown(d => d === id ? null : id)}
                moreMenuOpen={moreMenu === report._id}
                onMoreMenuToggle={(id) => setMoreMenu(m => m === id ? null : id)}
                canExport={canExport}
                canCreate={canCreate}
                canSchedule={canSchedule}
              />
            ))}
          </div>
        ) : (
          /* ── Empty State ── */
          <div className="bg-white border border-[#E2E8F0] rounded-xl py-20 flex flex-col items-center justify-center text-center">
            {reports.length === 0 ? (
              <>
                <BarChart2 size={48} className="text-[#CBD5E1] mb-4" />
                <p className="text-lg font-medium text-[#0F172A] mb-1">No reports yet</p>
                <p className="text-[13px] text-[#64748B] mb-5">Create your first custom report to get started.</p>
                {canCreate && (
                  <button
                    onClick={() => navigate('/admin/reports/new')}
                    className="bg-[#EA580C] text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#EA580C] transition-colors flex items-center gap-2"
                  >
                    <Plus size={14} /> Create Custom Report
                  </button>
                )}
              </>
            ) : (
              <>
                <Search size={40} className="text-[#CBD5E1] mb-3" />
                <p className="text-lg font-medium text-[#0F172A] mb-1">No reports found</p>
                <p className="text-[13px] text-[#64748B] mb-4">Try adjusting your search or category filter.</p>
                <button
                  onClick={() => { setSearchQuery(''); setActiveCategory('All'); setActiveStatusFilter(null); }}
                  className="text-[#EA580C] text-[13px] hover:underline"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        )}

      </div>

      {/* ── Detail Drawer ── */}
      <AnimatePresence>
        {selectedReport && (
          <DetailDrawer
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onRunNow={handleRunNow}
            onExport={handleExport}
            runState={runningReports[selectedReport._id] || null}
            canExport={canExport}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
