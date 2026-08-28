import { useState, useEffect } from 'react';
import PageWrapper from '../../components/PageWrapper';
import {
  Play, FileText, ExternalLink, GraduationCap,
  CalendarDays, Clock, CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { internAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const urgencyClass = (dueDate) => {
  if (!dueDate) return 'text-[#64748B]';
  const diff = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return 'text-red-600';
  if (diff <= 3) return 'text-amber-600';
  return 'text-[#64748B]';
};

const TYPE_STYLE = {
  Video:    { icon: Play,          bg: 'bg-red-50',    color: 'text-red-600'    },
  Document: { icon: FileText,      bg: 'bg-blue-50',   color: 'text-blue-600'   },
  Link:     { icon: ExternalLink,  bg: 'bg-green-50',  color: 'text-green-600'  },
  Course:   { icon: GraduationCap, bg: 'bg-purple-50', color: 'text-purple-600' },
};

const STATUS_BADGE = {
  Pending:     'bg-slate-100 text-slate-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed:   'bg-green-100 text-green-700',
};

export default function InternLearning() {
  const [data,       setData]       = useState({ progress: 0, total: 0, completed: 0, resources: [] });
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('All');
  const [updating,   setUpdating]   = useState(null);
  const [justDone,   setJustDone]   = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await internAPI.getLearningResources();
      const d = r.data?.data || r.data;
      setData({
        progress:  d?.progress  ?? 0,
        total:     d?.total     ?? 0,
        completed: d?.completed ?? 0,
        resources: d?.resources ?? (Array.isArray(d) ? d : []),
      });
    } catch { toast.error('Failed to load learning resources'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleStatus = async (id, status) => {
    setUpdating(id);
    try {
      await internAPI.updateLearningStatus(id, { status });
      if (status === 'Completed') {
        setJustDone(id);
        setTimeout(() => setJustDone(null), 2000);
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally { setUpdating(null); }
  };

  const resources = data.resources;
  const pending   = resources.filter(r => r.status !== 'Completed').length;
  const estMins   = resources.filter(r => r.status !== 'Completed').reduce((a, r) => a + (r.estimatedMinutes || 0), 0);

  const filtered = filter === 'All' ? resources : resources.filter(r => r.status === filter);

  return (
    <PageWrapper>
      <div className="w-full flex flex-col gap-6 max-w-[1200px] mx-auto pb-10 font-sans px-4 mt-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Learning Resources</h1>
            <p className="text-sm text-[#64748B] mt-1">Training materials assigned to you</p>
          </div>
          <div className="bg-[#DCFCE7] text-[#16A34A] px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm">
            <CheckCircle size={16} />
            {data.completed}/{data.total} completed
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Your Learning Progress</h2>
          <div className="w-full h-3 bg-blue-50 rounded-full overflow-hidden mb-3">
            <motion.div className="h-full bg-[#2563EB] rounded-full"
              initial={{ width: 0 }} animate={{ width: `${data.progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }} />
          </div>
          <div className="flex flex-col sm:flex-row justify-between text-sm">
            <p className="font-bold text-[#0F172A]">
              {data.progress}% complete &middot; <span className="text-[#64748B] font-normal">{data.completed} of {data.total} done</span>
            </p>
            <p className="text-[#64748B] mt-1 sm:mt-0">
              {pending} remaining &middot; <span className="font-bold">Est. {Math.round(estMins / 60)}h {estMins % 60}m</span>
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['All', 'Pending', 'In Progress', 'Completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${
                filter === f ? 'bg-[#2563EB] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex justify-center py-24">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence>
              {filtered.map(res => {
                const ts  = TYPE_STYLE[res.type] || TYPE_STYLE.Document;
                const Icon = ts.icon;
                const isUpdating = updating === res._id;
                const isDone     = justDone  === res._id;

                return (
                  <motion.div key={res._id} layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`relative bg-white rounded-xl border p-5 overflow-hidden transition-all ${
                      res.status === 'Completed' ? 'border-green-200' : 'border-[#E2E8F0] hover:border-[#2563EB] hover:shadow-sm'
                    }`}>

                    {/* Completion flash */}
                    <AnimatePresence>
                      {isDone && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-green-50/90 z-10 flex items-center justify-center backdrop-blur-sm rounded-xl">
                          <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.4 }}>
                            <CheckCircle size={56} className="text-green-500" />
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex justify-between items-start mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ts.bg} ${ts.color}`}>
                        <Icon size={20} />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${STATUS_BADGE[res.status] || STATUS_BADGE.Pending}`}>
                        {res.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#0F172A] leading-snug mb-1">{res.title}</h3>
                    {res.description && <p className="text-xs text-[#64748B] mb-2 line-clamp-2">{res.description}</p>}
                    <p className="text-xs text-[#64748B] mb-4">
                      Assigned by <span className="font-semibold text-[#0F172A]">{res.assignedBy?.name || '—'}</span>
                    </p>

                    <div className="flex items-center gap-4 mb-5 flex-wrap">
                      {res.dueDate && (
                        <div className="flex items-center gap-1.5">
                          <CalendarDays size={13} className={urgencyClass(res.dueDate)} />
                          <span className={`text-xs font-semibold ${urgencyClass(res.dueDate)}`}>{fmtDate(res.dueDate)}</span>
                        </div>
                      )}
                      {res.estimatedMinutes > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-[#64748B]" />
                          <span className="text-xs text-[#64748B]">{res.estimatedMinutes} mins</span>
                        </div>
                      )}
                      {res.status === 'Completed' && res.completedAt && (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <CheckCircle size={13} />
                          <span className="text-xs font-semibold">Done {fmtDate(res.completedAt)}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 flex-wrap">
                      {res.url && (
                        <a href={res.url} target="_blank" rel="noreferrer"
                          className="text-sm font-bold text-[#2563EB] border border-[#2563EB] hover:bg-[#EFF6FF] py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5">
                          <ExternalLink size={14} /> Open
                        </a>
                      )}
                      {res.status === 'Pending' && (
                        <button disabled={isUpdating} onClick={() => handleStatus(res._id, 'In Progress')}
                          className="bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
                          {isUpdating ? 'Updating…' : 'Start Learning'}
                        </button>
                      )}
                      {res.status === 'In Progress' && (
                        <button disabled={isUpdating} onClick={() => handleStatus(res._id, 'Completed')}
                          className="border border-green-500 text-green-600 hover:bg-green-50 text-sm font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
                          {isUpdating ? 'Saving…' : 'Mark Complete'}
                        </button>
                      )}
                      {res.status === 'Completed' && (
                        <span className="text-sm text-[#64748B] font-medium py-2">✓ Completed</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {filtered.length === 0 && !loading && (
              <div className="col-span-full py-16 text-center">
                <GraduationCap size={36} className="text-[#94A3B8] mx-auto mb-3" />
                <p className="text-sm font-bold text-[#0F172A]">No resources found</p>
                <p className="text-xs text-[#64748B] mt-1">
                  {filter === 'All' ? 'Your HR or PMO will assign learning materials here.' : `No ${filter} resources.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
