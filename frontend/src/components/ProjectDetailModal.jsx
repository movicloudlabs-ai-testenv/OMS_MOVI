import { useEffect, useState } from 'react';
import Modal from './Modal';
import { projectsAPI } from '../api';
import StatusBadge from './StatusBadge';
import toast from 'react-hot-toast';

export default function ProjectDetailModal({ projectId, isOpen, onClose }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && projectId) {
      setLoading(true);
      projectsAPI.getById(projectId)
        .then(res => setProject(res.data.data))
        .catch(() => toast.error('Failed to load project details'))
        .finally(() => setLoading(false));
    } else {
      setProject(null);
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Project Details" maxWidth="max-w-4xl">
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="spinner w-8 h-8" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Project Details...</p>
        </div>
      ) : project ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* HEADER: Project Info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem]">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary border-4 border-white shadow-sm shrink-0">
                <span className="material-symbols-outlined text-3xl">hub</span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-black font-mono text-slate-400 uppercase tracking-tighter">
                    #{project.code}
                  </span>
                  <StatusBadge status={project.health} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mt-1">{project.name}</h2>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              <div className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${project.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span className="text-sm font-bold text-slate-800 capitalize">{project.status?.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm lowercase">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Deadline</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-slate-300">event</span>
                  <span className="text-sm font-bold text-slate-800">
                    {project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Deadline'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BODY: Description */}
          <div className="px-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-4">Project Scope</h3>
            <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-slate-600 leading-relaxed text-sm">
                {project.description || 'No description provided for this project.'}
              </p>
            </div>
          </div>

          {/* TEAM SECTION */}
          <div className="px-2">
            <div className="flex items-center justify-between mb-4 px-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Assigned Team</h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-500">
                {project.team?.length || 0} Members
              </span>
            </div>
            
            {!project.team || project.team.length === 0 ? (
              <div className="p-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-slate-300 text-4xl">group_off</span>
                <p className="text-sm font-bold text-slate-400">No interns assigned to this project yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.team.map((member, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-primary/20 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                      {member.user?.profileImage ? (
                        <img src={member.user.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-slate-400">{member.user?.name?.[0]}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate leading-none mb-1">{member.user?.name}</p>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">{member.role || 'Member'}</p>
                      <p className="text-[10px] font-medium text-slate-400 truncate mt-1">@{member.user?.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button onClick={onClose} className="btn-secondary px-8 py-3 text-[10px] font-black uppercase tracking-widest">Close Project Summary</button>
          </div>

        </div>
      ) : (
        <div className="py-20 text-center text-slate-400">Project not found.</div>
      )}
    </Modal>
  );
}
