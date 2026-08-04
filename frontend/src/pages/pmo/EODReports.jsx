import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PageWrapper from '../../components/PageWrapper';
import { pmoAPI } from '../../utils/api';
import AccessDenied from '../../components/shared/AccessDenied';
import ReportDownloadCards from '../../components/shared/ReportDownloadCards';
import toast from 'react-hot-toast';

const todayStr = () => new Date().toISOString().slice(0, 10);
const toISO = (d) => d.toISOString().slice(0, 10);

function weekRange(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun
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

export default function PMOEODReports() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Daily Tracker', 'read');

  const [period, setPeriod] = useState('day'); // day | week | month
  const [date, setDate] = useState(todayStr());
  const [typeFilter, setTypeFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async () => {
    if (!canRead || period === 'downloads') return;
    try {
      setLoading(true);
      const params = { employmentType: typeFilter || undefined, college: collegeFilter || undefined };
      if (period === 'week') Object.assign(params, weekRange(date));
      else if (period === 'month') Object.assign(params, monthRange(date));
      else params.date = date;

      const res = await pmoAPI.getEODReports(params);
      setEntries(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load EOD reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [date, period, typeFilter, collegeFilter, canRead]); // eslint-disable-line

  const colleges = useMemo(() => [...new Set(entries.map(e => e.user?.college).filter(Boolean))].sort(), [entries]);

  // For week/month, group entries by person so it reads as a report, not a huge flat feed
  const grouped = useMemo(() => {
    if (period === 'day') return null;
    const byUser = new Map();
    entries.forEach((e) => {
      const uid = e.user?._id;
      if (!uid) return;
      if (!byUser.has(uid)) byUser.set(uid, { user: e.user, entries: [] });
      byUser.get(uid).entries.push(e);
    });
    return [...byUser.values()].sort((a, b) => b.entries.length - a.entries.length);
  }, [entries, period]);

  const openHistory = async (user) => {
    setSelectedUser(user);
    setHistoryLoading(true);
    try {
      const res = await pmoAPI.getUserEODHistory(user?._id);
      setUserHistory(res.data?.data || []);
    } catch {
      setUserHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!canRead) {
    return <PageWrapper><AccessDenied message="You don't have permission to view EOD reports." /></PageWrapper>;
  }

  const periodLabel = period === 'week'
    ? `Week of ${new Date(weekRange(date).from).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : period === 'month'
    ? new Date(date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <PageWrapper>
      <div className="max-w-[1440px] mx-auto w-full">
      <div className="font-sans text-[#0F172A] w-full flex flex-col gap-5 max-w-[1100px] mx-auto pb-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">EOD Reports</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">Quick end-of-day updates shared by interns &amp; employees.</p>
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
            exportFn={pmoAPI.exportEODReports}
            filePrefix="EOD_Report"
            reportLabel="EOD Report"
            employmentType={typeFilter}
            college={collegeFilter}
          />
        ) : (
          <>

        {/* Toolbar */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-sm flex items-center gap-3 flex-wrap">
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
          <p className="text-[13px] text-[#64748B] ml-auto font-medium">{periodLabel}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* Feed / grouped report */}
          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="text-center py-12 text-[14px] text-[#64748B]">Loading...</div>
            ) : entries.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center">
                <span className="material-symbols-outlined text-[#CBD5E1] text-[32px] mb-3">forum</span>
                <p className="text-[14px] font-medium text-[#0F172A]">No EOD updates for this period</p>
              </div>
            ) : period === 'day' ? (
              entries.map((e) => (
                <div
                  key={e._id}
                  onClick={() => openHistory(e.user)}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition-colors ${selectedUser?._id === e.user?._id ? 'border-[#2563EB] ring-1 ring-[#2563EB]/20' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-[#0F172A]">{e.user?.name}</span>
                      <span className="text-[11px] text-[#94A3B8]">{e.user?.employeeId}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${e.user?.employmentType === 'Intern' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'bg-[#8B5CF6]/10 text-[#8B5CF6]'}`}>
                        {e.user?.employmentType}
                      </span>
                      {e.user?.college && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-600">{e.user.college}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#94A3B8]">
                      {new Date(e.submittedAt || e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#334155] leading-relaxed whitespace-pre-wrap">{e.message}</p>
                </div>
              ))
            ) : (
              grouped.map((g) => (
                <div
                  key={g.user._id}
                  onClick={() => openHistory(g.user)}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition-colors ${selectedUser?._id === g.user._id ? 'border-[#2563EB] ring-1 ring-[#2563EB]/20' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-[#0F172A]">{g.user.name}</span>
                      <span className="text-[11px] text-[#94A3B8]">{g.user.employeeId}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${g.user.employmentType === 'Intern' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'bg-[#8B5CF6]/10 text-[#8B5CF6]'}`}>
                        {g.user.employmentType}
                      </span>
                      {g.user.college && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-600">{g.user.college}</span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-[#2563EB]">{g.entries.length} update{g.entries.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-2">
                    {g.entries.slice(0, 3).map(e => (
                      <div key={e._id} className="text-[12.5px] text-[#334155] leading-relaxed whitespace-pre-wrap border-l-2 border-[#E2E8F0] pl-2.5">
                        <span className="text-[11px] font-semibold text-[#94A3B8] mr-1.5">{new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}:</span>
                        {e.message}
                      </div>
                    ))}
                    {g.entries.length > 3 && (
                      <p className="text-[11px] text-[#2563EB] font-medium">+{g.entries.length - 3} more — click to view full history</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Person history sidebar */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 h-fit sticky top-4">
            <h3 className="text-[13px] font-bold text-[#0F172A] mb-3">
              {selectedUser ? `${selectedUser.name}'s Recent Updates` : 'Click a card to see full history'}
            </h3>
            {selectedUser && (
              historyLoading ? (
                <p className="text-[12px] text-[#94A3B8]">Loading...</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {userHistory.map((h) => (
                    <div key={h._id} className="border-b border-[#F1F5F9] pb-2.5 last:border-0">
                      <p className="text-[11px] font-semibold text-[#64748B] mb-1">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                      <p className="text-[12.5px] text-[#334155] whitespace-pre-wrap leading-relaxed">{h.message}</p>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
          </>
        )}
      </div>
      </div>
    </PageWrapper>
  );
}
