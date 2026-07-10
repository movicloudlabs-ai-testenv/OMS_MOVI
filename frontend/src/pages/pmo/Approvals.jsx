import { useState, useEffect } from 'react';
import PageWrapper from '../../components/PageWrapper';
import toast from 'react-hot-toast';
import { pmoAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';

export default function PMOApprovals() {
  const { hasPermission, user } = useAuth();
  const isPMOLead     = user?.role?.slug === 'pmo-lead' || user?.role?.slug === 'super-admin';
  const canRead       = hasPermission('Tasks', 'read') || isPMOLead;
  const canUpdateTask = hasPermission('Tasks', 'update') || isPMOLead;
  const [activeTab, setActiveTab] = useState('Tasks');
  const [taskApprovals, setTaskApprovals] = useState([]);
  const [leaveOverview, setLeaveOverview] = useState([]);
  const [onboardingList, setOnboardingList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const [tasksRes, leavesRes, onboardRes] = await Promise.all([
        pmoAPI.getTasksInReview(),
        pmoAPI.getLeaveOverview(),
        pmoAPI.getPendingOnboarding(),
      ]);
      setTaskApprovals(tasksRes.data.data || []);
      setLeaveOverview(leavesRes.data.data || []);
      setOnboardingList(onboardRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingApprove = async (id) => {
    try {
      await pmoAPI.approveOnboarding(id);
      setOnboardingList(prev => prev.filter(u => u._id !== id));
      toast.success('Onboarding approved!', { style: { background: '#10B981', color: '#fff' } });
    } catch {
      toast.error('Failed to approve onboarding');
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  if (!canRead) return <PageWrapper><AccessDenied message="You don't have permission to view approvals." /></PageWrapper>;

  const handleTaskAction = async (id, action) => {
    try {
      await pmoAPI.reviewApproval(id, { action });
      setTaskApprovals(prev => prev.filter(a => a._id !== id));
      if (action === 'approve') {
        toast.success('Task approved successfully!', {
          style: { background: '#10B981', color: '#fff' },
          iconTheme: { primary: '#fff', secondary: '#10B981' }
        });
      } else {
        toast('Changes requested. Task sent back.', {
          icon: '⚠️',
          style: { background: '#F59E0B', color: '#fff' }
        });
      }
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] w-full flex flex-col h-full gap-8 max-w-[1000px] mx-auto pb-12">
        
        {/* HEADER & TABS */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mt-6 border-b border-[#E2E8F0] pb-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A] flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[#2563EB] text-[28px]">fact_check</span>
              Team Approvals
            </h1>
            
            <div className="flex gap-2 bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-lg w-fit">
              <button 
                onClick={() => setActiveTab('Tasks')}
                className={`px-6 py-2 rounded-md text-[13px] font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'Tasks' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                Task Submissions
                {!loading && taskApprovals.length > 0 && (
                  <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'Tasks' ? 'bg-[#2563EB] text-white' : 'bg-[#E2E8F0]'}`}>
                    {taskApprovals.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('Leave')}
                className={`px-6 py-2 rounded-md text-[13px] font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'Leave' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">event_busy</span>
                On Leave
                {!loading && leaveOverview.length > 0 && (
                  <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'Leave' ? 'bg-[#2563EB] text-white' : 'bg-[#E2E8F0]'}`}>
                    {leaveOverview.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('Onboarding')}
                className={`px-6 py-2 rounded-md text-[13px] font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'Onboarding' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Onboarding
                {!loading && onboardingList.length > 0 && (
                  <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'Onboarding' ? 'bg-[#7C3AED] text-white' : 'bg-[#E2E8F0]'}`}>
                    {onboardingList.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">

          {loading && (
            <div className="flex justify-center items-center py-24">
              <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
            </div>
          )}

          {/* Tasks Tab */}
          {!loading && activeTab === 'Tasks' && (
            taskApprovals.length === 0 ? (
              <EmptyState title="All Caught Up!" subtitle="There are no pending task submissions to review. Your teams are still working hard." icon="task_alt" color="text-[#10B981]" bg="bg-[#ECFDF5]" />
            ) : taskApprovals.map(approval => {
              const name = approval.assignedTo?.name || 'Unknown Assignee';
              const initial = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              const pr = approval.priority || 'medium';
              const effort = `${approval.effortPoints || 0} pts`;
              const submittedAtStr = approval.updatedAt ? new Date(approval.updatedAt).toLocaleDateString() : 'recently';
              return (
                <div key={approval._id} className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden flex flex-col sm:flex-row hover:border-[#CBD5E1] transition-colors group">
                  <div className="flex-1 p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md border border-[#E2E8F0]">{approval._id.slice(-6).toUpperCase()}</span>
                        <span className="text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-md border border-[#BFDBFE]">{approval.project?.name || 'OWMS'}</span>
                      </div>
                      <span className="text-[11px] font-medium text-[#64748B] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span> Submitted {submittedAtStr}
                      </span>
                    </div>
                    <h3 className="text-[16px] font-bold text-[#0F172A] mb-2 group-hover:text-[#2563EB] transition-colors">{approval.title}</h3>
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 mb-4">
                      <p className="text-[13px] text-[#475569] leading-relaxed">
                        <span className="font-bold text-[#0F172A] mr-2">Description:</span>{approval.description || 'No description provided.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] bg-blue-100 text-blue-700">{initial}</div>
                        <div>
                          <p className="text-[12px] font-bold text-[#0F172A] leading-tight">{name}</p>
                          <p className="text-[11px] text-[#64748B]">{approval.assignedTo?.designation || 'Team Member'}</p>
                        </div>
                      </div>
                      <div className="h-6 w-px bg-[#E2E8F0]" />
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#64748B]">speed</span>
                        <span className="text-[12px] font-bold text-[#0F172A]">{effort}</span>
                      </div>
                      <div className="h-6 w-px bg-[#E2E8F0]" />
                      <span className="text-[12px] font-bold text-[#0F172A] uppercase">{pr} Priority</span>
                    </div>
                  </div>
                  <div className="bg-[#F8FAFC] border-t sm:border-t-0 sm:border-l border-[#E2E8F0] p-6 sm:w-[240px] flex flex-row sm:flex-col items-center justify-center gap-3 shrink-0">
                    <button
                      onClick={() => canUpdateTask && handleTaskAction(approval._id, 'approve')}
                      disabled={!canUpdateTask}
                      className={`w-full py-2.5 rounded-xl text-[13px] font-bold transition-colors shadow-sm flex items-center justify-center gap-2 ${canUpdateTask ? 'bg-[#10B981] text-white hover:bg-[#059669]' : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">done_all</span> Approve Task
                    </button>
                    <button
                      onClick={() => canUpdateTask && handleTaskAction(approval._id, 'reject')}
                      disabled={!canUpdateTask}
                      className={`w-full py-2.5 bg-white rounded-xl text-[13px] font-bold transition-colors shadow-sm flex items-center justify-center gap-2 ${canUpdateTask ? 'border border-[#F59E0B] text-[#D97706] hover:bg-[#FFFBEB]' : 'border border-[#E2E8F0] text-[#CBD5E1] cursor-not-allowed'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">history</span> Request Changes
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Leave Tab — read-only overview (PMO can see who's on leave, cannot act) */}
          {!loading && activeTab === 'Leave' && (
            leaveOverview.length === 0 ? (
              <EmptyState title="No one on leave" subtitle="No approved leaves across your team or HR in the recent window." icon="event_available" color="text-[#2563EB]" bg="bg-[#EFF6FF]" />
            ) : (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <span className="material-symbols-outlined text-[18px] text-[#64748B]">visibility</span>
                  <span className="text-[13px] font-bold text-[#0F172A]">Leave Overview</span>
                  <span className="text-[11px] text-[#64748B]">· view-only</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <tr>
                        {['Member', 'Role', 'Type', 'Duration', 'Days', 'Status'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leaveOverview.map(lv => {
                        const name = lv.user?.name || 'Unknown';
                        const initial = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                        const roleName = lv.user?.role?.name || lv.user?.designation || 'Member';
                        const slug = lv.user?.role?.slug || '';
                        const roleBadge = slug.includes('hr') ? 'bg-purple-100 text-purple-700'
                          : slug.includes('intern') ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700';
                        const today = new Date(); today.setHours(0,0,0,0);
                        const ongoing = new Date(lv.fromDate) <= today && new Date(lv.toDate) >= today;
                        const upcoming = new Date(lv.fromDate) > today;
                        return (
                          <tr key={lv._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] last:border-0">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center text-[10px] font-bold shrink-0">{initial}</div>
                                <div>
                                  <p className="text-xs font-semibold text-[#0F172A]">{name}</p>
                                  <p className="text-[10px] text-[#64748B]">{lv.user?.employeeId || ''}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadge}`}>{roleName}</span></td>
                            <td className="px-4 py-3"><span className="text-[10px] font-bold bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded uppercase">{lv.type}</span></td>
                            <td className="px-4 py-3 text-xs text-[#0F172A] whitespace-nowrap">{new Date(lv.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(lv.toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                            <td className="px-4 py-3 text-xs font-bold text-[#0F172A]">{lv.days}</td>
                            <td className="px-4 py-3">
                              {ongoing ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">On leave</span>
                                : upcoming ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase">Upcoming</span>
                                : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] uppercase">Completed</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Onboarding Tab */}
          {!loading && activeTab === 'Onboarding' && (
            onboardingList.length === 0 ? (
              <EmptyState title="No Pending Onboarding" subtitle="All new team members have completed their onboarding process." icon="person_check" color="text-[#7C3AED]" bg="bg-[#F5F3FF]" />
            ) : onboardingList.map(user => {
              const name = user.name || 'New Member';
              const initial = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              const joinedStr = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—';
              const progress = user.onboardingProgress || 0;
              return (
                <div key={user._id} className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden flex flex-col sm:flex-row hover:border-[#CBD5E1] transition-colors group">
                  <div className="flex-1 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center font-bold text-sm">{initial}</div>
                        <div>
                          <p className="text-[15px] font-bold text-[#0F172A]">{name}</p>
                          <p className="text-[12px] text-[#64748B]">{user.designation || 'New Employee'} • {user.department?.name || '—'}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-[#F5F3FF] text-[#7C3AED] px-2 py-0.5 rounded-full border border-[#DDD6FE]">{user.employmentType || 'Employee'}</span>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-[11px] font-bold mb-1.5">
                        <span className="text-[#64748B]">Onboarding Progress</span>
                        <span className="text-[#0F172A]">{progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className="h-full bg-[#7C3AED] rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      Joined {joinedStr}
                    </p>
                  </div>
                  <div className="bg-[#F8FAFC] border-t sm:border-t-0 sm:border-l border-[#E2E8F0] p-6 sm:w-[200px] flex items-center justify-center shrink-0">
                    <button
                      onClick={() => handleOnboardingApprove(user._id)}
                      className="w-full py-2.5 bg-[#7C3AED] text-white rounded-xl text-[13px] font-bold hover:bg-purple-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">check_circle</span> Approve
                    </button>
                  </div>
                </div>
              );
            })
          )}

        </div>

      </div>
    </PageWrapper>
  );
}

function EmptyState({ title, subtitle, icon, color, bg }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
      <div className={`w-16 h-16 ${bg} ${color} rounded-full flex items-center justify-center mb-4`}>
        <span className="material-symbols-outlined text-[32px]">{icon}</span>
      </div>
      <h3 className="text-[16px] font-bold text-[#0F172A] mb-1">{title}</h3>
      <p className="text-[13px] text-[#64748B] max-w-[300px]">{subtitle}</p>
    </div>
  );
}
