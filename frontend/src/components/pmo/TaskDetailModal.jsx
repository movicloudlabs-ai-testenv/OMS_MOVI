import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Paperclip, CheckSquare, MessageSquare, Plus,
  Trash2, Send, Download, UploadCloud, RefreshCw, Circle, CheckCircle2,
} from 'lucide-react';
import { pmoAPI } from '../../utils/api';
import toast from 'react-hot-toast';

/* ─── helpers ─── */
function Avatar({ name = '', size = 30 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const palette = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4'];
  const bg = palette[(name.charCodeAt(0) || 0) % palette.length];
  return (
    <div style={{ width: size, height: size, background: bg, borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36,
      fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {initials || '?'}
    </div>
  );
}

function relTime(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PRIORITY = {
  Critical: { cls: 'text-red-600 bg-red-50 border-red-200',   dot: '#EF4444' },
  High:     { cls: 'text-orange-600 bg-orange-50 border-orange-200', dot: '#F97316' },
  Medium:   { cls: 'text-amber-600 bg-amber-50 border-amber-200',   dot: '#F59E0B' },
  Low:      { cls: 'text-green-600 bg-green-50 border-green-200',   dot: '#10B981' },
};
const STATUS = {
  'Todo':        'bg-slate-100 text-slate-500',
  'In Progress': 'bg-blue-100 text-blue-700',
  'In Review':   'bg-violet-100 text-violet-700',
  'Blocked':     'bg-red-100 text-red-600',
  'Done':        'bg-emerald-100 text-emerald-700',
};

/* ─── component ─── */
export const TaskDetailModal = ({ task: taskSummary, onClose, onDelete }) => {
  const [task,       setTask]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('subtasks');
  const [comment,    setComment]    = useState('');
  const [posting,    setPosting]    = useState(false);
  const [newSub,     setNewSub]     = useState('');
  const [addingSub,  setAddingSub]  = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef();

  const reload = async () => {
    const res = await pmoAPI.getTask(taskSummary._id);
    setTask(res.data.data || res.data);
  };

  useEffect(() => {
    if (!taskSummary?._id) return;
    (async () => {
      setLoading(true);
      try { await reload(); }
      catch { toast.error('Failed to load task'); onClose(); }
      finally { setLoading(false); }
    })();
  }, [taskSummary?._id]);

  if (!taskSummary) return null;

  const handleComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await pmoAPI.addTaskComment(taskSummary._id, { text: comment.trim() });
      await reload();
      setComment('');
    } catch { toast.error('Failed to post comment'); }
    finally { setPosting(false); }
  };

  const handleAddSubtask = async () => {
    if (!newSub.trim()) return;
    setAddingSub(true);
    try {
      const subtasks = [...(task?.subtasks || []), { title: newSub.trim(), completed: false }];
      await pmoAPI.updateTask(taskSummary._id, { subtasks });
      await reload();
      setNewSub('');
    } catch { toast.error('Failed to add subtask'); }
    finally { setAddingSub(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await pmoAPI.uploadTaskAttachment(taskSummary._id, fd);
      await reload();
      toast.success('File uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); if (e.target) e.target.value = ''; }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await pmoAPI.deleteTask(taskSummary._id);
      toast.success('Task deleted');
      if (onDelete) onDelete(taskSummary._id);
      onClose();
    } catch { toast.error('Failed to delete task'); setDeleting(false); }
  };

  const t = task || taskSummary;
  const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done';
  const doneCount = task?.subtasks?.filter(s => s.completed).length || 0;
  const totalSubs = task?.subtasks?.length || 0;
  const pct = totalSubs > 0 ? Math.round((doneCount / totalSubs) * 100) : 0;
  const pri = PRIORITY[t.priority] || PRIORITY.Medium;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/40 backdrop-blur-sm">
        {/* backdrop */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0" onClick={onClose} />

        {/* panel */}
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.97 }}
          animate={{ y: 0,  opacity: 1, scale: 1 }}
          exit={{    y: 30, opacity: 0, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full max-w-4xl max-h-[82vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="px-8 pt-7 pb-5 border-b border-slate-100 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${pri.cls}`}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: pri.dot, display: 'inline-block' }} />
                    {t.priority || 'Medium'}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS[t.status] || STATUS.Todo}`}>
                    {t.status || 'Todo'}
                  </span>
                  {isOverdue && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500 text-white">Overdue</span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-slate-900 leading-snug">{t.title}</h1>
                {t.project?.name && (
                  <p className="text-sm text-slate-400 mt-1 font-medium">{t.project.name}</p>
                )}
              </div>
              <button onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors mt-1 shrink-0">
                <X size={20} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <RefreshCw size={28} className="text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 divide-x divide-slate-100">

              {/* ── Left: description + tabs ── */}
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-8 py-6 space-y-6">

                {/* Description */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</p>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {t.description || <span className="italic text-slate-400">No description provided.</span>}
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center gap-1 border-b border-slate-100 mb-5">
                    {[
                      { id: 'subtasks',    label: 'Subtasks',    icon: CheckSquare,   count: totalSubs },
                      { id: 'comments',    label: 'Comments',    icon: MessageSquare, count: task?.comments?.length },
                      { id: 'attachments', label: 'Attachments', icon: Paperclip,     count: task?.attachments?.length },
                    ].map(({ id, label, icon: Icon, count }) => (
                      <button key={id} onClick={() => setTab(id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all ${
                          tab === id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}>
                        <Icon size={14} />
                        {label}
                        {count > 0 && (
                          <span className={`text-[11px] font-bold px-1.5 rounded-full ${
                            tab === id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                          }`}>{count}</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* ── Subtasks (read-only for PMO) ── */}
                  {tab === 'subtasks' && (
                    <div className="space-y-2">
                      {totalSubs > 0 && (
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-500 shrink-0">
                            {doneCount}/{totalSubs} done
                          </span>
                        </div>
                      )}

                      {totalSubs > 0 ? task.subtasks.map((st, i) => (
                        <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                          st.completed
                            ? 'bg-emerald-50 border-emerald-100'
                            : 'bg-slate-50 border-slate-100'
                        }`}>
                          {st.completed
                            ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                            : <Circle size={18} className="text-slate-300 shrink-0" />}
                          <span className={`text-sm flex-1 ${
                            st.completed ? 'line-through text-slate-400' : 'text-slate-700'
                          }`}>{st.title}</span>
                          {st.completed && (
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                              Done
                            </span>
                          )}
                        </div>
                      )) : (
                        <p className="text-sm text-slate-400 italic text-center py-6">No subtasks yet.</p>
                      )}

                      {/* Add subtask */}
                      <div className="flex gap-2 pt-4 mt-2 border-t border-slate-100">
                        <input
                          value={newSub}
                          onChange={e => setNewSub(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                          placeholder="Add a subtask..."
                          className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                        />
                        <button onClick={handleAddSubtask} disabled={addingSub || !newSub.trim()}
                          className="px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1.5 transition-colors">
                          <Plus size={14} /> {addingSub ? '...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Comments ── */}
                  {tab === 'comments' && (
                    <div className="flex flex-col gap-3">
                      {/* thread */}
                      <div className="space-y-2">
                        {task?.comments?.length > 0 ? task.comments.map(c => (
                          <div key={c._id} className="flex items-start gap-3">
                            <Avatar name={c.author?.name || '?'} size={28} />
                            <div className="flex-1 min-w-0 bg-slate-50 border border-slate-100 rounded-xl rounded-tl-none px-3.5 py-2.5">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-xs font-bold text-slate-800 truncate">{c.author?.name || 'Unknown'}</span>
                                <span className="text-[10px] text-slate-400 shrink-0">{relTime(c.createdAt)}</span>
                              </div>
                              <p className="text-sm text-slate-700 leading-relaxed">{c.text}</p>
                            </div>
                          </div>
                        )) : (
                          <p className="text-sm text-slate-400 italic text-center py-4">No comments yet.</p>
                        )}
                      </div>

                      {/* compose */}
                      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden mt-1">
                        <textarea
                          value={comment}
                          onChange={e => setComment(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && e.metaKey && handleComment()}
                          rows={3}
                          placeholder="Write a comment for the assignee…"
                          className="w-full px-4 py-3 text-sm text-slate-700 placeholder-slate-400 outline-none resize-none bg-transparent"
                        />
                        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50">
                          <span className="text-[11px] text-slate-400">⌘ + Enter to send</span>
                          <button onClick={handleComment} disabled={posting || !comment.trim()}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
                            <Send size={11} /> {posting ? 'Posting…' : 'Send'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Attachments ── */}
                  {tab === 'attachments' && (
                    <div className="space-y-3">
                      {task?.attachments?.length > 0 ? (
                        <div className="space-y-2 mb-2">
                          {task.attachments.map((att, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                  <Paperclip size={15} className="text-blue-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">{att.name}</p>
                                  <p className="text-xs text-slate-400">{att.size} · {att.uploadedBy?.name || 'Unknown'}</p>
                                </div>
                              </div>
                              <a href={att.path} download
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Download size={15} />
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic text-center py-6">No attachments yet.</p>
                      )}
                      <div
                        onClick={() => fileRef.current?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); handleUpload({ target: { files: e.dataTransfer.files } }); }}
                        className={`border-2 border-dashed rounded-xl py-7 flex flex-col items-center gap-1.5 text-center cursor-pointer transition-all ${
                          uploading ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/40'
                        }`}>
                        <UploadCloud size={22} className={uploading ? 'text-blue-500 animate-bounce' : 'text-slate-400'} />
                        <p className="text-sm font-semibold text-slate-600">
                          {uploading ? 'Uploading…' : 'Drop files or click to browse'}
                        </p>
                        <p className="text-xs text-slate-400">JPG, PNG, PDF, XLSX, DOCX, CSV · Max 10 MB</p>
                        <input ref={fileRef} type="file" className="hidden"
                          accept=".jpg,.jpeg,.png,.pdf,.xlsx,.docx,.csv"
                          onChange={handleUpload} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right: details ── */}
              <div className="w-72 shrink-0 flex flex-col overflow-y-auto bg-slate-50/60 px-6 py-6 space-y-6">

                {/* People */}
                <section className="space-y-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">People</p>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] text-slate-400 mb-1.5">Assigned To</p>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={t.assignedTo?.name || '?'} size={32} />
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-tight">{t.assignedTo?.name || '—'}</p>
                          {t.assignedTo?.designation && (
                            <p className="text-[11px] text-slate-400">{t.assignedTo.designation}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-400 mb-1.5">Assigned By</p>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={t.assignedBy?.name || '?'} size={32} />
                        <p className="text-sm font-semibold text-slate-700">{t.assignedBy?.name || '—'}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="h-px bg-slate-200" />

                {/* Meta */}
                <section className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Details</p>

                  <MetaRow label="Due Date">
                    <span className={`text-sm font-semibold ${isOverdue ? 'text-red-500' : 'text-slate-700'}`}>
                      {fmtDate(t.dueDate)}
                    </span>
                  </MetaRow>

                  <MetaRow label="Project">
                    <span className="text-sm font-semibold text-blue-600">{t.project?.name || '—'}</span>
                  </MetaRow>

                  <MetaRow label="Effort">
                    <span className="text-sm font-semibold text-slate-700">
                      {t.effortPoints ? `${t.effortPoints} pts` : '—'}
                    </span>
                  </MetaRow>

                  {totalSubs > 0 && (
                    <MetaRow label="Subtasks">
                      <span className="text-sm font-semibold text-slate-700">{doneCount}/{totalSubs}</span>
                    </MetaRow>
                  )}

                  {t.blockedReason && (
                    <div className="mt-1 p-3 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-[11px] font-bold text-red-500 uppercase mb-1">Blocker</p>
                      <p className="text-xs text-red-600 leading-relaxed">{t.blockedReason}</p>
                    </div>
                  )}
                </section>

                <div className="h-px bg-slate-200" />

                {/* Actions */}
                <section className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Actions</p>
                  <button onClick={handleDelete} disabled={deleting}
                    className="w-full py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-bold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50">
                    <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete Task'}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                    Task progress is managed by the assignee
                  </p>
                </section>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

function MetaRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-slate-400 shrink-0">{label}</span>
      {children}
    </div>
  );
}
