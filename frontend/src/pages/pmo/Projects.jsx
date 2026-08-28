import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import AccessDenied from '../../components/shared/AccessDenied';
import { Eye } from 'lucide-react';
import { pmoAPI, adminAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function PMOProjects() {
  const navigate = useNavigate();
  const { user: currentUser, hasPermission } = useAuth();
  const canRead          = hasPermission('Projects', 'read');
  const canCreateProject = hasPermission('Projects', 'create');

  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Active');
  const [search, setSearch] = useState('');

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '', description: '', dueDate: '', priority: 'Medium', department: '', hrRepId: ''
  });
  const [availableHRs, setAvailableHRs] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const projRes = await pmoAPI.getProjects();
      setProjects(projRes.data.data || []);
      try {
        const deptRes = await adminAPI.getDepartments();
        setDepartments(deptRes.data.data || []);
      } catch {
        if (currentUser?.department) setDepartments([currentUser.department]);
      }
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchHRs = async () => {
    try {
      const res = await pmoAPI.getAvailableMembers({ type: 'hr' });
      setAvailableHRs(res.data.data || []);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => { fetchData(); }, [canRead]);


  const filteredProjects = projects.filter(p => {
    const matchesFilter = filter === 'All' || p.status === filter;
    const matchesSearch = 
      p.name?.toLowerCase().includes(search.toLowerCase()) || 
      p.code?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCreateProject = async () => {
    if (submitting) return;
    if (!newProject.name.trim()) { toast.error('Project name is required.'); return; }
    const dept = newProject.department || departments[0]?._id || departments[0];
    if (!dept) { toast.error('Department is required.'); return; }
    if (!newProject.hrRepId) { toast.error('Please select an HR Representative.'); return; }
    
    setSubmitting(true);
    try {
      const res = await pmoAPI.createProject({
        name: newProject.name,
        description: newProject.description,
        department: dept,
        priority: newProject.priority,
        endDate: newProject.dueDate ? new Date(newProject.dueDate) : undefined,
        hrRepId: newProject.hrRepId || undefined,
      });
      toast.success('Project created! Go to View Details to assemble your team.');
      setIsWizardOpen(false);
      setNewProject({ name: '', description: '', dueDate: '', priority: 'Medium', department: '', hrRepId: '' });
      const projRes = await pmoAPI.getProjects();
      setProjects(projRes.data.data || []);
      navigate(`/pmo/projects/${res.data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No due date';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!canRead) return <PageWrapper><AccessDenied message="You don't have permission to view projects." /></PageWrapper>;

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] w-full flex flex-col h-full gap-8 max-w-[1400px] mx-auto pb-12 relative">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">My Projects</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Manage your isolated project teams, requests, and timelines.
            </p>
          </div>
          {canCreateProject && (
            <button
              onClick={() => {
                if (departments.length > 0 && !newProject.department) {
                  setNewProject(prev => ({ ...prev, department: departments[0]._id || departments[0] }));
                }
                fetchHRs();
                setIsWizardOpen(true);
              }}
              className="bg-[#2563EB] text-white px-5 py-2 rounded-lg text-[13px] font-medium hover:bg-[#1D4ED8] transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Project
            </button>
          )}
        </div>

        {/* FILTERS & SEARCH */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex bg-[#F1F5F9] p-1 rounded-lg w-fit">
            {['All', 'Active', 'Planning', 'Completed'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-1.5 text-[13px] font-bold rounded-md transition-all ${
                  filter === f ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-[300px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-[18px]">search</span>
            <input 
              type="text" 
              placeholder="Search my projects..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors shadow-sm"
            />
          </div>
        </div>

        {/* PROJECT GRID */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map(p => {
              let healthColor = 'text-[#64748B] bg-[#F1F5F9] border-[#E2E8F0]';
              if (p.healthStatus === 'On Track') healthColor = 'text-[#10B981] bg-[#ECFDF5] border-[#D1FAE5]';
              else if (p.healthStatus === 'At Risk') healthColor = 'text-[#F59E0B] bg-[#FFFBEB] border-[#FEF3C7]';
              else if (p.healthStatus === 'Delayed') healthColor = 'text-[#EF4444] bg-[#FEF2F2] border-[#FEE2E2]';

              let progressBarColor = 'bg-[#2563EB]';
              if (p.healthStatus === 'On Track') progressBarColor = 'bg-[#10B981]';
              else if (p.healthStatus === 'At Risk') progressBarColor = 'bg-[#F59E0B]';
              else if (p.healthStatus === 'Delayed') progressBarColor = 'bg-[#EF4444]';

              return (
                <div key={p._id} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group cursor-pointer text-left">
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md w-fit border border-[#E2E8F0]">{p.code}</span>
                        <h3 className="text-[16px] font-bold text-[#0F172A] leading-tight group-hover:text-[#2563EB] transition-colors">{p.name}</h3>
                      </div>
                      <div className={`text-[11px] font-bold flex items-center gap-1.5 px-2 py-1 rounded-full border ${healthColor}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {p.healthStatus || 'Planning'}
                      </div>
                    </div>
                    <p className="text-[13px] text-[#64748B] leading-relaxed mb-6 line-clamp-2 flex-1">{p.description || 'No description provided.'}</p>
                    <div className="mb-6">
                      <div className="flex justify-between text-[11px] font-bold text-[#0F172A] mb-2">
                        <span>Progress</span><span>{p.completionPercent || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className={`h-full ${progressBarColor} rounded-full transition-all`} style={{ width: `${p.completionPercent || 0}%` }} />
                      </div>
                    </div>
                    <div className="pt-5 border-t border-[#F1F5F9] flex items-center justify-between mt-auto">
                      <div className="flex -space-x-2">
                        {p.team && p.team.slice(0, 4).map((member, i) => {
                          const name = member.user?.name || 'Unknown';
                          const initial = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                          return (
                            <div 
                              key={member.user?._id || i} 
                              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center font-bold text-[11px] bg-[#EFF6FF] text-[#1D4ED8]"
                              title={`${name} (${member.role})`}
                            >
                              {initial}
                            </div>
                          );
                        })}
                        {p.team && p.team.length > 4 && (
                          <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center font-bold text-[10px] bg-slate-100 text-slate-600">
                            +{p.team.length - 4}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] bg-[#F8FAFC] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0]">
                          <span className="material-symbols-outlined text-[14px]">event</span>
                          {formatDate(p.endDate)}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/pmo/projects/${p._id}`); }}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-[#2563EB] hover:bg-[#EFF6FF] border border-transparent hover:border-[#BFDBFE] px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Eye size={14} /> View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredProjects.length === 0 && (
              <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                <p className="text-[#64748B] font-medium">{projects.length === 0 ? 'No projects yet. Create your first project.' : 'No projects found matching the filters.'}</p>
              </div>
            )}
          </div>
        )}

        {/* --- CREATE PROJECT MODAL --- */}
        {isWizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-left">
              <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-[#2563EB]">rocket_launch</span>
                  <div>
                    <h2 className="text-[15px] font-bold text-[#0F172A]">Create New Isolated Project</h2>
                    <p className="text-[12px] text-[#64748B]">Project Foundation</p>
                  </div>
                </div>
                <button onClick={() => setIsWizardOpen(false)} className="text-[#64748B] hover:bg-[#E2E8F0] p-1 rounded-full">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[12px] font-bold text-[#0F172A] mb-1.5">Project Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={newProject.name}
                      onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                      className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[13px] outline-none focus:border-[#2563EB]"
                      placeholder="e.g. Website Redesign"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#0F172A] mb-1.5">Department <span className="text-red-500">*</span></label>
                    <select
                      value={newProject.department}
                      onChange={e => setNewProject({ ...newProject, department: e.target.value })}
                      className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[13px] outline-none focus:border-[#2563EB] cursor-pointer"
                    >
                      {departments.map(d => (
                        <option key={d._id || d} value={d._id || d}>{d.name || d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#0F172A] mb-1.5">Priority</label>
                    <select
                      value={newProject.priority}
                      onChange={e => setNewProject({ ...newProject, priority: e.target.value })}
                      className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[13px] outline-none focus:border-[#2563EB] cursor-pointer"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#0F172A] mb-1.5">Due Date</label>
                    <input
                      type="date"
                      value={newProject.dueDate}
                      onChange={e => setNewProject({ ...newProject, dueDate: e.target.value })}
                      className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[13px] outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[12px] font-bold text-[#0F172A] mb-1.5">
                      HR Representative <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newProject.hrRepId}
                      onChange={e => setNewProject({ ...newProject, hrRepId: e.target.value })}
                      className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[13px] outline-none focus:border-[#2563EB] cursor-pointer"
                    >
                      <option value="">Select an HR Representative...</option>
                      {availableHRs.map(hr => (
                        <option key={hr._id} value={hr._id}>{hr.name} — {hr.designation || 'HR Manager'}</option>
                      ))}
                    </select>
                    {availableHRs.length === 0 && (
                      <p className="text-[11px] text-[#94A3B8] mt-1">No available HR managers found.</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[12px] font-bold text-[#0F172A] mb-1.5">Description</label>
                    <textarea
                      value={newProject.description}
                      onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                      rows="3"
                      className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[13px] outline-none focus:border-[#2563EB] resize-none"
                      placeholder="Briefly describe the project goals..."
                    />
                  </div>
                </div>

                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-4 py-3 text-[12px] text-[#1D4ED8] font-medium">
                  After creating the project, go to <strong>View Details → Team</strong> to assemble your isolated team.
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end gap-3">
                <button 
                  onClick={() => setIsWizardOpen(false)} 
                  disabled={submitting}
                  className="px-4 py-2 text-[13px] font-bold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={submitting}
                  className={`px-5 py-2 bg-[#2563EB] text-white rounded-lg text-[13px] font-bold transition-colors flex items-center gap-2 ${
                    submitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#1D4ED8]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[16px] ${submitting ? 'animate-spin' : ''}`}>
                    {submitting ? 'sync' : 'rocket_launch'}
                  </span>
                  {submitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageWrapper>
  );
}
