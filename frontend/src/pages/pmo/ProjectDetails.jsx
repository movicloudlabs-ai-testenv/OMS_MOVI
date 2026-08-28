import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight, Pencil, Download, Archive, Trash2, CheckSquare, Clock, AlertCircle,
  GraduationCap, Flag, FileText, Plus, UserPlus, File, Eye
} from 'lucide-react';
import PageWrapper from '../../components/PageWrapper';
import { TaskDetailModal } from '../../components/pmo/TaskDetailModal';
import { WorkloadBar } from '../../components/pmo/WorkloadBar';
import { InternProgressRing } from '../../components/pmo/InternProgressRing';
import { ProjectHealthBadge } from '../../components/pmo/ProjectHealthBadge';
import { MilestoneTimeline } from '../../components/pmo/MilestoneTimeline';
import { pmoAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('Projects', 'update');
  
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedTask, setSelectedTask] = useState(null);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals visibility states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isInternModalOpen, setIsInternModalOpen] = useState(false);
  const [isHRModalOpen, setIsHRModalOpen] = useState(false);
  const [availableHRs, setAvailableHRs] = useState([]);

  // Modals form states
  const [editData, setEditData] = useState({ name: '', description: '', status: 'Planning', priority: 'Medium', dueDate: '' });
  const [milestoneData, setMilestoneData] = useState({ name: '', date: '' });
  const [taskData, setTaskData] = useState({ title: '', description: '', assignedTo: '', priority: 'Medium', effortPoints: 5, dueDate: '' });
  const [availablePool, setAvailablePool] = useState([]);
  const [availableInternPool, setAvailableInternPool] = useState([]);

  // Team wizard state
  const [teamWizardStep, setTeamWizardStep] = useState(1);
  const [teamRequirements, setTeamRequirements] = useState([]);
  const [reqInput, setReqInput] = useState({ role: '', qty: 1, skills: [], experience: '' });
  const [selectedForTeam, setSelectedForTeam] = useState({}); // { userId: roleName }

  // Intern profile modal
  const [viewingIntern, setViewingIntern] = useState(null);

  // Intern wizard state
  const [internWizardStep, setInternWizardStep] = useState(1);
  const [internRequirements, setInternRequirements] = useState([]);
  const [internReqInput, setInternReqInput] = useState({ role: '', qty: 1, skills: [], experience: '' });
  const [selectedForIntern, setSelectedForIntern] = useState({}); // { userId: roleName }

  const TABS = ['Overview', 'Tasks', 'Team', 'Interns', 'Timeline', 'Files', 'Activity'];

  const fetchProjectDetails = async () => {
    setLoading(true);
    try {
      const projRes = await pmoAPI.getProject(id);
      setProject(projRes.data.data);
      
      const tasksRes = await pmoAPI.getTasks({ projectId: id });
      setTasks(tasksRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePool = async () => {
    try {
      const [empRes, internRes] = await Promise.all([
        pmoAPI.getAvailableMembers({ type: 'employee' }),
        pmoAPI.getAvailableMembers({ type: 'intern' }),
      ]);
      setAvailablePool(empRes.data.data || []);
      setAvailableInternPool(internRes.data.data || []);
    } catch {
      console.warn('Failed to load available pool');
    }
  };

  const fetchHRs = async () => {
    try {
      const res = await pmoAPI.getAvailableMembers({ type: 'hr' });
      setAvailableHRs(res.data.data || []);
    } catch (err) {
      console.warn('Failed to load HRs');
    }
  };

  const handleAssignHR = async (hrId) => {
    try {
      await pmoAPI.updateProject(id, { hrManager: hrId });
      toast.success('HR Manager assigned successfully');
      setIsHRModalOpen(false);
      fetchProjectDetails();
    } catch (err) {
      toast.error('Failed to assign HR Manager');
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  useEffect(() => {
    if (project) {
      setEditData({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'Planning',
        priority: project.priority || 'Medium',
        dueDate: project.endDate ? project.endDate.substring(0, 10) : ''
      });
    }
  }, [project]);

  // Submit Handlers
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: editData.name,
        description: editData.description,
        status: editData.status,
        priority: editData.priority,
        endDate: editData.dueDate ? new Date(editData.dueDate) : undefined
      };
      await pmoAPI.updateProject(id, payload);
      toast.success('Project details updated successfully');
      setIsEditModalOpen(false);
      fetchProjectDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update project');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await pmoAPI.deleteProject(id);
      toast.success('Project deleted successfully');
      setIsDeleteModalOpen(false);
      navigate('/pmo/projects');
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const handleArchiveConfirm = async () => {
    if (window.confirm(`Are you sure you want to archive "${project.name}"? This will mark the project as Completed.`)) {
      try {
        await pmoAPI.updateProject(id, { status: 'Completed' });
        toast.success('Project archived successfully');
        fetchProjectDetails();
      } catch (err) {
        toast.error('Failed to archive project');
      }
    }
  };

  const handleMilestoneSubmit = async (e) => {
    e.preventDefault();
    try {
      await pmoAPI.addProjectMilestone(id, {
        name: milestoneData.name,
        date: new Date(milestoneData.date)
      });
      toast.success('Milestone added successfully');
      setMilestoneData({ name: '', date: '' });
      setIsMilestoneModalOpen(false);
      fetchProjectDetails();
    } catch (err) {
      toast.error('Failed to add milestone');
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...taskData,
        project: id,
        dueDate: new Date(taskData.dueDate)
      };
      await pmoAPI.createTask(payload);
      toast.success('Task created and assigned successfully');
      setTaskData({ title: '', description: '', assignedTo: '', priority: 'Medium', effortPoints: 5, dueDate: '' });
      setIsTaskModalOpen(false);
      fetchProjectDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleRemoveTeamMember = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this employee from the project team?")) return;
    try {
      await pmoAPI.removeProjectTeamMember(id, userId);
      toast.success("Team member removed successfully");
      fetchProjectDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove team member');
    }
  };

  const handleTeamSubmit = async () => {
    const entries = Object.entries(selectedForTeam);
    if (entries.length === 0) { toast.error('Select at least one team member.'); return; }
    try {
      const payload = entries.map(([userId, role]) => ({ userId, role }));
      await pmoAPI.addProjectTeam(id, payload);
      toast.success('Team members added successfully');
      setSelectedForTeam({});
      setTeamRequirements([]);
      setTeamWizardStep(1);
      setIsTeamModalOpen(false);
      fetchProjectDetails();
    } catch (err) {
      toast.error('Failed to add team members');
    }
  };

  const handleInternSubmit = async () => {
    const internIds = Object.keys(selectedForIntern);
    if (internIds.length === 0) { toast.error('Select at least one intern.'); return; }
    try {
      await pmoAPI.assignProjectInterns(id, internIds);
      toast.success('Interns assigned successfully');
      setSelectedForIntern({});
      setInternRequirements([]);
      setInternWizardStep(1);
      setIsInternModalOpen(false);
      fetchProjectDetails();
    } catch (err) {
      toast.error('Failed to assign interns');
    }
  };

  const handleExportReport = () => {
    if (!project) return;
    
    const projectData = [
      { Field: 'Project Code', Value: project.code || 'N/A' },
      { Field: 'Project Name', Value: project.name || 'N/A' },
      { Field: 'Description', Value: project.description || 'N/A' },
      { Field: 'Status', Value: project.status || 'N/A' },
      { Field: 'Priority', Value: project.priority || 'N/A' },
      { Field: 'Project Manager', Value: project.manager?.name || 'N/A' },
      { Field: 'Department', Value: project.department?.name || 'N/A' },
      { Field: 'Start Date', Value: project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A' },
      { Field: 'End Date', Value: project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A' },
      { Field: 'Budget Allocated', Value: `₹${(project.budget?.allocated || project.budget || 0).toLocaleString()}` },
      { Field: 'Budget Spent', Value: `₹${(project.budget?.spent || project.budgetSpent || 0).toLocaleString()}` },
      { Field: 'Completion Percentage', Value: `${project.completionPercent || 0}%` }
    ];

    const tasksData = tasks.map(t => ({
      TaskID: t._id,
      TaskTitle: t.title,
      Assignee: t.assignedTo?.name || 'Unassigned',
      Status: t.status,
      Priority: t.priority,
      EffortPoints: t.effortPoints || 0,
      DueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'
    }));

    const teamData = (project.team || []).map(m => ({
      MemberName: m.user?.name || 'Unknown',
      RoleInProject: m.role || 'Developer',
      Designation: m.user?.designation || 'Staff'
    }));

    const milestonesData = (project.milestones || []).map(m => ({
      MilestoneName: m.name,
      TargetDate: m.date ? new Date(m.date).toLocaleDateString() : 'N/A',
      Status: m.status
    }));

    const separator = ',';
    
    const buildCSVSection = (title, headers, data) => {
      if (!data || !data.length) return `${title}\nNo data available\n\n`;
      const headerRow = headers.join(separator);
      const rows = data.map(row => headers.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = typeof cell === 'object' ? JSON.stringify(cell).replace(/"/g, '""') : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
        return cell;
      }).join(separator));
      return `${title}\n${headerRow}\n${rows.join('\n')}\n\n`;
    };

    let csvContent = '';
    csvContent += buildCSVSection('PROJECT DETAILS', ['Field', 'Value'], projectData);
    csvContent += buildCSVSection('PROJECT TEAM', ['MemberName', 'RoleInProject', 'Designation'], teamData);
    csvContent += buildCSVSection('PROJECT MILESTONES', ['MilestoneName', 'TargetDate', 'Status'], milestonesData);
    csvContent += buildCSVSection('PROJECT TASKS', ['TaskTitle', 'Assignee', 'Status', 'Priority', 'EffortPoints', 'DueDate'], tasksData);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${project.name.toLowerCase().replace(/\s+/g, '_')}_project_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Project report exported successfully');
  };

  // Compute stats for team members based on project tasks
  const teamWithTaskStats = (project?.team || []).map(member => {
    const memberTasks = tasks.filter(t => t.assignedTo?._id === member.user?._id);
    const tasksAssigned = memberTasks.length;
    const tasksDone = memberTasks.filter(t => t.status === 'Done').length;
    
    const workload = memberTasks.filter(t => t.status !== 'Done').length * 15;

    return {
      ...member,
      tasksAssigned,
      tasksDone,
      workload: Math.min(workload, 100)
    };
  });

  // Compute stats for interns based on project tasks
  const internsWithTaskStats = (project?.interns || []).map(intern => {
    const internTasks = tasks.filter(t => t.assignedTo?._id === intern.user?._id);
    const tasksAssigned = internTasks.length;
    const tasksDone = internTasks.filter(t => t.status === 'Done').length;
    
    return {
      ...intern,
      tasksAssigned,
      tasksDone
    };
  });

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-24">
          <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
        </div>
      );
    }

    if (!project) {
      return (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-[#64748B]">
          <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-[#0F172A]">Project Not Found</h3>
          <p className="text-sm mt-1">This project does not exist or you do not have permission to view it.</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'Overview':
        return (
          <OverviewTab 
            project={project} 
            team={teamWithTaskStats} 
            onAddMilestoneClick={() => setIsMilestoneModalOpen(true)}
            onAddTaskClick={() => {
              setTaskData(prev => ({ ...prev, assignedTo: '' }));
              setIsTaskModalOpen(true);
            }}
            onAddTeamMemberClick={() => {
              fetchAvailablePool();
              setIsTeamModalOpen(true);
            }}
            onAssignInternClick={() => {
              fetchAvailablePool();
              setIsInternModalOpen(true);
            }}
            onAssignHRClick={() => {
              fetchHRs();
              setIsHRModalOpen(true);
            }}
            onExportReportClick={handleExportReport}
          />
        );
      case 'Tasks':
        return (
          <TasksTab 
            tasks={tasks} 
            onTaskClick={setSelectedTask} 
            onAddTaskClick={() => {
              setTaskData(prev => ({ ...prev, assignedTo: '' }));
              setIsTaskModalOpen(true);
            }}
          />
        );
      case 'Team':
        return (
          <TeamTab 
            team={teamWithTaskStats} 
            navigate={navigate} 
            canUpdate={canUpdate}
            onRemoveTeamMemberClick={handleRemoveTeamMember}
            onAddTeamMemberClick={() => {
              fetchAvailablePool();
              setIsTeamModalOpen(true);
            }}
            onAssignTaskClick={(memberId) => {
              setTaskData(prev => ({ ...prev, assignedTo: memberId }));
              setIsTaskModalOpen(true);
            }}
          />
        );
      case 'Interns':
        return (
          <InternsTab
            interns={internsWithTaskStats}
            onAssignInternClick={() => {
              fetchAvailablePool();
              setIsInternModalOpen(true);
            }}
            onViewInternClick={(intern) => navigate(`/pmo/interns/${intern.user?._id}`)}
          />
        );
      case 'Timeline':
        return <TimelineTab project={project} />;
      case 'Files':
        return <FilesTab />;
      case 'Activity':
        return <ActivityTab project={project} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-screen bg-[#F8FAFC]">
          <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
        </div>
      </PageWrapper>
    );
  }

  if (!project) {
    return (
      <PageWrapper>
        <div className="p-8 text-center bg-[#F8FAFC] h-full flex flex-col justify-center items-center">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-[#0F172A]">Project Not Found</h1>
          <button onClick={() => navigate('/pmo/projects')} className="mt-4 px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-semibold">Back to Projects</button>
        </div>
      </PageWrapper>
    );
  }

  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'Done').length;
  const inProgressTasksCount = tasks.filter(t => t.status === 'In Progress').length;
  const overdueTasksCount = tasks.filter(t => {
    const now = new Date();
    return t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done';
  }).length;

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] w-full flex flex-col h-full bg-[#F8FAFC]">
        
        {/* HEADER SECTION */}
        <div className="bg-white border-b border-[#E2E8F0] px-8 py-6 flex flex-col gap-4 text-left">
          {/* Row 1: Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#64748B] font-medium">
            <span className="hover:text-[#0F172A] cursor-pointer" onClick={() => navigate('/pmo/dashboard')}>PMO</span>
            <ChevronRight size={14} />
            <span className="hover:text-[#0F172A] cursor-pointer" onClick={() => navigate('/pmo/projects')}>Projects</span>
            <ChevronRight size={14} />
            <span className="text-[#0F172A]">{project.name}</span>
          </div>

          {/* Row 2: Identity */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-2xl font-bold text-[#0F172A]">{project.name}</h1>
              <div className="flex items-center gap-2">
                <ProjectHealthBadge status={project.status} />
                <span className={`px-2 py-1 text-xs font-bold rounded border ${
                  project.priority === 'Critical' ? 'bg-red-50 text-red-600 border-red-200' :
                  project.priority === 'High' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                  'bg-amber-50 text-amber-600 border-amber-200'
                }`}>
                  {project.priority || 'Medium'} Priority
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsEditModalOpen(true)} className="px-3 py-1.5 text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] transition-colors flex items-center gap-2 bg-white shadow-sm">
                <Pencil size={16} /> Edit Project
              </button>
              <button onClick={handleExportReport} className="px-3 py-1.5 text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] transition-colors flex items-center gap-2 bg-white shadow-sm">
                <Download size={16} /> Export Report
              </button>
              <button onClick={handleArchiveConfirm} className="px-3 py-1.5 text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] transition-colors flex items-center gap-2 bg-white shadow-sm">
                <Archive size={16} /> Archive
              </button>
              <button onClick={() => setIsDeleteModalOpen(true)} className="px-3 py-1.5 text-sm font-semibold text-[#DC2626] border border-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors flex items-center gap-2 bg-white shadow-sm">
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>

          {/* Row 3: Stat Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm font-semibold text-[#0F172A] gap-4">
              <span className="flex items-center gap-2"><CheckSquare size={16} className="text-[#64748B]" /> Total Tasks: {totalTasksCount}</span>
              <span className="w-[1px] h-4 bg-[#E2E8F0] hidden sm:block"></span>
              <span className="flex items-center gap-2 text-[#16A34A]"><CheckSquare size={16} /> Completed: {completedTasksCount}</span>
              <span className="w-[1px] h-4 bg-[#E2E8F0] hidden sm:block"></span>
              <span className="flex items-center gap-2 text-[#2563EB]"><Clock size={16} /> In Progress: {inProgressTasksCount}</span>
              <span className="w-[1px] h-4 bg-[#E2E8F0] hidden sm:block"></span>
              <span className="flex items-center gap-2 text-[#DC2626]"><AlertCircle size={16} /> Overdue: {overdueTasksCount}</span>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="bg-white border-b border-[#E2E8F0] px-8 flex gap-8">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm font-bold border-b-2 transition-colors ${
                activeTab === tab ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TAB CONTENT AREA */}
        <div className="flex-1 p-8 overflow-y-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </div>

      {/* Task Modal details */}
      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
        />
      )}

      {/* --- EDIT PROJECT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-left">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
              <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                <Pencil size={18} className="text-[#2563EB]" /> Edit Project
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-[#64748B] hover:bg-[#E2E8F0] p-1 rounded-full"><span className="material-symbols-outlined text-[20px] flex items-center justify-center">close</span></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Project Name</label>
                  <input type="text" required value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:border-[#2563EB] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Description</label>
                  <textarea rows="3" value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:border-[#2563EB] outline-none resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Status</label>
                    <select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})} className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:border-[#2563EB] outline-none cursor-pointer">
                      <option value="Planning">Planning</option>
                      <option value="Active">Active</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Priority</label>
                    <select value={editData.priority} onChange={e => setEditData({...editData, priority: e.target.value})} className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:border-[#2563EB] outline-none cursor-pointer">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Due Date</label>
                  <input type="date" value={editData.dueDate} onChange={e => setEditData({...editData, dueDate: e.target.value})} className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:border-[#2563EB] outline-none" />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end gap-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold bg-[#2563EB] text-white hover:bg-blue-700 rounded-lg">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE PROJECT MODAL --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col text-left">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#FEF2F2] flex justify-between items-center">
              <h3 className="font-bold text-[#DC2626] flex items-center gap-2">
                <Trash2 size={18} /> Delete Project
              </h3>
              <button onClick={() => setIsDeleteModalOpen(false)} className="text-[#64748B] hover:bg-[#E2E8F0] p-1 rounded-full"><span className="material-symbols-outlined text-[20px] flex items-center justify-center">close</span></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-[#475569] leading-relaxed">Are you sure you want to delete <strong>{project.name}</strong>? This action cannot be undone. All tasks associated with this project will be deleted permanently.</p>
            </div>
            <div className="px-5 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end gap-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg">Cancel</button>
              <button onClick={handleDeleteConfirm} className="px-4 py-2 text-sm font-bold bg-[#DC2626] text-white hover:bg-red-700 rounded-lg">Delete Project</button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD MILESTONE MODAL --- */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-left">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
              <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                <Flag size={18} className="text-[#2563EB]" /> Add Milestone
              </h3>
              <button onClick={() => setIsMilestoneModalOpen(false)} className="text-[#64748B] hover:bg-[#E2E8F0] p-1 rounded-full"><span className="material-symbols-outlined text-[20px] flex items-center justify-center">close</span></button>
            </div>
            <form onSubmit={handleMilestoneSubmit}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Milestone Name</label>
                  <input type="text" required value={milestoneData.name} onChange={e => setMilestoneData({...milestoneData, name: e.target.value})} placeholder="e.g. Beta Release" className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:border-[#2563EB] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Target Date</label>
                  <input type="date" required value={milestoneData.date} onChange={e => setMilestoneData({...milestoneData, date: e.target.value})} className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:border-[#2563EB] outline-none" />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end gap-2">
                <button type="button" onClick={() => setIsMilestoneModalOpen(false)} className="px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold bg-[#2563EB] text-white hover:bg-blue-700 rounded-lg">Add Milestone</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD TASK MODAL --- */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-left">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
              <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                <Plus size={18} className="text-[#2563EB]" /> Add Project Task
              </h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-[#64748B] hover:bg-[#E2E8F0] p-1 rounded-full"><span className="material-symbols-outlined text-[20px] flex items-center justify-center">close</span></button>
            </div>
            <form onSubmit={handleTaskSubmit}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Task Title</label>
                  <input type="text" required value={taskData.title} onChange={e => setTaskData({...taskData, title: e.target.value})} placeholder="e.g. Build backend routes" className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:border-[#2563EB] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Description</label>
                  <textarea rows="3" value={taskData.description} onChange={e => setTaskData({...taskData, description: e.target.value})} placeholder="Provide details about delivery scope..." className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:border-[#2563EB] outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Assign To Member / Intern</label>
                  <select required value={taskData.assignedTo} onChange={e => setTaskData({...taskData, assignedTo: e.target.value})} className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:border-[#2563EB] outline-none cursor-pointer">
                    <option value="">Select assignee...</option>
                    {[...(project.team || []), ...(project.interns || [])].map(m => m.user && (
                      <option key={m.user._id} value={m.user._id}>{m.user.name} ({m.role || (m.user.employmentType === 'Intern' ? 'Intern' : 'Developer')})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Priority</label>
                    <select value={taskData.priority} onChange={e => setTaskData({...taskData, priority: e.target.value})} className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:border-[#2563EB] outline-none cursor-pointer">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Effort Points</label>
                    <input type="number" min="1" max="13" required value={taskData.effortPoints} onChange={e => setTaskData({...taskData, effortPoints: parseInt(e.target.value)})} className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:border-[#2563EB] outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Due Date</label>
                  <input type="date" required value={taskData.dueDate} onChange={e => setTaskData({...taskData, dueDate: e.target.value})} className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:border-[#2563EB] outline-none" />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end gap-2">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold bg-[#2563EB] text-white hover:bg-blue-700 rounded-lg">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD TEAM MEMBER WIZARD --- */}
      {isTeamModalOpen && (
        <TeamWizardModal
          step={teamWizardStep}
          setStep={setTeamWizardStep}
          requirements={teamRequirements}
          setRequirements={setTeamRequirements}
          reqInput={reqInput}
          setReqInput={setReqInput}
          availablePool={availablePool.filter(emp => !project.team.some(t => (t.user?._id || t.user) === emp._id))}
          selectedForTeam={selectedForTeam}
          setSelectedForTeam={setSelectedForTeam}
          onClose={() => { setIsTeamModalOpen(false); setTeamWizardStep(1); setTeamRequirements([]); setSelectedForTeam({}); setReqInput({ role: '', qty: 1, skills: [], experience: '' }); }}
          onSubmit={handleTeamSubmit}
        />
      )}

      {/* --- ASSIGN INTERN WIZARD --- */}
      {isInternModalOpen && (
        <InternWizardModal
          step={internWizardStep}
          setStep={setInternWizardStep}
          requirements={internRequirements}
          setRequirements={setInternRequirements}
          reqInput={internReqInput}
          setReqInput={setInternReqInput}
          availablePool={availableInternPool.filter(intern => !project.interns.some(i => (i.user?._id || i.user) === intern._id))}
          selectedForIntern={selectedForIntern}
          setSelectedForIntern={setSelectedForIntern}
          onClose={() => {
            setIsInternModalOpen(false);
            setInternWizardStep(1);
            setInternRequirements([]);
            setSelectedForIntern({});
            setInternReqInput({ role: '', qty: 1, skills: [], experience: '' });
          }}
          onSubmit={handleInternSubmit}
        />
      )}

      {/* --- ASSIGN HR MODAL --- */}
      {isHRModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh] text-left">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <UserPlus size={20} className="text-[#2563EB]" />
                <div>
                  <h2 className="text-[15px] font-bold text-[#0F172A]">Assign HR Manager</h2>
                  <p className="text-[12px] text-[#64748B]">Select an HR Manager for this project</p>
                </div>
              </div>
              <button onClick={() => setIsHRModalOpen(false)} className="text-[#64748B] hover:bg-[#E2E8F0] p-1 rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
              {availableHRs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-[#64748B]">No HR Managers found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableHRs.map(hr => {
                    const n = hr.currentProjects || 0;
                    return (
                      <div key={hr._id} className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                          <img src={hr.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(hr.name)}&background=EFF6FF&color=1D4ED8`} alt={hr.name} className="w-10 h-10 rounded-full" />
                          <div>
                            <h3 className="text-sm font-bold text-[#0F172A]">{hr.name}</h3>
                            <p className="text-xs text-[#64748B] font-mono">{hr.employeeId || 'ID N/A'}</p>
                          </div>
                        </div>
                        <div className="mb-4">
                          {n === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#DCFCE7] text-[#16A34A]">Available</span>
                          ) : n <= 2 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#FEF3C7] text-[#D97706]">Managing {n} projects</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#FEE2E2] text-[#DC2626]">High workload ({n} projects)</span>
                          )}
                        </div>
                        <button onClick={() => handleAssignHR(hr._id)} className="w-full mt-auto py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg transition-colors">
                          Assign to Project
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- INTERN PROFILE MODAL --- */}
      {viewingIntern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-left">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
              <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                <GraduationCap size={18} className="text-[#7C3AED]" /> Intern Profile
              </h3>
              <button onClick={() => setViewingIntern(null)} className="text-[#64748B] hover:bg-[#E2E8F0] p-1 rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6">
              {/* Avatar + name */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center text-xl font-bold shrink-0">
                  {(viewingIntern.user?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-[#0F172A]">{viewingIntern.user?.name || '—'}</h2>
                  <p className="text-[13px] text-[#64748B]">{viewingIntern.user?.designation || 'Intern'}</p>
                  <span className="inline-block mt-1 text-[11px] font-bold bg-[#F5F3FF] text-[#7C3AED] px-2 py-0.5 rounded-full">Intern</span>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0]">
                  <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">College</p>
                  <p className="text-[13px] font-semibold text-[#0F172A]">{viewingIntern.user?.college || '—'}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0]">
                  <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Department</p>
                  <p className="text-[13px] font-semibold text-[#0F172A]">{viewingIntern.user?.department?.name || '—'}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0]">
                  <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Tasks Assigned</p>
                  <p className="text-[20px] font-bold text-[#0F172A]">{viewingIntern.tasksAssigned}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0]">
                  <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Tasks Done</p>
                  <p className="text-[20px] font-bold text-[#16A34A]">{viewingIntern.tasksDone}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-[11px] font-bold mb-1.5">
                  <span className="text-[#64748B]">Completion</span>
                  <span className="text-[#0F172A]">
                    {viewingIntern.tasksAssigned > 0
                      ? Math.round((viewingIntern.tasksDone / viewingIntern.tasksAssigned) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7C3AED] rounded-full transition-all"
                    style={{ width: `${viewingIntern.tasksAssigned > 0 ? Math.round((viewingIntern.tasksDone / viewingIntern.tasksAssigned) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
              <button onClick={() => setViewingIntern(null)} className="px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

// --- TAB COMPONENTS ---

const OverviewTab = ({ project, team, onAddMilestoneClick, onAddTaskClick, onAddTeamMemberClick, onAssignInternClick, onAssignHRClick, onExportReportClick }) => {
  const managerName = project.manager?.name || 'Unknown PMO';
  const managerAvatar = project.manager?.avatar || managerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const deptName = project.department?.name || 'Engineering';
  const startDateStr = project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A';
  const endDateStr = project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A';
  const budgetAllocated = project.budget?.allocated || project.budget || 0;
  const budgetSpent = project.budget?.spent || project.budgetSpent || 0;
  const healthPercent = project.completionPercent || 0;
  const healthStatus = project.healthStatus || 'On Track';
  
  // Tasks calculations
  const totalTasks = project.tasks?.total || 0;
  const doneTasks = project.tasks?.done || 0;

  return (
    <div className="flex flex-col lg:flex-row gap-6 text-left">
      {/* Left Column (60%) */}
      <div className="flex-[3] space-y-6">
        
        {/* Project Information */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="text-base font-bold text-[#0F172A] mb-4">Project Information</h3>
          <p className="text-sm text-[#475569] leading-relaxed mb-6">{project.description || 'No description provided.'}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Project Manager</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{managerAvatar}</div>
                <span className="text-sm font-semibold text-[#0F172A]">{managerName}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Department</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569]">{deptName}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Timeline</p>
              <p className="text-sm font-semibold text-[#0F172A]">{startDateStr} → {endDateStr}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Budget</p>
              <p className="text-sm font-semibold text-[#0F172A]">₹{budgetAllocated.toLocaleString()}</p>
            </div>
          </div>

          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-[#E2E8F0]">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider mr-2 self-center">Tags:</span>
              {project.tags.map(tag => (
                <span key={tag} className="bg-[#F1F5F9] text-[#64748B] text-xs font-bold px-2.5 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Milestones */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="text-base font-bold text-[#0F172A] mb-4">Milestones</h3>
          <MilestoneTimeline milestones={project.milestones || []} />
          <button onClick={onAddMilestoneClick} className="mt-6 w-full py-2.5 border-2 border-dashed border-[#E2E8F0] text-[#64748B] font-bold text-sm rounded-lg hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors flex items-center justify-center gap-2">
            <Plus size={16} /> Add Milestone
          </button>
        </div>

      </div>

      {/* Right Column (40%) */}
      <div className="flex-[2] space-y-6">
        
        {/* Project Health */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="text-base font-bold text-[#0F172A] mb-6">Project Health</h3>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-24 h-24 rounded-full border-8 border-[#10B981] flex items-center justify-center shrink-0">
              <span className="text-2xl font-black text-[#0F172A]">{healthPercent}%</span>
            </div>
            <div>
              <h4 className="text-xl font-bold text-[#10B981]">{healthStatus}</h4>
              <p className="text-xs font-medium text-[#64748B] mt-1">Based on task completion and milestone dates.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-[#64748B]">Task Progress</span>
                <span className="text-[#0F172A]">{doneTasks} of {totalTasks} done</span>
              </div>
              <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${totalTasks > 0 ? (doneTasks/totalTasks)*100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-[#64748B]">Budget Spent</span>
                <span className="text-[#0F172A]">₹{(budgetSpent/100000).toFixed(1)}L of ₹{(budgetAllocated/100000).toFixed(1)}L</span>
              </div>
              <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                <div className="h-full bg-[#10B981] rounded-full" style={{ width: `${budgetAllocated > 0 ? (budgetSpent/budgetAllocated)*100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Intern Knowledge Transfer & AI Usage Metrics */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2563EB] text-[20px]">school</span>
              Intern KT & Daily Tracker Sync
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Live Synced
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-[#64748B]">Knowledge Transfer (KT) Progress</span>
                <span className="text-[#2563EB] font-black text-sm">
                  {project.ktMetrics?.averageKTProgress || 0}%
                </span>
              </div>
              <div className="h-2.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${project.ktMetrics?.averageKTProgress || 0}%` }} 
                />
              </div>
              <p className="text-[11px] text-[#64748B] mt-1">
                Aggregated automatically from {project.ktMetrics?.internsReporting || 0} active intern daily trackers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#F1F5F9]">
              <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#64748B] block">AI Credits Used</span>
                <span className="text-base font-bold text-[#0F172A] mt-0.5 block">
                  {project.ktMetrics?.totalAICredits || 0} <span className="text-xs text-[#64748B] font-normal">credits</span>
                </span>
              </div>
              <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#64748B] block">Daily Reports</span>
                <span className="text-base font-bold text-[#0F172A] mt-0.5 block">
                  {project.ktMetrics?.totalTrackerEntries || 0} <span className="text-xs text-[#64748B] font-normal">logged</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="text-base font-bold text-[#0F172A] mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button onClick={onAddTaskClick} className="w-full py-2.5 px-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-sm font-semibold text-[#0F172A] flex items-center gap-3 transition-colors">
              <Plus size={18} className="text-[#64748B]" /> Add Task
            </button>
            <button onClick={onAddTeamMemberClick} className="w-full py-2.5 px-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-sm font-semibold text-[#0F172A] flex items-center gap-3 transition-colors">
              <UserPlus size={18} className="text-[#64748B]" /> Add Team Member
            </button>
            <button onClick={onAssignInternClick} className="w-full py-2.5 px-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-sm font-semibold text-[#0F172A] flex items-center gap-3 transition-colors">
              <GraduationCap size={18} className="text-[#64748B]" /> Assign Intern
            </button>
            <button onClick={onAssignHRClick} className="w-full py-2.5 px-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-sm font-semibold text-[#0F172A] flex items-center gap-3 transition-colors">
              <UserPlus size={18} className="text-[#64748B]" /> Assign HR Manager
            </button>
            <button onClick={onAddMilestoneClick} className="w-full py-2.5 px-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-sm font-semibold text-[#0F172A] flex items-center gap-3 transition-colors">
              <Flag size={18} className="text-[#64748B]" /> Add Milestone
            </button>
            <button onClick={onExportReportClick} className="w-full py-2.5 px-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-sm font-semibold text-[#0F172A] flex items-center gap-3 transition-colors">
              <FileText size={18} className="text-[#64748B]" /> Generate Report
            </button>
          </div>
        </div>

        {/* Team Summary */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-[#0F172A]">Team Summary</h3>
          </div>
          <div className="space-y-4">
            {team.slice(0, 4).map((member, i) => {
              const name = member.user?.name || 'Unknown';
              const initial = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={member.user?._id || i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[#EFF6FF] text-[#1D4ED8]">{initial}</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#0F172A] leading-tight">{name}</p>
                    <p className="text-xs text-[#64748B]">{member.role}</p>
                  </div>
                  <span className="text-xs font-bold bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded-full">{member.tasksDone}/{member.tasksAssigned} tasks</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

const TasksTab = ({ tasks, onTaskClick, onAddTaskClick }) => (
  <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden text-left">
    <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
      <input type="text" placeholder="Search tasks..." className="px-3 py-1.5 text-sm border border-[#E2E8F0] rounded-lg focus:ring-1 focus:ring-[#2563EB] outline-none" />
      <div className="flex gap-2">
        <button onClick={onAddTaskClick} className="px-4 py-1.5 bg-[#2563EB] text-white text-sm font-semibold rounded-lg hover:bg-[#1D4ED8] flex items-center gap-2">
          <Plus size={16} /> Add Task
        </button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-[#475569]">
        <thead className="bg-[#F8FAFC] text-xs uppercase font-bold text-[#64748B] border-b border-[#E2E8F0]">
          <tr>
            <th className="px-4 py-3">Task</th>
            <th className="px-4 py-3">Assignee</th>
            <th className="px-4 py-3">Due Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Points</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {tasks.map(t => (
            <tr key={t._id} className="hover:bg-[#F8FAFC] cursor-pointer" onClick={() => onTaskClick(t)}>
              <td className="px-4 py-4 font-semibold text-[#0F172A]">{t.title}</td>
              <td className="px-4 py-4">{t.assignedTo?.name || 'Unassigned'}</td>
              <td className="px-4 py-4">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}</td>
              <td className="px-4 py-4">
                <span className="bg-[#EFF6FF] text-[#2563EB] px-2 py-1 rounded text-xs font-bold">{t.status}</span>
              </td>
              <td className="px-4 py-4 font-bold">{t.effortPoints || 0} pts</td>
              <td className="px-4 py-4">
                <button className="text-[#64748B] hover:text-[#0F172A]"><Eye size={16} /></button>
              </td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan="6" className="text-center py-12 text-[#64748B]">No tasks defined for this project.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const TeamTab = ({ team, navigate, onAddTeamMemberClick, onAssignTaskClick, onRemoveTeamMemberClick, canUpdate }) => (
  <div className="space-y-6 text-left">
    <div className="flex justify-between items-center">
      <h2 className="text-lg font-bold text-[#0F172A]">Project Team ({team.length})</h2>
      <button onClick={onAddTeamMemberClick} className="bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
        <UserPlus size={16} /> Add Team Member
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {team.map((member, i) => {
        const name = member.user?.name || 'Unknown';
        const initial = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return (
          <div key={member.user?._id || i} className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold bg-[#EFF6FF] text-[#1D4ED8]">{initial}</div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">{name}</h3>
                <p className="text-xs text-[#64748B] font-medium">{member.role} · {member.user?.designation || 'Staff'}</p>
              </div>
            </div>
            <div className="flex justify-between text-center divide-x divide-[#E2E8F0] border-y border-[#E2E8F0] py-3 mb-4">
              <div className="flex-1"><p className="text-sm font-bold text-[#0F172A]">{member.tasksAssigned}</p><p className="text-[10px] uppercase font-bold text-[#64748B]">Assigned</p></div>
              <div className="flex-1"><p className="text-sm font-bold text-[#16A34A]">{member.tasksDone}</p><p className="text-[10px] uppercase font-bold text-[#64748B]">Done</p></div>
              <div className="flex-1"><p className="text-sm font-bold text-[#0F172A]">{member.tasksAssigned > 0 ? Math.round((member.tasksDone/member.tasksAssigned)*100) : 0}%</p><p className="text-[10px] uppercase font-bold text-[#64748B]">Completion</p></div>
            </div>
            <WorkloadBar percentage={member.workload} size="sm" />
            <div className="mt-5 flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); if(member.user?._id) navigate(`/pmo/employees/${member.user._id}`); }} className="flex-1 py-1.5 border border-[#E2E8F0] text-[#0F172A] text-xs font-bold rounded-lg hover:bg-[#F8FAFC] transition-colors">View Profile</button>
              <button onClick={() => onAssignTaskClick(member.user?._id)} className="flex-1 py-1.5 border border-[#E2E8F0] text-[#0F172A] text-xs font-bold rounded-lg hover:bg-[#F8FAFC] transition-colors">Assign Task</button>
              {canUpdate && (
                <button onClick={() => onRemoveTeamMemberClick(member.user?._id)} className="flex-1 py-1.5 border border-[#EF4444] text-[#EF4444] text-xs font-bold rounded-lg hover:bg-[#FEF2F2] transition-colors">Remove</button>
              )}
            </div>
          </div>
        );
      })}
      {team.length === 0 && (
        <div className="col-span-2 py-12 text-center border border-dashed border-[#E2E8F0] rounded-xl bg-white text-[#64748B]">No team members allocated to this project.</div>
      )}
    </div>
  </div>
);

const InternsTab = ({ interns, onAssignInternClick, onViewInternClick }) => (
  <div className="space-y-6 text-left">
    <div className="flex justify-between items-center">
      <h2 className="text-lg font-bold text-[#0F172A]">Assigned Interns ({interns.length})</h2>
      <button onClick={onAssignInternClick} className="bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
        <Plus size={16} /> Assign Intern
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {interns.map((intern, i) => {
        const name = intern.user?.name || 'Unknown Intern';
        const initial = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return (
          <div key={intern.user?._id || i} className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xl font-bold mb-3">{initial}</div>
            <h3 className="text-base font-bold text-[#0F172A]">{name}</h3>
            <p className="text-xs text-[#64748B] mb-4 bg-[#F1F5F9] inline-block px-2 py-1 rounded">{intern.user?.college || 'N/A'}</p>
            <div className="flex justify-center mb-3">
              <InternProgressRing percentage={intern.tasksAssigned > 0 ? Math.round((intern.tasksDone/intern.tasksAssigned)*100) : 0} size={64} />
            </div>
            <p className="text-xs font-bold text-[#64748B] mb-3">{intern.tasksDone} of {intern.tasksAssigned} tasks done</p>
            
            {/* KT Progress & AI Credits Badge */}
            <div className="w-full bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] mb-4 text-left">
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className="text-[#64748B]">KT Progress</span>
                <span className="text-[#2563EB] font-black">{intern.ktCompletion ?? 0}%</span>
              </div>
              <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${intern.ktCompletion ?? 0}%` }} 
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-[#64748B] pt-1.5 border-t border-[#E2E8F0]">
                <span>AI Tool Credits:</span>
                <span className="font-extrabold text-[#0F172A]">{intern.aiCredits ?? 0}</span>
              </div>
            </div>
            <div className="mt-auto flex gap-2 w-full">
              <button onClick={() => onViewInternClick(intern)} className="flex-1 py-2 bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-xs font-bold rounded-lg hover:bg-[#F1F5F9]">View Profile</button>
            </div>
          </div>
        );
      })}
      {interns.length === 0 && (
        <div className="col-span-full py-12 text-center border border-dashed border-[#E2E8F0] rounded-xl bg-white text-[#64748B] w-full">No interns assigned to this project.</div>
      )}
    </div>
  </div>
);

const TimelineTab = () => (
  <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-[#64748B]">
    <Clock size={48} className="mx-auto mb-4 opacity-50" />
    <h3 className="text-lg font-bold text-[#0F172A]">Project Timeline</h3>
    <p className="text-sm mt-1">Gantt view scoped to this project will render here.</p>
  </div>
);

const FilesTab = () => (
  <div className="space-y-6 text-left">
    <div className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-12 text-center hover:bg-[#F8FAFC] cursor-pointer transition-colors">
      <File size={48} className="mx-auto mb-4 text-[#94A3B8]" />
      <h3 className="text-base font-bold text-[#0F172A] mb-1">Drop files here or click to browse</h3>
      <p className="text-xs font-medium text-[#64748B]">Max 10MB per file · PDF, XLSX, DOCX, PNG, JPG supported</p>
    </div>
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center shadow-sm">
      <p className="text-sm font-bold text-[#64748B]">No files uploaded yet.</p>
    </div>
  </div>
);

const ActivityTab = ({ project }) => (
  <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm text-left">
    <div className="space-y-6 pl-4 border-l-2 border-[#E2E8F0] ml-4">
      <div className="relative">
        <div className="absolute -left-[25px] w-3 h-3 bg-blue-500 rounded-full mt-1.5 ring-4 ring-white" />
        <p className="text-sm text-[#0F172A]">Project created with priority <span className="font-bold text-orange-600">{project.priority || 'Medium'}</span></p>
        <p className="text-xs font-bold text-[#64748B] mt-0.5">{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}</p>
      </div>
    </div>
  </div>
);

// ─── Team Wizard Modal ────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'UI/UX Designer', 'QA Engineer', 'DevOps Engineer', 'Data Engineer', 'Mobile Developer',
];

const SKILL_OPTIONS = [
  'React', 'Angular', 'Vue', 'Node.js', 'Python', 'Java', 'Go',
  'TypeScript', 'AWS', 'Docker', 'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL',
];

const EXPERIENCE_OPTIONS = ['Any', 'Junior (0–2 yrs)', 'Mid (2–5 yrs)', 'Senior (5+ yrs)'];

const ROLE_KEYWORDS = {
  'Frontend Developer':  ['frontend', 'front-end', 'react', 'angular', 'vue', 'ui'],
  'Backend Developer':   ['backend', 'back-end', 'node', 'django', 'spring', 'api'],
  'Full Stack Developer':['full stack', 'fullstack', 'full-stack'],
  'UI/UX Designer':      ['ui', 'ux', 'designer', 'design', 'figma'],
  'QA Engineer':         ['qa', 'quality', 'test', 'automation', 'sdet'],
  'DevOps Engineer':     ['devops', 'cloud', 'infrastructure', 'sre', 'cicd'],
  'Data Engineer':       ['data', 'analytics', 'ml', 'ai', 'scientist'],
  'Mobile Developer':    ['mobile', 'android', 'ios', 'flutter', 'react native'],
};

const matchesRole = (emp, roleName) => {
  const desig = (emp.designation || '').toLowerCase();
  const keywords = ROLE_KEYWORDS[roleName] || [roleName.toLowerCase().split(' ')[0]];
  return keywords.some(kw => desig.includes(kw));
};

const TeamWizardModal = ({
  step, setStep, requirements, setRequirements,
  reqInput, setReqInput, availablePool,
  selectedForTeam, setSelectedForTeam,
  onClose, onSubmit,
}) => {
  const toggleSkill = (skill) => {
    setReqInput(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const addRequirement = () => {
    if (!reqInput.role) return;
    setRequirements(prev => [...prev, { ...reqInput, qty: parseInt(reqInput.qty) || 1 }]);
    setReqInput({ role: '', qty: 1, skills: [], experience: '' });
  };

  const removeRequirement = (idx) => setRequirements(prev => prev.filter((_, i) => i !== idx));

  const toggleSelect = (emp, roleName) => {
    setSelectedForTeam(prev => {
      if (prev[emp._id]) {
        const next = { ...prev };
        delete next[emp._id];
        return next;
      }
      return { ...prev, [emp._id]: roleName };
    });
  };

  // For step 2: group matching employees per requirement
  const grouped = requirements.map(req => ({
    req,
    matches: availablePool.filter(emp => matchesRole(emp, req.role)),
  }));

  const totalSelected = Object.keys(selectedForTeam).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh] text-left">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <UserPlus size={20} className="text-[#2563EB]" />
            <div>
              <h2 className="text-[15px] font-bold text-[#0F172A]">Add Team Members</h2>
              <p className="text-[12px] text-[#64748B]">Step {step} of 2 — {step === 1 ? 'Define Requirements' : 'Select Employees'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:bg-[#E2E8F0] p-1 rounded-full">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Progress */}
        <div className="w-full h-1 bg-[#F1F5F9] shrink-0">
          <div className="h-full bg-[#2563EB] transition-all duration-300" style={{ width: `${(step / 2) * 100}%` }} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

          {/* STEP 1: Requirements */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[15px] font-bold text-[#0F172A] mb-1">Resource Requirements</h3>
                <p className="text-[12px] text-[#64748B]">Define what roles you need. Then we'll show you matching available employees.</p>
              </div>

              {/* Input row */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#0F172A] mb-1">Role Needed</label>
                    <select
                      value={reqInput.role}
                      onChange={e => setReqInput(p => ({ ...p, role: e.target.value }))}
                      className="w-full p-2 bg-white border border-[#E2E8F0] rounded-lg text-[13px] outline-none focus:border-[#2563EB] cursor-pointer"
                    >
                      <option value="">Select a role...</option>
                      {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#0F172A] mb-1">Quantity</label>
                    <input
                      type="number" min="1" max="20"
                      value={reqInput.qty}
                      onChange={e => setReqInput(p => ({ ...p, qty: e.target.value }))}
                      className="w-full p-2 bg-white border border-[#E2E8F0] rounded-lg text-[13px] outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#0F172A] mb-2">Skills Required <span className="font-normal text-[#64748B]">(optional)</span></label>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_OPTIONS.map(skill => (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                          reqInput.skills.includes(skill)
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#2563EB] hover:text-[#2563EB]'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#0F172A] mb-1">Experience Level <span className="font-normal text-[#64748B]">(optional)</span></label>
                  <div className="flex gap-2">
                    {EXPERIENCE_OPTIONS.map(exp => (
                      <button
                        key={exp}
                        onClick={() => setReqInput(p => ({ ...p, experience: p.experience === exp ? '' : exp }))}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                          reqInput.experience === exp
                            ? 'bg-[#0F172A] text-white border-[#0F172A]'
                            : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#0F172A]'
                        }`}
                      >
                        {exp}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={addRequirement}
                  disabled={!reqInput.role}
                  className="w-full py-2 bg-[#0F172A] text-white rounded-lg text-[13px] font-bold hover:bg-[#334155] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Add Requirement
                </button>
              </div>

              {/* Requirements list */}
              <div className="space-y-2">
                {requirements.map((req, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px] text-[#2563EB]">person_search</span>
                      <div>
                        <p className="text-[13px] font-bold text-[#0F172A]">{req.role}</p>
                        <p className="text-[11px] text-[#64748B]">
                          Qty: {req.qty}
                          {req.skills.length > 0 && ` · ${req.skills.join(', ')}`}
                          {req.experience && ` · ${req.experience}`}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => removeRequirement(idx)} className="text-[#EF4444] hover:bg-red-50 p-1 rounded-lg">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))}
                {requirements.length === 0 && (
                  <div className="text-center py-8 text-[12px] text-[#94A3B8] border-2 border-dashed border-[#E2E8F0] rounded-xl">
                    No requirements added yet. Add at least one above.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Matching Employees */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[15px] font-bold text-[#0F172A] mb-1">Available Employees</h3>
                <p className="text-[12px] text-[#64748B]">Only free employees matching your requirements are shown. Click <strong>+</strong> to select.</p>
              </div>

              {grouped.map(({ req, matches }, idx) => (
                <div key={idx}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[12px] font-bold text-[#0F172A] uppercase tracking-wide">{req.role}</span>
                    <span className="text-[11px] text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">Need {req.qty}</span>
                    <span className="text-[11px] text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">{matches.length} available</span>
                  </div>

                  {matches.length === 0 ? (
                    <div className="text-[12px] text-[#94A3B8] italic py-3 px-4 border border-dashed border-[#E2E8F0] rounded-xl">
                      No available employees match this role right now.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {matches.map(emp => {
                        const isSelected = !!selectedForTeam[emp._id];
                        const initial = emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                        return (
                          <div key={emp._id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                            isSelected ? 'bg-[#EFF6FF] border-[#BFDBFE]' : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[12px] bg-[#EFF6FF] text-[#1D4ED8] shrink-0">
                                {initial}
                              </div>
                              <div>
                                <p className="text-[13px] font-bold text-[#0F172A] leading-tight">{emp.name}</p>
                                <p className="text-[11px] text-[#64748B]">{emp.designation || emp.role?.name || 'Employee'} · {emp.department?.name || ''}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleSelect(emp, req.role)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                                isSelected
                                  ? 'bg-[#EF4444] text-white'
                                  : 'bg-[#E2E8F0] text-[#475569] hover:bg-[#2563EB] hover:text-white'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[15px]">{isSelected ? 'remove' : 'add'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {grouped.length === 0 && (
                <div className="text-center py-12 text-[#94A3B8] text-[13px]">No requirements defined.</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center shrink-0">
          <button
            onClick={() => step === 1 ? onClose() : setStep(1)}
            className="px-4 py-2 text-[13px] font-bold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg border border-[#E2E8F0] bg-white"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={requirements.length === 0}
              className="px-5 py-2 bg-[#2563EB] text-white rounded-lg text-[13px] font-bold hover:bg-[#1D4ED8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next — Select Employees <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={totalSelected === 0}
              className="px-5 py-2 bg-[#10B981] text-white rounded-lg text-[13px] font-bold hover:bg-[#059669] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">group_add</span>
              Add {totalSelected > 0 ? totalSelected : ''} Member{totalSelected !== 1 ? 's' : ''} to Project
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

// ─── Intern Wizard Modal ──────────────────────────────────────────────────────

const INTERN_ROLE_OPTIONS = [
  'Full Stack Intern', 'Frontend Intern', 'Backend Intern',
  'UI/UX Intern', 'QA Intern', 'Data Intern', 'DevOps Intern', 'Mobile Intern',
];

const INTERN_ROLE_KEYWORDS = {
  'Full Stack Intern':  ['full stack', 'fullstack', 'full-stack', 'developer', 'software'],
  'Frontend Intern':    ['frontend', 'front-end', 'react', 'angular', 'vue', 'ui'],
  'Backend Intern':     ['backend', 'back-end', 'node', 'server', 'api'],
  'UI/UX Intern':       ['ui', 'ux', 'designer', 'design', 'figma'],
  'QA Intern':          ['qa', 'quality', 'test', 'automation'],
  'Data Intern':        ['data', 'analytics', 'ml', 'ai'],
  'DevOps Intern':      ['devops', 'cloud', 'infrastructure'],
  'Mobile Intern':      ['mobile', 'android', 'ios', 'flutter'],
};

const matchesInternRole = (intern, roleName) => {
  const desig = (intern.designation || '').toLowerCase();
  const domain = (intern.domain || '').toLowerCase();
  const keywords = INTERN_ROLE_KEYWORDS[roleName] || [roleName.toLowerCase().split(' ')[0]];
  // If intern has no designation AND no domain set, show them under any role
  if (!desig && !domain) return true;
  if (keywords.some(kw => desig.includes(kw) || domain.includes(kw))) return true;
  // Bug fix: an intern whose designation/domain (e.g. "Product Intern",
  // "Marketing Intern") doesn't fall into ANY of the known keyword
  // categories was being hidden from every single role's match list —
  // making them impossible to select no matter what requirement was
  // chosen. Fall back to showing such "uncategorized" interns everywhere,
  // same as interns with no designation set at all.
  const matchesAnyKnownCategory = Object.values(INTERN_ROLE_KEYWORDS).some(
    (kwList) => kwList.some(kw => desig.includes(kw) || domain.includes(kw))
  );
  return !matchesAnyKnownCategory;
};

const InternWizardModal = ({
  step, setStep, requirements, setRequirements,
  reqInput, setReqInput, availablePool,
  selectedForIntern, setSelectedForIntern,
  onClose, onSubmit,
}) => {
  const toggleSkill = (skill) => {
    setReqInput(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const addRequirement = () => {
    if (!reqInput.role) return;
    setRequirements(prev => [...prev, { ...reqInput, qty: parseInt(reqInput.qty) || 1 }]);
    setReqInput({ role: '', qty: 1, skills: [], experience: '' });
  };

  const removeRequirement = (idx) => setRequirements(prev => prev.filter((_, i) => i !== idx));

  const toggleSelect = (intern, roleName) => {
    setSelectedForIntern(prev => {
      if (prev[intern._id]) { const next = { ...prev }; delete next[intern._id]; return next; }
      return { ...prev, [intern._id]: roleName };
    });
  };

  const grouped = requirements.map(req => ({
    req,
    matches: availablePool.filter(intern => matchesInternRole(intern, req.role)),
  }));

  const totalSelected = Object.keys(selectedForIntern).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh] text-left">

        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <GraduationCap size={20} className="text-[#7C3AED]" />
            <div>
              <h2 className="text-[15px] font-bold text-[#0F172A]">Assign Interns</h2>
              <p className="text-[12px] text-[#64748B]">Step {step} of 2 — {step === 1 ? 'Define Requirements' : 'Select Interns'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:bg-[#E2E8F0] p-1 rounded-full">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="w-full h-1 bg-[#F1F5F9] shrink-0">
          <div className="h-full bg-[#7C3AED] transition-all duration-300" style={{ width: `${(step / 2) * 100}%` }} />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[15px] font-bold text-[#0F172A] mb-1">Intern Requirements</h3>
                <p className="text-[12px] text-[#64748B]">Define what intern roles you need. We'll show matching available interns.</p>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#0F172A] mb-1">Intern Role Needed</label>
                    <select
                      value={reqInput.role}
                      onChange={e => setReqInput(p => ({ ...p, role: e.target.value }))}
                      className="w-full p-2 bg-white border border-[#E2E8F0] rounded-lg text-[13px] outline-none focus:border-[#7C3AED] cursor-pointer"
                    >
                      <option value="">Select a role...</option>
                      {INTERN_ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#0F172A] mb-1">Quantity</label>
                    <input
                      type="number" min="1" max="20"
                      value={reqInput.qty}
                      onChange={e => setReqInput(p => ({ ...p, qty: e.target.value }))}
                      className="w-full p-2 bg-white border border-[#E2E8F0] rounded-lg text-[13px] outline-none focus:border-[#7C3AED]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#0F172A] mb-2">Skills Required <span className="font-normal text-[#64748B]">(optional)</span></label>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_OPTIONS.map(skill => (
                      <button key={skill} onClick={() => toggleSkill(skill)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                          reqInput.skills.includes(skill)
                            ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                            : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#7C3AED] hover:text-[#7C3AED]'
                        }`}>{skill}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#0F172A] mb-1">Internship Stage <span className="font-normal text-[#64748B]">(optional)</span></label>
                  <div className="flex gap-2 flex-wrap">
                    {['Any', 'Early Stage', 'Mid Stage', 'Final Stage'].map(stage => (
                      <button key={stage}
                        onClick={() => setReqInput(p => ({ ...p, experience: p.experience === stage ? '' : stage }))}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                          reqInput.experience === stage
                            ? 'bg-[#0F172A] text-white border-[#0F172A]'
                            : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#0F172A]'
                        }`}>{stage}</button>
                    ))}
                  </div>
                </div>

                <button onClick={addRequirement} disabled={!reqInput.role}
                  className="w-full py-2 bg-[#0F172A] text-white rounded-lg text-[13px] font-bold hover:bg-[#334155] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  <Plus size={14} /> Add Requirement
                </button>
              </div>

              <div className="space-y-2">
                {requirements.map((req, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <GraduationCap size={18} className="text-[#7C3AED]" />
                      <div>
                        <p className="text-[13px] font-bold text-[#0F172A]">{req.role}</p>
                        <p className="text-[11px] text-[#64748B]">
                          Qty: {req.qty}{req.skills.length > 0 && ` · ${req.skills.join(', ')}`}{req.experience && ` · ${req.experience}`}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => removeRequirement(idx)} className="text-[#EF4444] hover:bg-red-50 p-1 rounded-lg">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))}
                {requirements.length === 0 && (
                  <div className="text-center py-8 text-[12px] text-[#94A3B8] border-2 border-dashed border-[#E2E8F0] rounded-xl">
                    No requirements added yet. Add at least one above.
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[15px] font-bold text-[#0F172A] mb-1">Available Interns</h3>
                <p className="text-[12px] text-[#64748B]">Only free interns matching your requirements are shown. Click <strong>+</strong> to select.</p>
              </div>

              {grouped.map(({ req, matches }, idx) => (
                <div key={idx}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[12px] font-bold text-[#0F172A] uppercase tracking-wide">{req.role}</span>
                    <span className="text-[11px] text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">Need {req.qty}</span>
                    <span className="text-[11px] text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">{matches.length} available</span>
                  </div>
                  {matches.length === 0 ? (
                    <div className="text-[12px] text-[#94A3B8] italic py-3 px-4 border border-dashed border-[#E2E8F0] rounded-xl">
                      No available interns match this role right now.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {matches.map(intern => {
                        const isSelected = !!selectedForIntern[intern._id];
                        const initial = intern.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                        return (
                          <div key={intern._id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                            isSelected ? 'bg-[#F5F3FF] border-[#DDD6FE]' : 'bg-white border-[#E2E8F0] hover:border-[#C4B5FD]'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[12px] bg-[#F5F3FF] text-[#7C3AED] shrink-0">
                                {initial}
                              </div>
                              <div>
                                <p className="text-[13px] font-bold text-[#0F172A] leading-tight">{intern.name}</p>
                                <p className="text-[11px] text-[#64748B]">
                                  {intern.designation || 'Intern'}
                                  {intern.domain ? ` · ${intern.domain}` : ''}
                                  {intern.college ? ` · ${intern.college}` : ''}
                                  {intern.department?.name ? ` · ${intern.department.name}` : ''}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleSelect(intern, req.role)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                                isSelected ? 'bg-[#EF4444] text-white' : 'bg-[#E2E8F0] text-[#475569] hover:bg-[#7C3AED] hover:text-white'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[15px]">{isSelected ? 'remove' : 'add'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {grouped.length === 0 && (
                <div className="text-center py-12 text-[#94A3B8] text-[13px]">No requirements defined.</div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center shrink-0">
          <button
            onClick={() => step === 1 ? onClose() : setStep(1)}
            className="px-4 py-2 text-[13px] font-bold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg border border-[#E2E8F0] bg-white"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={requirements.length === 0}
              className="px-5 py-2 bg-[#7C3AED] text-white rounded-lg text-[13px] font-bold hover:bg-[#6D28D9] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next — Select Interns <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={totalSelected === 0}
              className="px-5 py-2 bg-[#10B981] text-white rounded-lg text-[13px] font-bold hover:bg-[#059669] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">school</span>
              Assign {totalSelected > 0 ? totalSelected : ''} Intern{totalSelected !== 1 ? 's' : ''} to Project
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
