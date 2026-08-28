import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import { TaskDetailModal } from '../../components/pmo/TaskDetailModal';
import { GraduationCap, X } from 'lucide-react';
import { pmoAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'border-l-[#64748B]' },
  { id: 'in-progress', title: 'In Progress', color: 'border-l-[#2563EB]' },
  { id: 'qa', title: 'QA / Review', color: 'border-l-[#F59E0B]' },
  { id: 'completed', title: 'Completed', color: 'border-l-[#10B981]' },
];

const PRIORITY_STYLES = {
  Low: { icon: 'keyboard_arrow_down', color: 'text-[#64748B]', bg: 'bg-[#F1F5F9]' },
  Medium: { icon: 'drag_handle', color: 'text-[#D97706]', bg: 'bg-[#FFFBEB]' },
  High: { icon: 'keyboard_arrow_up', color: 'text-[#EA580C]', bg: 'bg-[#FFF7ED]' },
  Critical: { icon: 'priority_high', color: 'text-[#DC2626]', bg: 'bg-[#FEF2F2]' },
};

const STATUS_MAP_FE_TO_BE = {
  'backlog': 'Todo',
  'in-progress': 'In Progress',
  'qa': 'In Review',
  'completed': 'Done'
};

const STATUS_MAP_BE_TO_FE = {
  'Todo': 'backlog',
  'In Progress': 'in-progress',
  'In Review': 'qa',
  'Done': 'completed',
  'Blocked': 'in-progress'
};

export default function PMOTaskBoard() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTaskId = searchParams.get('taskId');

  const canRead = hasPermission('Tasks', 'read');
  const canCreate = hasPermission('Tasks', 'create');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [currentProjectDetails, setCurrentProjectDetails] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [internAssignTask, setInternAssignTask] = useState(null);
  const [selectedInternId, setSelectedInternId] = useState('');
  const [reassignTask, setReassignTask] = useState(null);
  const [reassignTo, setReassignTo] = useState('');
  const [availableOrgInterns, setAvailableOrgInterns] = useState([]);
  const [availableOrgTeam, setAvailableOrgTeam] = useState([]);

  // Bulk Reassignment State
  const [isBulkReassignModalOpen, setIsBulkReassignModalOpen] = useState(false);
  const [bulkSelectedTaskIds, setBulkSelectedTaskIds] = useState([]);
  const [bulkReassignTo, setBulkReassignTo] = useState('');
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Create Task Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'Medium',
    dueDate: '',
    effortPoints: 5
  });

  const fetchAllOrgResources = async () => {
    try {
      const [internsRes, teamRes] = await Promise.all([
        pmoAPI.getInterns().catch(() => ({ data: { data: [] } })),
        pmoAPI.getTeam().catch(() => ({ data: { data: [] } })),
      ]);
      setAvailableOrgInterns(internsRes.data?.data || []);
      setAvailableOrgTeam(teamRes.data?.data || []);
    } catch (e) {
      console.warn('Could not load org resources:', e);
    }
  };

  const fetchProjects = async () => {
    if (!canRead) return;
    try {
      const res = await pmoAPI.getProjects();
      const projectList = res.data.data || [];
      setProjects(projectList);
      if (projectList.length > 0 && !selectedProject) {
        setSelectedProject(projectList[0]._id);
      } else if (projectList.length === 0) {
        setLoading(false);
      }
    } catch (error) {
      toast.error('Failed to load projects');
      setLoading(false);
    }
  };

  const fetchProjectTasksAndDetails = async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const [tasksRes, projectRes] = await Promise.all([
        pmoAPI.getTasks({ projectId: selectedProject }),
        pmoAPI.getProject(selectedProject)
      ]);
      
      const mappedTasks = (tasksRes.data.data || []).map(t => {
        const name = t.assignedTo?.name || 'Unassigned';
        const initial = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return {
          id: t._id,
          title: t.title,
          description: t.description,
          projectId: t.project?._id || selectedProject,
          priority: t.priority || 'Medium',
          status: STATUS_MAP_BE_TO_FE[t.status] || 'backlog',
          effort: `${t.effortPoints || 0} pts`,
          blocked: t.status === 'Blocked',
          needsReassignment: !!t.needsReassignment,
          assignees: [{ initial, bg: 'bg-[#EFF6FF]', text: 'text-[#1D4ED8]', name }],
          raw: t
        };
      });
      
      setTasks(mappedTasks);
      setCurrentProjectDetails(projectRes.data.data);
    } catch (error) {
      toast.error('Failed to load project details or tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchAllOrgResources();
  }, [canRead]);

  useEffect(() => {
    fetchProjectTasksAndDetails();
  }, [selectedProject]);

  // Load and display task directly if URL search parameter taskId is present
  useEffect(() => {
    if (!urlTaskId || !canRead) return;
    (async () => {
      try {
        const res = await pmoAPI.getTask(urlTaskId);
        const taskData = res.data?.data || res.data;
        if (taskData) {
          const urlTab = searchParams.get('tab');
          if (urlTab) taskData.initialTab = urlTab;
          const projId = taskData.project?._id || taskData.project;
          if (projId) setSelectedProject(projId);
          setSelectedTask(taskData);
        }
      } catch (err) {
        console.warn('Could not load target task by ID:', err);
      }
    })();
  }, [urlTaskId, searchParams, canRead]);

  // Drag and Drop handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== targetStatus) {
      const beStatus = STATUS_MAP_FE_TO_BE[targetStatus];
      try {
        await pmoAPI.updateTaskStatus(draggedTask.id, { status: beStatus });
        setTasks(prev => prev.map(t => t.id === draggedTask.id ? { ...t, status: targetStatus } : t));
        toast.success(`Task moved to ${beStatus}`);
      } catch (err) {
        toast.error('Failed to update task status in backend');
      }
    }
    setDraggedTask(null);
  };

  // Assign Task to Intern
  const handleAssignInternSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInternId) {
      toast.error('Please select an intern');
      return;
    }
    try {
      await pmoAPI.updateTask(internAssignTask.id, { assignedTo: selectedInternId });
      toast.success('Task assigned to intern successfully');
      setInternAssignTask(null);
      setSelectedInternId('');
      fetchProjectTasksAndDetails();
    } catch (error) {
      toast.error('Failed to assign task to intern');
    }
  };

  // Reassign an orphaned (needs-reassignment) task to any project member
  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!reassignTo) {
      toast.error('Please select a team member');
      return;
    }
    try {
      await pmoAPI.updateTask(reassignTask.id, { assignedTo: reassignTo });
      toast.success('Task reassigned successfully');
      setReassignTask(null);
      setReassignTo('');
      fetchProjectTasksAndDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reassign task');
    }
  };

  // Create Task Submit
  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    if (!newTaskData.title || !newTaskData.assignedTo) {
      toast.error('Title and Assignee are required');
      return;
    }
    try {
      const payload = {
        ...newTaskData,
        project: selectedProject
      };
      await pmoAPI.createTask(payload);
      toast.success('Task created and assigned successfully!');
      setIsCreateModalOpen(false);
      setNewTaskData({
        title: '',
        description: '',
        assignedTo: '',
        priority: 'Medium',
        dueDate: '',
        effortPoints: 5
      });
      fetchProjectTasksAndDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create task');
    }
  };

  const handleBulkReassignSubmit = async (e) => {
    e.preventDefault();
    if (!bulkReassignTo) {
      toast.error('Please select a team member or intern');
      return;
    }
    if (bulkSelectedTaskIds.length === 0) {
      toast.error('Please select at least one task to reassign');
      return;
    }
    setIsSubmittingBulk(true);
    try {
      await pmoAPI.bulkReassignTasks({
        taskIds: bulkSelectedTaskIds,
        assignedTo: bulkReassignTo,
        projectId: selectedProject,
      });
      toast.success(`Successfully reassigned ${bulkSelectedTaskIds.length} task(s)!`);
      setIsBulkReassignModalOpen(false);
      setBulkSelectedTaskIds([]);
      setBulkReassignTo('');
      await fetchProjectTasksAndDetails();
      await fetchAllOrgResources();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to bulk reassign tasks');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Get resource pool (project members + available org interns and staff)
  const getResourcePool = () => {
    const projectMemberIds = new Set();
    const projectMembers = [];
    const availableInterns = [];
    const availableStaff = [];

    if (currentProjectDetails) {
      currentProjectDetails.team?.forEach(t => {
        if (t.user) {
          projectMemberIds.add(t.user._id?.toString());
          projectMembers.push({ id: t.user._id, name: `${t.user.name} (${t.role || 'Developer'})`, isMember: true });
        }
      });
      currentProjectDetails.interns?.forEach(i => {
        if (i.user) {
          projectMemberIds.add(i.user._id?.toString());
          projectMembers.push({ id: i.user._id, name: `${i.user.name} (Intern)`, isMember: true });
        }
      });
    }

    availableOrgInterns.forEach(item => {
      const u = item.user || item;
      if (u?._id && !projectMemberIds.has(u._id.toString())) {
        availableInterns.push({ id: u._id, name: `${u.name} (Intern • ${u.domain || 'General'})`, isMember: false });
      }
    });

    availableOrgTeam.forEach(item => {
      const u = item.user || item;
      if (u?._id && !projectMemberIds.has(u._id.toString())) {
        availableStaff.push({ id: u._id, name: `${u.name} (${u.designation || 'Staff'})`, isMember: false });
      }
    });

    return { projectMembers, availableInterns, availableStaff };
  };

  if (!canRead) return <PageWrapper><AccessDenied message="You don't have permission to view the task board." /></PageWrapper>;

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] w-full flex flex-col h-[calc(100vh-100px)] overflow-hidden gap-6 max-w-[1600px] mx-auto pb-4 text-left">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 shrink-0">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">Project Task Board</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Manage deliverables, track effort, and clear blockers for your active projects.
            </p>
          </div>
          
          <div className="flex gap-3 items-center">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-[18px]">folder</span>
              <select 
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="pl-9 pr-8 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[13px] font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 shadow-sm appearance-none cursor-pointer"
              >
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] text-[18px] pointer-events-none">expand_more</span>
            </div>

            {canCreate && (
              <button
                onClick={() => {
                  const { projectMembers = [], availableInterns = [], availableStaff = [] } = getResourcePool() || {};
                  const all = [...projectMembers, ...availableInterns, ...availableStaff];
                  if (all.length === 0) {
                    toast.error('No members or interns found in the organization.');
                    return;
                  }
                  setNewTaskData(prev => ({ ...prev, assignedTo: all[0].id }));
                  setIsCreateModalOpen(true);
                }}
                className="bg-[#2563EB] text-white px-5 py-2 rounded-lg text-[13px] font-medium hover:bg-[#1D4ED8] transition-colors shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                New Task
              </button>
            )}
          </div>
        </div>

        {/* Needs-reassignment alert banner with Bulk Reassign action */}
        {!loading && tasks.some(t => t.needsReassignment) && (
          <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl shadow-xs">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#D97706] text-[22px]">person_alert</span>
              <p className="text-[13px] text-[#92400E]">
                <strong>{tasks.filter(t => t.needsReassignment).length}</strong> task(s) on this project are unassigned after a team member was removed. Reassign them to keep work moving.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const orphanedIds = tasks.filter(t => t.needsReassignment).map(t => t.id);
                setBulkSelectedTaskIds(orphanedIds);
                const { projectMembers = [], availableInterns = [], availableStaff = [] } = getResourcePool() || {};
                const all = [...projectMembers, ...availableInterns, ...availableStaff];
                if (all.length > 0) setBulkReassignTo(all[0].id);
                setIsBulkReassignModalOpen(true);
              }}
              className="bg-[#D97706] hover:bg-[#B45309] text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">group_work</span>
              ⚡ Bulk Reassign Tasks
            </button>
          </div>
        )}

        {/* BOARD WRAPPER */}
        {loading ? (
          <div className="flex justify-center items-center py-24 flex-1">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : (
          <div className="flex-1 flex gap-6 overflow-x-auto overflow-y-hidden custom-scrollbar pb-4 pt-2">
            {COLUMNS.map(col => {
              const columnTasks = tasks.filter(t => t.status === col.id);
              return (
                <div 
                  key={col.id} 
                  className="w-[320px] shrink-0 flex flex-col bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] overflow-hidden"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  {/* Column Header */}
                  <div className={`px-4 py-3 bg-white border-b border-[#E2E8F0] flex items-center justify-between border-l-4 ${col.color}`}>
                    <h3 className="text-[14px] font-bold text-[#0F172A]">{col.title}</h3>
                    <div className="w-6 h-6 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[12px] font-bold text-[#64748B]">
                      {columnTasks.length}
                    </div>
                  </div>

                  {/* Column Body */}
                  <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
                    {columnTasks.map(task => {
                      const pStyles = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium;
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onClick={() => setSelectedTask(task.raw)}
                          className={`bg-white p-4 rounded-xl shadow-sm border transition-all cursor-pointer group relative ${task.blocked ? 'border-[#FCA5A5] bg-[#FEF2F2]/50 hover:border-[#EF4444]' : 'border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-md'}`}
                        >
                          {/* Assign to Intern Button (Hover) */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setInternAssignTask(task); }}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-[#E2E8F0] rounded-full shadow-sm items-center justify-center text-[#64748B] hover:text-[#2563EB] hover:border-[#2563EB] transition-colors hidden group-hover:flex z-10"
                            title="Assign to Intern"
                          >
                            <GraduationCap size={16} />
                          </button>

                          {/* Tags */}
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${pStyles.bg} ${pStyles.color}`}>
                              <span className="material-symbols-outlined text-[12px]">{pStyles.icon}</span>
                              {task.priority}
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {task.needsReassignment && (
                                <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F59E0B] text-white flex items-center gap-1 shadow-sm">
                                  <span className="material-symbols-outlined text-[12px]">person_alert</span>
                                  Needs reassign
                                </div>
                              )}
                              {task.blocked && (
                                <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#EF4444] text-white flex items-center gap-1 shadow-sm">
                                  <span className="material-symbols-outlined text-[12px]">block</span>
                                  Blocked
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="text-[14px] font-bold text-[#0F172A] leading-snug mb-4">{task.title}</h4>

                          {/* Footer */}
                          <div className="border-t border-[#E2E8F0] pt-3 flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-1 rounded-md">
                              <span className="material-symbols-outlined text-[14px]">psychiatry</span>
                              {task.effort}
                            </div>
                            
                            {task.needsReassignment ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setReassignTask(task); setReassignTo(''); }}
                                className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#F59E0B] hover:bg-[#D97706] px-2.5 py-1 rounded-md transition-colors shadow-sm"
                                title="Assign this task to a team member"
                              >
                                <span className="material-symbols-outlined text-[14px]">person_add</span>
                                Reassign
                              </button>
                            ) : (
                              <div className="flex -space-x-1.5">
                                {task.assignees.map((a, i) => (
                                  <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] border-2 border-white bg-blue-100 text-blue-700`} title={a.name}>
                                    {a.initial}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>
                      );
                    })}
                    {columnTasks.length === 0 && (
                      <div className="h-24 border-2 border-dashed border-[#E2E8F0] rounded-xl flex items-center justify-center text-[12px] font-semibold text-[#94A3B8]">
                        Drop tasks here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE TASK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-left">
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900">Create New Project Task</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTaskSubmit}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Task Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Set up database indices"
                    value={newTaskData.title} 
                    onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-600 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Description</label>
                  <textarea 
                    rows="3" 
                    placeholder="Provide details about delivery scope..."
                    value={newTaskData.description} 
                    onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-600 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Assign To Team Member / Intern</label>
                  {(() => {
                    const { projectMembers = [], availableInterns = [], availableStaff = [] } = getResourcePool() || {};
                    const isAutoAllocate = newTaskData.assignedTo && !projectMembers.some(m => m.id === newTaskData.assignedTo);
                    return (
                      <>
                        <select 
                          value={newTaskData.assignedTo} 
                          onChange={e => setNewTaskData({...newTaskData, assignedTo: e.target.value})}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-600 outline-none"
                          required
                        >
                          <option value="">Select assignee...</option>
                          {projectMembers.length > 0 && (
                            <optgroup label="⭐ Current Project Members">
                              {projectMembers.map(res => (
                                <option key={res.id} value={res.id}>{res.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {availableInterns.length > 0 && (
                            <optgroup label="🎓 Available Interns (Auto-allocate)">
                              {availableInterns.map(res => (
                                <option key={res.id} value={res.id}>{res.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {availableStaff.length > 0 && (
                            <optgroup label="👥 Available Staff & Developers (Auto-allocate)">
                              {availableStaff.map(res => (
                                <option key={res.id} value={res.id}>{res.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        {isAutoAllocate && (
                          <p className="text-[11px] text-[#2563EB] mt-1.5 flex items-center gap-1 font-medium bg-blue-50 p-2 rounded-md border border-blue-100">
                            <span className="material-symbols-outlined text-[14px]">info</span>
                            This member is not in the project team yet. Creating this task will automatically allocate them to the project.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Priority</label>
                    <select 
                      value={newTaskData.priority} 
                      onChange={e => setNewTaskData({...newTaskData, priority: e.target.value})}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-600 outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Effort Points</label>
                    <input 
                      type="number" 
                      min="1" max="13" 
                      value={newTaskData.effortPoints} 
                      onChange={e => setNewTaskData({...newTaskData, effortPoints: parseInt(e.target.value)})}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-600 outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Due Date</label>
                  <input 
                    type="date" 
                    value={newTaskData.dueDate} 
                    onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-600 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN TO INTERN MODAL */}
      {internAssignTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col text-left">
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900">Assign Task to Intern</h3>
              <button onClick={() => setInternAssignTask(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAssignInternSubmit}>
              <div className="p-5 space-y-3">
                <p className="text-sm text-slate-600 mb-2">Select an intern to assign to <strong>{internAssignTask.title}</strong>.</p>
                {(() => {
                  const { projectMembers = [], availableInterns = [] } = getResourcePool() || {};
                  const projectInterns = projectMembers.filter(m => m.name.includes('(Intern)'));
                  return (
                    <select 
                      value={selectedInternId}
                      onChange={e => setSelectedInternId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
                      required
                    >
                      <option value="">Select an intern...</option>
                      {projectInterns.length > 0 && (
                        <optgroup label="⭐ Project Interns">
                          {projectInterns.map(i => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                          ))}
                        </optgroup>
                      )}
                      {availableInterns.length > 0 && (
                        <optgroup label="🎓 Available Interns (Auto-allocate)">
                          {availableInterns.map(i => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  );
                })()}
              </div>
              <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                <button type="button" onClick={() => setInternAssignTask(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REASSIGN TASK MODAL */}
      {reassignTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col text-left">
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900">Reassign Task</h3>
              <button onClick={() => setReassignTask(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleReassignSubmit}>
              <div className="p-5 space-y-3">
                <p className="text-sm text-slate-600">
                  <strong>{reassignTask.title}</strong> lost its owner. Choose a team member to take it over.
                </p>
                {(() => {
                  const { projectMembers = [], availableInterns = [], availableStaff = [] } = getResourcePool() || {};
                  const allAvailable = [...projectMembers, ...availableInterns, ...availableStaff];
                  const isAutoAllocate = reassignTo && !projectMembers.some(m => m.id === reassignTo);
                  return (
                    <>
                      <select
                        value={reassignTo}
                        onChange={e => setReassignTo(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
                        required
                      >
                        <option value="">Select team member...</option>
                        {projectMembers.length > 0 && (
                          <optgroup label="⭐ Current Project Members">
                            {projectMembers.map(res => (
                              <option key={res.id} value={res.id}>{res.name}</option>
                            ))}
                          </optgroup>
                        )}
                        {availableInterns.length > 0 && (
                          <optgroup label="🎓 Available Interns (Auto-allocate)">
                            {availableInterns.map(res => (
                              <option key={res.id} value={res.id}>{res.name}</option>
                            ))}
                          </optgroup>
                        )}
                        {availableStaff.length > 0 && (
                          <optgroup label="👥 Available Staff & Developers (Auto-allocate)">
                            {availableStaff.map(res => (
                              <option key={res.id} value={res.id}>{res.name}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      {isAutoAllocate && (
                        <p className="text-[11px] text-[#2563EB] mt-1 flex items-center gap-1 font-medium">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          Member will be auto-allocated to this project upon reassignment.
                        </p>
                      )}
                      {allAvailable.length === 0 && (
                        <p className="text-[12px] text-amber-600">No active members found in organization.</p>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                <button type="button" onClick={() => setReassignTask(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold bg-[#D97706] text-white hover:bg-[#B45309] rounded-lg">Reassign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK REASSIGN MODAL */}
      {isBulkReassignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-left border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#D97706] text-xl">group_work</span>
                <h3 className="font-bold text-slate-900 text-base">Bulk Task Reassignment</h3>
              </div>
              <button onClick={() => setIsBulkReassignModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleBulkReassignSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs uppercase tracking-widest font-extrabold text-slate-500 block">
                      Select Tasks ({bulkSelectedTaskIds.length}/{tasks.filter(t => t.needsReassignment).length})
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setBulkSelectedTaskIds(tasks.filter(t => t.needsReassignment).map(t => t.id))}
                        className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setBulkSelectedTaskIds([])}
                        className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-48 overflow-y-auto custom-scrollbar">
                    {tasks.filter(t => t.needsReassignment).map(task => {
                      const isChecked = bulkSelectedTaskIds.includes(task.id);
                      return (
                        <label
                          key={task.id}
                          className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                            isChecked ? 'bg-white border-blue-500 shadow-xs' : 'bg-white border-slate-200 opacity-70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBulkSelectedTaskIds(prev => [...prev, task.id]);
                              } else {
                                setBulkSelectedTaskIds(prev => prev.filter(id => id !== task.id));
                              }
                            }}
                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">
                                {task.priority}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">{task.effort}</span>
                              <span className="text-[10px] text-amber-600 font-semibold">● Needs Reassignment</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest font-extrabold text-slate-500 block mb-1.5">
                    Assign To
                  </label>
                  {(() => {
                    const { projectMembers = [], availableInterns = [], availableStaff = [] } = getResourcePool() || {};
                    const allAvailable = [...projectMembers, ...availableInterns, ...availableStaff];
                    const isAutoAllocate = bulkReassignTo && !projectMembers.some(m => m.id === bulkReassignTo);
                    return (
                      <>
                        <select
                          value={bulkReassignTo}
                          onChange={e => setBulkReassignTo(e.target.value)}
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 shadow-xs cursor-pointer"
                          required
                        >
                          <option value="">Select team member...</option>
                          {projectMembers.length > 0 && (
                            <optgroup label="⭐ Current Project Members">
                              {projectMembers.map(res => (
                                <option key={res.id} value={res.id}>{res.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {availableInterns.length > 0 && (
                            <optgroup label="🎓 Available Interns (Auto-allocate)">
                              {availableInterns.map(res => (
                                <option key={res.id} value={res.id}>{res.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {availableStaff.length > 0 && (
                            <optgroup label="👥 Available Staff & Developers (Auto-allocate)">
                              {availableStaff.map(res => (
                                <option key={res.id} value={res.id}>{res.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        {isAutoAllocate && (
                          <p className="text-[11px] text-blue-600 mt-1.5 flex items-center gap-1 font-medium bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <span className="material-symbols-outlined text-[15px]">info</span>
                            Member will be auto-allocated to this project upon reassignment.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <span className="text-xs text-slate-500 font-semibold">
                  {bulkSelectedTaskIds.length} task(s) selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkReassignModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBulk || bulkSelectedTaskIds.length === 0}
                    className="px-5 py-2 text-xs font-bold bg-[#D97706] text-white hover:bg-[#B45309] rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingBulk ? <><div className="spinner" /> Reassigning...</> : '⚡ Reassign Selected'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal details */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onDelete={(id) => setTasks(prev => prev.filter(t => (t.raw?._id || t._id) !== id))}
        />
      )}

    </PageWrapper>
  );
}
