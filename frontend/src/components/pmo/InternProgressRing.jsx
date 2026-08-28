import React from 'react';

/**
 * InternProgressRing
 * @param {Object} props
 * @param {number} props.percentage - Completion percentage (0-100)
 * @param {number} [props.size=80] - Size in pixels
 * @param {boolean} [props.showLabel=true] - Show the percentage text in middle
 */
export const InternProgressRing = ({ percentage = 0, size = 80, showLabel = true }) => {
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorClass = percentage < 50 ? 'text-red-500' : percentage < 75 ? 'text-amber-500' : 'text-green-500';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background circle */}
        <circle
          className="text-slate-100"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={`${colorClass} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold text-slate-800" style={{ fontSize: size * 0.25 }}>
            {percentage}%
          </span>
        </div>
      )}
    </div>
  );
};
