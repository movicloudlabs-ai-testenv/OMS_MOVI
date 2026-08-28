import { useState, useEffect, useRef } from 'react';
import PageWrapper from '../../components/PageWrapper';
import {
  Columns, List, CalendarDays, X, CheckCircle2, Circle,
  Paperclip, Download, UploadCloud, Search, AlertCircle,
  PlayCircle, Send, RefreshCw, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { employeeAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const COLUMNS = [
  { id: 'Todo',        title: 'To Do',       color: 'border-t-slate-400'  },
  { id: 'In Progress', title: 'In Progress',  color: 'border-t-blue-500'   },
  { id: 'In Review',   title: 'In Review',    color: 'border-t-purple-500' },
  { id: 'Done',        title: 'Done',         color: 'border-t-green-500'  },
];

const PRIORITY_STYLES = {
  Low:      { badge: 'bg-green-100 text-green-700',   dot: 'bg-green-500'  },
  Medium:   { badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500'  },
  High:     { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  Critical: { badge: 'bg-red-100 text-red-700',       dot: 'bg-red-500'    },
};

const fmtDate = (d) => {
  if (!d) return 'No due date';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const relTime = (d) => {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// ─── Task Detail Modal ────────────────────────────────────────────────────────
function TaskDetailModal({ task: initialTask, onClose, onStatusChange, onRefresh }) {
  const [task,        setTask]        = useState(initialTask);
  const [activeTab,   setActiveTab]   = useState('Subtasks');
  const [comment,     setComment]     = useState('');
  const [commenting,  setCommenting]  = useState(false);
  const [togglingId,  setTogglingId]  = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const fileRef = useRef(null);

  if (!task) return null;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done';
  const priStyle  = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium;

  const reload = async () => {
    try {
      const res = await employeeAPI.getTask(task._id);
      setTask(res.data?.data || res.data);
      onRefresh?.();
    } catch { /* silent */ }
  };

  const handleToggleSubtask = async (subtaskId) => {
    setTogglingId(subtaskId);
    try {
      await employeeAPI.toggleSubtask(task._id, subtaskId);
      await reload();
    } catch { toast.error('Failed to update subtask'); }
    finally { setTogglingId(null); }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setCommenting(true);
    try {
      await employeeAPI.addComment(task._id, { text: comment.trim() });
      setComment('');
      await reload();
      toast.success('Comment posted');
    } catch { toast.error('Failed to post comment'); }
    finally { setCommenting(false); }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Max file size is 10 MB'); return; }
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      await employeeAPI.uploadAttachment(task._id, fd);
      await reload();
      toast.success('File uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const completedCount = task.subtasks?.filter(s => s.completed).length || 0;
  const totalCount     = task.subtasks?.length || 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm font-sans">
        <motion.div
          className="absolute inset-0 cursor-pointer"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          initial={{ x: 640, opacity: 0 }}
          animate={{ x: 0,   opacity: 1 }}
          exit={{ x: 640, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col z-10 border-l border-slate-200"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${priStyle.badge}`}>
                  {task.priority || 'Medium'} Priority
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-slate-200 bg-white text-slate-600 flex items-center gap-1">
                  <RefreshCw size={11} /> {task.status}
                </span>
                {isOverdue  && <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-500 text-white animate-pulse">Overdue</span>}
                {task.status === 'Blocked' && <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">Blocked</span>}
              </div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{task.title}</h2>
              {task.project?.name && (
                <span className="inline-block mt-1.5 text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded">
                  {task.project.name}
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors shrink-0">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">

            {/* Left */}
            <div className="flex-[3] p-6 space-y-6 overflow-y-auto">
              {/* Description */}
              <section>
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Description</h3>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 leading-relaxed min-h-[72px]">
                  {task.description || <span className="italic text-slate-400">No description provided.</span>}
                </div>
              </section>

              {/* Tabs */}
              <section>
                <div className="flex border-b border-slate-200 mb-4 gap-1">
                  {['Subtasks', 'Comments', 'Attachments'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
                      {tab}
                      {tab === 'Subtasks' && totalCount > 0 && (
                        <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{completedCount}/{totalCount}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Subtasks */}
                {activeTab === 'Subtasks' && (
                  <div className="space-y-2">
                    {totalCount > 0 && (
                      <div className="mb-3">
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Progress</span><span>{completedCount}/{totalCount} complete</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }} />
                        </div>
                      </div>
                    )}
                    {task.subtasks?.length > 0 ? task.subtasks.map((st) => (
                      <div key={st._id}
                        onClick={() => togglingId === null && handleToggleSubtask(st._id)}
                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                          st.completed
                            ? 'bg-green-50 border-green-100'
                            : 'bg-slate-50 border-slate-100 hover:border-[#2563EB] hover:bg-blue-50'
                        } ${togglingId === st._id ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {st.completed
                          ? <CheckCircle2 size={17} className="text-green-500 shrink-0" />
                          : <Circle      size={17} className="text-slate-300 group-hover:text-[#2563EB] shrink-0" />
                        }
                        <span className={`text-sm flex-1 ${st.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {st.title}
                        </span>
                        {!st.completed && (
                          <span className="opacity-0 group-hover:opacity-100 text-[11px] text-[#2563EB] font-medium transition-opacity">
                            Mark complete
                          </span>
                        )}
                        {st.completed && (
                          <span className="text-[11px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Done</span>
                        )}
                      </div>
                    )) : (
                      <p className="text-sm text-slate-400 italic">No subtasks defined.</p>
                    )}
                  </div>
                )}

                {/* Comments */}
                {activeTab === 'Comments' && (
                  <div className="space-y-4">
                    {task.comments?.length > 0 ? (
                      <div className="space-y-3">
                        {task.comments.map((c, i) => {
                          const name   = c.author?.name || 'User';
                          const avatar = name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
                          return (
                            <div key={c._id || i} className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">{avatar}</div>
                              <div className="flex-1 bg-slate-50 p-3 rounded-tr-xl rounded-b-xl border border-slate-200">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-bold text-slate-900">{name}</span>
                                  <span className="text-[10px] text-slate-400">{relTime(c.createdAt)}</span>
                                </div>
                                <p className="text-sm text-slate-700">{c.text}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No comments yet.</p>
                    )}

                    {/* Compose box */}
                    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden mt-3">
                      <textarea
                        value={comment} onChange={e => setComment(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment(); }}
                        rows={3} placeholder="Write a comment…"
                        className="w-full px-4 py-3 text-sm outline-none resize-none bg-transparent"
                      />
                      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50">
                        <span className="text-[10px] text-slate-400">⌘ Enter to send</span>
                        <button
                          onClick={handleComment}
                          disabled={commenting || !comment.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          <Send size={11} /> {commenting ? 'Sending…' : 'Send'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {activeTab === 'Attachments' && (
                  <div className="space-y-3">
                    {task.attachments?.length > 0 && (
                      <div className="space-y-2">
                        {task.attachments.map((att, i) => (
                          <div key={i} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                                <Paperclip size={15} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{att.name}</p>
                                <p className="text-xs text-slate-400">
                                  {att.size} · {att.uploadedBy?.name || 'You'}
                                </p>
                              </div>
                            </div>
                            <a href={`${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000'}${att.path}`}
                              target="_blank" rel="noreferrer"
                              className="text-slate-400 hover:text-[#2563EB] p-1.5 rounded-full hover:bg-slate-200">
                              <Download size={15} />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      onClick={() => !uploading && fileRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files[0]); }}
                      className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <UploadCloud size={22} className={uploading ? 'text-blue-500 animate-bounce' : 'text-slate-400'} />
                      <p className="text-sm font-bold text-slate-700 mt-2">
                        {uploading ? 'Uploading…' : 'Drop files or click to browse'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">PDF, DOCX, XLSX, PNG, JPG · max 10 MB</p>
                    </div>
                    <input ref={fileRef} type="file" className="hidden"
                      accept=".jpg,.jpeg,.png,.pdf,.xlsx,.docx,.csv"
                      onChange={e => handleUpload(e.target.files[0])} />
                  </div>
                )}
              </section>
            </div>

            {/* Right sidebar */}
            <div className="flex-[2] bg-slate-50 p-6 flex flex-col gap-6 min-w-0">
              <div>
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Assigned By</p>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {(task.assignedBy?.name || 'M').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{task.assignedBy?.name || 'Manager'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Due Date</p>
                    <div className={`flex items-center gap-2 text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                      <CalendarDays size={15} className={isOverdue ? 'text-red-500' : 'text-slate-400'} />
                      {fmtDate(task.dueDate)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Effort</p>
                    <span className="text-sm font-bold text-slate-700">{task.effortPoints || 0} pts</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Project</p>
                    <span className="text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-1 rounded">
                      {task.project?.name || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div>
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  {task.status === 'Todo' && (
                    <button onClick={() => { onStatusChange(task._id, 'In Progress'); onClose(); }}
                      className="w-full py-2 px-3 bg-white border border-[#E2E8F0] text-[#2563EB] rounded-lg text-sm font-bold hover:bg-[#EFF6FF] flex items-center gap-2 transition-colors">
                      <PlayCircle size={15} /> Mark as Started
                    </button>
                  )}
                  {(task.status === 'In Progress' || task.status === 'Todo') && (
                    <button onClick={() => { onStatusChange(task._id, 'In Review'); onClose(); }}
                      className="w-full py-2 px-3 bg-white border border-[#E2E8F0] text-purple-600 rounded-lg text-sm font-bold hover:bg-purple-50 flex items-center gap-2 transition-colors">
                      <Send size={15} /> Submit for Review
                    </button>
                  )}
                  {task.status !== 'Blocked' && task.status !== 'Done' && (
                    <button onClick={() => { onStatusChange(task._id, 'Blocked'); onClose(); }}
                      className="w-full py-2 px-3 bg-white border border-slate-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 flex items-center gap-2 transition-colors">
                      <AlertCircle size={15} /> Report Blocker
                    </button>
                  )}
                  {task.status !== 'Done' && (
                    <button onClick={() => { onStatusChange(task._id, 'Done'); onClose(); }}
                      className="w-full py-2.5 px-3 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2 transition-colors shadow-sm">
                      <CheckCircle2 size={15} /> Mark Complete
                    </button>
                  )}
                  {task.status === 'Done' && (
                    <div className="w-full py-2.5 px-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 size={15} /> Completed
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeTasks() {
  const [view,          setView]          = useState('board');
  const [tasks,         setTasks]         = useState([]);
  const [projects,      setProjects]      = useState([]);
  const [projectFilter, setProjectFilter] = useState('All Projects');
  const [search,        setSearch]        = useState('');
  const [selectedTask,  setSelectedTask]  = useState(null);
  const [loading,       setLoading]       = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const [tRes, pRes] = await Promise.all([
        employeeAPI.getTasks(),
        employeeAPI.getProjects(),
      ]);
      setTasks(tRes.data?.data || []);
      setProjects(pRes.data?.data || []);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleStatusChange = async (taskId, status) => {
    try {
      await employeeAPI.updateTaskStatus(taskId, { status });
      toast.success(`Status updated to ${status}`);
      fetchTasks();
    } catch { toast.error('Failed to update status'); }
  };

  const filtered = tasks.filter(t => {
    const matchProject = projectFilter === 'All Projects' || t.project?.name === projectFilter;
    const matchSearch  = !search || t.title.toLowerCase().includes(search.toLowerCase());
    return matchProject && matchSearch;
  });

  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done').length;

  return (
    <PageWrapper>
      <div className="w-full flex flex-col h-[calc(100vh-64px)] overflow-hidden font-sans pb-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 px-6 md:px-8 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              My Tasks
              {overdue > 0 && (
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700 animate-pulse">
                  {overdue} Overdue
                </span>
              )}
            </h1>
            <p className="text-sm text-[#64748B] mt-1">{tasks.length} total assigned tasks</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
              className="text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#2563EB] font-medium text-[#0F172A]">
              <option value="All Projects">All Projects</option>
              {projects.map(p => <option key={p._id} value={p.name}>{p.name}</option>)}
            </select>

            <div className="flex bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0]">
              {[['board', 'Board', Columns], ['list', 'List', List]].map(([id, label, Icon]) => (
                <button key={id} onClick={() => setView(id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === id ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-24 flex-1">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden mt-6 px-6 md:px-8">

            {/* Board */}
            {view === 'board' && (
              <div className="flex gap-5 h-full overflow-x-auto pb-4">
                {COLUMNS.map(col => {
                  const colTasks = filtered.filter(t => t.status === col.id);
                  return (
                    <div key={col.id} className={`w-[300px] shrink-0 flex flex-col h-full bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] border-t-4 ${col.color}`}>
                      <div className="px-4 py-3 flex items-center justify-between">
                        <h3 className="font-bold text-[#0F172A] text-sm">{col.title}</h3>
                        <span className="bg-white border border-[#E2E8F0] text-[#64748B] text-xs font-bold px-2 py-0.5 rounded-full">
                          {colTasks.length}
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {colTasks.map(task => {
                          const ps = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium;
                          const ov = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done';
                          return (
                            <div key={task._id} onClick={() => setSelectedTask(task)}
                              className={`bg-white p-4 rounded-xl border cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group ${ov ? 'border-red-200' : 'border-[#E2E8F0]'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${ps.badge}`}>
                                  {task.priority || 'Medium'}
                                </span>
                                {ov && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                              </div>
                              <h4 className="text-sm font-bold text-[#0F172A] mb-1 leading-tight group-hover:text-[#2563EB] transition-colors">
                                {task.title}
                              </h4>
                              <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded inline-block mb-3">
                                {task.project?.name || 'Project'}
                              </span>
                              {/* Subtask progress mini */}
                              {task.subtasks?.length > 0 && (() => {
                                const done = task.subtasks.filter(s => s.completed).length;
                                return (
                                  <div className="mb-3">
                                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${(done / task.subtasks.length) * 100}%` }} />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{done}/{task.subtasks.length} subtasks</p>
                                  </div>
                                );
                              })()}
                              <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-2">
                                <span className="text-[10px] font-bold text-[#64748B]">
                                  {(task.assignedBy?.name || 'Manager').split(' ')[0]}
                                </span>
                                <span className={`text-[10px] font-medium ${ov ? 'text-red-600' : 'text-[#64748B]'}`}>
                                  {fmtDate(task.dueDate)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {colTasks.length === 0 && (
                          <p className="text-center text-xs text-slate-400 italic py-6">Empty</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List */}
            {view === 'list' && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm h-full flex flex-col">
                <div className="p-4 border-b border-[#E2E8F0]">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search tasks…"
                      className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#2563EB]" />
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-[#F8FAFC] sticky top-0 border-b border-[#E2E8F0]">
                      <tr>
                        {['Priority','Task','Project','Due Date','Effort','Status',''].map(h => (
                          <th key={h} className="px-5 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(task => {
                        const ov = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done';
                        const ps = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium;
                        return (
                          <tr key={task._id} className={`border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors ${ov ? 'bg-red-50/30' : ''}`}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${ps.dot}`} />
                                <span className="text-sm font-medium">{task.priority || 'Medium'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm font-bold text-[#0F172A] hover:text-[#2563EB] cursor-pointer"
                                onClick={() => setSelectedTask(task)}>{task.title}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs bg-[#EFF6FF] text-[#2563EB] font-bold px-2 py-0.5 rounded">
                                {task.project?.name || '—'}
                              </span>
                            </td>
                            <td className={`px-5 py-4 text-sm ${ov ? 'text-red-600 font-bold' : 'text-[#64748B]'}`}>
                              {fmtDate(task.dueDate)}
                            </td>
                            <td className="px-5 py-4 text-sm text-[#0F172A]">
                              <span className="font-bold">{task.effortPoints || 0}</span>
                              <span className="text-xs text-[#64748B] ml-1">pts</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-xs font-bold px-2 py-1 rounded ${task.status === 'Done' ? 'bg-green-100 text-green-700' : task.status === 'Blocked' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                                {task.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button onClick={() => setSelectedTask(task)}
                                className="text-[#64748B] hover:text-[#2563EB] p-2 rounded-lg hover:bg-[#E2E8F0] transition-colors">
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr><td colSpan={7} className="text-center py-12 text-[#64748B] text-sm">No tasks found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onStatusChange={handleStatusChange}
          onRefresh={fetchTasks}
        />
      )}
    </PageWrapper>
  );
}
