import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay } from 'date-fns';

export default function CalendarWidget({ tasks = [], milestones = [] }) {
  const [date, setDate] = useState(new Date());

  const getDayContent = ({ date, view }) => {
    if (view !== 'month') return null;
    
    const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), date));
    // Assume milestones might be passed if added in the future
    const dayMilestones = milestones.filter(m => m.date && isSameDay(new Date(m.date), date));
    
    if (dayTasks.length > 0 || dayMilestones.length > 0) {
      return (
        <div className="flex justify-center gap-1 mt-1">
          {dayTasks.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
          {dayMilestones.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>}
        </div>
      );
    }
    return null;
  };

  const selectedDateTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), date));

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 h-full flex flex-col">
      <h2 className="font-headline font-bold text-base text-slate-900 mb-2 px-1">Calendar</h2>
      
      <div className="calendar-container flex-1">
        <Calendar 
          onChange={setDate} 
          value={date}
          tileContent={getDayContent}
          className="w-full border-none font-body text-[13px]"
        />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-50">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">
            {format(date, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
          {selectedDateTasks.length === 0 ? (
            <div className="py-4 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">No events</p>
            </div>
          ) : (
            selectedDateTasks.map(task => (
              <div key={task._id} className="text-[12px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2 shadow-sm">
                <span className="font-bold text-slate-800 truncate">{task.title}</span>
                <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[8px] uppercase font-black border ${task.status === 'done' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
