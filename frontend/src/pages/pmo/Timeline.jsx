import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import { pmoAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';

export default function PMOTimeline() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Projects', 'read');
  const navigate = useNavigate();
  const [viewState, setViewState] = useState('Weeks'); // Weeks, Months, Quarters
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const response = await pmoAPI.getProjects();
      setProjects(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load project timeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  if (!canRead) return <PageWrapper><AccessDenied message="You don't have permission to view the project timeline." /></PageWrapper>;

  // Set Timeline Start to Monday of the current week
  const getTimelineStartDate = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const timelineStart = getTimelineStartDate();
  const msPerDay = 24 * 60 * 60 * 1000;
  
  let daysPerColumn = 7;
  let unitName = 'Weeks';
  if (viewState === 'Months') {
    daysPerColumn = 30;
    unitName = 'Months';
  } else if (viewState === 'Quarters') {
    daysPerColumn = 90;
    unitName = 'Quarters';
  }
  const msPerColumn = daysPerColumn * msPerDay;

  const getHeaderLabel = (index) => {
    if (viewState === 'Weeks') {
      return `W${index + 1}`;
    } else if (viewState === 'Months') {
      const date = new Date(timelineStart.getTime() + index * msPerColumn);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[date.getMonth()];
    } else {
      const date = new Date(timelineStart.getTime() + index * msPerColumn);
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter}`;
    }
  };

  const getSubHeaderLabel = (index) => {
    const date = new Date(timelineStart.getTime() + index * msPerColumn);
    if (viewState === 'Weeks') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    } else {
      return `${date.getFullYear()}`;
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'On Track':
        return 'bg-[#10B981]';
      case 'At Risk':
        return 'bg-[#F59E0B]';
      case 'Delayed':
        return 'bg-[#EF4444]';
      default:
        return 'bg-[#10B981]';
    }
  };

  const mappedProjects = (projects || []).map(p => {
    const projStart = p.startDate ? new Date(p.startDate) : timelineStart;
    const projEnd = p.endDate ? new Date(p.endDate) : new Date(projStart.getTime() + 4 * 7 * 24 * 60 * 60 * 1000);

    let startCol = Math.floor((projStart - timelineStart) / msPerColumn) + 1;
    if (startCol < 1) startCol = 1;
    if (startCol > 12) startCol = 12;

    let durationCols = Math.ceil((projEnd - projStart) / msPerColumn);
    if (durationCols < 1) durationCols = 1;
    if (startCol + durationCols > 13) {
      durationCols = 13 - startCol;
    }

    const mappedMilestones = (p.milestones || []).map(ms => {
      const msCol = ms.date ? Math.floor((new Date(ms.date) - timelineStart) / msPerColumn) + 1 : startCol;
      return {
        col: Math.max(1, Math.min(12, msCol)),
        name: ms.name || 'Milestone'
      };
    });

    return {
      id: p.code || p._id.toString().substring(0, 7).toUpperCase(),
      name: p.name,
      manager: p.manager?.name || 'Unassigned',
      health: p.healthStatus || 'On Track',
      color: getHealthColor(p.healthStatus),
      startCol,
      durationCols,
      milestones: mappedMilestones
    };
  });

  const columns = Array.from({ length: 12 });

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] w-full flex flex-col h-full gap-8 max-w-[1400px] mx-auto pb-12 text-left">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">Project Timeline</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Gantt chart view for tracking long-term delivery schedules and milestones.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1">
              {['Weeks', 'Months', 'Quarters'].map(v => (
                <button 
                  key={v}
                  onClick={() => setViewState(v)}
                  className={`px-4 py-1.5 rounded-md text-[12px] font-bold transition-all ${
                    viewState === v ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button 
              onClick={() => navigate('/pmo/monitoring')}
              className="border border-[#E2E8F0] bg-white text-[#0F172A] px-5 py-2 rounded-lg text-[13px] font-bold hover:bg-[#F8FAFC] transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">donut_large</span>
              View Monitoring
            </button>
          </div>
        </div>

        {/* GANTT CHART */}
        {loading ? (
          <div className="flex justify-center items-center py-24 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : mappedProjects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
            <p className="text-sm font-semibold text-[#64748B]">No projects available to display in timeline</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
            
            {/* Gantt Header */}
            <div className="flex border-b border-[#E2E8F0] bg-[#F8FAFC] overflow-x-auto">
              {/* Left Sidebar Header */}
              <div className="w-[300px] shrink-0 p-4 border-r border-[#E2E8F0] flex items-center bg-[#F8FAFC] z-20">
                <h3 className="text-[13px] font-bold text-[#0F172A]">Projects & Milestones</h3>
              </div>
              {/* Timeline Header */}
              <div className="flex-1 flex min-w-[720px]">
                {columns.map((_, i) => (
                  <div key={i} className="flex-1 min-w-[60px] border-r border-[#E2E8F0] last:border-r-0 p-3 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-bold text-[#64748B]">{getHeaderLabel(i)}</span>
                    <span className="text-[10px] text-[#94A3B8] mt-0.5 whitespace-nowrap">{getSubHeaderLabel(i)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt Body */}
            <div className="flex flex-col divide-y divide-[#F1F5F9] overflow-x-auto">
              {mappedProjects.map((proj) => (
                <div key={proj.id} className="flex relative group hover:bg-[#F8FAFC] transition-colors">
                  
                  {/* Left Sidebar (Project Details) */}
                  <div className="w-[300px] shrink-0 p-4 border-r border-[#E2E8F0] bg-white group-hover:bg-[#F8FAFC] transition-colors z-20 sticky left-0 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md">{proj.id}</span>
                      <span className={`w-2 h-2 rounded-full ${proj.color}`} />
                    </div>
                    <h4 className="text-[14px] font-bold text-[#0F172A] leading-tight mb-1">{proj.name}</h4>
                    <p className="text-[11px] font-medium text-[#64748B]">PM: {proj.manager}</p>
                  </div>

                  {/* Timeline Area */}
                  <div className="flex-1 min-w-[720px] relative py-4">
                    
                    {/* Grid Lines Overlay */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {columns.map((_, i) => (
                        <div key={i} className="flex-1 min-w-[60px] border-r border-[#F1F5F9] last:border-r-0" />
                      ))}
                    </div>

                    {/* Project Duration Bar */}
                    <div 
                      className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-lg ${proj.color} bg-opacity-20 border ${proj.color.replace('bg-', 'border-')} flex items-center px-3 shadow-sm transition-all hover:brightness-95 cursor-pointer z-10`}
                      style={{
                        left: `calc(${((proj.startCol - 1) / 12) * 100}%)`,
                        width: `calc(${(proj.durationCols / 12) * 100}%)`
                      }}
                      onClick={() => navigate('/pmo/projects')}
                    >
                      <div className={`h-full w-1 absolute left-0 top-0 rounded-l-lg ${proj.color}`} />
                      <span className="text-[11px] font-bold text-[#0F172A] ml-1 truncate">
                        {proj.durationCols} {unitName}
                      </span>
                    </div>

                    {/* Milestones */}
                    {proj.milestones.map((ms, idx) => (
                      <div 
                        key={idx}
                        className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 group/ms cursor-pointer"
                        style={{ left: `calc(${((ms.col - 1) / 12) * 100}% + calc(100% / 24))` }}
                      >
                        <div className="w-3.5 h-3.5 bg-[#2563EB] rotate-45 border-2 border-white shadow-sm group-hover/ms:scale-125 transition-transform" />
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover/ms:opacity-100 transition-opacity bg-[#0F172A] text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap pointer-events-none">
                          {ms.name}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0F172A]" />
                        </div>
                      </div>
                    ))}

                  </div>

                </div>
              ))}
            </div>

            {/* Footer Legend */}
            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-[11px] font-bold text-[#64748B]">
              <div className="flex gap-6">
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> On Track</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> At Risk</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Delayed</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#2563EB] rotate-45 ml-1" /> Key Milestone</span>
              </div>
              <span>Showing Next 12 {unitName}</span>
            </div>

          </div>
        )}

      </div>
    </PageWrapper>
  );
}
