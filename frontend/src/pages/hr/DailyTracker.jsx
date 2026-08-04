import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import HRLayout from '../../components/hr/HRLayout';
import { hrAPI } from '../../utils/api';
import AccessDenied from '../../components/shared/AccessDenied';
import ReportDownloadCards from '../../components/shared/ReportDownloadCards';
import toast from 'react-hot-toast';

const todayStr = () => new Date().toISOString().slice(0, 10);
const toISO = (d) => d.toISOString().slice(0, 10);

function weekRange(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toISO(monday), to: toISO(sunday) };
}

function monthRange(dateStr) {
  const d = new Date(dateStr);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: toISO(first), to: toISO(last) };
}

const YESTERDAY_STATUS = ['Completed', 'Partially Completed', 'Not Started', 'Blocked'];
const ATTENDANCE_OPTIONS = ['Present', 'Half-Day', 'WFH', 'Leave', 'Absent'];
const REPORT_OPTIONS = ['Submitted', 'Late', 'Pending'];

const ATTENDANCE_COLORS = {
  Present: 'bg-[#16A34A]/10 text-[#16A34A]',
  'Half-Day': 'bg-[#D97706]/10 text-[#D97706]',
  WFH: 'bg-[#3B82F6]/10 text-[#3B82F6]',
  Leave: 'bg-[#8B5CF6]/10 text-[#8B5CF6]',
  Absent: 'bg-[#DC2626]/10 text-[#DC2626]',
};

export default function HRDailyTracker() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Daily Tracker', 'read');

  const [period, setPeriod] = useState('day'); // day | week | month
  const [date, setDate] = useState(todayStr());
  const [typeFilter, setTypeFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);   // entry being viewed
  const [userHistory, setUserHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async () => {
    if (!canRead || period === 'downloads') return;
    try {
      setLoading(true);
      setError('');
      const params = { employmentType: typeFilter || undefined, college: collegeFilter || undefined };
      if (period === 'week') Object.assign(params, weekRange(date));
      else if (period === 'month') Object.assign(params, monthRange(date));
      else params.date = date;

      const res = await hrAPI.getDailyTrackerEntries(params);
      setEntries(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load daily tracker entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [date, period, typeFilter, collegeFilter, canRead]); // eslint-disable-line

  const openDetail = async (entry) => {
    setSelected(entry);
    setHistoryLoading(true);
    try {
      const res = await hrAPI.getUserTrackerHistory(entry.user?._id);
      setUserHistory(res.data?.data || []);
    } catch {
      setUserHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeDetail = () => { setSelected(null); setUserHistory([]); };

  const rows = useMemo(() => entries.map((e, idx) => ({ sno: idx + 1, ...e })), [entries]);
  const colleges = useMemo(() => [...new Set(entries.map(e => e.user?.college).filter(Boolean))].sort(), [entries]);

  if (!canRead) {
    return <HRLayout bare><AccessDenied message="You don't have permission to view the Daily Tracker / EOD reports." /></HRLayout>;
  }

  return (
    <HRLayout bare>
      <div className="font-sans text-[#0F172A] w-full flex flex-col h-full gap-5 max-w-[1440px] mx-auto pb-8">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">Daily Tracker</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Daily work log submitted by interns &amp; employees — click a row to view full details and history.
            </p>
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex items-center gap-1 border-b border-[#E2E8F0]">
          {['day', 'week', 'month', 'downloads'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors capitalize ${period === p ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#64748B] hover:text-[#0F172A]'}`}
            >
              {p === 'day' ? 'Daily' : p === 'week' ? 'Weekly' : p === 'month' ? 'Monthly' : 'Downloads'}
            </button>
          ))}
        </div>

        {period === 'downloads' ? (
          <ReportDownloadCards
            exportFn={hrAPI.exportDailyTracker}
            filePrefix="Daily_Tracker"
            reportLabel="Daily Tracker"
            employmentType={typeFilter}
            college={collegeFilter}
          />
        ) : (
          <>

        {/* TOOLBAR */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] bg-white focus:outline-none focus:border-[#2563EB]"
            >
              <option value="">All (Interns + Employees)</option>
              <option value="Intern">Interns only</option>
              <option value="Full-time">Employees only</option>
            </select>
            <select
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              className="border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] bg-white focus:outline-none focus:border-[#2563EB]"
            >
              <option value="">All Colleges</option>
              {colleges.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {date !== todayStr() && (
              <button onClick={() => setDate(todayStr())} className="text-[13px] text-[#2563EB] hover:underline font-medium">
                Jump to Today
              </button>
            )}
          </div>
          <p className="text-[13px] text-[#64748B]">
            <span className="font-medium text-[#0F172A]">{rows.length}</span> report{rows.length !== 1 ? 's' : ''}
            {period === 'day' && <> for {new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</>}
            {period === 'week' && <> this week</>}
            {period === 'month' && <> this month</>}
          </p>
        </div>

        {/* SPREADSHEET TABLE */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden flex-1">
          {loading && <div className="px-4 py-12 text-center text-[14px] text-[#64748B]">Loading...</div>}
          {!loading && error && <div className="px-4 py-12 text-center text-[14px] text-[#DC2626]">{error}</div>}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-[12.5px]">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    {['S.No', 'Name', 'Project', 'Role', 'Yesterday Status', 'Pending Reason', 'Today Task', 'Expected Completion', 'Blockers', 'Module', 'Working Time', 'Hours', 'Report Submission', 'Attendance', 'KT %', 'Productivity', 'AI Credits', 'Project Assignment'].map(h => (
                      <th key={h} className="px-3 py-2.5 font-semibold text-[#64748B] uppercase text-[10.5px] tracking-wide border-r border-[#F1F5F9] last:border-r-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? rows.map((r) => (
                    <tr key={r._id} onClick={() => openDetail(r)} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] cursor-pointer last:border-0">
                      <td className="px-3 py-2 border-r border-[#F8FAFC] text-[#64748B]">{r.sno}</td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC] font-medium text-[#0F172A]">{r.user?.name || '-'}</td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC]">{r.project?.name || '-'}</td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC]">{r.role || r.user?.designation || '-'}</td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC]">{r.yesterdayStatus || '-'}</td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC] max-w-[140px] truncate">{r.pendingReason || '-'}</td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC] max-w-[200px] truncate">{r.todayTask || '-'}</td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC]">{r.expectedCompletion ? new Date(r.expectedCompletion).toLocaleDateString() : '-'}</td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC] max-w-[140px] truncate">{r.blockers || '-'}</td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC]">{r.module || '-'}</td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC]">{r.workingTime || '-'}</td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC]">{r.hours ?? '-'}</td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC]">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-semibold ${r.reportSubmission === 'Submitted' ? 'bg-[#16A34A]/10 text-[#16A34A]' : r.reportSubmission === 'Late' ? 'bg-[#D97706]/10 text-[#D97706]' : 'bg-slate-100 text-slate-600'}`}>
                          {r.reportSubmission}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC]">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-semibold ${ATTENDANCE_COLORS[r.attendance] || 'bg-slate-100 text-slate-600'}`}>
                          {r.attendance}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC]">{r.ktCompletion != null ? `${r.ktCompletion}%` : '-'}</td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC]">{r.productivityMetrics ?? '-'}</td>
                      <td className="px-3 py-2 border-r border-[#F8FAFC]">{r.aiCredits ?? '-'}</td>
                      <td className="px-3 py-2 max-w-[160px] truncate">{r.projectAssignment || '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={18} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-[#64748B]">
                          <span className="material-symbols-outlined text-[#CBD5E1] text-[32px] mb-3">fact_check</span>
                          <p className="text-[14px] font-medium text-[#0F172A]">No reports submitted for this date</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {/* DETAIL / EDIT MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeDetail}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[16px] font-bold text-[#0F172A]">{selected.user?.name}</h2>
                <p className="text-[12px] text-[#64748B]">{selected.user?.employeeId} &middot; {new Date(selected.date).toLocaleDateString()}</p>
              </div>
              <button onClick={closeDetail} className="text-[#64748B] hover:text-[#0F172A]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EditField label="Yesterday Status"><p className="text-[13px] text-[#0F172A]">{selected.yesterdayStatus || '-'}</p></EditField>
              <EditField label="Pending Reason"><p className="text-[13px] text-[#0F172A]">{selected.pendingReason || '-'}</p></EditField>
              <div className="sm:col-span-2">
                <EditField label="Today's Task"><p className="text-[13px] text-[#0F172A]">{selected.todayTask || '-'}</p></EditField>
              </div>
              <EditField label="Blockers"><p className="text-[13px] text-[#0F172A]">{selected.blockers || '-'}</p></EditField>
              <EditField label="Module"><p className="text-[13px] text-[#0F172A]">{selected.module || '-'}</p></EditField>
              <EditField label="Working Time"><p className="text-[13px] text-[#0F172A]">{selected.workingTime || '-'}</p></EditField>
              <EditField label="Hours"><p className="text-[13px] text-[#0F172A]">{selected.hours ?? '-'}</p></EditField>
              <EditField label="Report Submission"><p className="text-[13px] text-[#0F172A]">{selected.reportSubmission || '-'}</p></EditField>
              <EditField label="Attendance"><p className="text-[13px] text-[#0F172A]">{selected.attendance || '-'}</p></EditField>
              <EditField label="KT Completion (%)"><p className="text-[13px] text-[#0F172A]">{selected.ktCompletion != null ? `${selected.ktCompletion}%` : '-'}</p></EditField>
              <EditField label="Productivity (0-10)"><p className="text-[13px] text-[#0F172A]">{selected.productivityMetrics ?? '-'}</p></EditField>
              <EditField label="AI Credits"><p className="text-[13px] text-[#0F172A]">{selected.aiCredits ?? '-'}</p></EditField>
              <div className="sm:col-span-2">
                <EditField label="Project Assignment Notes"><p className="text-[13px] text-[#0F172A]">{selected.projectAssignment || '-'}</p></EditField>
              </div>
            </div>

            <div className="flex justify-end mt-5 pt-4 border-t border-[#F1F5F9]">
              <button onClick={closeDetail} className="px-4 py-2 rounded-md text-[13px] font-medium text-[#64748B] hover:bg-[#F1F5F9]">Close</button>
            </div>

            {/* History */}
            <div className="mt-6 pt-4 border-t border-[#F1F5F9]">
              <h3 className="text-[13px] font-bold text-[#0F172A] mb-3">Recent History</h3>
              {historyLoading ? (
                <p className="text-[12px] text-[#94A3B8]">Loading history...</p>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {userHistory.slice(0, 10).map(h => (
                    <div key={h._id} className="flex items-center justify-between text-[12px] border border-[#F1F5F9] rounded-md px-3 py-2">
                      <span className="text-[#0F172A] font-medium">{new Date(h.date).toLocaleDateString()}</span>
                      <span className="text-[#64748B] truncate max-w-[300px]">{h.todayTask}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10.5px] font-semibold ${ATTENDANCE_COLORS[h.attendance] || 'bg-slate-100 text-slate-600'}`}>{h.attendance}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </HRLayout>
  );
}

function EditField({ label, children }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}
