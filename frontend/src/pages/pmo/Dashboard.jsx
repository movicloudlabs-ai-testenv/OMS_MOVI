import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import { Plus, CheckSquare, ClipboardCheck, BarChart2, GraduationCap, Clock, AlertCircle } from 'lucide-react';
import { pmoAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function PMODashboard() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreateProject = hasPermission('Projects', 'create');
  const canCreateTask    = hasPermission('Tasks', 'create');

  const [projects, setProjects] = useState([]);
  const [healthReport, setHealthReport] = useState([]);
  const [resourceWarnings, setResourceWarnings] = useState({ overloadedMembers: [], leaveWarnings: [] });
  const [teamStats, setTeamStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const projectsRes = await pmoAPI.getProjects();
      const projectsData = projectsRes.data.data || [];
      setProjects(projectsData);

      try {
        const healthRes = await pmoAPI.getProjectHealth();
        setHealthReport(healthRes.data.data || []);
      } catch (e) {
        console.warn('Could not load project health report', e);
      }

      try {
        const warningsRes = await pmoAPI.getResourceWarnings();
        setResourceWarnings(warningsRes.data.data || { overloadedMembers: [], leaveWarnings: [] });
      } catch (e) {
        console.warn('Could not load resource warnings', e);
      }

      try {
        const teamRes = await pmoAPI.getTeam();
        setTeamStats(teamRes.data.data || []);
      } catch (e) {
        console.warn('Could not load team stats', e);
      }
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute metrics
  const activeProjectsCount = projects.filter(p => p.status === 'Active' || p.status === 'Planning').length;
  const delayedProjectsCount = projects.filter(p => p.healthStatus === 'Delayed' || p.healthStatus === 'At Risk').length;
  
  // Calculate average resource utilization from workloads
  const totalMembers = teamStats.length;
  const avgUtilization = totalMembers > 0 
    ? Math.round(teamStats.reduce((acc, m) => acc + (m.stats?.workload || 0), 0) / totalMembers)
    : 0;

  // Upcoming milestones
  const allMilestones = [];
  projects.forEach(p => {
    if (p.milestones) {
      p.milestones.forEach(m => {
        if (m.status === 'upcoming' || m.status === 'current') {
          allMilestones.push({ ...m, projectName: p.name });
        }
      });
    }
  });

  const METRICS = [
    { label: 'Active Projects', value: String(activeProjectsCount), change: 'Current active projects', icon: 'work', color: 'text-[#2563EB]', bg: 'bg-[#EFF6FF]' },
    { label: 'At Risk / Delayed', value: String(delayedProjectsCount), change: 'Requires attention', icon: 'warning', color: 'text-[#EF4444]', bg: 'bg-[#FEF2F2]' },
    { label: 'Resource Utilization', value: `${avgUtilization}%`, change: `${totalMembers} team members`, icon: 'group', color: 'text-[#10B981]', bg: 'bg-[#ECFDF5]' },
    { label: 'Upcoming Milestones', value: String(allMilestones.length), change: 'Across all projects', icon: 'flag', color: 'text-[#F59E0B]', bg: 'bg-[#FFFBEB]' },
  ];

  // Dynamic PMO activity feed generated from project list
  const recentActivities = [];
  projects.slice(0, 4).forEach(p => {
    recentActivities.push({
      user: p.manager?.name || 'PMO Lead',
      action: 'launched project',
      target: p.name,
      time: p.createdAt ? `${new Date(p.createdAt).toLocaleDateString()}` : 'Recently',
      icon: 'rocket_launch',
      color: 'text-[#2563EB]',
      bg: 'bg-[#EFF6FF]'
    });
    
    if (p.milestones) {
      p.milestones.slice(0, 1).forEach(m => {
        recentActivities.push({
          user: 'System',
          action: `scheduled milestone '${m.name}' for`,
          target: p.name,
          time: m.date ? `${new Date(m.date).toLocaleDateString()}` : 'Upcoming',
          icon: 'flag',
          color: 'text-[#F59E0B]',
          bg: 'bg-[#FFFBEB]'
        });
      });
    }
  });

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] w-full flex flex-col h-full gap-5 max-w-[1400px] mx-auto pb-8 text-left">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">PMO Dashboard</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              High-level overview of project health, resource utilization, and delivery timelines.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="border border-[#E2E8F0] bg-white text-[#0F172A] px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors shadow-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export Report
            </button>
            {canCreateProject && (
              <button
                onClick={() => navigate('/pmo/projects')}
                className="bg-[#2563EB] text-white px-5 py-2 rounded-lg text-[13px] font-medium hover:bg-[#1D4ED8] transition-colors shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                New Project
              </button>
            )}
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {METRICS.map((metric, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 rounded-full opacity-5 bg-gradient-to-br from-transparent to-[#0F172A] group-hover:scale-110 transition-transform duration-500" />
              
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${metric.bg} ${metric.color}`}>
                  <span className="material-symbols-outlined text-[20px]">{metric.icon}</span>
                </div>
              </div>
              
              <h3 className="text-[24px] font-bold text-[#0F172A] leading-none mb-1">{metric.value}</h3>
              <p className="text-[12px] font-semibold text-[#64748B]">{metric.label}</p>
              
              <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center gap-1.5">
                <span className={`text-[11px] font-bold ${metric.color}`}>{metric.change}</span>
              </div>
            </div>
          ))}
        </div>

        {/* QUICK ACTIONS ROW */}
        <div className="flex flex-wrap gap-3 mt-1">
          {canCreateProject && (
            <button onClick={() => navigate('/pmo/projects')} className="border border-[#E2E8F0] bg-white text-[#0F172A] px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-[#F1F5F9] transition-colors flex items-center gap-2 shadow-sm">
              <Plus size={16} className="text-[#64748B]"/> New Project
            </button>
          )}
          {canCreateTask && (
            <button onClick={() => navigate('/pmo/tasks')} className="border border-[#E2E8F0] bg-white text-[#0F172A] px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-[#F1F5F9] transition-colors flex items-center gap-2 shadow-sm">
              <CheckSquare size={16} className="text-[#64748B]"/> Assign Task
            </button>
          )}
          <button onClick={() => navigate('/pmo/approvals')} className="border border-[#E2E8F0] bg-white text-[#0F172A] px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-[#F1F5F9] transition-colors flex items-center gap-2 shadow-sm">
            <ClipboardCheck size={16} className="text-[#64748B]"/> Review Approvals
          </button>
          <button onClick={() => navigate('/pmo/reports')} className="border border-[#E2E8F0] bg-white text-[#0F172A] px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-[#F1F5F9] transition-colors flex items-center gap-2 shadow-sm">
            <BarChart2 size={16} className="text-[#64748B]"/> Generate Report
          </button>
        </div>

        {/* MAIN CONTENT GRID */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* LEFT: PROJECT HEALTH GRID */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
                  <h2 className="text-[14px] font-bold text-[#0F172A] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#64748B] text-[18px]">monitoring</span>
                    Project Health & Progress
                  </h2>
                  <button 
                    onClick={() => navigate('/pmo/projects')}
                    className="text-[11px] font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                  >
                    View All Projects
                  </button>
                </div>
                
                <div className="p-5">
                  <div className="space-y-4">
                    {projects.map(project => {
                      let healthColor = 'text-[#64748B] bg-[#F1F5F9] border-[#E2E8F0]';
                      if (project.healthStatus === 'On Track') healthColor = 'text-[#10B981] bg-[#ECFDF5] border-[#D1FAE5]';
                      else if (project.healthStatus === 'At Risk') healthColor = 'text-[#F59E0B] bg-[#FFFBEB] border-[#FEF3C7]';
                      else if (project.healthStatus === 'Delayed') healthColor = 'text-[#EF4444] bg-[#FEF2F2] border-[#FEE2E2]';

                      let progressBarColor = 'bg-[#2563EB]';
                      if (project.healthStatus === 'On Track') progressBarColor = 'bg-[#10B981]';
                      else if (project.healthStatus === 'At Risk') progressBarColor = 'bg-[#F59E0B]';
                      else if (project.healthStatus === 'Delayed') progressBarColor = 'bg-[#EF4444]';

                      return (
                        <div key={project._id} className="p-4 border border-[#E2E8F0] rounded-xl hover:border-[#CBD5E1] transition-colors bg-white group cursor-pointer" onClick={() => navigate(`/pmo/projects/${project._id}`)}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md">{project.code}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  project.priority === 'Critical' ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]' :
                                  project.priority === 'High' ? 'bg-[#FFF7ED] text-[#EA580C] border-[#FFEDD5]' :
                                  'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                                }`}>
                                  {project.priority || 'Medium'} Priority
                                </span>
                              </div>
                              <h3 className="text-[15px] font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">{project.name}</h3>
                              <p className="text-[12px] font-medium text-[#64748B] mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">person</span>
                                PM: {project.manager?.name || 'Unassigned'}
                              </p>
                            </div>

                            <div className="flex flex-col sm:items-end gap-1.5">
                              <div className={`text-[12px] font-bold flex items-center gap-1.5 ${healthColor.split(' ')[0]}`}>
                                <span className="w-2 h-2 rounded-full bg-current"></span>
                                {project.healthStatus || 'Planning'}
                              </div>
                              <p className="text-[11px] font-semibold text-[#64748B] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">event</span>
                                Due {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="flex items-center gap-3">
                            <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${progressBarColor} rounded-full`} 
                                style={{ width: `${project.completionPercent || 0}%` }} 
                              />
                            </div>
                            <span className="text-[12px] font-bold text-[#0F172A] w-8 text-right">{project.completionPercent || 0}%</span>
                          </div>
                        </div>
                      );
                    })}
                    {projects.length === 0 && (
                      <p className="text-center py-6 text-[#64748B]">No projects set up yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: RESOURCE & ACTIVITY SIDEBAR */}
            <div className="space-y-5">
              
              {/* Resource Allocation Snapshot */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <h2 className="text-[13px] font-bold text-[#0F172A] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#64748B] text-[16px]">pie_chart</span>
                    Resource Workloads
                  </h2>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {teamStats.slice(0, 4).map((member, idx) => {
                      const workload = member.stats?.workload || 0;
                      let workloadBarColor = 'bg-[#10B981]';
                      if (workload > 80) workloadBarColor = 'bg-[#EF4444]';
                      else if (workload > 50) workloadBarColor = 'bg-[#F59E0B]';

                      return (
                        <div key={member.user?._id || idx}>
                          <div className="flex justify-between text-[12px] font-bold text-[#0F172A] mb-1.5">
                            <span>{member.user?.name || 'Staff Member'}</span>
                            <span>{workload}%</span>
                          </div>
                          <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                            <div className={`h-full ${workloadBarColor} rounded-full`} style={{ width: `${workload}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {teamStats.length === 0 && (
                      <p className="text-xs text-[#64748B]">No allocated resources yet.</p>
                    )}
                  </div>
                  
                  {resourceWarnings.overloadedMembers.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[#E2E8F0] bg-orange-50/50 p-2.5 rounded-lg border border-orange-100 flex items-start gap-2">
                      <AlertCircle size={16} className="text-[#D97706] shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[#D97706] leading-relaxed">
                        <strong className="text-[#92400E]">Workload Warning:</strong> {resourceWarnings.overloadedMembers.map(m => m.user).join(', ')} exceed standard capacities.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent PMO Activity */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <h2 className="text-[13px] font-bold text-[#0F172A] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#64748B] text-[16px]">history</span>
                    Recent PMO Activity
                  </h2>
                </div>
                <div className="p-4">
                  <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px before:h-full before:w-0.5 before:bg-[#E2E8F0]">
                    {recentActivities.slice(0, 4).map((activity, idx) => (
                      <div key={idx} className="relative flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shrink-0 z-10 ${activity.bg} ${activity.color}`}>
                          <span className="material-symbols-outlined text-[14px]">{activity.icon}</span>
                        </div>
                        <div className="pt-1">
                          <p className="text-[13px] text-[#0F172A] leading-snug">
                            <span className="font-bold">{activity.user}</span> {activity.action} <span className="font-semibold text-[#2563EB]">{activity.target}</span>
                          </p>
                          <p className="text-[11px] font-medium text-[#64748B] mt-0.5">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                    {recentActivities.length === 0 && (
                      <p className="text-xs text-[#64748B] py-2 pl-4">No recent activity detected.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Intern Summary Widget */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
                  <h2 className="text-[13px] font-bold text-[#0F172A] flex items-center gap-2">
                    <GraduationCap size={16} className="text-[#64748B]" />
                    Intern Overview
                  </h2>
                </div>
                <div className="p-4">
                  <div className="space-y-4">
                    {teamStats.filter(t => t.user?.employmentType === 'Intern').slice(0, 3).map((intern, i) => {
                      const name = intern.user?.name || 'Intern';
                      const initial = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                      const doneTasks = intern.stats?.completedTasks || 0;
                      const activeTasks = intern.stats?.activeTasks || 0;
                      const totalTasks = doneTasks + activeTasks;
                      const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                      
                      return (
                        <div key={intern.user?._id || i} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">{initial}</div>
                          <div className="flex-1">
                            <p className="text-[13px] font-bold text-[#0F172A] leading-tight">{name}</p>
                            <span className="text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] px-1.5 py-0.5 rounded mt-0.5 inline-block">{intern.projects?.join(', ') || 'OWMS'}</span>
                          </div>
                          <div className="text-right w-12">
                            <p className="text-[11px] font-bold text-[#0F172A] mb-1">{completion}%</p>
                            <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                              <div className="h-full bg-[#10B981] rounded-full" style={{ width: `${completion}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {teamStats.filter(t => t.user?.employmentType === 'Intern').length === 0 && (
                      <p className="text-xs text-[#64748B] text-center py-2">No interns currently assigned.</p>
                    )}
                  </div>
                  <button onClick={() => navigate('/pmo/interns')} className="w-full mt-4 py-2 border border-[#E2E8F0] rounded-lg text-[12px] font-bold text-[#2563EB] hover:bg-[#F8FAFC] transition-colors">
                    View All Interns →
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </PageWrapper>
  );
}
