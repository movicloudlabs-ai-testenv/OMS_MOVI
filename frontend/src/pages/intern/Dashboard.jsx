import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import AttendanceClock from '../../components/shared/AttendanceClock';
import EODQuickShare from '../../components/shared/EODQuickShare';
import { 
  CheckSquare, AlertCircle, CalendarDays, Clock, 
  ExternalLink, GraduationCap, CheckCircle, FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { internAPI } from '../../utils/api';
import toast from 'react-hot-toast';

// Sub-components
const CircularProgress = ({ percentage }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="120" height="120" className="transform -rotate-90">
        <circle cx="60" cy="60" r={radius} stroke="#E2E8F0" strokeWidth="8" fill="none" />
        <motion.circle 
          cx="60" cy="60" r={radius} stroke="#2563EB" strokeWidth="8" fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-[#2563EB]">{percentage}%</span>
      </div>
    </div>
  );
};

export default function InternDashboard() {
  const navigate = useNavigate();

  const [profile,     setProfile]     = useState(null);
  const [tasks,       setTasks]       = useState([]);
  const [learning,    setLearning]    = useState([]);
  const [attendance,  setAttendance]  = useState(null);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading,     setLoading]     = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const [profileRes, tasksRes, learningRes, attendanceRes, leaveRes] = await Promise.all([
        internAPI.getProfile(),
        internAPI.getTasks(),
        internAPI.getLearningResources(),
        internAPI.getAttendance({ month: now.getMonth() + 1, year: now.getFullYear() }),
        internAPI.getLeaveBalance(),
      ]);

      setProfile(profileRes.data?.data || profileRes.data);
      setTasks(tasksRes.data?.data || []);
      const lData = learningRes.data?.data;
      setLearning(Array.isArray(lData) ? lData : (lData?.resources || []));
      setAttendance(attendanceRes.data?.data || attendanceRes.data);
      setLeaveBalance(leaveRes.data?.data || leaveRes.data);
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
  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done').length;

  // Attendance percentage from real data
  const attendancePct = attendance?.stats?.percentage ?? attendance?.summary?.attendancePercentage ?? attendance?.attendancePercentage ?? null;

  // Remaining leaves from real balance
  const remainingLeaves = leaveBalance
    ? Object.values(leaveBalance).reduce((sum, b) => {
        if (b && typeof b === 'object' && 'total' in b) return sum + (b.total - (b.used || 0));
        return sum;
      }, 0)
    : null;

  // Calculate internship progress percent (model uses internshipStart/internshipEnd)
  let progressPercent = 0;
  let daysRemaining = null;
  if (profile?.internshipStart && profile?.internshipEnd) {
    const start = new Date(profile.internshipStart);
    const end   = new Date(profile.internshipEnd);
    const now   = new Date();
    const total   = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    progressPercent = total > 0 ? Math.min(Math.round((elapsed / total) * 100), 100) : 0;
    daysRemaining   = Math.max(Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)), 0);
  }

  // Todays tasks (active)
  const todaysTasks = tasks.filter(t => t.status !== 'Done').slice(0, 3);

  // Performance rating from profile
  const ratings = profile?.performanceRatings || [];
  const latestRatingObj = ratings.length > 0 ? ratings[ratings.length - 1] : null;
  const avgRating = ratings.length > 0 
    ? (ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1)
    : '5.0';

  const getUrgencyColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-blue-500';
      default: return 'bg-slate-300';
    }
  };

  return (
    <PageWrapper>
      <div className="w-full flex flex-col gap-6 max-w-[1400px] mx-auto pb-8 font-sans text-left">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Good morning, {profile?.name || 'User'}</h1>
            <p className="text-sm text-[#64748B] mt-1">{profile?.college || 'College'} &middot; {profile?.department?.name || 'Operations'} Intern</p>
          </div>
          <div>
            <p className="text-sm text-[#64748B] font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* CLOCK IN/OUT */}
        <AttendanceClock api={internAPI} />

        {/* EOD UPDATE + DAILY TRACKER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <EODQuickShare api={internAPI} />
          </div>
          <button
            onClick={() => navigate('/intern/daily-tracker')}
            className="bg-[#2563EB] text-white rounded-xl shadow-sm p-5 flex items-center justify-between gap-3 hover:bg-[#1D4ED8] transition-colors text-left"
          >
            <div>
              <p className="text-[14px] font-bold">Daily Tracker</p>
              <p className="text-[12px] text-blue-100 mt-0.5">Fill today's detailed work log</p>
            </div>
            <span className="material-symbols-outlined text-[24px]">arrow_forward</span>
          </button>
        </div>

        {/* STATS BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <CheckSquare size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">{totalTasks} Tasks</p>
              <p className="text-xs text-[#64748B]">{completedTasks} completed</p>
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">{overdueCount} Overdue</p>
              <p className="text-xs text-[#64748B]">Need attention</p>
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
              <CalendarDays size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">Attendance</p>
              <p className="text-xs text-[#64748B]">
                {attendancePct !== null ? `${attendancePct}%` : '—'} &middot; This month
              </p>
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">
                {remainingLeaves !== null ? `${remainingLeaves} Leaves` : '— Leaves'}
              </p>
              <p className="text-xs text-[#64748B]">Remaining balance</p>
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
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-[#0F172A]">Today's Tasks</h2>
                </div>
                <button onClick={() => navigate('/intern/tasks')} className="text-sm font-bold text-[#2563EB] hover:underline">
                  View All &rarr;
                </button>
              </div>
              <div className="space-y-3">
                {todaysTasks.length > 0 ? todaysTasks.map(task => (
                  <div key={task._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-[#E2E8F0] rounded-lg hover:border-blue-300 transition-colors cursor-pointer group" onClick={() => navigate('/intern/tasks')}>
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
                      <div className={`w-2 h-2 rounded-full ${getUrgencyColor(task.priority)}`} />
                      <span className="text-sm font-medium text-[#0F172A]">{task.title}</span>
                      <span className="text-xs bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded ml-2 hidden sm:inline-block truncate max-w-[150px]" title={task.project?.name}>{task.project?.name || 'Project'}</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 pl-5 sm:pl-0">
                      <span className="text-xs font-semibold text-[#64748B] whitespace-nowrap">Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</span>
                      <div className="w-24">
                        <span className={`text-[11px] font-bold px-2 py-1 rounded w-full inline-block text-center ${
                          task.status === 'Todo' ? 'bg-slate-100 text-slate-600' :
                          task.status === 'In Progress' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                        }`}>{task.status}</span>
                      </div>
                      <div className="w-24 flex justify-end">
                        <button className="text-[11px] font-bold text-[#2563EB] border border-[#2563EB] hover:bg-[#EFF6FF] px-3 py-1 rounded transition-colors">Open</button>
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

            {/* My Project Card */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-semibold text-[#0F172A]">My Project</h2>
                <span className="bg-[#DCFCE7] text-[#16A34A] text-xs font-bold px-2 py-0.5 rounded">Active</span>
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]">{profile?.project?.name || 'No Project Assigned'}</h3>
              <p className="text-sm text-[#64748B] mt-1 line-clamp-2">
                {profile?.project?.description || 'You are assigned to assist in building modules and tasks defined by the PMO Lead.'}
              </p>
              
              <div className="mt-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-[#0F172A]">My Contribution</span>
                  <span className="text-xs font-bold text-[#2563EB]">{completedTasks} of {totalTasks} tasks completed</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-5 text-sm text-[#64748B]">
                <p><strong>PMO Lead:</strong> {profile?.pmoLead?.name || 'Unassigned'}</p>
                <span className="hidden sm:inline text-slate-300">|</span>
                <p><strong>Mentor:</strong> {profile?.mentor?.name || 'Unassigned'}</p>
                <span className="hidden sm:inline text-slate-300">|</span>
                <p><strong>Due:</strong> {profile?.project?.endDate ? new Date(profile.project.endDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              
              <div className="mt-5 pt-4 border-t border-[#E2E8F0]">
                <button onClick={() => navigate('/intern/tasks')} className="text-sm font-bold text-[#2563EB] hover:underline">
                  View Project Tasks &rarr;
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN 35% */}
          <div className="w-full lg:w-[35%] space-y-6">
            
            {/* Internship Progress */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm flex flex-col items-center text-center">
              <h2 className="font-semibold text-[#0F172A] w-full text-left mb-6">Internship Progress</h2>
              <CircularProgress percentage={progressPercent} />
              <p className="text-xs text-[#64748B] mt-2 mb-4">of internship complete</p>
              
              <div className="flex gap-4 w-full justify-center text-sm font-medium text-[#0F172A] mb-5">
                <div><span className="text-[#64748B] text-xs block">Start</span>{profile?.internshipStart ? new Date(profile.internshipStart).toLocaleDateString(undefined, {month: 'short', day: '2-digit'}) : '—'}</div>
                <div className="w-px bg-slate-200"></div>
                <div><span className="text-[#64748B] text-xs block">End</span>{profile?.internshipEnd ? new Date(profile.internshipEnd).toLocaleDateString(undefined, {month: 'short', day: '2-digit'}) : '—'}</div>
              </div>

              <div className="bg-[#EFF6FF] text-[#2563EB] px-4 py-1.5 rounded-full text-sm font-bold inline-block">
                {daysRemaining !== null ? `${daysRemaining} days remaining` : 'No end date set'}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <h2 className="font-semibold text-[#0F172A] mb-4">Upcoming Deadlines</h2>
              <div className="space-y-3">
                {tasks.filter(t => t.status !== 'Done' && t.dueDate).slice(0, 3).map(t => (
                  <div key={t._id} className="flex gap-3">
                    <div className={`w-1 rounded-full shrink-0 ${getUrgencyColor(t.priority)}`} />
                    <div className="flex-1 py-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-[#0F172A]">{t.title}</p>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{t.priority}</span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5">{new Date(t.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {tasks.filter(t => t.status !== 'Done' && t.dueDate).length === 0 && (
                  <p className="text-xs text-[#64748B]">No upcoming deadlines.</p>
                )}
              </div>
            </div>

            {/* Performance Rating */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-[#0F172A]">My Performance</h2>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div>
                  <h3 className="text-3xl font-bold text-[#0F172A]">{avgRating}<span className="text-lg text-slate-400">/5</span></h3>
                  <p className="text-xs font-medium text-[#64748B] mt-1">Overall Rating</p>
                </div>
                <div className="h-10 w-px bg-slate-200"></div>
                <div className="flex-1">
                  <p className="text-xs text-[#64748B] mb-1">Latest Week Rating</p>
                  <div className="flex gap-0.5 text-amber-400">
                    {'★'.repeat(latestRatingObj?.rating || 4)}{'☆'.repeat(5 - (latestRatingObj?.rating || 4))}
                  </div>
                </div>
              </div>
              {latestRatingObj?.note && (
                <p className="text-sm text-[#64748B] italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                  "{latestRatingObj.note}"
                </p>
              )}
            </div>

            {/* Learning Resources */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-[#0F172A]">Learning</h2>
                <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2 py-0.5 rounded">{learning.filter(l => l.status !== 'Completed').length} pending</span>
              </div>
              <div className="space-y-3 mb-4">
                {learning.length === 0 ? (
                  <p className="text-sm text-[#64748B] py-2">No learning resources assigned yet.</p>
                ) : learning.slice(0, 2).map(lr => (
                  <div key={lr._id} className="flex gap-3 items-center border border-[#E2E8F0] p-2.5 rounded-lg text-left">
                    <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
                      <GraduationCap size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#0F172A] truncate">{lr.title}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">{lr.type} &middot; {lr.status}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/intern/learning')} className="text-sm font-bold text-[#2563EB] hover:underline">
                View All Resources &rarr;
              </button>
            </div>

          </div>

        </div>
      </div>
    </PageWrapper>
  );
}