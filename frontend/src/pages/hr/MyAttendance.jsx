import { useState, useEffect } from 'react';
import HRLayout from '../../components/hr/HRLayout';
import { CalendarDays, ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { hrAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function DayDetailsModal({ details, onClose }) {
  if (!details) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-lg font-bold text-[#0F172A]">Date Details</h2>
          <button onClick={onClose} className="text-[#64748B] hover:bg-[#E2E8F0] p-1.5 rounded-full"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between">
            <span className="text-sm font-bold text-[#64748B]">Date</span>
            <span className="text-sm text-[#0F172A]">{details.date}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm font-bold text-[#64748B]">Status</span>
            <span className="text-sm font-bold text-[#0F172A]">{details.status}</span>
          </div>

          {details.status === 'Present' && details.loginTime && (
            <div className="flex justify-between">
              <span className="text-sm font-bold text-[#64748B]">Login Time</span>
              <span className="text-sm text-[#0F172A]">{details.loginTime}</span>
            </div>
          )}

          {details.status === 'Leave' && (
            <>
              <div className="flex justify-between">
                <span className="text-sm font-bold text-[#64748B]">Leave Type</span>
                <span className="text-sm text-[#0F172A]">{details.leaveType}</span>
              </div>
              <div className="flex justify-between flex-col mt-2">
                <span className="text-sm font-bold text-[#64748B] mb-1">Reason</span>
                <span className="text-sm text-[#0F172A] bg-[#F8FAFC] p-2 rounded">{details.reason || 'N/A'}</span>
              </div>
            </>
          )}

          <div className="flex justify-end pt-2 border-t border-[#E2E8F0] mt-4">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] rounded-lg">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HRMyAttendance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  
  const [selectedDay, setSelectedDay] = useState(null);

  const loadAttendance = async (m, y) => {
    setLoading(true);
    try {
      const res = await hrAPI.getMyAttendance({ month: m, year: y });
      setData(res.data?.data || res.data);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance(currentMonth, currentYear);
  }, [currentMonth, currentYear]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const stats = data?.stats || { present: 0, absent: 0, leave: 0, percentage: 0 };
  const attendanceList = data?.attendance || [];

  // Calendar logic
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const emptyDays = Array(firstDayOfMonth).fill(null);

  const getDayColor = (status) => {
    switch(status) {
      case 'Present': return 'bg-green-100 border-green-200 text-green-800';
      case 'Absent': return 'bg-red-100 border-red-200 text-red-800';
      case 'Leave': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      default: return 'bg-white border-[#E2E8F0] text-[#0F172A]'; // Future dates
    }
  };

  const getDayStatusLabel = (status) => {
    switch(status) {
      case 'Present': return 'Present';
      case 'Absent': return 'Absent';
      case 'Leave': return 'Leave';
      default: return '';
    }
  };

  return (
    <HRLayout bare>
      <div className="w-full flex flex-col gap-5 max-w-[1200px] mx-auto pb-10 font-sans mt-5 px-4 lg:px-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/hr/profile')} className="p-2 bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] text-[#64748B] transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">My Attendance</h1>
            <p className="text-xs text-[#64748B] mt-0.5">View your attendance and leave records</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Present', value: stats.present, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Absent', value: stats.absent, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Leave', value: stats.leave, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Attendance %', value: `${stats.percentage}%`, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map((item, idx) => (
            <div key={idx} className={`${item.bg} border border-[#E2E8F0] rounded-xl px-5 py-4`}>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">{item.label}</span>
                <span className={`text-2xl font-black ${item.color}`}>{loading ? '–' : item.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar View */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-2">
              <CalendarDays size={18} className="text-[#64748B]" /> Monthly Calendar
            </h2>
            <div className="flex items-center gap-4">
              <button onClick={handlePrevMonth} className="p-2 border border-[#E2E8F0] rounded hover:bg-[#F8FAFC] transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="font-bold text-[#0F172A] w-32 text-center">
                {MONTHS[currentMonth - 1]} {currentYear}
              </span>
              <button onClick={handleNextMonth} className="p-2 border border-[#E2E8F0] rounded hover:bg-[#F8FAFC] transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-[#64748B] uppercase tracking-wider py-2">
                  {day}
                </div>
              ))}
              
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] p-2 rounded-lg bg-[#F8FAFC] border border-transparent"></div>
              ))}

              {attendanceList.map((dayData, i) => {
                const dayNum = i + 1;
                const statusStr = dayData.status;
                const label = getDayStatusLabel(statusStr);
                
                return (
                  <div 
                    key={dayNum} 
                    onClick={() => statusStr && setSelectedDay(dayData)}
                    className={`min-h-[80px] p-2 rounded-lg border flex flex-col ${getDayColor(statusStr)} ${statusStr ? 'cursor-pointer hover:opacity-80 transition-opacity shadow-sm' : ''}`}
                  >
                    <span className="text-sm font-bold mb-1">{dayNum}</span>
                    {label && (
                      <span className="text-[10px] font-bold uppercase tracking-wider mt-auto text-center rounded-sm px-1 py-0.5 bg-white/50 mix-blend-multiply">
                        {label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedDay && (
        <DayDetailsModal details={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </HRLayout>
  );
}
