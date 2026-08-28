import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Eye, PlayCircle, Send, AlertCircle, CheckCircle,
  Paperclip, MessageSquare, CheckSquare, UploadCloud, Download, RefreshCw, CalendarDays,
  Circle, CheckCircle2,
} from 'lucide-react';
import HRLayout from '../../components/hr/HRLayout';
import { hrAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import AccessDenied from '../../components/shared/AccessDenied';


const COLUMNS = [
  { id: 'Todo',        label: 'To Do',       border: 'border-t-[#64748B]', badge: 'bg-[#F1F5F9] text-[#64748B]' },
  { id: 'In Progress', label: 'In Progress', border: 'border-t-[#2563EB]', badge: 'bg-[#EFF6FF] text-[#2563EB]' },
  { id: 'In Review',   label: 'In Review',   border: 'border-t-[#F59E0B]', badge: 'bg-[#FFFBEB] text-[#D97706]' },
  { id: 'Blocked',     label: 'Blocked',     border: 'border-t-[#EF4444]', badge: 'bg-[#FEF2F2] text-[#DC2626]' },
  { id: 'Done',        label: 'Done',        border: 'border-t-[#10B981]', badge: 'bg-[#ECFDF5] text-[#059669]' },
];

const PRIORITY_STYLES = {
  Critical: { color: 'text-[#DC2626]', bg: 'bg-[#FEF2F2]' },
  High:     { color: 'text-[#EA580C]', bg: 'bg-[#FFF7ED]' },
  Medium:   { color: 'text-[#D97706]', bg: 'bg-[#FFFBEB]' },
  Low:      { color: 'text-[#64748B]', bg: 'bg-[#F1F5F9]' },
};


function dueDateLabel(d) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d) - Date.now()) / 86400000);
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, color: 'text-[#DC2626]' };
  if (diff === 0) return { label: 'Due today',    color: 'text-[#D97706]' };
  if (diff <= 3)  return { label: `${diff}d left`, color: 'text-[#D97706]' };
  return { label: `${diff}d left`, color: 'text-[#64748B]' };
}

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function relTime(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)  return 'Just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function Avatar({ name = '', size = 28 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const colors = ['#2563EB','#059669','#D97706','#DC2626','#7C3AED','#DB2777'];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, background: bg, borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize: size*0.35, fontWeight:700, color:'#fff', flexShrink:0 }}>
      {initials}
    </div>
  );
}

// ─── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, canAct, onSelect }) {
  const pr  = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium;
  const due = dueDateLabel(task.dueDate);
  const assigneeName = task.assignedTo?.name || 'Unassigned';

  return (
    <div
      onClick={() => onSelect(task)}
      className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-[#2563EB] transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pr.bg} ${pr.color}`}>{task.priority}</span>
        <span className="text-[10px] text-[#94A3B8] truncate max-w-[120px]">{task.project?.name || '—'}</span>
      </div>
      <p className="text-[13px] font-semibold text-[#0F172A] mb-2 leading-snug group-hover:text-[#2563EB] transition-colors line-clamp-2">
        {task.title}
      </p>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          <Avatar name={assigneeName} size={20} />
          <span className="text-[11px] text-[#64748B] truncate max-w-[90px]">{assigneeName}</span>
        </div>
        {due && <span className={`text-[10px] font-medium ${due.color}`}>{due.label}</span>}
      </div>
      {!canAct && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[#F1F5F9]">
          <Eye size={11} className="text-[#94A3B8]" />
          <span className="text-[10px] text-[#94A3B8]">View only</span>
        </div>
      )}
    </div>
  );
}

// ─── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, tasks, canAct, onSelect }) {
  const colTasks = tasks.filter(t => t.status === col.id);
  return (
    <div className="flex flex-col min-w-[240px] max-w-[260px] flex-1">
      <div className={`bg-white border border-[#E2E8F0] border-t-2 ${col.border} rounded-xl p-3 mb-3 flex items-center justify-between shadow-sm`}>
        <span className="text-[12px] font-bold text-[#0F172A]">{col.label}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${col.badge}`}>{colTasks.length}</span>
      </div>
      <div className="flex flex-col gap-2.5 overflow-y-auto flex-1 pr-0.5">
        {colTasks.map(task => (
          <TaskCard key={task._id} task={task} canAct={canAct} onSelect={onSelect} />
        ))}
        {colTasks.length === 0 && (
          <div className="border-2 border-dashed border-[#E2E8F0] rounded-xl py-6 text-center text-[#CBD5E1] text-[11px]">No tasks</div>
        )}
      </div>
    </div>
  );
}

// ─── Rich Task Detail Drawer (My Tasks — real data) ───────────────────────────
function MyTaskDetailDrawer({ taskSummary, onClose, onStatusChange }) {
  const [task, setTask]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState(taskSummary?.initialTab || 'subtasks');
  const [comment, setComment]   = useState('');
  const [posting, setPosting]   = useState(false);
  const [blockerNote, setBlockerNote] = useState('');
  const [showBlockerInput, setShowBlockerInput] = useState(false);
  const [togglingIdx, setTogglingIdx] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await hrAPI.getMyTask(taskSummary._id);
        setTask(res.data.data || res.data);
      } catch {
        toast.error('Failed to load task details');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [taskSummary._id]);

  const handleStatus = async (newStatus, note) => {
    try {
      await onStatusChange(taskSummary._id, newStatus, note);
      // Refresh task data
      const res = await hrAPI.getMyTask(taskSummary._id);
      setTask(res.data.data || res.data);
      setShowBlockerInput(false);
      setBlockerNote('');
    } catch {}
  };

  const handleToggleSubtask = async (index) => {
    setTogglingIdx(index);
    try {
      await hrAPI.toggleMySubtask(taskSummary._id, index);
      const res = await hrAPI.getMyTask(taskSummary._id);
      setTask(res.data.data || res.data);
    } catch {
      toast.error('Failed to update subtask');
    } finally {
      setTogglingIdx(null);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await hrAPI.uploadMyTaskAttachment(taskSummary._id, fd);
      const res = await hrAPI.getMyTask(taskSummary._id);
      setTask(res.data.data || res.data);
      toast.success('File uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await hrAPI.addMyTaskComment(taskSummary._id, { text: comment });
      const res = await hrAPI.getMyTask(taskSummary._id);
      setTask(res.data.data || res.data);
      setComment('');
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const due = dueDateLabel(taskSummary.dueDate);
  const currentStatus = task?.status || taskSummary.status;

  const priorityBadge = {
    Critical: 'text-red-600 bg-red-100 border-red-200',
    High:     'text-orange-600 bg-orange-100 border-orange-200',
    Medium:   'text-amber-600 bg-amber-100 border-amber-200',
    Low:      'text-green-600 bg-green-100 border-green-200',
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={onClose} />

      <motion.div
        initial={{ x: 620, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 620, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${priorityBadge[taskSummary.priority] || priorityBadge.Medium}`}>
                {taskSummary.priority} Priority
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-600 flex items-center gap-1">
                <RefreshCw size={10} /> {currentStatus}
              </span>
              {currentStatus === 'Blocked' && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">Blocked</span>
              )}
              {due && <span className={`text-[11px] font-bold ${due.color}`}>{due.label}</span>}
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{taskSummary.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors ml-4">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 custom-scrollbar">

            {/* Left: description + tabs */}
            <div className="flex-[3] p-6 space-y-7">

              {/* Description */}
              <section>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Description</h3>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[60px]">
                  {task?.description || <span className="italic text-slate-400">No description provided.</span>}
                </p>
              </section>

              {/* Tabs */}
              <section>
                <div className="flex border-b border-slate-200 mb-4">
                  {[
                    { id: 'subtasks',     label: 'Subtasks',     icon: CheckSquare,     count: task?.subtasks?.length },
                    { id: 'comments',     label: 'Comments',     icon: MessageSquare,   count: task?.comments?.length },
                    { id: 'attachments',  label: 'Attachments',  icon: Paperclip,       count: task?.attachments?.length },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
                        activeTab === tab.id ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}>
                      <tab.icon size={14} /> {tab.label}
                      {tab.count > 0 && <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded-full">{tab.count}</span>}
                    </button>
                  ))}
                </div>

                {/* Subtasks */}
                {activeTab === 'subtasks' && (
                  <div className="space-y-2">
                    {task?.subtasks?.length > 0 ? (
                      <>
                        {/* progress bar */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
                              style={{ width: `${Math.round((task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100)}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 shrink-0">
                            {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                          </span>
                        </div>
                        {task.subtasks.map((st, i) => (
                          <div key={i}
                            onClick={() => togglingIdx === null && handleToggleSubtask(i)}
                            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                              st.completed
                                ? 'bg-green-50 border-green-100'
                                : 'bg-slate-50 border-slate-100 hover:border-[#2563EB] hover:bg-blue-50'
                            } ${togglingIdx === i ? 'opacity-60 pointer-events-none' : ''}`}
                          >
                            {st.completed
                              ? <CheckCircle2 size={17} className="text-green-500 shrink-0" />
                              : <Circle size={17} className="text-slate-300 group-hover:text-[#2563EB] shrink-0 transition-colors" />}
                            <span className={`text-sm flex-1 transition-colors ${
                              st.completed ? 'line-through text-slate-400' : 'text-slate-700 group-hover:text-[#2563EB]'
                            }`}>{st.title}</span>
                            {!st.completed && (
                              <span className="text-[11px] font-semibold text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                Mark complete
                              </span>
                            )}
                            {st.completed && (
                              <span className="text-[11px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full shrink-0">Done</span>
                            )}
                          </div>
                        ))}
                      </>
                    ) : <p className="text-sm text-slate-400 italic">No subtasks defined.</p>}
                  </div>
                )}

                {/* Comments */}
                {activeTab === 'comments' && (
                  <div className="space-y-4">
                    {task?.comments?.length > 0 ? (
                      <div className="space-y-3">
                        {task.comments.map(c => (
                          <div key={c._id} className="flex gap-3">
                            <Avatar name={c.author?.name || '?'} size={30} />
                            <div className="flex-1 bg-slate-50 p-3 rounded-tr-xl rounded-b-xl border border-slate-200">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-900">{c.author?.name || 'Unknown'}</span>
                                <span className="text-[10px] text-slate-500">{relTime(c.createdAt)}</span>
                              </div>
                              <p className="text-sm text-slate-700">{c.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-slate-400 italic">No comments yet.</p>}

                    {/* compose */}
                    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden mt-1">
                      <textarea value={comment} onChange={e => setComment(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && e.metaKey && handleComment()}
                        rows={3} placeholder="Write a comment for PMO…"
                        className="w-full px-4 py-3 text-sm text-slate-700 placeholder-slate-400 outline-none resize-none bg-transparent" />
                      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50">
                        <span className="text-[11px] text-slate-400">⌘ + Enter to send</span>
                        <button onClick={handleComment} disabled={posting || !comment.trim()}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                          <Send size={11} /> {posting ? 'Posting…' : 'Send'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {activeTab === 'attachments' && (
                  <div className="space-y-3">
                    {task?.attachments?.length > 0 ? (
                      <div className="space-y-2">
                        {task.attachments.map((att, i) => (
                          <div key={i} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                                <Paperclip size={15} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{att.name}</p>
                                <p className="text-xs text-slate-400">
                                  {att.size}{att.uploadedBy?.name ? ` · ${att.uploadedBy.name}` : ''}
                                </p>
                              </div>
                            </div>
                            <a href={att.path} download target="_blank" rel="noreferrer"
                              className="text-slate-400 hover:text-[#2563EB] p-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                              <Download size={15} />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No attachments yet.</p>
                    )}

                    {/* Upload zone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); handleUpload({ target: { files: e.dataTransfer.files } }); }}
                      className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center text-center cursor-pointer transition-all ${
                        uploading ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40'
                      }`}>
                      <UploadCloud size={22} className={`mb-2 ${uploading ? 'text-blue-500 animate-bounce' : 'text-slate-400'}`} />
                      <p className="text-sm font-semibold text-slate-700">
                        {uploading ? 'Uploading…' : 'Drop files or click to browse'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, PDF, XLSX, DOCX, CSV · Max 10 MB</p>
                      <input ref={fileInputRef} type="file" className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf,.xlsx,.docx,.csv"
                        onChange={handleUpload} />
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Right: details + quick actions */}
            <div className="flex-[2] bg-slate-50 p-6 flex flex-col">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Assigned By</p>
                  <div className="flex items-center gap-2">
                    <Avatar name={task?.assignedBy?.name || '?'} size={24} />
                    <span className="text-sm font-bold text-slate-700">{task?.assignedBy?.name || '—'}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Due Date</p>
                  <div className={`flex items-center gap-2 text-sm font-bold ${due?.color === 'text-[#DC2626]' ? 'text-red-600' : 'text-slate-700'}`}>
                    <CalendarDays size={14} className="text-slate-400" />
                    {fmt(task?.dueDate)}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Project</p>
                  <span className="inline-block px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-[#2563EB]">
                    {task?.project?.name || '—'}
                  </span>
                </div>
                {task?.effortPoints && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Effort</p>
                    <span className="text-sm font-bold text-slate-700">{task.effortPoints} pts</span>
                  </div>
                )}
                {task?.blockedReason && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Blocker Note</p>
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2 border border-red-100">{task.blockedReason}</p>
                  </div>
                )}
              </div>

              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-8 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {currentStatus === 'Todo' && (
                  <button onClick={() => handleStatus('In Progress')}
                    className="w-full py-2 px-3 bg-white border border-[#E2E8F0] text-[#2563EB] rounded-lg text-sm font-bold hover:bg-[#EFF6FF] hover:border-[#BFDBFE] flex items-center gap-2 transition-colors">
                    <PlayCircle size={16} /> Mark as Started
                  </button>
                )}
                {(currentStatus === 'In Progress' || currentStatus === 'Todo') && (
                  <button onClick={() => handleStatus('In Review')}
                    className="w-full py-2 px-3 bg-white border border-[#E2E8F0] text-purple-600 rounded-lg text-sm font-bold hover:bg-purple-50 hover:border-purple-200 flex items-center gap-2 transition-colors">
                    <Send size={16} /> Submit for Review
                  </button>
                )}
                {currentStatus !== 'Blocked' && currentStatus !== 'Done' && !showBlockerInput && (
                  <button onClick={() => setShowBlockerInput(true)}
                    className="w-full py-2 px-3 bg-white border border-slate-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 hover:border-red-200 flex items-center gap-2 transition-colors">
                    <AlertCircle size={16} /> Report Blocker
                  </button>
                )}
                {showBlockerInput && (
                  <div className="space-y-2">
                    <textarea value={blockerNote} onChange={e => setBlockerNote(e.target.value)}
                      placeholder="Describe the blocker..." rows={2}
                      className="w-full p-2.5 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => handleStatus('Blocked', blockerNote)}
                        className="flex-1 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600">Submit Blocker</button>
                      <button onClick={() => setShowBlockerInput(false)}
                        className="px-3 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200">Cancel</button>
                    </div>
                  </div>
                )}
                {currentStatus === 'In Review' && (
                  <button onClick={() => handleStatus('In Progress')}
                    className="w-full py-2 px-3 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 flex items-center gap-2 transition-colors">
                    <RefreshCw size={16} /> Back to In Progress
                  </button>
                )}
                {currentStatus === 'Blocked' && (
                  <button onClick={() => handleStatus('In Progress')}
                    className="w-full py-2 px-3 bg-white border border-slate-200 text-[#2563EB] rounded-lg text-sm font-bold hover:bg-blue-50 flex items-center gap-2 transition-colors">
                    <PlayCircle size={16} /> Resume Task
                  </button>
                )}
                {currentStatus !== 'Done' && (
                  <button onClick={() => handleStatus('Done')}
                    className="w-full py-2 px-3 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2 transition-colors shadow-sm">
                    <CheckCircle size={16} /> Mark Complete
                  </button>
                )}
                {currentStatus === 'Done' && (
                  <div className="w-full py-2 px-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> Completed
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ─── Simple View-only Drawer (Intern/Employee boards) ─────────────────────────
function ViewDrawer({ task, onClose }) {
  const pr  = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium;
  const due = dueDateLabel(task.dueDate);
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <motion.div initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 bottom-0 w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-[#E2E8F0]">
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-start shrink-0">
          <div>
            <p className="text-[11px] text-[#94A3B8] mb-1">{task.project?.name || '—'}</p>
            <h2 className="text-[15px] font-bold text-[#0F172A]">{task.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#64748B] hover:bg-[#E2E8F0] rounded-full"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${pr.bg} ${pr.color}`}>{task.priority}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">{task.status}</span>
            {due && <span className={`text-[11px] font-medium ${due.color}`}>{due.label}</span>}
          </div>
          {task.description && (
            <div>
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase mb-1">Description</p>
              <p className="text-[13px] text-[#475569] leading-relaxed">{task.description}</p>
            </div>
          )}
          <div className="space-y-2">
            {[
              ['Assigned To', task.assignedTo?.name],
              ['Assigned By', task.assignedBy?.name],
              ['Due Date',    fmt(task.dueDate)],
            ].map(([label, val]) => val && (
              <div key={label} className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
                <span className="text-[11px] font-bold text-[#94A3B8] uppercase">{label}</span>
                <span className="text-[13px] text-[#0F172A]">{val}</span>
              </div>
            ))}
          </div>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-2">
            <Eye size={14} className="text-[#94A3B8]" />
            <p className="text-[12px] text-[#64748B]">This task belongs to your team member. View only — you cannot change its status.</p>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Assign Task Modal ─────────────────────────────────────────────────────────
function AssignModal({ teamMembers, projects, onClose, onSubmit }) {
  const [form, setForm] = useState({ title: '', description: '', projectId: '', assignedTo: '', priority: 'Medium', dueDate: '', effortPoints: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.projectId || !form.assignedTo) { toast.error('Title, project, and assignee are required'); return; }
    setSubmitting(true);
    await onSubmit(form);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900 text-[14px] flex items-center gap-2">
            <Plus size={16} className="text-[#2563EB]" /> Assign Task
          </h3>
          <button onClick={onClose}><X size={16} className="text-slate-400 hover:text-slate-700" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Task Title *</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-[13px] outline-none focus:border-[#2563EB]" placeholder="Enter task title" required />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Assign To *</label>
            <select value={form.assignedTo} onChange={e => setForm({...form, assignedTo: e.target.value})}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-[13px] outline-none" required>
              <option value="">Select team member...</option>
              {teamMembers.map(m => <option key={m._id} value={m._id}>{m.name} ({m.employmentType})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Project *</label>
            <select value={form.projectId} onChange={e => setForm({...form, projectId: e.target.value})}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-[13px] outline-none" required>
              <option value="">Select project...</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-[13px] outline-none">
                {['Low','Medium','High','Critical'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-[13px] outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
            <textarea rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-[13px] outline-none resize-none" placeholder="Optional..." />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 text-[13px] font-bold bg-[#2563EB] text-white hover:bg-[#1D4ED8] rounded-lg disabled:opacity-50">
              {submitting ? 'Assigning...' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HRTaskBoard() {
  const { hasPermission } = useAuth();
  const canRead   = hasPermission('Tasks', 'read');
  const canCreate = hasPermission('Tasks', 'create');

  const [activeBoard, setActiveBoard]     = useState('my');
  const [myTasks, setMyTasks]             = useState([]);
  const [internTasks, setInternTasks]     = useState([]);
  const [employeeTasks, setEmployeeTasks] = useState([]);
  const [teamMembers, setTeamMembers]     = useState([]);
  const [projects, setProjects]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showAssign, setShowAssign]       = useState(false);
  const [selectedTask, setSelectedTask]   = useState(null);

  const fetchAll = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const [myRes, internRes, empRes, empListRes, internListRes] = await Promise.all([
        hrAPI.getMyTasks(),
        hrAPI.getInternTasks(),
        hrAPI.getEmployeeTasks(),
        hrAPI.getEmployees(),
        hrAPI.getInterns(),
      ]);
      setMyTasks(myRes.data.data || []);
      setInternTasks(internRes.data.data || []);
      setEmployeeTasks(empRes.data.data || []);

      const emps    = (empListRes.data.data || []).map(e => ({ _id: e._id, name: e.name, employmentType: e.employmentType || 'Employee' }));
      const interns = (internListRes.data.data || []).map(i => ({ _id: i._id, name: i.name, employmentType: 'Intern' }));
      setTeamMembers([...emps, ...interns]);

      const allTasks = [...(myRes.data.data || []), ...(internRes.data.data || []), ...(empRes.data.data || [])];
      const projMap  = new Map();
      allTasks.forEach(t => { if (t.project?._id) projMap.set(t.project._id, t.project); });
      setProjects(Array.from(projMap.values()));
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const [searchParams] = useSearchParams();
  const urlTaskId = searchParams.get('taskId');
  const urlTab = searchParams.get('tab');

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (!urlTaskId || !canRead) return;
    (async () => {
      try {
        const res = await hrAPI.getMyTask(urlTaskId);
        const taskData = res.data?.data || res.data;
        if (taskData) {
          if (urlTab) taskData.initialTab = urlTab;
          setSelectedTask(taskData);
        }
      } catch (err) {
        console.warn('Could not load target HR task by ID:', err);
      }
    })();
  }, [urlTaskId, searchParams, canRead]);

  if (!canRead) return <HRLayout bare><AccessDenied message="You don't have permission to view the task board." /></HRLayout>;


  const handleStatusChange = async (taskId, newStatus, note) => {
    try {
      await hrAPI.updateMyTaskStatus(taskId, { status: newStatus, blockedReason: note });
      setMyTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      // Update selected task status too so header badge refreshes
      if (selectedTask?._id === taskId) {
        setSelectedTask(prev => ({ ...prev, status: newStatus }));
      }
      toast.success(`Task moved to ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task');
      throw err;
    }
  };

  const handleAssignTask = async (formData) => {
    try {
      await hrAPI.assignTask(formData);
      toast.success('Task assigned successfully!');
      setShowAssign(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign task');
    }
  };

  const boards = {
    my:        { label: 'My Tasks',       tasks: myTasks,       canAct: true,  desc: 'Tasks assigned to you by PMO' },
    interns:   { label: 'Intern Tasks',   tasks: internTasks,   canAct: false, desc: 'Tasks assigned to your interns' },
    employees: { label: 'Employee Tasks', tasks: employeeTasks, canAct: false, desc: 'Tasks assigned to your employees' },
  };

  const active = boards[activeBoard];

  const TABS = [
    { id: 'my',        label: 'My Tasks',       count: myTasks.length },
    { id: 'interns',   label: 'Intern Tasks',   count: internTasks.length },
    { id: 'employees', label: 'Employee Tasks', count: employeeTasks.length },
  ];

  return (
    <HRLayout bare>
      <div className="font-sans text-[#0F172A] w-full flex flex-col h-[calc(100vh-80px)] overflow-hidden gap-4 max-w-[1600px] mx-auto pb-2">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 shrink-0">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Task Board</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">{active.desc}</p>
          </div>
          {canCreate && (
            <button onClick={() => setShowAssign(true)}
              className="bg-[#2563EB] text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#1D4ED8] transition-colors flex items-center gap-2 self-start sm:self-auto">
              <Plus size={15} /> Assign Task
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-lg w-fit shrink-0">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveBoard(tab.id); setSelectedTask(null); }}
              className={`px-4 py-1.5 rounded-md text-[12px] font-bold transition-all flex items-center gap-1.5 ${
                activeBoard === tab.id ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}>
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeBoard === tab.id ? 'bg-[#2563EB] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : (
          <div className="flex-1 flex gap-4 overflow-x-auto overflow-y-hidden pb-2 pt-1">
            {COLUMNS.map(col => (
              <KanbanColumn key={col.id} col={col} tasks={active.tasks} canAct={active.canAct} onSelect={setSelectedTask} />
            ))}
          </div>
        )}
      </div>

      {showAssign && (
        <AssignModal teamMembers={teamMembers} projects={projects} onClose={() => setShowAssign(false)} onSubmit={handleAssignTask} />
      )}

      <AnimatePresence>
        {selectedTask && activeBoard === 'my' && (
          <MyTaskDetailDrawer
            key={selectedTask._id}
            taskSummary={selectedTask}
            onClose={() => setSelectedTask(null)}
            onStatusChange={handleStatusChange}
          />
        )}
        {selectedTask && activeBoard !== 'my' && (
          <ViewDrawer key={selectedTask._id} task={selectedTask} onClose={() => setSelectedTask(null)} />
        )}
      </AnimatePresence>
    </HRLayout>
  );
}
