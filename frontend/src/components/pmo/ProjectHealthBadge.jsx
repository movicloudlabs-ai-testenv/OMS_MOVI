import React from 'react';

/**
 * ProjectHealthBadge
 * @param {Object} props
 * @param {number} [props.healthScore] - Optional score out of 100
 * @param {string} props.status - Status string ('On Track', 'At Risk', 'Delayed', 'Completed')
 */
export const ProjectHealthBadge = ({ healthScore, status }) => {
  let colorClasses = '';
  
  switch (status?.toLowerCase()) {
    case 'on track':
    case 'completed':
    case 'active':
      colorClasses = 'bg-emerald-50 text-emerald-600 border-emerald-200';
      break;
    case 'at risk':
      colorClasses = 'bg-amber-50 text-amber-600 border-amber-200';
      break;
    case 'delayed':
    case 'blocked':
      colorClasses = 'bg-red-50 text-red-600 border-red-200';
      break;
    default:
      colorClasses = 'bg-slate-50 text-slate-600 border-slate-200';
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{status}</span>
      {healthScore !== undefined && (
        <>
          <span className="w-px h-3 bg-current opacity-30 mx-0.5" />
          <span>{healthScore}%</span>
        </>
      )}
    </div>
  );
};
