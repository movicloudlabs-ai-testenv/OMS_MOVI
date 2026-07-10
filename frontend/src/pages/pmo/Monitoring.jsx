import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import { pmoAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion } from 'framer-motion';

export default function PMOMonitoring() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Projects', 'read');
  const navigate = useNavigate();
  const [projectHealthList, setProjectHealthList] = useState([]);
  const [activeBlockers, setActiveBlockers] = useState([]);
  const [resourceWarnings, setResourceWarnings] = useState({ overloadedMembers: [], leaveWarnings: [] });
  const [barData, setBarData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMonitoringData = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const [healthRes, warningsRes, blockedTasksRes, teamRes] = await Promise.all([
        pmoAPI.getProjectHealth(),
        pmoAPI.getResourceWarnings(),
        pmoAPI.getTasks({ status: 'Blocked' }),
        pmoAPI.getTeam()
      ]);
      setProjectHealthList(healthRes.data.data || []);
      setResourceWarnings(warningsRes.data.data || { overloadedMembers: [], leaveWarnings: [] });
      
      const blockers = (blockedTasksRes.data.data || []).map(t => ({
        id: t._id,
        task: t.title,
        project: t.project?.name || 'OWMS',
        assignee: t.assignedTo?.name || 'Unassigned',
        reason: t.blockedReason || 'API Blocker',
        timeBlocked: 'Active',
      }));
      setActiveBlockers(blockers);

      // Process Team Data for Department Workload
      const teamData = teamRes.data.data || [];
      const deptWorkloadMap = {};
      teamData.forEach(item => {
        if (!item.user) return;
        const dept = item.user.department?.name || 'General';
        const workload = item.stats?.workload || 0;
        if (!deptWorkloadMap[dept]) {
          deptWorkloadMap[dept] = { total: 0, count: 0 };
        }
        deptWorkloadMap[dept].total += workload;
        deptWorkloadMap[dept].count += 1;
      });
      const processedBarData = Object.keys(deptWorkloadMap).map(dept => ({
        name: dept,
        workload: Math.round(deptWorkloadMap[dept].total / deptWorkloadMap[dept].count)
      }));
      setBarData(processedBarData);

    } catch (error) {
      toast.error('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  if (!canRead) return <PageWrapper><AccessDenied message="You don't have permission to view monitoring data." /></PageWrapper>;

  const pieData = [
    { name: 'On Track', value: projectHealthList.filter(p => p.health === 'On Track').length, color: '#10B981' },
    { name: 'At Risk', value: projectHealthList.filter(p => p.health === 'At Risk').length, color: '#F59E0B' },
    { name: 'Delayed', value: projectHealthList.filter(p => p.health === 'Delayed').length, color: '#EF4444' }
  ].filter(d => d.value > 0);

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] w-full flex flex-col h-full gap-8 max-w-[1400px] mx-auto pb-12 text-left">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">Project Monitoring</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Deep dive into project execution, active bottlenecks, and resource utilization.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/pmo/timeline')}
              className="border border-[#E2E8F0] bg-white text-[#0F172A] px-5 py-2 rounded-lg text-[13px] font-bold hover:bg-[#F8FAFC] transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              View Timeline
            </button>
          </div>
        </div>

        {/* MAIN GRID */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT: Charts and Project Health Cards */}
            <div className="lg:col-span-2 space-y-6">

              {/* CHARTS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Chart 1: Project Health Distribution */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col items-center"
                >
                  <h3 className="text-sm font-bold text-[#0F172A] mb-4 w-full text-left">Project Health Distribution</h3>
                  {pieData.length > 0 ? (
                    <div className="w-full h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 'bold' }} />
                          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: '600' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-sm text-[#64748B]">No projects available</div>
                  )}
                </motion.div>

                {/* Chart 2: Department Workload */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm"
                >
                  <h3 className="text-sm font-bold text-[#0F172A] mb-4">Average Workload by Department</h3>
                  {barData.length > 0 ? (
                    <div className="w-full h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            cursor={{ fill: '#F1F5F9' }} 
                            contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 'bold' }}
                            formatter={(value) => [`${value}%`, 'Workload']}
                          />
                          <Bar dataKey="workload" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={30}>
                            {barData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.workload > 100 ? '#DC2626' : entry.workload >= 80 ? '#D97706' : '#2563EB'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-sm text-[#64748B]">No workload data available</div>
                  )}
                </motion.div>
              </div>

              <h2 className="text-[15px] font-bold text-[#0F172A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563EB] text-[20px]">donut_large</span>
                Execution Health
              </h2>

              <div className="space-y-5">
                {projectHealthList.map(p => {
                  let healthColor = 'bg-[#10B981]';
                  let textColor = 'text-[#059669] bg-[#ECFDF5]';
                  if (p.health === 'At Risk') {
                    healthColor = 'bg-[#F59E0B]';
                    textColor = 'text-[#D97706] bg-[#FFFBEB]';
                  } else if (p.health === 'Delayed') {
                    healthColor = 'bg-[#EF4444]';
                    textColor = 'text-[#DC2626] bg-[#FEF2F2]';
                  }

                  const progress = p.metrics?.completionPercent || 0;

                  return (
                    <div key={p._id} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: p.health === 'On Track' ? '#10B981' : p.health === 'At Risk' ? '#F59E0B' : '#EF4444' }} />
                      
                      <div className="flex items-start justify-between mb-5 pl-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[11px] font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md">{p._id.slice(-6).toUpperCase()}</span>
                            <div className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${textColor}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {p.health}
                            </div>
                            {p.metrics?.blockedTasks > 0 && (
                              <div className="text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                <span className="material-symbols-outlined text-[12px]">warning</span>
                                {p.metrics.blockedTasks} Blockers
                              </div>
                            )}
                          </div>
                          <h3 onClick={() => navigate(`/pmo/projects/${p._id}`)} className="text-[18px] font-bold text-[#0F172A] hover:text-[#2563EB] cursor-pointer transition-colors">{p.name}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-[28px] font-black text-[#0F172A] leading-none">{progress}%</p>
                          <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mt-1">Complete</p>
                        </div>
                      </div>

                      <div className="w-full h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden mb-6 pl-2">
                        <div className={`h-full ${healthColor} rounded-full`} style={{ width: `${progress}%` }} />
                      </div>

                      <div className="grid grid-cols-4 gap-4 pl-2">
                        {[
                          { label: 'Total Tasks', value: p.metrics?.totalTasks || 0, color: 'text-[#0F172A]' },
                          { label: 'Overdue Tasks', value: p.metrics?.overdueTasks || 0, color: 'text-[#EF4444]' },
                          { label: 'Blocked Tasks', value: p.metrics?.blockedTasks || 0, color: 'text-[#F59E0B]' },
                          { label: 'Progress Rate', value: `${progress}%`, color: 'text-[#10B981]' },
                        ].map((stat, idx) => (
                          <div key={idx} className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                            <p className={`text-[16px] font-black ${stat.color} leading-none mb-1`}>{stat.value}</p>
                            <p className="text-[11px] font-bold text-[#64748B]">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {projectHealthList.length === 0 && (
                  <p className="text-[#64748B] text-center py-6 bg-white border border-dashed rounded-xl">No active project health metrics available.</p>
                )}
              </div>
            </div>

            {/* RIGHT: Blockers & Warnings */}
            <div className="space-y-6">
              
              <h2 className="text-[15px] font-bold text-[#0F172A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#EF4444] text-[20px]">report</span>
                Attention Required
              </h2>

              {/* Blockers */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#FEF2F2] flex justify-between items-center">
                  <h3 className="text-[13px] font-bold text-[#DC2626] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">back_hand</span>
                    Active Blockers
                  </h3>
                  <span className="bg-[#DC2626] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{activeBlockers.length}</span>
                </div>
                <div className="divide-y divide-[#E2E8F0]">
                  {activeBlockers.map(b => (
                    <div key={b.id} className="p-4 hover:bg-[#F8FAFC] transition-colors">
                      <div className="flex justify-between items-start mb-1.5">
                        <p className="text-[13px] font-bold text-[#0F172A] leading-tight">{b.task}</p>
                        <span className="text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] px-2 py-0.5 rounded-full shrink-0">
                          {b.timeBlocked}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mb-2">{b.project}</p>
                      <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 p-2 rounded mb-2"><strong>Reason:</strong> {b.reason}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-[#2563EB] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">person</span> {b.assignee}
                        </p>
                        <button onClick={() => navigate('/pmo/tasks')} className="text-[11px] font-bold text-[#0F172A] border border-[#E2E8F0] px-3 py-1 rounded-md hover:bg-[#E2E8F0] transition-colors">
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                  {activeBlockers.length === 0 && (
                    <p className="text-xs text-[#64748B] p-4 text-center">No active blocked tasks.</p>
                  )}
                </div>
              </div>

              {/* Resource Warnings */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#FFFBEB] flex items-center gap-2">
                  <h3 className="text-[13px] font-bold text-[#D97706] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    Resource Warnings
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {resourceWarnings.overloadedMembers.map((w, idx) => (
                    <div key={idx} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                      <p className="text-[12px] font-bold text-[#0F172A] mb-0.5">{w.user} <span className="text-[#64748B] font-normal">({w.activeTasks} Tasks)</span></p>
                      <p className="text-[11px] text-[#DC2626] font-medium leading-relaxed">{w.warning}</p>
                    </div>
                  ))}
                  {resourceWarnings.leaveWarnings.map((w, idx) => (
                    <div key={idx} className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl">
                      <p className="text-[12px] font-bold text-[#0F172A] mb-0.5">{w.user} <span className="text-[#64748B] font-normal">({w.leaveType})</span></p>
                      <p className="text-[11px] text-blue-600 font-medium leading-relaxed">{w.warning}: {w.dates}</p>
                    </div>
                  ))}
                  {resourceWarnings.overloadedMembers.length === 0 && resourceWarnings.leaveWarnings.length === 0 && (
                    <p className="text-xs text-[#64748B] text-center py-4">No resource warnings detected.</p>
                  )}
                  <button onClick={() => navigate('/pmo/team')} className="w-full py-2 mt-2 bg-white border border-[#E2E8F0] rounded-lg text-[12px] font-bold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">
                    Reallocate Resources
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
