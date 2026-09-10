import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import { Users, CalendarDays, CheckSquare, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { employeeAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const healthColor = (h) => ({
  'On Track': 'text-green-600', 'At Risk': 'text-amber-600', 'Delayed': 'text-red-600',
}[h] || 'text-slate-500');

const statusBadge = (s) => ({
  Active:    'bg-green-100 text-green-700',
  Planning:  'bg-blue-100 text-blue-700',
  Completed: 'bg-slate-100 text-slate-600',
  'On Hold': 'bg-amber-100 text-amber-700',
}[s] || 'bg-slate-100 text-slate-600');

const priorityBadge = (p) => ({
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-orange-100 text-orange-700',
  Medium:   'bg-amber-100 text-amber-700',
  Low:      'bg-green-100 text-green-700',
}[p] || 'bg-slate-100 text-slate-600');

function ProjectDrawer({ project, onClose }) {
  if (!project) return null;

  const myRole = project.myRole || 'Member';
  const managerName = project.manager?.name || '—';

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} />
      <motion.div
        initial={{ x: 480, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 480, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-[#E2E8F0]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
          <button onClick={onClose} className="absolute top-5 right-5 text-[#64748B] hover:bg-[#E2E8F0] p-1.5 rounded-full">
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${statusBadge(project.status)}`}>{project.status}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${priorityBadge(project.priority)}`}>{project.priority} Priority</span>
          </div>
          <h2 className="text-xl font-bold text-[#0F172A] pr-10">{project.name}</h2>
          <span className="mt-2 inline-block text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded">
            My Role: {myRole}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-7">
          {/* Description */}
          <div>
            <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Description</h4>
            <p className="text-sm text-[#0F172A] leading-relaxed">{project.description || 'No description provided.'}</p>
          </div>

          {/* Milestones */}
          {project.milestones?.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-4">Milestones</h4>
              <div className="relative border-l-2 border-[#E2E8F0] ml-2 space-y-5">
                {project.milestones.map((ms, i) => (
                  <div key={i} className="relative pl-5">
                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                      ms.status === 'completed' ? 'bg-green-500' : ms.status === 'current' ? 'bg-[#2563EB] ring-2 ring-blue-100' : 'bg-[#CBD5E1]'
                    }`} />
                    <p className={`text-sm font-bold ${ms.status === 'upcoming' ? 'text-[#64748B]' : 'text-[#0F172A]'}`}>{ms.name}</p>
                    <p className="text-xs text-[#64748B] mt-0.5">{fmtDate(ms.date)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Tasks snapshot */}
          {project.myTasks?.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">My Tasks in this Project</h4>
              <div className="space-y-2">
                {project.myTasks.slice(0, 5).map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-[#E2E8F0] rounded-xl">
                    <div className="flex items-center gap-3">
                      <CheckSquare size={15} className={t.status === 'Done' ? 'text-green-500' : 'text-[#94A3B8]'} />
                      <span className={`text-sm font-medium ${t.status === 'Done' ? 'text-[#64748B] line-through' : 'text-[#0F172A]'}`}>{t.title}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team snapshot */}
          {project.team?.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Team</h4>
              <div className="space-y-3">
                {project.team.map((m, i) => {
                  const name = m.user?.name || m.name || '?';
                  const av   = name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-xs font-bold shrink-0">{av}</div>
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">{name}</p>
                        <p className="text-xs text-[#64748B]">{m.role || m.user?.designation || 'Member'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contacts */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
            <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Contacts</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Project Manager</span>
                <span className="font-semibold text-[#0F172A]">{managerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Due Date</span>
                <span className="font-semibold text-[#0F172A]">{fmtDate(project.endDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function EmployeeProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    employeeAPI.getProjects()
      .then(r => setProjects(r.data?.data || []))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch full project detail (with myTasks) when opening drawer
  const handleOpen = async (proj) => {
    setSelected(proj); // show immediately with list data
    try {
      const r = await employeeAPI.getProject(proj._id);
      setSelected(r.data?.data || r.data);
    } catch { /* keep list data */ }
  };

  return (
    <PageWrapper>
      <div className="w-full flex flex-col gap-6 max-w-[1200px] mx-auto pb-8 font-sans px-6 mt-6">

        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">My Projects</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {loading ? 'Loading…' : `${projects.length} project${projects.length !== 1 ? 's' : ''} assigned to you`}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-[#64748B]">
            <p className="text-lg font-semibold">No projects assigned yet.</p>
            <p className="text-sm mt-1">Your PMO lead will assign you to a project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projects.map(proj => {
              const done  = proj.myTaskStats?.done  || 0;
              const total = proj.myTaskStats?.total || 0;
              const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={proj._id} className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-shadow">

                  {/* Card header — clickable */}
                  <div className="p-6 cursor-pointer group hover:bg-[#F8FAFC] transition-colors border-b border-[#E2E8F0]"
                    onClick={() => handleOpen(proj)}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors line-clamp-1 pr-4">{proj.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${statusBadge(proj.status)}`}>{proj.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${priorityBadge(proj.priority)}`}>{proj.priority} Priority</span>
                      {proj.myRole && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB]">
                          My Role: {proj.myRole}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#64748B] line-clamp-2 leading-relaxed">
                      {proj.description || 'No description.'}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="p-6 flex-1">
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                          <CheckSquare size={13} className="text-[#64748B]" /> My Tasks
                        </span>
                        <span className="text-xs font-bold text-[#2563EB]">{done}/{total} done</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#64748B] mb-4">
                      <div className="flex items-center gap-1.5">
                        <Users size={13} /> <span>{proj.teamSize || proj.team?.length || 0} members</span>
                      </div>
                      <span className="text-slate-300">·</span>
                      <div className="flex items-center gap-1.5">
                        <CalendarDays size={13} /> <span>{fmtDate(proj.endDate)}</span>
                      </div>
                      <span className="text-slate-300">·</span>
                      <span>PM: {proj.manager?.name || '—'}</span>
                    </div>

                    <div className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                      {proj.healthStatus === 'On Track' && <CheckCircle2 size={14} className="text-green-600" />}
                      {proj.healthStatus === 'At Risk'  && <AlertCircle  size={14} className="text-amber-600" />}
                      {proj.healthStatus === 'Delayed'  && <AlertCircle  size={14} className="text-red-600" />}
                      <span className={`text-sm font-bold ${healthColor(proj.healthStatus)}`}>
                        {proj.healthStatus || 'On Track'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex border-t border-[#E2E8F0] bg-[#F8FAFC]">
                    <button onClick={() => navigate('/employee/tasks')}
                      className="flex-1 py-3 text-sm font-bold text-[#0F172A] hover:text-[#2563EB] hover:bg-white transition-colors border-r border-[#E2E8F0] flex items-center justify-center gap-2">
                      <CheckSquare size={15} /> My Tasks
                    </button>
                    <button onClick={() => navigate('/employee/team')}
                      className="flex-1 py-3 text-sm font-bold text-[#0F172A] hover:text-[#2563EB] hover:bg-white transition-colors flex items-center justify-center gap-2">
                      <Users size={15} /> Team
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ProjectDrawer project={selected} onClose={() => setSelected(null)} />
    </PageWrapper>
  );
}
