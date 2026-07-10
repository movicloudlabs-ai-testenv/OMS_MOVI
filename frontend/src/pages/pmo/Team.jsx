import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, UserPlus, X, ChevronDown, Eye, Plus, SlidersHorizontal } from 'lucide-react';
import PageWrapper from '../../components/PageWrapper';
import { pmoAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function PMOTeam() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Users', 'read');
  const canViewProfile = canRead;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [teamData, setTeamData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  
  const [selectedMember, setSelectedMember] = useState(null); // For drawer

  const fetchTeam = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const response = await pmoAPI.getTeam();
      setTeamData(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [canRead]);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const formattedTeam = (teamData || []).filter(item => item.user).map(item => {
    const user = item.user;
    const stats = item.stats || { activeTasks: 0, completedTasks: 0, overdueTasksCount: 0, workload: 0 };
    return {
      id: user._id,
      name: user.name,
      employeeId: user.employeeId || 'ID N/A',
      role: user.designation || 'Team Member',
      dept: user.department?.name || 'General',
      workload: stats.workload || 0,
      activeProjects: item.projects || [],
      tasksActive: stats.activeTasks || 0,
      tasksDone: stats.completedTasks || 0,
      tasksOverdue: stats.overdueTasksCount || 0,
      avatar: getInitials(user.name),
    };
  });

  const getStatus = (workload) => {
    if (workload < 50) return { label: 'Available', color: 'bg-[#DCFCE7] text-[#16A34A]' };
    if (workload <= 80) return { label: 'Active', color: 'bg-[#DBEAFE] text-[#2563EB]' };
    if (workload <= 95) return { label: 'At Capacity', color: 'bg-[#FEF3C7] text-[#D97706]' };
    return { label: 'Overloaded', color: 'bg-[#FEE2E2] text-[#DC2626]' };
  };

  const getWorkloadColor = (workload) => {
    if (workload < 50) return 'bg-[#16A34A]';
    if (workload <= 80) return 'bg-[#D97706]';
    return 'bg-[#DC2626]';
  };

  const totalMembers = formattedTeam.length;
  const fullyAvailable = formattedTeam.filter(m => m.workload < 50).length;
  const atCapacity = formattedTeam.filter(m => m.workload >= 80 && m.workload <= 95).length;
  const overloaded = formattedTeam.filter(m => m.workload > 95).length;
  const avgUtilization = totalMembers > 0 ? Math.round(formattedTeam.reduce((acc, m) => acc + m.workload, 0) / totalMembers) : 0;

  // Filters
  const allProjects = ['All', ...new Set(formattedTeam.flatMap(m => m.activeProjects))];
  const statuses = ['All', 'Available', 'Active', 'At Capacity', 'Overloaded'];

  const filteredTeam = formattedTeam.filter(member => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = member.name.toLowerCase().includes(term) || member.role.toLowerCase().includes(term);
    
    const matchesProject = selectedProject === 'All' || member.activeProjects.includes(selectedProject);
    const matchesStatus = selectedStatus === 'All' || getStatus(member.workload).label === selectedStatus;

    return matchesSearch && matchesProject && matchesStatus;
  });

  if (!canRead) return <PageWrapper><AccessDenied message="You don't have permission to view the team." /></PageWrapper>;

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] w-full flex flex-col h-full bg-[#F8FAFC]">
        {/* HEADER */}
        <div className="bg-white border-b border-[#E2E8F0] px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Team</h1>
              <p className="text-sm text-[#64748B] mt-1">Manage resources and workload across all projects</p>
            </div>
            <button onClick={() => navigate('/pmo/projects')} className="bg-[#2563EB] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-[#1D4ED8] transition-colors shadow-sm flex items-center gap-2">
              <UserPlus size={18} /> Add Team Member
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 p-8 overflow-y-auto">
          
          {/* STATS BAR */}
          <div className="flex items-center gap-4 text-sm mb-6 bg-white border border-[#E2E8F0] rounded-lg px-4 py-3 shadow-sm font-semibold">
            <span className="text-[#0F172A]">Total: {totalMembers} members</span>
            <span className="w-px h-4 bg-[#E2E8F0]" />
            <span className="text-[#16A34A]">Available: {fullyAvailable}</span>
            <span className="w-px h-4 bg-[#E2E8F0]" />
            <span className="text-[#D97706]">At Capacity: {atCapacity}</span>
            <span className="w-px h-4 bg-[#E2E8F0]" />
            <span className={`${overloaded > 0 ? 'text-[#DC2626]' : 'text-[#64748B]'}`}>Overloaded: {overloaded}</span>
            <span className="w-px h-4 bg-[#E2E8F0]" />
            <span className="text-[#2563EB]">Average Workload: {avgUtilization}%</span>
          </div>

          {/* TOOLBAR */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
            <div className="relative w-full md:w-80">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input 
                type="text" 
                placeholder="Search team members..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative">
                <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="appearance-none pl-4 pr-10 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC] outline-none cursor-pointer">
                  {allProjects.map(p => <option key={p} value={p}>{p === 'All' ? 'All Projects' : p}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none" />
              </div>

              <div className="relative">
                <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="appearance-none pl-4 pr-10 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC] outline-none cursor-pointer">
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* TABLE */}
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
            </div>
          ) : filteredTeam.length === 0 ? (
            <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
              <p className="text-sm font-semibold text-[#64748B]">No team members found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm text-[#475569]">
                <thead className="bg-[#F8FAFC] text-xs uppercase font-bold text-[#64748B] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-6 py-4 font-bold">Member</th>
                    <th className="px-6 py-4 font-bold">Role & Department</th>
                    <th className="px-6 py-4 font-bold">Active Projects</th>
                    <th className="px-6 py-4 font-bold">Tasks</th>
                    <th className="px-6 py-4 font-bold">Workload</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredTeam.map(member => (
                    <tr 
                      key={member.id} 
                      className="hover:bg-[#F8FAFC] cursor-pointer transition-colors group"
                      onClick={() => setSelectedMember(member)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0">
                            {member.avatar}
                          </div>
                          <div>
                            <p className="font-semibold text-[#0F172A]">{member.name}</p>
                            <p className="text-xs text-[#64748B] font-mono mt-0.5">{member.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#0F172A]"><span className="inline-block px-2 py-0.5 bg-[#F1F5F9] text-[#475569] rounded uppercase text-[10px] tracking-wide mb-1">{member.role}</span></p>
                        <p className="text-xs text-[#64748B]">{member.dept}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {member.activeProjects.slice(0, 2).map((p, i) => (
                            <span key={i} className="bg-[#EFF6FF] text-[#2563EB] text-xs px-2 py-0.5 rounded-full font-semibold">{p}</span>
                          ))}
                          {member.activeProjects.length > 2 && (
                            <span className="bg-[#F1F5F9] text-[#64748B] text-xs px-2 py-0.5 rounded-full font-semibold">+{member.activeProjects.length - 2} more</span>
                          )}
                          {member.activeProjects.length === 0 && <span className="text-xs text-[#94A3B8] italic">None</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#0F172A] font-semibold">{member.tasksActive} active / {member.tasksDone} done</p>
                        {member.tasksOverdue > 0 && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-[#DC2626] bg-[#FEF2F2] px-1.5 py-0.5 rounded">
                            ({member.tasksOverdue} overdue)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="w-full"></span>
                          <span className={`text-xs font-bold ${getWorkloadColor(member.workload).replace('bg-', 'text-')}`}>{member.workload}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div className={`h-full ${getWorkloadColor(member.workload)}`} style={{ width: `${Math.min(member.workload, 100)}%` }} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold ${getStatus(member.workload).color}`}>
                          {getStatus(member.workload).label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => canViewProfile ? navigate(`/hr/employees/${member.id}`) : toast.error('Permission denied')}
                            className="p-1.5 text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded transition-colors"
                            title="View Profile"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => navigate('/pmo/tasks')}
                            className="p-1.5 text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded transition-colors"
                            title="Assign Task"
                          >
                            <Plus size={18} />
                          </button>
                          <button 
                            onClick={() => navigate('/pmo/tasks')}
                            className="p-1.5 text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded transition-colors"
                            title="Adjust Workload"
                          >
                            <SlidersHorizontal size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center text-sm text-[#64748B]">
                <span>Showing {filteredTeam.length} members</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* DRAWER */}
      <AnimatePresence>
        {selectedMember && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#0F172A]/20 backdrop-blur-sm z-40"
              onClick={() => setSelectedMember(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-[#E2E8F0]"
            >
              <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center shrink-0">
                <h2 className="font-bold text-[#0F172A]">Member Details</h2>
                <button onClick={() => setSelectedMember(null)} className="text-[#64748B] hover:bg-[#E2E8F0] p-1 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-xl font-bold shrink-0">
                    {selectedMember.avatar}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0F172A]">{selectedMember.name}</h3>
                    <p className="text-sm font-mono text-[#64748B] mb-1">{selectedMember.employeeId}</p>
                    <span className="text-xs font-bold uppercase tracking-wide bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded mr-2">{selectedMember.role}</span>
                    <span className="text-xs font-bold uppercase tracking-wide border border-[#E2E8F0] text-[#64748B] px-2 py-0.5 rounded">{selectedMember.dept}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[11px] tracking-widest text-[#94A3B8] font-bold uppercase">Workload</span>
                    <span className={`text-3xl font-black leading-none ${getWorkloadColor(selectedMember.workload).replace('bg-', 'text-')}`}>
                      {selectedMember.workload}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden mt-2">
                    <div className={`h-full ${getWorkloadColor(selectedMember.workload)}`} style={{ width: `${Math.min(selectedMember.workload, 100)}%` }} />
                  </div>
                  <div className="mt-3 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold ${getStatus(selectedMember.workload).color}`}>
                      {getStatus(selectedMember.workload).label}
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-xs font-bold text-[#64748B] mb-2 uppercase">Active Projects</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.activeProjects.length > 0 ? selectedMember.activeProjects.map((p, i) => (
                      <span key={i} className="text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] px-2.5 py-1 rounded-lg border border-[#DBEAFE]">{p}</span>
                    )) : <span className="text-xs font-medium text-[#94A3B8] italic">Unassigned</span>}
                  </div>
                </div>

                <div className="flex justify-between text-center divide-x divide-[#E2E8F0] border-y border-[#E2E8F0] py-4 mb-6">
                  <div className="flex-1"><p className="text-lg font-black text-[#2563EB]">{selectedMember.tasksActive}</p><p className="text-[10px] uppercase font-bold text-[#64748B]">Active</p></div>
                  <div className="flex-1"><p className="text-lg font-black text-[#16A34A]">{selectedMember.tasksDone}</p><p className="text-[10px] uppercase font-bold text-[#64748B]">Done</p></div>
                  <div className="flex-1"><p className="text-lg font-black text-[#DC2626]">{selectedMember.tasksOverdue}</p><p className="text-[10px] uppercase font-bold text-[#64748B]">Overdue</p></div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => canViewProfile ? navigate(`/hr/employees/${selectedMember.id}`) : toast.error('Permission denied')}
                    className="w-full py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm font-bold rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center gap-2"
                  >
                    <Eye size={16} /> View Full Profile
                  </button>
                  <button 
                    onClick={() => navigate('/pmo/tasks')}
                    className="w-full py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm font-bold rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Assign Task
                  </button>
                  <button 
                    onClick={() => navigate('/pmo/tasks')}
                    className="w-full py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm font-bold rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center gap-2"
                  >
                    <SlidersHorizontal size={16} /> Adjust Workload
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </PageWrapper>
  );
}
