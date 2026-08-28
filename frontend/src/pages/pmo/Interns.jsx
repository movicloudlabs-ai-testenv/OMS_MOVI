import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, UserPlus, Star, X, ChevronRight } from 'lucide-react';
import PageWrapper from '../../components/PageWrapper';
import { pmoAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';

function roleAvg(ratings, source) {
  const f = (ratings || []).filter(r => r.source === source);
  return f.length ? f.reduce((a, r) => a + r.rating, 0) / f.length : null;
}
function combinedRating(ratings) {
  const hr = roleAvg(ratings, 'hr'), pmo = roleAvg(ratings, 'pmo');
  if (hr !== null && pmo !== null) return ((hr + pmo) / 2).toFixed(1);
  if (hr !== null) return hr.toFixed(1);
  if (pmo !== null) return pmo.toFixed(1);
  return '0.0';
}

export default function PMOInterns() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [interns, setInterns] = useState([]);
  const [taskMap, setTaskMap] = useState({});
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [evalWeek, setEvalWeek] = useState('');
  const [evalRating, setEvalRating] = useState(0);
  const [evalNote, setEvalNote] = useState('');
  const [evalSubmitting, setEvalSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestData, setRequestData] = useState({ projectId: '', department: '', duration: 3, skills: '', note: '' });

  const canRead = hasPermission('Interns', 'read');
  const canAssignTask = hasPermission('Tasks', 'create');

  const fetchData = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const [internsRes, tasksInReviewRes, projectsRes, allTasksRes] = await Promise.all([
        pmoAPI.getInterns(),
        pmoAPI.getTasksInReview(),
        pmoAPI.getProjects(),
        pmoAPI.getTasks({}),
      ]);
      const internList = internsRes.data.data || [];
      const allTasks = allTasksRes.data.data || [];

      const map = {};
      for (const intern of internList) {
        const uid = intern.user?._id;
        if (!uid) continue;
        const internTasks = allTasks.filter(t => t.assignedTo?._id === uid || t.assignedTo === uid);
        map[uid] = {
          assigned: internTasks.length,
          done: internTasks.filter(t => t.status === 'Done').length,
        };
      }

      setInterns(internList);
      setTaskMap(map);
      setPendingReviewCount((tasksInReviewRes.data.data || []).length);
      setProjects(projectsRes.data.data || []);

      if (projectsRes.data.data?.length > 0) {
        setRequestData(prev => ({
          ...prev,
          projectId: projectsRes.data.data[0]._id,
          department: projectsRes.data.data[0].department?._id || projectsRes.data.data[0].department || '',
        }));
      }
    } catch {
      toast.error('Failed to load intern data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [canRead]);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestData.projectId || !requestData.department) { toast.error('Project and Department are required'); return; }
    try {
      await pmoAPI.requestInterns({ ...requestData, skills: requestData.skills.split(',').map(s => s.trim()).filter(Boolean) });
      toast.success('Intern request submitted to HR!');
      setIsRequestOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    }
  };

  const handleEvalSubmit = async () => {
    if (!evalWeek || !evalRating) { toast.error('Week and rating are required'); return; }
    setEvalSubmitting(true);
    try {
      const res = await pmoAPI.addInternRating(selectedIntern.user._id, { week: parseInt(evalWeek), rating: evalRating, note: evalNote });
      setInterns(prev => prev.map(i =>
        i.user?._id === selectedIntern.user._id
          ? { ...i, user: { ...i.user, performanceRatings: res.data.data } }
          : i
      ));
      setSelectedIntern(prev => ({ ...prev, user: { ...prev.user, performanceRatings: res.data.data } }));
      setEvalWeek(''); setEvalRating(0); setEvalNote('');
      toast.success('Evaluation saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save evaluation');
    } finally {
      setEvalSubmitting(false);
    }
  };

  const openDrawer = (intern) => {
    setSelectedIntern(intern);
    setEvalWeek(''); setEvalRating(0); setEvalNote('');
  };

  const activeInterns = interns.filter(i => i.user?.status === 'Active').length;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const completingSoon = interns.filter(i => {
    if (!i.user?.internshipEnd) return false;
    const e = new Date(i.user.internshipEnd);
    return e.getMonth() === currentMonth && e.getFullYear() === currentYear;
  }).length;

  const filteredInterns = interns.filter(intern => {
    const term = searchTerm.toLowerCase();
    return (
      intern.user?.name?.toLowerCase().includes(term) ||
      intern.user?.college?.toLowerCase().includes(term) ||
      intern.project?.name?.toLowerCase().includes(term)
    );
  });

  if (!canRead) return <PageWrapper><AccessDenied message="You don't have permission to view interns." /></PageWrapper>;

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] w-full flex flex-col gap-5 max-w-[1200px] mx-auto pb-12 text-left">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">Interns</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">Track and manage interns across all active projects</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsRequestOpen(true)}
              className="border border-[#E2E8F0] text-[#2563EB] px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-1.5">
              <UserPlus size={15} /> Request Intern
            </button>
            {canAssignTask && (
              <button onClick={() => navigate('/pmo/tasks')}
                className="bg-[#2563EB] text-white px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-[#1D4ED8] transition-colors flex items-center gap-1.5">
                <Plus size={15} /> Assign Task
              </button>
            )}
          </div>
        </div>

        {/* STATS BAR */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl px-6 py-3 flex items-center gap-0 overflow-x-auto shadow-sm">
          <div className="flex items-center gap-2.5 px-4 shrink-0">
            <span className="material-symbols-outlined text-[20px] text-[#7C3AED]">school</span>
            <div>
              <div className="text-xl font-bold text-[#0F172A]">{interns.length}</div>
              <div className="text-[11px] text-[#64748B]">Total Interns</div>
            </div>
          </div>
          <div className="w-px h-8 bg-[#E2E8F0] mx-1 shrink-0" />
          <div className="flex items-center gap-2.5 px-4 shrink-0">
            <span className="material-symbols-outlined text-[20px] text-[#16A34A]">check_circle</span>
            <div>
              <div className="text-xl font-bold text-[#16A34A]">{activeInterns}</div>
              <div className="text-[11px] text-[#64748B]">Active</div>
            </div>
          </div>
          <div className="w-px h-8 bg-[#E2E8F0] mx-1 shrink-0" />
          <div className="flex items-center gap-2.5 px-4 shrink-0">
            <span className="material-symbols-outlined text-[20px] text-[#D97706]">event_upcoming</span>
            <div>
              <div className="text-xl font-bold text-[#D97706]">{completingSoon}</div>
              <div className="text-[11px] text-[#64748B]">Completing This Month</div>
            </div>
          </div>
          <div className="w-px h-8 bg-[#E2E8F0] mx-1 shrink-0" />
          <button onClick={() => navigate('/pmo/approvals')} className="flex items-center gap-2.5 px-4 shrink-0 rounded-lg py-1 hover:bg-[#F8FAFC] transition-colors">
            <span className="material-symbols-outlined text-[20px] text-[#2563EB]">task_alt</span>
            <div className="text-left">
              <div className="text-xl font-bold text-[#2563EB]">{pendingReviewCount}</div>
              <div className="text-[11px] text-[#64748B] border-b border-dashed border-[#BFDBFE]">Pending Review</div>
            </div>
          </button>
        </div>

        {/* SEARCH */}
        <div className="relative max-w-sm w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input type="text" placeholder="Search by name, college, or project..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[13px] focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        {/* LIST */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="grid items-center gap-4 px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider"
              style={{ gridTemplateColumns: '1fr 140px 120px 100px 110px 80px' }}>
              <span>Intern</span>
              <span>Project</span>
              <span className="text-center">Tasks</span>
              <span className="text-center">Progress</span>
              <span className="text-center">Rating</span>
              <span></span>
            </div>

            {filteredInterns.length === 0 ? (
              <div className="py-16 text-center text-[#94A3B8]">
                <span className="material-symbols-outlined text-[40px] mb-2 block opacity-40">school</span>
                <p className="text-[13px]">No interns found.</p>
              </div>
            ) : (
              filteredInterns.map(intern => {
                const name = intern.user?.name || 'Intern';
                const initial = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const uid = intern.user?._id;
                const tasks = taskMap[uid] || { assigned: 0, done: 0 };
                const pct = tasks.assigned > 0 ? Math.round((tasks.done / tasks.assigned) * 100) : 0;
                const ratings = intern.user?.performanceRatings || [];
                const combined = parseFloat(combinedRating(ratings));
                const hrAvg = roleAvg(ratings, 'hr');
                const pmoAvg = roleAvg(ratings, 'pmo');
                const isActive = intern.user?.status === 'Active';

                return (
                  <div key={uid}
                    className="grid items-center gap-4 px-4 py-3 border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC] transition-colors group cursor-pointer"
                    style={{ gridTemplateColumns: '1fr 140px 120px 100px 110px 80px' }}
                    onClick={() => openDrawer(intern)}
                  >
                    {/* Intern identity */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[12px] font-bold shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#0F172A] truncate group-hover:text-[#7C3AED] transition-colors">{name}</p>
                        <p className="text-[11px] text-[#94A3B8] truncate">{intern.user?.college || '—'}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${isActive ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' : 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]'}`}>
                        {intern.user?.status || 'Active'}
                      </span>
                    </div>

                    {/* Project */}
                    <div>
                      <span className="text-[11px] font-medium bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded truncate block max-w-[130px]">
                        {intern.project?.name || '—'}
                      </span>
                    </div>

                    {/* Task counts */}
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className="text-[11px] font-bold bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded">{tasks.assigned} assigned</span>
                      <span className="text-[11px] font-bold bg-[#ECFDF5] text-[#16A34A] px-2 py-0.5 rounded">{tasks.done} done</span>
                    </div>

                    {/* Progress bar */}
                    <div className="flex flex-col gap-1">
                      <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className="h-full bg-[#7C3AED] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-[#94A3B8] font-medium text-center">{pct}%</span>
                    </div>

                    {/* Star rating — combined */}
                    <div className="flex flex-col items-center gap-0.5 justify-center">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={12} className={s <= Math.round(combined) ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'} />
                        ))}
                        {combined === 0 && <span className="text-[10px] text-[#94A3B8] ml-1">—</span>}
                      </div>
                      {ratings.length > 0 && (
                        <div className="flex gap-1">
                          {hrAvg !== null && <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1 rounded">HR {hrAvg.toFixed(1)}</span>}
                          {pmoAvg !== null && <span className="text-[9px] bg-violet-100 text-violet-700 font-bold px-1 rounded">PMO {pmoAvg.toFixed(1)}</span>}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openDrawer(intern)}
                        className="p-1.5 text-[#94A3B8] hover:text-[#7C3AED] hover:bg-[#F5F3FF] rounded-lg transition-colors"
                        title="Evaluate"
                      >
                        <Star size={14} />
                      </button>
                      <button
                        onClick={() => navigate(`/pmo/interns/${uid}`)}
                        className="p-1.5 text-[#94A3B8] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg transition-colors"
                        title="View Profile"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* REQUEST INTERN MODAL */}
      {isRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-left">
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-[14px]"><UserPlus size={16} className="text-[#2563EB]" /> Request Interns from HR</h3>
              <button onClick={() => setIsRequestOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
            </div>
            <form onSubmit={handleRequestSubmit}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Project</label>
                  <select value={requestData.projectId} onChange={e => setRequestData({...requestData, projectId: e.target.value})}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-[13px] outline-none" required>
                    {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Department</label>
                  <select value={requestData.department} onChange={e => setRequestData({...requestData, department: e.target.value})}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-[13px] outline-none" required>
                    <option value="">Select department...</option>
                    {projects.map(p => p.department && (
                      <option key={p.department._id || p.department} value={p.department._id || p.department}>{p.department.name || 'Department'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Duration (Months)</label>
                  <input type="number" min="1" max="12" value={requestData.duration}
                    onChange={e => setRequestData({...requestData, duration: parseInt(e.target.value)})}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-[13px] outline-none" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Required Skills (Comma separated)</label>
                  <input type="text" placeholder="e.g. React, Node.js, UI Design" value={requestData.skills}
                    onChange={e => setRequestData({...requestData, skills: e.target.value})}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-[13px] outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Notes</label>
                  <textarea rows="3" placeholder="Provide context..." value={requestData.note}
                    onChange={e => setRequestData({...requestData, note: e.target.value})}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-[13px] outline-none resize-none" />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                <button type="button" onClick={() => setIsRequestOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-[13px] font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVAL DRAWER */}
      <AnimatePresence>
        {selectedIntern && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 cursor-pointer" onClick={() => setSelectedIntern(null)} />
            <motion.div initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-[#E2E8F0] text-left">

              <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-violet-100 text-violet-700">
                    {selectedIntern.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-[14px] font-bold text-[#0F172A]">{selectedIntern.user?.name}</h2>
                    <p className="text-[11px] text-[#64748B]">{selectedIntern.user?.college} • {selectedIntern.project?.name}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedIntern(null)} className="p-1.5 text-[#64748B] hover:bg-[#E2E8F0] rounded-full"><X size={16} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5">

                {/* Task Summary */}
                {(() => {
                  const uid = selectedIntern.user?._id;
                  const tasks = taskMap[uid] || { assigned: 0, done: 0 };
                  const pct = tasks.assigned > 0 ? Math.round((tasks.done / tasks.assigned) * 100) : 0;
                  return (
                    <div>
                      <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Task Summary</p>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 text-center">
                          <p className="text-[20px] font-black text-[#0F172A]">{tasks.assigned}</p>
                          <p className="text-[10px] font-bold text-[#64748B] uppercase">Assigned</p>
                        </div>
                        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-2.5 text-center">
                          <p className="text-[20px] font-black text-[#16A34A]">{tasks.done}</p>
                          <p className="text-[10px] font-bold text-[#64748B] uppercase">Completed</p>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className="h-full bg-[#7C3AED] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-1 text-right font-bold">{pct}% completion</p>
                    </div>
                  );
                })()}

                {/* Add Evaluation */}
                <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl p-4 space-y-3">
                  <p className="text-[13px] font-bold text-[#5B21B6]">Add Performance Evaluation</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#64748B] mb-1">Week #</label>
                      <input type="number" min="1" max="52" value={evalWeek} onChange={e => setEvalWeek(e.target.value)}
                        placeholder="e.g. 3"
                        className="w-full p-2 border border-[#DDD6FE] bg-white rounded-lg text-[13px] outline-none focus:border-[#7C3AED]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#64748B] mb-1">Rating</label>
                      <div className="flex items-center gap-0.5 mt-1.5">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} type="button"
                            onMouseEnter={() => setHoverRating(s)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setEvalRating(s)}
                            className="focus:outline-none">
                            <Star size={18} className={(hoverRating || evalRating) >= s ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-300'} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] mb-1">Note (Optional)</label>
                    <textarea rows="2" value={evalNote} onChange={e => setEvalNote(e.target.value)}
                      placeholder="Describe performance highlights..."
                      className="w-full p-2 border border-[#DDD6FE] bg-white rounded-lg text-[13px] outline-none focus:border-[#7C3AED] resize-none" />
                  </div>
                  <button onClick={handleEvalSubmit} disabled={evalSubmitting || !evalWeek || !evalRating}
                    className="w-full py-2 bg-[#7C3AED] text-white rounded-lg text-[13px] font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {evalSubmitting ? 'Saving...' : 'Save Evaluation'}
                  </button>
                </div>

                {/* History */}
                <div>
                  <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Evaluation History</p>
                  <div className="space-y-2">
                    {selectedIntern.user?.performanceRatings?.length > 0 ? (
                      <>
                        {/* Combined score header */}
                        <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-100 rounded-lg mb-2">
                          <div className="flex items-center gap-1.5">
                            <Star size={13} className="fill-amber-400 text-amber-400" />
                            <span className="text-[13px] font-bold text-[#0F172A]">
                              {combinedRating(selectedIntern.user.performanceRatings)}
                            </span>
                            <span className="text-[11px] text-[#94A3B8]">/ 5 combined</span>
                          </div>
                          <div className="flex gap-1.5">
                            {roleAvg(selectedIntern.user.performanceRatings, 'hr') !== null && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                HR {roleAvg(selectedIntern.user.performanceRatings, 'hr').toFixed(1)}★
                              </span>
                            )}
                            {roleAvg(selectedIntern.user.performanceRatings, 'pmo') !== null && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                                PMO {roleAvg(selectedIntern.user.performanceRatings, 'pmo').toFixed(1)}★
                              </span>
                            )}
                          </div>
                        </div>
                        {[...selectedIntern.user.performanceRatings].sort((a,b) => b.week - a.week).map((r, idx) => (
                          <div key={idx} className="flex items-start justify-between p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-[12px] font-bold text-[#475569]">Week {r.week}</p>
                                {r.source === 'pmo'
                                  ? <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-violet-100 text-violet-700">PMO</span>
                                  : <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700">HR</span>}
                              </div>
                              {r.note && <p className="text-[11px] text-[#64748B] mt-0.5">{r.note}</p>}
                            </div>
                            <div className="flex gap-0.5 shrink-0">
                              {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'} />)}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="text-[12px] text-[#94A3B8] italic">No evaluations yet.</p>
                    )}
                  </div>
                </div>

              </div>

              <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
                <button onClick={() => navigate(`/pmo/interns/${selectedIntern.user?._id}`)}
                  className="w-full py-2 border border-[#7C3AED] text-[#7C3AED] rounded-lg text-[13px] font-bold hover:bg-[#F5F3FF] transition-colors">
                  View Full Profile
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
