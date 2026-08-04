import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import AttendanceClock from '../../components/shared/AttendanceClock';
import EODQuickShare from '../../components/shared/EODQuickShare';
import { 
  CheckSquare, Briefcase, CalendarDays, Clock, 
  CheckCircle, Users, AlertCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { employeeAPI } from '../../utils/api';
import toast from 'react-hot-toast';

export default function EmployeeDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveBalance,   setLeaveBalance]   = useState(null);
  const [leaveRequests,  setLeaveRequests]  = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const profileRes = await employeeAPI.getProfile();
      // getProfile returns { user, projects, taskStats, leaveBalance, attendance }
      const profileData = profileRes.data.data;
      setProfile(profileData?.user || profileData);
      if (profileData?.leaveBalance) setLeaveBalance(profileData.leaveBalance);
      if (Array.isArray(profileData?.projects)) setProjects(profileData.projects);

      const tasksRes = await employeeAPI.getTasks();
      setTasks(tasksRes.data.data || []);

      const attendanceRes = await employeeAPI.getAttendance();
      // getAttendance returns { records, summary, month, year }
      const attData = attendanceRes.data.data;
      setAttendance(Array.isArray(attData) ? attData : (attData?.records || []));

      try {
        const [leaveBalRes, leaveReqRes] = await Promise.all([
          employeeAPI.getLeaveBalance(),
          employeeAPI.getLeaveRequests(),
        ]);
        setLeaveBalance(leaveBalRes.data.data);
        setLeaveRequests(leaveReqRes.data?.data || []);
      } catch (leaveErr) {
        console.warn('Could not load leave data', leaveErr);
      }

      try {
        const teamRes = await employeeAPI.getTeam();
        setTeam(teamRes.data.data || []);
      } catch (teamErr) {
        console.warn('Could not load team members', teamErr);
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

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-screen bg-[#F8FAFC]">
          <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
        </div>
      </PageWrapper>
    );
  }

  // Calculate task counts
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Done').length;
  const activeTasksCount = tasks.filter(t => t.status !== 'Done').length;

  // Calculate attendance rate
  const totalDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'Present').length;
  const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

  // Calculate remaining leaves
  const remainingLeaves = leaveBalance 
    ? ((leaveBalance.casual?.total || 0) + (leaveBalance.sick?.total || 0) + (leaveBalance.annual?.total || 0)) -
      ((leaveBalance.casual?.used || 0) + (leaveBalance.sick?.used || 0) + (leaveBalance.annual?.used || 0))
    : 19;

  // Calculate workload
  const maxWorkload = 10;
  const workload = Math.min(Math.round((activeTasksCount / maxWorkload) * 100), 100);

  const getUrgencyColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-blue-500';
      default: return 'bg-slate-300';
    }
  };

  const workloadColor = workload < 50 ? 'text-[#16A34A] bg-[#DCFCE7]' : workload <= 80 ? 'text-[#D97706] bg-[#FEF3C7]' : 'text-[#DC2626] bg-[#FEE2E2]';
  const workloadBarColor = workload < 50 ? 'bg-[#16A34A]' : workload <= 80 ? 'bg-[#D97706]' : 'bg-[#DC2626]';

  // Filters tasks for "Today's Tasks" section (active tasks)
  const todaysTasks = tasks.filter(t => t.status !== 'Done').slice(0, 3);

  // Generate activities dynamically from statusHistory
  const recentActivities = tasks
    .filter(t => t.statusHistory && t.statusHistory.length > 0)
    .flatMap(t => t.statusHistory.map(h => ({
      id: h._id || Math.random(),
      text: `Task '${t.title}' marked ${h.status}`,
      time: new Date(h.changedAt).toLocaleDateString(),
      color: h.status === 'Done' ? 'bg-green-500' : (h.status === 'In Progress' ? 'bg-blue-500' : 'bg-purple-500')
    })))
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 3);

  // Fallback default activities if history is empty
  const activities = recentActivities.length > 0 ? recentActivities : [
    { id: 1, text: "Assigned to department projects", time: "Recently", color: "bg-purple-500" },
    { id: 2, text: "Profile logged into OWMS workspace", time: "Today", color: "bg-blue-500" }
  ];

  return (
    <PageWrapper>
      <div className="w-full flex flex-col gap-6 max-w-[1400px] mx-auto pb-8 font-sans text-left">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Good morning, {profile?.name || 'User'}</h1>
            <p className="text-sm text-[#64748B] mt-1">{profile?.designation || 'Staff'} &middot; {profile?.department?.name || 'Operations'}</p>
          </div>
          <div>
            <p className="text-sm text-[#64748B] font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* CLOCK IN/OUT */}
        <AttendanceClock api={employeeAPI} />

        {/* EOD UPDATE */}
        <EODQuickShare api={employeeAPI} />

        {/* STATS BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#2563EB] shrink-0">
              <CheckSquare size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">My Tasks</p>
              <p className="text-xs text-[#64748B]">{totalTasks} &middot; {completedTasks} done</p>
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <Briefcase size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">Projects</p>
              <p className="text-xs text-[#64748B]">{projects.length} active</p>
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-[#16A34A] shrink-0">
              <CalendarDays size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">Attendance</p>
              <p className="text-xs text-[#64748B]">{attendancePercent}% &middot; {presentDays}/{totalDays} days</p>
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-[#D97706] shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">Leave</p>
              <p className="text-xs text-[#64748B]">{remainingLeaves} days left</p>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT COLUMN 65% */}
          <div className="w-full lg:w-[65%] space-y-6">
            
            {/* Today's Tasks */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-[#0F172A]">Today's Tasks</h2>
                <button onClick={() => navigate('/employee/tasks')} className="text-sm font-bold text-[#2563EB] hover:underline">
                  View All &rarr;
                </button>
              </div>
              <div className="space-y-3">
                {todaysTasks.length > 0 ? todaysTasks.map(task => (
                  <div key={task._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-[#E2E8F0] rounded-lg hover:border-blue-300 transition-colors cursor-pointer group" onClick={() => navigate('/employee/tasks')}>
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
                      <div className={`w-2 h-2 rounded-full ${getUrgencyColor(task.priority)}`} />
                      <span className="text-sm font-medium text-[#0F172A]">{task.title}</span>
                      <span className="text-xs bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded ml-2 hidden sm:inline-block max-w-[150px] truncate" title={task.project?.name}>{task.project?.name || 'Project'}</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 pl-5 sm:pl-0">
                      <span className="text-xs font-semibold text-[#64748B] whitespace-nowrap">Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</span>
                      <div className="w-24">
                        <span className={`text-[11px] font-bold px-2 py-1 rounded w-full inline-block text-center ${
                          task.status === 'Todo' ? 'bg-slate-100 text-slate-600' :
                          task.status === 'In Progress' ? 'bg-blue-50 text-[#2563EB]' : 'bg-purple-50 text-purple-600'
                        }`}>{task.status}</span>
                      </div>
                      <div className="w-24 flex justify-end">
                        <button className="text-[11px] font-bold text-[#2563EB] border border-[#2563EB] hover:bg-[#EFF6FF] px-3 py-1 rounded transition-colors">Action</button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-6 text-[#64748B]">
                    <CheckCircle size={32} className="text-[#16A34A] mb-2 opacity-50" />
                    <p className="text-sm">No active tasks due today</p>
                  </div>
                )}
              </div>
            </div>

            {/* My Projects Card */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-[#0F172A]">My Projects</h2>
                  <span className="bg-[#EFF6FF] text-[#2563EB] text-xs font-bold px-2 py-0.5 rounded">{projects.length} Active</span>
                </div>
                <button onClick={() => navigate('/employee/projects')} className="text-sm font-bold text-[#2563EB] hover:underline">
                  View All &rarr;
                </button>
              </div>
              <div className="space-y-4">
                {projects.slice(0, 3).map(proj => {
                  const projTasks = tasks.filter(t => t.project?._id === proj._id || t.project === proj._id);
                  const done = projTasks.filter(t => t.status === 'Done').length;
                  const total = projTasks.length;
                  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

                  return (
                    <div key={proj._id} className="border border-[#E2E8F0] rounded-lg p-4 cursor-pointer" onClick={() => navigate(`/employee/projects`)}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#0F172A]">{proj.name}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${proj.status === 'Active' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-slate-100 text-slate-600'}`}>{proj.status}</span>
                          {proj.priority === 'High' && <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-red-50 text-red-600">High</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                          <Users size={14} />
                          <span>{proj.team?.length || 0} members</span>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs text-[#64748B]">My Progress</span>
                          <span className="text-[10px] font-bold text-[#0F172A]">{done}/{total} tasks &middot; Due {proj.endDate ? new Date(proj.endDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {projects.length === 0 && (
                  <p className="text-center py-6 text-[#64748B]">No project allocations found.</p>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <h2 className="font-semibold text-[#0F172A] mb-5">Recent Activity</h2>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[5px] before:-translate-x-px before:h-full before:w-0.5 before:bg-[#E2E8F0]">
                {activities.map(act => (
                  <div key={act.id} className="relative flex items-center gap-4 text-left">
                    <div className={`w-3 h-3 rounded-full border-2 border-white z-10 ${act.color}`} />
                    <div className="flex-1">
                      <p className="text-sm text-[#0F172A]">{act.text}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN 35% */}
          <div className="w-full lg:w-[35%] space-y-6">
            
            {/* Workload Card */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <h2 className="font-semibold text-[#0F172A] mb-4">My Workload</h2>
              <div className="flex flex-col items-center justify-center py-2">
                <span className={`text-4xl font-black ${workloadColor.split(' ')[0]}`}>
                  {workload}%
                </span>
                <p className="text-xs text-[#64748B] mt-1 text-center font-medium">Capacity utilized</p>
              </div>
              
              <div className="mt-4">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${workloadBarColor}`} style={{ width: `${workload}%` }} />
                </div>
                <p className="text-xs text-center text-[#0F172A] mt-3 font-medium">
                  {projects.length} active projects
                </p>
              </div>

              {workload > 80 && (
                <div className="mt-4 p-3 bg-[#FEF3C7] border border-[#D97706] rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} className="text-[#D97706] shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-[#D97706]">High workload detected. Consider discussing prioritization with your manager.</p>
                </div>
              )}
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <h2 className="font-semibold text-[#0F172A] mb-4">Upcoming Deadlines</h2>
              <div className="space-y-3">
                {tasks.filter(t => t.status !== 'Done' && t.dueDate).slice(0, 3).map(t => (
                  <div key={t._id} className="flex items-center gap-3">
                    <div className={`w-1.5 h-10 rounded-full ${getUrgencyColor(t.priority)} shrink-0`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#0F172A]">{t.title}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">{new Date(t.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {tasks.filter(t => t.status !== 'Done' && t.dueDate).length === 0 && (
                  <p className="text-xs text-[#64748B]">No upcoming task deadlines.</p>
                )}
              </div>
            </div>

            {/* Leave Status Card */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-[#0F172A]">Leave Status</h2>
                <button onClick={() => navigate('/employee/leave')} className="text-sm font-bold text-[#2563EB] hover:underline">View All →</button>
              </div>
              {leaveRequests.length === 0 ? (
                <p className="text-xs text-[#64748B]">No leave applications yet.</p>
              ) : (
                <div className="space-y-2">
                  {leaveRequests.slice(0, 4).map(req => (
                    <div key={req._id} className="flex items-center justify-between p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#0F172A]">{req.type} Leave</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5">
                          {req.fromDate ? new Date(req.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          {' → '}
                          {req.toDate ? new Date(req.toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          {' · '}{req.days}d
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ml-2 ${
                        req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{req.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Team Card */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-[#0F172A]">My Team</h2>
                <button onClick={() => navigate('/employee/team')} className="text-sm font-bold text-[#2563EB] hover:underline">
                  View All &rarr;
                </button>
              </div>
              <div className="space-y-3">
                {team.slice(0, 3).map((member, i) => {
                  const name = member.user?.name || member.name || 'Team Member';
                  const initial = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  
                  return (
                    <div key={member.user?._id || member._id || i} className="flex items-center gap-3 border border-[#E2E8F0] p-2.5 rounded-lg bg-[#F8FAFC]">
                      <div className={`w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                        {initial}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">{name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-white border border-[#E2E8F0] text-[#64748B]">{member.roleInProject || member.role?.name || member.designation || 'Staff'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {team.length === 0 && (
                  <p className="text-xs text-[#64748B]">No team members listed.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </PageWrapper>
  );
}
