import React from 'react';

/**
 * WorkloadBar
 * @param {Object} props
 * @param {number} props.percentage - Workload percentage (e.g. 75)
 * @param {boolean} [props.showLabel=true] - Whether to show the text label
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Height of the bar
 */
export const WorkloadBar = ({ percentage = 0, showLabel = true, size = 'md' }) => {
  const isOverloaded = percentage >= 80;
  const isWarning = percentage >= 50 && percentage < 80;
  
  const colorClass = isOverloaded ? 'bg-red-600' : isWarning ? 'bg-amber-500' : 'bg-green-600';
  const textClass = isOverloaded ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-green-600';
  
  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }[size];

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Workload</span>
          <span className={`text-sm font-black ${textClass}`}>{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClass}`}>
        <div 
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`} 
          style={{ width: `${Math.min(percentage, 100)}%` }} 
        />
      </div>
    </div>
  );
};
