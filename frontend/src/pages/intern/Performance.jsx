import { useEffect, useMemo, useState } from 'react';
import { performanceAPI } from '../../api';
import PageWrapper from '../../components/PageWrapper';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function ScoreBar({ label, score, detail }) {
  const safe = Math.max(0, Math.min(10, Number(score) || 0));
  return <div>
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="text-sm font-black text-slate-900">{safe.toFixed(1)}/10</span>
    </div>
    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${safe * 10}%` }} /></div>
    {detail && <p className="text-[11px] text-slate-400 mt-1.5">{detail}</p>}
  </div>;
}

export default function InternPerformance() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [monthly, hist] = await Promise.all([
        performanceAPI.getMonthly({ month, year }),
        performanceAPI.getAll(),
      ]);
      setData(monthly.data?.data || null);
      setHistory(hist.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load performance');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month, year]);

  const breakdown = data?.breakdown;
  const score = Number(data?.overallScore || 0);
  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => now.getFullYear() - i), []);

  return <PageWrapper>
    <div className="max-w-6xl mx-auto space-y-7">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="font-headline font-bold text-2xl text-slate-900">Performance</h1>
          <p className="text-slate-500 text-sm mt-1">Monthly performance calculated from your actual OWMS activity</p>
        </div>
        <div className="flex gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold">
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : !data ? <div className="bg-white rounded-3xl p-12 text-center text-slate-400">No performance data available.</div> : <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-gradient-to-br from-primary to-blue-600 rounded-3xl p-8 text-white flex flex-col justify-center">
            <p className="text-[10px] uppercase tracking-widest font-bold text-blue-100">Overall Monthly Score</p>
            <p className="text-7xl font-black mt-2">{score.toFixed(1)}</p>
            <p className="text-blue-100 mt-1">out of 10 · {data.period}</p>
            <div className="mt-6 text-sm text-blue-50">Project: <strong>{data.project?.name || 'Not assigned'}</strong></div>
            <div className="text-sm text-blue-50">Role: <strong>{data.role?.name || 'Intern'}</strong></div>
          </div>
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-7 space-y-5">
            <h2 className="font-headline font-bold text-lg text-slate-900">Score Breakdown</h2>
            <ScoreBar label="Attendance" score={breakdown.attendance.score} detail={`${breakdown.attendance.percentage}% attendance · ${breakdown.attendance.presentDays}/${data.workingDays} working days`} />
            <ScoreBar label="Daily Tracker / Productivity" score={breakdown.dailyTracker.score} detail={`${breakdown.dailyTracker.reports} tracker reports · productivity ${breakdown.dailyTracker.averageProductivity}/10 · KT ${breakdown.dailyTracker.averageKT}%`} />
            <ScoreBar label="EOD Reports" score={breakdown.eod.score} detail={`${breakdown.eod.submitted} EOD reports · ${breakdown.eod.percentage}% completion`} />
            <ScoreBar label="Task Completion" score={breakdown.tasks.score} detail={`${breakdown.tasks.completed}/${breakdown.tasks.total} tasks completed · ${breakdown.tasks.completion}%`} />
            <ScoreBar label="Project Contribution" score={breakdown.projectContribution.score} detail={`${breakdown.projectContribution.completion}% task-based project contribution`} />
            <ScoreBar label="HR / PMO Rating" score={breakdown.managementRating.score} detail={`${breakdown.managementRating.reviews} management review(s) · average ${breakdown.managementRating.average}/5`} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
            <h2 className="font-headline font-bold text-lg text-slate-900 mb-5">Monthly Activity</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Attendance', `${breakdown.attendance.percentage}%`], ['Working Hours', breakdown.dailyTracker.totalHours],
                ['Tracker Reports', breakdown.dailyTracker.reports], ['EOD Reports', breakdown.eod.submitted],
                ['Tasks Completed', `${breakdown.tasks.completed}/${breakdown.tasks.total}`], ['KT Completion', `${breakdown.dailyTracker.averageKT}%`],
              ].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{label}</p><p className="text-xl font-black text-slate-900 mt-1">{value}</p></div>)}
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
            <h2 className="font-headline font-bold text-lg text-slate-900 mb-5">HR / PMO Reviews</h2>
            {breakdown.managementRating.ratings?.length ? <div className="space-y-3 max-h-64 overflow-y-auto">{breakdown.managementRating.ratings.map((r, i) => <div key={`${r.createdAt}-${i}`} className="p-4 rounded-2xl border border-slate-100"><div className="flex justify-between"><span className="text-xs font-bold uppercase text-slate-400">{r.source} · Week {r.week || '-'}</span><span className="font-black text-primary">{r.rating}/5</span></div>{r.note && <p className="text-sm text-slate-600 mt-2">{r.note}</p>}</div>)}</div> : <p className="text-sm text-slate-400">No HR/PMO rating was recorded for this month.</p>}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
          <h2 className="font-headline font-bold text-lg text-slate-900 mb-4">Rating History</h2>
          {history.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{history.map((r, i) => <div key={r._id || i} className="p-4 rounded-2xl bg-slate-50"><div className="flex justify-between"><span className="text-xs font-bold text-slate-500">{r.source?.toUpperCase()} · Week {r.week || '-'}</span><strong className="text-primary">{r.rating}/5</strong></div><p className="text-[11px] text-slate-400 mt-2">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</p></div>)}</div> : <p className="text-sm text-slate-400">No ratings yet.</p>}
        </div>
      </>}
    </div>
  </PageWrapper>;
}
