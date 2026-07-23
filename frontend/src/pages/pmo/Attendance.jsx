import { useState, useEffect } from 'react';
import PageWrapper from '../../components/PageWrapper';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { pmoAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_STYLES = {
  Present:   { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  Absent:    { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500'    },
  Leave:     { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  Holiday:   { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  'Half-Day':{ bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
};

export default function PMOAttendance() {
  const now = new Date();
  const [year,    setYear]    = useState(now.getFullYear());
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await pmoAPI.getAttendance({ month, year });
      const d = r.data?.data || r.data;
      setRecords(d?.records || []);
      setSummary(d?.summary  || null);
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month, year]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1);  setYear(y => y + 1); } else setMonth(m => m + 1); };

  const dayMap = {};
  records.forEach(r => { dayMap[new Date(r.date).getDate()] = r.status; });

  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  return (
    <PageWrapper>
      <div className="w-full max-w-[900px] mx-auto flex flex-col gap-6 px-6 mt-6 pb-10 font-sans">

        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
            <CalendarDays size={22} className="text-[#2563EB]" /> Attendance
          </h1>
          <p className="text-sm text-[#64748B] mt-1">Your monthly attendance record</p>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Present',    val: summary.present,           color: 'text-green-600', bg: 'bg-green-50'    },
              { label: 'Absent',     val: summary.absent,            color: 'text-red-600',   bg: 'bg-red-50'      },
              { label: 'Leave',      val: summary.leave,             color: 'text-blue-600',  bg: 'bg-blue-50'     },
              { label: 'Attendance', val: `${summary.percentage}%`,  color: 'text-[#2563EB]', bg: 'bg-[#EFF6FF]'   },
            ].map(({ label, val, color, bg }) => (
              <div key={label} className={`${bg} border border-[#E2E8F0] rounded-xl p-4 text-center`}>
                <p className={`text-2xl font-bold ${color}`}>{val}</p>
                <p className="text-xs text-[#64748B] mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Calendar */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[#E2E8F0] text-[#64748B]"><ChevronLeft size={18} /></button>
            <h2 className="text-sm font-bold text-[#0F172A]">{MONTH_NAMES[month - 1]} {year}</h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[#E2E8F0] text-[#64748B]"><ChevronRight size={18} /></button>
          </div>

          <div className="grid grid-cols-7 border-b border-[#E2E8F0]">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-bold text-[#64748B] uppercase">{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <span className="material-symbols-outlined text-[28px] text-[#2563EB] animate-spin">sync</span>
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e${i}`} className="min-h-[68px] border-b border-r border-[#F1F5F9]" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const status = dayMap[day];
                const st     = STATUS_STYLES[status];
                const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
                return (
                  <div key={day} className={`min-h-[68px] p-2 border-b border-r border-[#F1F5F9] flex flex-col ${st?.bg || ''}`}>
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                      isToday ? 'bg-[#2563EB] text-white' : 'text-[#64748B]'
                    }`}>{day}</span>
                    {status && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md self-start ${st.bg} ${st.text}`}>
                        {status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          {Object.entries(STATUS_STYLES).map(([label, s]) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
