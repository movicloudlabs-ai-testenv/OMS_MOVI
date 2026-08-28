import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * MilestoneTimeline
 * @param {Object} props
 * @param {Array} props.milestones - Array of milestone objects
 */
export const MilestoneTimeline = ({ milestones = [] }) => {
  return (
    <div className="relative pl-3 mt-4">
      {/* Vertical line connecting milestones */}
      <div className="absolute left-[15px] top-3 bottom-5 w-[2px] bg-slate-100" />
      
      <div className="space-y-6">
        {milestones.map((ms, idx) => {
          const isCompleted = ms.status === 'completed';
          const isCurrent = ms.status === 'current';
          const isUpcoming = ms.status === 'upcoming';
          const isOverdue = ms.status === 'overdue';

          let dotClass = 'bg-slate-200 border-slate-300';
          if (isCompleted) dotClass = 'bg-green-500 border-green-500';
          else if (isCurrent) dotClass = 'bg-blue-500 border-blue-500 ring-4 ring-blue-100';
          else if (isOverdue) dotClass = 'bg-red-500 border-red-500';

          return (
            <div key={ms.id || idx} className="relative flex items-start gap-4 group">
              {/* Timeline Dot */}
              <div className={`w-3 h-3 rounded-full border-2 mt-1 relative z-10 transition-colors ${dotClass}`}>
                {isCurrent && (
                  <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 pb-1 border-b border-transparent group-hover:border-slate-100 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={`text-sm font-bold ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                      {ms.name}
                    </h4>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{ms.date}</p>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="shrink-0 ml-4">
                    {isCompleted && <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200"><CheckCircle2 size={12} /> Done</span>}
                    {isCurrent && <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">In Progress</span>}
                    {isUpcoming && <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Upcoming</span>}
                    {isOverdue && <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200"><AlertCircle size={12} /> Overdue</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
