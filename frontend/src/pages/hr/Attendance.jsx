import React, { useState, useEffect, useMemo } from 'react';
import HRLayout from '../../components/hr/HRLayout';
import { useAuth } from '../../contexts/AuthContext';
import { hrAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, UserX, Clock, AlertTriangle, Search, Filter, RefreshCw,
  CheckCircle, XCircle, ChevronLeft, ChevronRight, Download, X, CheckCircle2, User, ChevronDown
} from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import AccessDenied from '../../components/shared/AccessDenied';

// --- HELPERS ---
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const isTodayInRange = (from, to) => {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const f = new Date(from); f.setHours(0, 0, 0, 0);
  const e = new Date(to); e.setHours(23, 59, 59, 999);
  return t >= f && t <= e;
};

const getTypeColor = (type) => {
  switch (type?.toLowerCase()) {
    case 'casual': return 'bg-blue-100 text-blue-700';
    case 'sick': return 'bg-red-100 text-red-700';
    case 'annual': return 'bg-green-100 text-green-700';
    case 'emergency': return 'bg-amber-100 text-amber-700';
    case 'compensatory': return 'bg-purple-100 text-purple-700';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

// --- MODALS ---
function ApproveModal({ leave, onClose, onConfirm }) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await onConfirm(leave._id, 'Approved', note);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-[#E2E8F0]">
          <h3 className="text-lg font-bold text-[#0F172A]">Approve Leave</h3>
          <button onClick={onClose} className="text-[#64748B] hover:bg-[#F1F5F9] p-1.5 rounded-full"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center text-sm font-bold text-[#64748B]">
              {getInitials(leave.user?.name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">{leave.user?.name}</p>
              <p className="text-xs text-[#64748B]">{leave.type} • {fmtShort(leave.fromDate)} → {fmtShort(leave.toDate)}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Add a note (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="E.g., Enjoy your time off!" className="w-full p-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#2563EB] resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2 text-sm font-bold bg-[#16A34A] text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2">
            {submitting ? 'Approving...' : <><CheckCircle size={16} /> Confirm Approval</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function RejectModal({ leave, onClose, onConfirm }) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!note.trim()) return;
    setSubmitting(true);
    await onConfirm(leave._id, 'Rejected', note);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-[#E2E8F0]">
          <h3 className="text-lg font-bold text-[#0F172A]">Reject Leave</h3>
          <button onClick={onClose} className="text-[#64748B] hover:bg-[#F1F5F9] p-1.5 rounded-full"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg">
            <AlertTriangle size={24} className="text-[#DC2626]" />
            <div>
              <p className="text-sm font-semibold text-[#991B1B]">You are about to reject this leave.</p>
              <p className="text-xs text-[#DC2626]">A reason is required to notify the employee.</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Reason for rejection *</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Please provide a reason..." className="w-full p-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#DC2626] resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !note.trim()} className="px-5 py-2 text-sm font-bold bg-[#DC2626] text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
            {submitting ? 'Rejecting...' : <><XCircle size={16} /> Confirm Rejection</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function LeaveDetailDrawer({ leave, employee, onClose, onApprove, onReject }) {
  if (!leave) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 right-0 w-full max-w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-[#E2E8F0]">
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
          <h2 className="text-lg font-bold text-[#0F172A]">Leave Request Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-full text-[#64748B] hover:bg-[#F1F5F9] transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Employee Info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xl font-bold shadow-sm">
              {getInitials(leave.user?.name)}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">{leave.user?.name}</h3>
              <p className="text-xs text-[#64748B]">{leave.user?.employeeId} • {leave.user?.role?.name || 'Employee'}</p>
              <p className="text-xs text-[#64748B]">{leave.user?.department?.name || 'Department N/A'}</p>
            </div>
          </div>

          {/* Request Info */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Leave Type</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getTypeColor(leave.type)}`}>{leave.type}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Status</p>
                {leave.status === 'Pending' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-100 text-amber-700">Pending</span>}
                {leave.status === 'Approved' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-green-100 text-green-700">Approved</span>}
                {leave.status === 'Rejected' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-red-100 text-red-700">Rejected</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E2E8F0]">
              <div>
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Duration</p>
                <p className="text-sm font-semibold text-[#0F172A]">{fmtShort(leave.fromDate)} → {fmtShort(leave.toDate)}</p>
                <p className="text-xs text-[#64748B]">{leave.days} working day{leave.days !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Applied On</p>
                <p className="text-sm font-semibold text-[#0F172A]">{fmtDate(leave.createdAt)}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Reason</p>
              <p className="text-sm text-[#334155] leading-relaxed">{leave.reason || 'No reason provided.'}</p>
            </div>

            {leave.reviewNote && (
              <div className="pt-4 border-t border-[#E2E8F0]">
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Review Note ({leave.reviewedBy?.name})</p>
                <p className={`text-sm leading-relaxed ${leave.status === 'Rejected' ? 'text-red-700' : 'text-[#334155]'}`}>{leave.reviewNote}</p>
              </div>
            )}
          </div>

          {/* Balance Info */}
          <div>
            <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">Leave Balance Check</h4>
            {employee ? (
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#64748B] uppercase">Type</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#64748B] uppercase text-center">Allocated</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#64748B] uppercase text-center">Used</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#64748B] uppercase text-center">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {Object.entries(employee.leaveBalance || {}).map(([key, bal]) => {
                      if (typeof bal !== 'object' || !bal.total) return null;
                      const remaining = bal.total - bal.used;
                      const isRequestType = key.toLowerCase() === leave.type.toLowerCase();
                      return (
                        <tr key={key} className={isRequestType ? 'bg-blue-50/50' : ''}>
                          <td className="px-3 py-2 text-xs font-medium text-[#0F172A] capitalize">
                            {key} {isRequestType && <span className="text-[9px] text-blue-600 font-bold ml-1">(Requested)</span>}
                          </td>
                          <td className="px-3 py-2 text-xs text-center text-[#64748B]">{bal.total}</td>
                          <td className="px-3 py-2 text-xs text-center text-[#64748B]">{bal.used}</td>
                          <td className={`px-3 py-2 text-xs text-center font-bold ${remaining <= 0 ? 'text-red-600' : 'text-[#0F172A]'}`}>{remaining}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-[#64748B] italic">Balance data not available.</p>
            )}
          </div>
        </div>

        {leave.status === 'Pending' && (
          <div className="p-5 border-t border-[#E2E8F0] bg-white flex gap-3">
            <button onClick={() => { onClose(); onReject(leave); }} className="flex-1 py-2.5 text-sm font-bold text-[#DC2626] bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200">
              Reject
            </button>
            <button onClick={() => { onClose(); onApprove(leave); }} className="flex-1 py-2.5 text-sm font-bold text-white bg-[#16A34A] hover:bg-green-700 rounded-xl transition-colors">
              Approve
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

function BalanceAlertsModal({ employees, onClose }) {
  const alerted = employees.filter(emp => {
    if (!emp.leaveBalance) return false;
    return Object.values(emp.leaveBalance).some(bal => bal && typeof bal === 'object' && bal.total - bal.used <= 0);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-[#E2E8F0]">
          <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <AlertTriangle size={18} className="text-[#DC2626]" /> Exhausted Balances
          </h3>
          <button onClick={onClose} className="text-[#64748B] hover:bg-[#F1F5F9] p-1.5 rounded-full"><X size={18} /></button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {alerted.length === 0 ? (
            <p className="text-sm text-center text-[#64748B] py-8">All employee balances are healthy.</p>
          ) : (
            <div className="space-y-4">
              {alerted.map(emp => (
                <div key={emp._id} className="p-3 border border-[#E2E8F0] rounded-lg">
                  <p className="text-sm font-bold text-[#0F172A]">{emp.name}</p>
                  <p className="text-xs text-[#64748B] mb-2">{emp.employeeId}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(emp.leaveBalance || {}).filter(([_, bal]) => bal?.total - bal?.used <= 0).map(([key, bal]) => (
                      <span key={key} className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 uppercase">
                        {key}: {bal.total - bal.used} days left
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function AttendanceOverviewWidget({ summary }) {
  const data = [
    { name: 'Present', value: summary?.present || 0, color: '#10B981' },
    { name: 'Leave', value: summary?.leave || 0, color: '#3B82F6' },
    { name: 'Half Day', value: summary?.halfDay || 0, color: '#F59E0B' },
    { name: 'Absent', value: summary?.absent || 0, color: '#EF4444' }
  ];
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const rate = total > 0 ? Math.round((data[0].value / total) * 100) : 0;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-3 shrink-0">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
          <CalendarDays size={18} className="text-orange-500" /> Attendance Overview
        </h3>
        <div className="relative">
          <select className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#64748B] focus:outline-none focus:border-[#2563EB]">
            <option>This Month</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <div className="relative w-24 h-24">
            <PieChart width={96} height={96}>
              <Pie
                data={data}
                cx={48}
                cy={48}
                innerRadius={35}
                outerRadius={48}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2 pr-1">
              <span className="text-base font-bold text-[#0F172A]">{rate}%</span>
              <span className="text-[8px] text-[#64748B]">Rate</span>
            </div>
          </div>
          <div className="space-y-1">
            {data.map(item => (
              <div key={item.name} className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[#334155]">{item.name}</span>
                </div>
                <span className="font-bold text-[#0F172A] w-12 text-right">{item.value} <span className="text-[10px] text-[#94A3B8] font-normal">({total > 0 ? Math.round(item.value/total*100) : 0}%)</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-4 gap-2 border border-[#E2E8F0] rounded-xl p-3">
          <div>
            <p className="text-[10px] text-[#64748B] font-medium mb-1">Average Attendance</p>
            <p className="text-lg font-bold text-orange-500">{summary?.average ? summary.average + '%' : 'N/A%'}</p>
            <p className="text-[10px] text-[#94A3B8] mt-1">This Month</p>
          </div>
          <div>
            <p className="text-[10px] text-[#64748B] font-medium mb-1">Best Attendance Day</p>
            <p className="text-lg font-bold text-[#0F172A]">{summary?.bestDay || 'N/A'}</p>
            <p className="text-[10px] text-[#94A3B8] mt-1">—</p>
          </div>
          <div>
            <p className="text-[10px] text-[#64748B] font-medium mb-1">Total Working Days</p>
            <p className="text-lg font-bold text-[#0F172A]">{summary?.totalDays || 0}</p>
            <p className="text-[10px] text-[#94A3B8] mt-1">This Month</p>
          </div>
          <div>
            <p className="text-[10px] text-[#64748B] font-medium mb-1">Attendance Trend</p>
            <p className="text-lg font-bold text-orange-500">— {summary?.trend || 0}%</p>
            <p className="text-[10px] text-[#94A3B8] mt-1">vs Last Month</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function HRAttendance() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Attendance', 'read');

  const [allLeaves, setAllLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI State
  const [activeFilter, setActiveFilter] = useState('pending'); // 'pending', 'approved', 'today', 'all'
  const [viewMode, setViewMode] = useState('queue'); // 'queue', 'calendar'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // For dropdown in queue

  const currentDate = new Date();
  const [calendarMonth, setCalendarMonth] = useState(currentDate.getMonth());
  const [calendarYear, setCalendarYear] = useState(currentDate.getFullYear());

  // Modals
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [balanceModal, setBalanceModal] = useState(false);

  const loadData = async () => {
    if (!canRead) return;
    try {
      const [leavesRes, empRes, summaryRes] = await Promise.all([
        hrAPI.getLeaves({ limit: 1000 }), 
        hrAPI.getEmployees({ limit: 500 }),
        hrAPI.getAttendanceSummary({ month: currentDate.getMonth() + 1, year: currentDate.getFullYear() }).catch(() => ({ data: { data: null } }))
      ]);
      setAllLeaves(leavesRes.data?.data || leavesRes.data || []);
      setEmployees(empRes.data?.data || empRes.data?.employees || []);
      setAttendanceSummary(summaryRes.data?.data || summaryRes.data || null);
    } catch (err) {
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [canRead]);

  // Derived Data
  const todayLeaves = useMemo(() => allLeaves.filter(l => l.status === 'Approved' && isTodayInRange(l.fromDate, l.toDate)), [allLeaves]);
  const pendingLeaves = useMemo(() => allLeaves.filter(l => l.status === 'Pending'), [allLeaves]);
  const monthlyApproved = useMemo(() => allLeaves.filter(l => l.status === 'Approved' && new Date(l.fromDate).getMonth() === currentDate.getMonth() && new Date(l.fromDate).getFullYear() === currentDate.getFullYear()), [allLeaves]);
  
  const employeesWithExhaustedBal = useMemo(() => employees.filter(emp => {
    if (!emp.leaveBalance) return false;
    return Object.values(emp.leaveBalance).some(bal => bal && typeof bal === 'object' && bal.total - bal.used <= 0);
  }), [employees]);

  const filteredQueue = useMemo(() => {
    let list = allLeaves;
    if (activeFilter === 'pending') list = pendingLeaves;
    else if (activeFilter === 'approved') list = monthlyApproved;
    else if (activeFilter === 'today') list = todayLeaves;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l => l.user?.name?.toLowerCase().includes(q) || l.user?.employeeId?.toLowerCase().includes(q));
    }

    if (statusFilter !== 'All') {
      list = list.filter(l => l.status === statusFilter);
    }

    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allLeaves, activeFilter, pendingLeaves, monthlyApproved, todayLeaves, search, statusFilter]);

  // Calendar Data Processing
  const calendarDayMap = useMemo(() => {
    const map = {};
    const approvedInMonth = allLeaves.filter(l => l.status === 'Approved');
    
    approvedInMonth.forEach(l => {
      let cur = new Date(l.fromDate); cur.setHours(0,0,0,0);
      const end = new Date(l.toDate); end.setHours(23,59,59,999);
      while (cur <= end) {
        if (cur.getDay() !== 0 && cur.getDay() !== 6) {
          const dateStr = cur.toISOString().split('T')[0];
          if (!map[dateStr]) map[dateStr] = [];
          map[dateStr].push({ name: l.user?.name, type: l.type });
        }
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [allLeaves]);

  const handleReview = async (id, status, reviewNote) => {
    try {
      await hrAPI.reviewLeave(id, { status, reviewNote });
      toast.success(`Leave ${status.toLowerCase()} successfully`);
      loadData();
      setApproveModal(null);
      setRejectModal(null);
      if (selectedLeave?._id === id) setSelectedLeave(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to review leave');
    }
  };

  const handleExport = () => {
    const exportData = allLeaves.filter(l => new Date(l.fromDate).getMonth() === currentDate.getMonth() && new Date(l.fromDate).getFullYear() === currentDate.getFullYear());
    
    const headers = ['Employee Name', 'Employee ID', 'Department', 'Role', 'Leave Type', 'From Date', 'To Date', 'Working Days', 'Status', 'Approved By', 'Reason'];
    const rows = exportData.map(l => [
      l.user?.name || '',
      l.user?.employeeId || '',
      l.user?.department?.name || '',
      l.user?.role?.name || '',
      l.type,
      fmtDate(l.fromDate),
      fmtDate(l.toDate),
      l.days,
      l.status,
      l.reviewedBy?.name || '',
      (l.reason || '').replace(/"/g, '""')
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-report-${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderCalendar = () => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getDensityClass = (count) => {
      if (count === 0) return 'bg-white';
      if (count <= 2) return 'bg-[#DBEAFE]';
      if (count <= 5) return 'bg-[#BFDBFE]';
      return 'bg-[#3B82F6] text-white';
    };

    return (
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#0F172A]">{new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => { setCalendarMonth(currentDate.getMonth()); setCalendarYear(currentDate.getFullYear()); }} className="text-xs font-bold text-[#64748B] hover:text-[#0F172A] px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC]">Today</button>
            <div className="flex gap-1">
              <button onClick={() => { if(calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y=>y-1); } else setCalendarMonth(m=>m-1); }} className="p-1.5 border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] text-[#64748B]"><ChevronLeft size={16} /></button>
              <button onClick={() => { if(calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y=>y+1); } else setCalendarMonth(m=>m+1); }} className="p-1.5 border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] text-[#64748B]"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-[#E2E8F0] border border-[#E2E8F0] rounded-lg overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="bg-[#F8FAFC] py-2 text-center text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{d}</div>
          ))}
          {blanks.map(b => <div key={`b-${b}`} className="bg-white h-24" />)}
          {days.map(d => {
            const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const leavesOnDay = calendarDayMap[dateStr] || [];
            const count = leavesOnDay.length;
            const isToday = isTodayInRange(dateStr, dateStr);

            return (
              <div key={d} className={`h-24 p-2 relative group transition-colors ${getDensityClass(count)}`}>
                <span className={`text-xs font-bold ${isToday ? 'bg-[#2563EB] text-white w-6 h-6 flex items-center justify-center rounded-full' : (count >= 6 ? 'text-white' : 'text-[#64748B]')}`}>{d}</span>
                
                {count > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {leavesOnDay.slice(0, 2).map((l, i) => (
                      <div key={i} title={`${l.name} (${l.type})`} className="w-5 h-5 rounded-full bg-white/80 text-[#0F172A] border border-[#E2E8F0] flex items-center justify-center text-[8px] font-bold shadow-sm">
                        {getInitials(l.name)}
                      </div>
                    ))}
                    {count > 2 && (
                      <div className="w-5 h-5 rounded-full bg-black/20 text-[#0F172A] flex items-center justify-center text-[9px] font-bold">
                        +{count - 2}
                      </div>
                    )}
                  </div>
                )}

                {count > 0 && (
                  <div className="hidden group-hover:block absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#0F172A] text-white text-xs rounded-lg p-2 shadow-xl">
                    <p className="font-bold mb-1 border-b border-white/20 pb-1">{dateStr}</p>
                    <ul className="space-y-1">
                      {leavesOnDay.map((l, i) => <li key={i} className="truncate">• {l.name} ({l.type})</li>)}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-[#64748B]">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-white border border-[#E2E8F0]" /> 0 people</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#DBEAFE] border border-[#BFDBFE]" /> 1-2 people</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#BFDBFE] border border-[#93C5FD]" /> 3-5 people</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#3B82F6]" /> 6+ people</div>
        </div>
      </div>
    );
  };

  if (!canRead) return <HRLayout bare><AccessDenied message="You don't have permission to manage leave requests." /></HRLayout>;

  return (
    <HRLayout bare>
      <div className="w-full h-full overflow-hidden font-sans flex flex-col">
        
        <div className="flex justify-between items-end mb-3 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Time & Leave Management</h1>
            <p className="text-sm text-[#64748B] mt-1">Review, approve, and track employee leave across the organization.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#0F172A] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-lg shadow-sm transition-colors">
              <Download size={16} /> Export Monthly Report
            </button>
            <button onClick={() => setViewMode(v => v === 'queue' ? 'calendar' : 'queue')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#EA580C] hover:bg-orange-700 rounded-lg shadow-sm transition-colors">
              <CalendarDays size={16} /> {viewMode === 'queue' ? 'View Master Calendar' : 'View Leave Queue'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3 shrink-0">
          <div onClick={() => { setActiveFilter('approved'); setViewMode('queue'); }} className={`bg-white border rounded-xl p-3 shadow-sm cursor-pointer transition-all hover:border-[#2563EB] hover:shadow-md ${activeFilter === 'approved' && viewMode === 'queue' ? 'border-[#2563EB] ring-1 ring-[#2563EB]' : 'border-[#E2E8F0]'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><CalendarDays size={16} /></div>
              <span className="text-xl font-black text-[#0F172A]">{loading ? '...' : monthlyApproved.length}</span>
            </div>
            <p className="text-sm font-bold text-[#0F172A]">Total Leaves This Month</p>
            <p className="text-[11px] text-[#64748B] mt-1">Approved leaves recorded</p>
          </div>

          <div onClick={() => { setActiveFilter('today'); setViewMode('queue'); }} className={`bg-white border rounded-xl p-3 shadow-sm cursor-pointer transition-all hover:border-[#EA580C] hover:shadow-md ${activeFilter === 'today' && viewMode === 'queue' ? 'border-[#EA580C] ring-1 ring-[#EA580C]' : 'border-[#E2E8F0]'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600"><UserX size={16} /></div>
              <span className="text-xl font-black text-[#0F172A]">{loading ? '...' : todayLeaves.length}</span>
            </div>
            <p className="text-sm font-bold text-[#0F172A]">On Leave Today</p>
            <p className="text-[11px] text-[#64748B] mt-1 truncate">
              {todayLeaves.length > 0 ? todayLeaves.slice(0, 2).map(l => l.user?.name?.split(' ')[0]).join(', ') + (todayLeaves.length > 2 ? '...' : '') : 'No active leaves today'}
            </p>
          </div>

          <div onClick={() => { setActiveFilter('pending'); setViewMode('queue'); }} className={`bg-white border rounded-xl p-3 shadow-sm cursor-pointer transition-all hover:border-[#9333EA] hover:shadow-md ${activeFilter === 'pending' && viewMode === 'queue' ? 'border-[#9333EA] ring-1 ring-[#9333EA]' : 'border-[#E2E8F0]'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><Clock size={16} /></div>
              <span className="text-xl font-black text-[#0F172A]">{loading ? '...' : pendingLeaves.length}</span>
            </div>
            <p className="text-sm font-bold text-[#0F172A]">Pending Approvals</p>
            <p className={`text-[11px] mt-1 flex items-center gap-1 font-medium ${pendingLeaves.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {pendingLeaves.length > 0 ? <><AlertTriangle size={12} /> Requires your action</> : <><CheckCircle size={12} /> All caught up</>}
            </p>
          </div>

          <div onClick={() => setBalanceModal(true)} className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm cursor-pointer transition-all hover:border-[#DC2626] hover:shadow-md">
            <div className="flex justify-between items-start mb-2">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600"><AlertTriangle size={16} /></div>
              <span className="text-xl font-black text-[#0F172A]">{loading ? '...' : employeesWithExhaustedBal.length}</span>
            </div>
            <p className="text-sm font-bold text-[#0F172A]">Leave Balance Alerts</p>
            <p className={`text-[11px] mt-1 font-medium ${employeesWithExhaustedBal.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {employeesWithExhaustedBal.length > 0 ? 'Employees with exhausted leave balance' : 'All balances healthy'}
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 items-stretch flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 w-full min-w-0 flex flex-col gap-3 min-h-0">
            {viewMode === 'calendar' ? renderCalendar() : (
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
                <div className="p-2.5 px-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-[#0F172A]">Leave Requests</h2>
                    {activeFilter !== 'all' && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E2E8F0] text-xs font-bold text-[#64748B] rounded-full shadow-sm">
                        {activeFilter === 'pending' && 'Pending'}
                        {activeFilter === 'approved' && 'Monthly Leaves'}
                        {activeFilter === 'today' && 'On Leave Today'}
                        <button onClick={() => setActiveFilter('all')} className="hover:text-[#0F172A]"><X size={12} /></button>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                      <input type="text" placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="w-48 pl-9 pr-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#2563EB]" />
                    </div>
                    {activeFilter === 'all' && (
                      <div className="relative">
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]">
                          <option value="All">All Status</option>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                      </div>
                    )}
                    <button onClick={() => { setRefreshing(true); loadData(); }} disabled={refreshing} className="p-2 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] rounded-lg shadow-sm transition-colors disabled:opacity-50">
                      <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                <div className="overflow-auto flex-1">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <tr>
                        {['Employee', 'Leave Type', 'Dates', 'Reason', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-3 py-1.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {loading ? (
                        <tr><td colSpan="6" className="px-4 py-12 text-center text-sm text-[#64748B]">Loading leave requests...</td></tr>
                      ) : filteredQueue.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-3 py-8 text-center">
                            <div className="flex flex-col items-center justify-center text-[#CBD5E1] mb-2"><CalendarDays size={40} /></div>
                            <p className="text-sm font-bold text-[#0F172A] mb-1">No leave requests found</p>
                            <p className="text-xs text-[#64748B]">
                              {activeFilter === 'pending' && "No pending approvals. All caught up!"}
                              {activeFilter === 'today' && "No employees on leave today"}
                              {activeFilter === 'approved' && "No approved leaves this month"}
                              {activeFilter === 'all' && "No records found matching criteria"}
                            </p>
                            {activeFilter !== 'all' && (
                              <button onClick={() => setActiveFilter('all')} className="mt-4 text-xs font-bold text-[#2563EB] hover:underline">Clear Filters</button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredQueue.map(lv => (
                          <tr key={lv._id} onClick={() => setSelectedLeave(lv)} className="group hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center text-xs font-bold text-[#64748B] shrink-0">{getInitials(lv.user?.name)}</div>
                                <div>
                                  <p className="text-sm font-medium text-[#0F172A]">{lv.user?.name}</p>
                                  <p className="text-xs text-[#64748B]">{lv.user?.employeeId}</p>
                                  <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${lv.user?.role?.slug === 'intern' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {lv.user?.role?.name || 'Staff'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-1.5">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${getTypeColor(lv.type)}`}>{lv.type}</span>
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[#0F172A] whitespace-nowrap">{fmtShort(lv.fromDate)} → {fmtShort(lv.toDate)}</span>
                                {isTodayInRange(lv.fromDate, lv.toDate) && lv.status === 'Approved' && (
                                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="On leave today" />
                                )}
                              </div>
                              <p className="text-xs text-[#64748B] mt-0.5">{lv.days} working day{lv.days !== 1 ? 's' : ''}</p>
                            </td>
                            <td className="px-3 py-1.5 max-w-[150px]">
                              <p className="text-xs text-[#334155] truncate" title={lv.reason}>{lv.reason || '—'}</p>
                            </td>
                            <td className="px-3 py-1.5">
                              {lv.status === 'Pending' && <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full uppercase bg-amber-100 text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending</span>}
                              {lv.status === 'Approved' && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full uppercase bg-green-100 text-green-700"><CheckCircle size={12} /> Approved</span>}
                              {lv.status === 'Rejected' && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full uppercase bg-red-100 text-red-700"><XCircle size={12} /> Rejected</span>}
                            </td>
                            <td className="px-3 py-1.5 text-right" onClick={e => e.stopPropagation()}>
                              {lv.status === 'Pending' ? (
                                <div className="flex items-center gap-2 justify-end">
                                  <button onClick={() => setApproveModal(lv)} className="px-3 py-1.5 text-xs font-bold bg-[#16A34A] text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm">Approve</button>
                                  <button onClick={() => setRejectModal(lv)} className="px-3 py-1.5 text-xs font-bold border border-[#DC2626] text-[#DC2626] rounded-lg hover:bg-red-50 transition-colors bg-white">Reject</button>
                                </div>
                              ) : (
                                <div className="text-right">
                                  {lv.status === 'Approved' ? (
                                    <>
                                      <p className="text-[10px] text-[#64748B]">Approved by {lv.reviewedBy?.name?.split(' ')[0]}</p>
                                      <p className="text-[9px] text-[#94A3B8]">{fmtShort(lv.reviewedAt)}</p>
                                    </>
                                  ) : (
                                    <span className="text-xs font-medium text-[#DC2626] underline decoration-dotted cursor-help" title={lv.reviewNote}>View Reason</span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {!loading && filteredQueue.length > 0 && (
                  <div className="p-2 px-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center text-xs text-[#64748B] shrink-0">
                    <span>Showing {filteredQueue.length} requests</span>
                  </div>
                )}
              </div>
            )}
            <AttendanceOverviewWidget summary={attendanceSummary} />
          </div>
          
          <div className="w-full lg:w-[280px] shrink-0 space-y-3 overflow-y-auto pr-1">
            <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex flex-col min-h-0">
              <div className="px-3 py-1.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center gap-2">
                <UserX size={16} className="text-[#64748B]" />
                <h3 className="text-sm font-bold text-[#0F172A]">Who is Out Today</h3>
              </div>
              <div className="p-3 overflow-y-auto flex-1">
                {todayLeaves.length === 0 ? (
                  <p className="text-xs text-[#64748B] italic text-center py-4">No employees out today</p>
                ) : (
                  <div className="space-y-3">
                    {todayLeaves.slice(0, 5).map(lv => (
                      <div key={lv._id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center text-xs font-bold text-[#64748B] shrink-0">{getInitials(lv.user?.name)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0F172A] truncate">{lv.user?.name}</p>
                          <p className="text-[10px] text-[#64748B]">Returns: {fmtShort(lv.toDate)}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getTypeColor(lv.type)}`}>{lv.type}</span>
                      </div>
                    ))}
                    {todayLeaves.length > 5 && (
                      <button onClick={() => { setActiveFilter('today'); setViewMode('queue'); }} className="w-full text-xs font-bold text-[#2563EB] hover:underline text-left pt-2">
                        + {todayLeaves.length - 5} more
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="px-3 py-1.5 border-t border-[#E2E8F0] bg-[#F8FAFC]">
                <button onClick={() => setViewMode('calendar')} className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1 w-full justify-center">
                  View Full Team Calendar &rarr;
                </button>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex flex-col min-h-0">
              <div className="px-3 py-1.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <h3 className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Leave Policies</h3>
              </div>
              <div className="p-3 overflow-y-auto flex-1">
                <ul className="space-y-2 text-sm text-[#334155]">
                  <li className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Casual Leave</span><span className="font-bold text-[#0F172A]">12 Days</span></li>
                  <li className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Sick Leave</span><span className="font-bold text-[#0F172A]">7 Days</span></li>
                  <li className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Annual Leave</span><span className="font-bold text-[#0F172A]">15 Days</span></li>
                  <li className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Emergency Leave</span><span className="font-bold text-[#0F172A]">3 Days</span></li>
                </ul>
              </div>
              <div className="px-3 py-1.5 border-t border-[#E2E8F0] bg-[#F8FAFC] text-center">
                <span className="text-xs text-[#64748B] italic">Defaults shown. Super-admin can manage policies.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {approveModal && <ApproveModal leave={approveModal} onClose={() => setApproveModal(null)} onConfirm={handleReview} />}
        {rejectModal && <RejectModal leave={rejectModal} onClose={() => setRejectModal(null)} onConfirm={handleReview} />}
        {balanceModal && <BalanceAlertsModal employees={employeesWithExhaustedBal} onClose={() => setBalanceModal(false)} />}
        {selectedLeave && (
          <LeaveDetailDrawer 
            leave={selectedLeave} 
            employee={employees.find(e => e._id === selectedLeave.user?._id)} 
            onClose={() => setSelectedLeave(null)} 
            onApprove={setApproveModal} 
            onReject={setRejectModal} 
          />
        )}
      </AnimatePresence>
    </HRLayout>
  );
}
