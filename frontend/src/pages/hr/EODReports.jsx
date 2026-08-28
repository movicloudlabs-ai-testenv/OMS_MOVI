import React, { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import HRLayout from '../../components/hr/HRLayout';
import { hrAPI } from '../../utils/api';
import AccessDenied from '../../components/shared/AccessDenied';
import PeriodCardGrid from '../../components/shared/PeriodCardGrid';
import toast from 'react-hot-toast';

const toISO = (d) => d.toISOString().slice(0, 10);
const todayStr = () => toISO(new Date());

function buildDateCards(count = 30) {
  const cards = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    cards.push({ key: toISO(d), date: toISO(d), label: d.toLocaleDateString('en-GB').replace(/\//g, '-') });
  }
  return cards;
}

export default function HREODReports() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Daily Tracker', 'read');

  const [period, setPeriod] = useState('day'); // day | week | month
  const [typeFilter, setTypeFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');

  // Day view state
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [dayStatus, setDayStatus] = useState([]);
  const [dayLoading, setDayLoading] = useState(true);
  const [downloadingDate, setDownloadingDate] = useState(null);

  // Week/Month view state
  const [periodAnchor, setPeriodAnchor] = useState(todayStr());
  const [periodEntries, setPeriodEntries] = useState([]);
  const [periodLoading, setPeriodLoading] = useState(false);

  // Selected person detail panel
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personHistory, setPersonHistory] = useState([]);
  const [personLoading, setPersonLoading] = useState(false);

  const dateCards = useMemo(() => buildDateCards(30), []);

  const loadDayStatus = async () => {
    if (!canRead) return;
    try {
      setDayLoading(true);
      const res = await hrAPI.getEODDayStatus({
        date: selectedDate,
        employmentType: typeFilter || undefined,
        college: collegeFilter || undefined,
      });
      setDayStatus(res.data?.data?.results || []);
    } catch (err) {
      toast.error('Failed to load EOD status');
    } finally {
      setDayLoading(false);
    }
  };

  useEffect(() => {
    if (period === 'day') loadDayStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, typeFilter, collegeFilter, canRead, period]);

  const loadPeriodEntries = async (from, to) => {
    setPeriodLoading(true);
    try {
      const res = await hrAPI.getEODReports({
        from, to,
        employmentType: typeFilter || undefined,
        college: collegeFilter || undefined,
      });
      setPeriodEntries(res.data?.data || []);
    } catch {
      setPeriodEntries([]);
    } finally {
      setPeriodLoading(false);
    }
  };

  const colleges = useMemo(() => {
    const fromDay = dayStatus.map(r => r.user?.college).filter(Boolean);
    const fromPeriod = periodEntries.map(e => e.user?.college).filter(Boolean);
    return [...new Set([...fromDay, ...fromPeriod])].sort();
  }, [dayStatus, periodEntries]);

  const grouped = useMemo(() => {
    const byUser = new Map();
    periodEntries.forEach((e) => {
      const uid = e.user?._id;
      if (!uid) return;
      if (!byUser.has(uid)) byUser.set(uid, { user: e.user, entries: [] });
      byUser.get(uid).entries.push(e);
    });
    return [...byUser.values()].sort((a, b) => b.entries.length - a.entries.length);
  }, [periodEntries]);

  const openPerson = async (user) => {
    setSelectedPerson(user);
    setPersonLoading(true);
    try {
      const res = await hrAPI.getUserEODHistory(user?._id);
      setPersonHistory(res.data?.data || []);
    } catch {
      setPersonHistory([]);
    } finally {
      setPersonLoading(false);
    }
  };

  const handleDownloadDate = async (e, card) => {
    e.stopPropagation();
    setDownloadingDate(card.key);
    try {
      const label = `EOD_Report_${card.label}`;
      const res = await hrAPI.exportEODReports({ from: card.date, to: card.date, label });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `${label}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch {
      toast.error('Failed to download report');
    } finally {
      setDownloadingDate(null);
    }
  };

  if (!canRead) {
    return <HRLayout bare><AccessDenied message="You don't have permission to view EOD reports." /></HRLayout>;
  }

  return (
    <HRLayout bare>
      <div className="font-sans text-[#0F172A] w-full flex flex-col gap-5 max-w-[1200px] mx-auto pb-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">EOD Reports</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">Quick end-of-day updates shared by interns &amp; employees.</p>
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex items-center gap-1 border-b border-[#E2E8F0]">
          {['day', 'week', 'month'].map(p => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setSelectedPerson(null); }}
              className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors capitalize ${period === p ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#64748B] hover:text-[#0F172A]'}`}
            >
              {p === 'day' ? 'Daily' : p === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-sm flex items-center gap-3 flex-wrap">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] bg-white focus:outline-none focus:border-[#2563EB]">
            <option value="">All (Interns + Employees)</option>
            <option value="Intern">Interns only</option>
            <option value="Full-time">Employees only</option>
          </select>
          <select value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)} className="border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] bg-white focus:outline-none focus:border-[#2563EB]">
            <option value="">All Colleges</option>
            {colleges.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {period === 'day' ? (
          !selectedPerson ? (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
              {/* Date list, decreasing order */}
              <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
                {dateCards.map((card) => (
                  <button
                    key={card.key}
                    onClick={() => setSelectedDate(card.date)}
                    className={`bg-white border rounded-xl px-4 py-3 flex items-center justify-between gap-2 text-left transition-all ${selectedDate === card.date ? 'border-[#2563EB] ring-1 ring-[#2563EB]/20 bg-[#EFF6FF]' : 'border-[#CBD5E1] hover:border-[#94A3B8]'}`}
                  >
                    <div>
                      <p className="text-[13px] font-bold text-[#0F172A]">{card.label}</p>
                      <p className="text-[11px] text-[#64748B]">EOD report</p>
                    </div>
                    <span
                      role="button"
                      onClick={(e) => handleDownloadDate(e, card)}
                      className="shrink-0 p-1.5 rounded-md hover:bg-[#E2E8F0] transition-colors"
                      title="Download this date's report"
                    >
                      {downloadingDate === card.key ? <Loader2 size={15} className="text-[#2563EB] animate-spin" /> : <Download size={15} className="text-[#64748B]" />}
                    </span>
                  </button>
                ))}
              </div>

              {/* Intern/Employee status table for selected date */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden flex flex-col max-h-[600px]">
                <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
                  <p className="text-[13px] font-bold text-[#0F172A]">
                    {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                {dayLoading ? (
                  <div className="px-4 py-12 text-center text-[13px] text-[#64748B]">Loading...</div>
                ) : dayStatus.length === 0 ? (
                  <div className="px-4 py-12 text-center text-[13px] text-[#94A3B8]">No interns/employees found.</div>
                ) : (
                  <div className="overflow-x-auto overflow-y-auto flex-1">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#E2E8F0] z-10">
                        <tr>
                          <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase">Name</th>
                          <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase">College</th>
                          <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase">EOD Status</th>
                          <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayStatus.map((row) => (
                          <tr
                            key={row.user._id}
                            onClick={() => row.submitted && openPerson(row.user)}
                            className={`border-b border-[#F1F5F9] last:border-0 ${row.submitted ? 'cursor-pointer hover:bg-[#F8FAFC]' : ''}`}
                          >
                            <td className="px-4 py-2.5 text-[13px] font-medium text-[#0F172A]">{row.user.name}</td>
                            <td className="px-4 py-2.5 text-[12.5px] text-[#64748B]">{row.user.college || '-'}</td>
                            <td className="px-4 py-2.5">
                              {row.submitted ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#16A34A]/10 text-[#16A34A]">Submitted</span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#DC2626]/10 text-[#DC2626]">Not Submitted</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-[12.5px] text-[#64748B]">
                              {row.submitted ? new Date(selectedDate).toLocaleDateString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
              <button onClick={() => setSelectedPerson(null)} className="flex items-center gap-1 text-[12.5px] text-[#64748B] hover:text-[#2563EB] mb-4">
                <ChevronLeft size={16} /> Back to list
              </button>
              <h3 className="text-[15px] font-bold text-[#0F172A] mb-3">{selectedPerson.name}'s EOD Reports</h3>
              {personLoading ? (
                <p className="text-[12px] text-[#94A3B8]">Loading...</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {personHistory.map((h) => (
                    <div key={h._id} className="border-b border-[#F1F5F9] pb-3 last:border-0">
                      <p className="text-[11px] font-semibold text-[#64748B] mb-1">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                      <p className="text-[13px] text-[#334155] whitespace-pre-wrap leading-relaxed">{h.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        ) : (
          <>
            <PeriodCardGrid
              mode={period}
              selectedAnchor={periodAnchor}
              onSelect={(card) => { setPeriodAnchor(card.anchorDate); loadPeriodEntries(card.from, card.to); }}
              exportFn={hrAPI.exportEODReports}
              filePrefix="EOD_Report"
              reportLabel="EOD Report"
              employmentType={typeFilter}
              college={collegeFilter}
              fileExt="pdf"
            />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
              <div className="flex flex-col gap-3">
                {periodLoading ? (
                  <div className="text-center py-12 text-[14px] text-[#64748B]">Loading...</div>
                ) : grouped.length === 0 ? (
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center">
                    <span className="material-symbols-outlined text-[#CBD5E1] text-[32px] mb-3">forum</span>
                    <p className="text-[14px] font-medium text-[#0F172A]">Select a card above to view that period's updates</p>
                  </div>
                ) : (
                  grouped.map((g) => (
                    <div
                      key={g.user._id}
                      onClick={() => openPerson(g.user)}
                      className="bg-white border border-[#E2E8F0] rounded-xl p-4 cursor-pointer hover:border-[#CBD5E1] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-bold text-[#0F172A]">{g.user.name}</span>
                          <span className="text-[11px] text-[#94A3B8]">{g.user.employeeId}</span>
                          {g.user.college && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-600">{g.user.college}</span>}
                        </div>
                        <span className="text-[11px] font-semibold text-[#2563EB]">{g.entries.length} update{g.entries.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-2">
                        {g.entries.slice(0, 2).map(e => (
                          <div key={e._id} className="text-[12.5px] text-[#334155] leading-relaxed whitespace-pre-wrap border-l-2 border-[#E2E8F0] pl-2.5">
                            <span className="text-[11px] font-semibold text-[#94A3B8] mr-1.5">{new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}:</span>
                            {e.message}
                          </div>
                        ))}
                        {g.entries.length > 2 && <p className="text-[11px] text-[#2563EB] font-medium">+{g.entries.length - 2} more — click to view full history</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 h-fit sticky top-4">
                <h3 className="text-[13px] font-bold text-[#0F172A] mb-3">
                  {selectedPerson ? `${selectedPerson.name}'s Recent Updates` : 'Click a card to see full history'}
                </h3>
                {selectedPerson && (
                  personLoading ? (
                    <p className="text-[12px] text-[#94A3B8]">Loading...</p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {personHistory.map((h) => (
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
    </HRLayout>
  );
}
