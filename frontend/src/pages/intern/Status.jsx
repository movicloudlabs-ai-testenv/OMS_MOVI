import { useEffect, useState } from 'react';
import { statusAPI } from '../../api';
import PageWrapper from '../../components/PageWrapper';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function InternStatus() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [type, setType] = useState('daily');
  const [blockers, setBlockers] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await statusAPI.getAll();
      setUpdates(res.data.data);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (content.length < 10) { toast.error('Update must be at least 10 characters'); return; }
    setSubmitting(true);
    try {
      await statusAPI.create({ content, type, blockers });
      toast.success('Status update submitted');
      setContent(''); setBlockers('');
      await load();
    } catch {
      toast.error('Failed to submit update');
    } finally { setSubmitting(false); }
  };

  return (
    <PageWrapper>
      <div className="space-y-8">
        <div>
          <h1 className="font-headline font-bold text-2xl text-slate-900">Status Updates</h1>
          <p className="text-slate-500 text-sm mt-1">Submit your daily or weekly progress update</p>
        </div>

        {/* Submit Form */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <h2 className="font-headline font-bold text-lg text-slate-900 mb-6">New Update</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex gap-3">
              {['daily', 'weekly'].map(t => (
                <button type="button" key={t}
                  onClick={() => setType(t)}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${type === t ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {t === 'daily' ? 'Daily' : 'Weekly'}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">What did you work on?</label>
              <textarea
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm text-slate-900 resize-none focus:ring-2 focus:ring-primary/20 outline-none"
                rows={6}
                placeholder="Describe your progress, tasks completed, and plans for next..."
                value={content}
                onChange={e => setContent(e.target.value)}
                maxLength={1000}
              />
              <div className={`text-right text-[10px] font-bold mt-1 ${content.length > 900 ? 'text-rose-500' : 'text-slate-400'}`}>
                {content.length} / 1000
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Blockers (optional)</label>
              <input
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Any blockers or dependencies?"
                value={blockers}
                onChange={e => setBlockers(e.target.value)}
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary px-8 py-3 text-sm flex items-center gap-2">
              {submitting ? <><div className="spinner" /> Submitting...</> : 'Submit Update'}
            </button>
          </form>
        </div>

        {/* History */}
        <div>
          <h2 className="font-headline font-bold text-lg text-slate-900 mb-4">Update History</h2>
          {loading ? <LoadingSpinner /> : updates.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No updates submitted yet.</p>
          ) : (
            <div className="space-y-4">
              {updates.map(u => (
                <div key={u._id} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`badge ${u.type === 'weekly' ? 'badge-in_progress' : 'badge-done'}`}>{u.type}</span>
                    <span className="text-xs text-slate-400 font-medium">{format(new Date(u.createdAt), 'MMM d, yyyy · HH:mm')}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{u.content}</p>
                  {u.blockers && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs font-bold text-rose-500 mb-1">Blockers</p>
                      <p className="text-xs text-slate-500">{u.blockers}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
