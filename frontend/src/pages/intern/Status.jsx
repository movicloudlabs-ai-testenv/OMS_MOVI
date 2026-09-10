import { useEffect, useState } from 'react';
import { internAPI } from '../../api';
import PageWrapper from '../../components/PageWrapper';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function InternStatus() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [blockers, setBlockers] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => { setLoading(true); try { const res = await internAPI.getMyTrackerHistory(); setUpdates(res.data?.data || []); } catch { toast.error('Failed to load status history'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    if (content.trim().length < 10) return toast.error('Update must be at least 10 characters');
    setSubmitting(true);
    try {
      await internAPI.submitDailyTracker({ todayTask: content.trim(), blockers: blockers.trim(), yesterdayStatus: 'Completed', reportSubmission: 'Submitted' });
      toast.success('Daily tracker update submitted'); setContent(''); setBlockers(''); await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit update'); } finally { setSubmitting(false); }
  };

  return <PageWrapper><div className="max-w-5xl mx-auto space-y-7">
    <div><h1 className="font-headline font-bold text-2xl text-slate-900">Status Updates</h1><p className="text-slate-500 text-sm mt-1">Your status page now uses the same Daily Tracker data used by HR and PMO.</p></div>
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7"><h2 className="font-headline font-bold text-lg text-slate-900 mb-5">New Daily Update</h2><form onSubmit={handleSubmit} className="space-y-5">
      <textarea rows={5} maxLength={1000} value={content} onChange={e=>setContent(e.target.value)} placeholder="What did you work on today?" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/20" required />
      <input value={blockers} onChange={e=>setBlockers(e.target.value)} placeholder="Blockers (optional)" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
      <button disabled={submitting} className="btn-primary px-7 py-3 text-sm">{submitting ? 'Submitting...' : 'Submit Update'}</button>
    </form></div>
    <div><h2 className="font-headline font-bold text-lg text-slate-900 mb-4">Update History</h2>{loading?<LoadingSpinner/>:<div className="space-y-3">{updates.map(u=><div key={u._id} className="bg-white rounded-2xl border border-slate-100 p-5"><div className="flex justify-between gap-3"><p className="text-xs font-bold uppercase text-slate-400">{u.date ? format(new Date(u.date),'MMM d, yyyy') : 'Date unavailable'}</p><span className="text-xs font-bold text-primary">{u.attendance || 'Present'}</span></div><p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{u.todayTask}</p>{u.blockers&&<p className="text-xs text-rose-500 mt-2">Blocker: {u.blockers}</p>}</div>)}{!updates.length&&<div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400">No status updates yet.</div>}</div>}</div>
  </div></PageWrapper>;
}
