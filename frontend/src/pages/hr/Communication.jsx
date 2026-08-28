import { useEffect, useState } from 'react';
import { announcementsAPI } from '../../api';
import HRLayout from '../../components/hr/HRLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ALL_ROLES = ['intern', 'hr', 'pmo', 'admin'];

export default function HRCommunication() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', content: '', targetRoles: ['intern'], pinned: false });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    announcementsAPI.getAll().then(r => setAnnouncements(r.data.data)).finally(() => setLoading(false));
  }, []);

  const toggleRole = (role) => {
    setForm(p => ({
      ...p,
      targetRoles: p.targetRoles.includes(role) ? p.targetRoles.filter(r => r !== role) : [...p.targetRoles, role]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await announcementsAPI.create(form);
      setAnnouncements(p => [res.data.data, ...p]);
      setForm({ title: '', content: '', targetRoles: ['intern'], pinned: false });
      toast.success('Announcement sent');
    } catch { toast.error('Failed to send announcement'); } finally { setSending(false); }
  };

  return (
    <HRLayout bare>
      <div className="space-y-8">
        <div>
          <h1 className="font-headline font-bold text-2xl text-slate-900">Communication</h1>
          <p className="text-slate-500 text-sm mt-1">Broadcast announcements to the team</p>
        </div>

        {/* Compose */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <h2 className="font-headline font-bold text-lg text-slate-900 mb-6">New Announcement</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Subject</label>
              <input className="w-full bg-slate-50 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Announcement subject..." required />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Message</label>
              <textarea className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" rows={5} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Write your announcement..." required />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-3">Target Audience</label>
              <div className="flex gap-2 flex-wrap">
                {ALL_ROLES.map(r => (
                  <button type="button" key={r} onClick={() => toggleRole(r)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize ${form.targetRoles.includes(r) ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={sending} className="btn-primary px-8 py-3 text-sm flex items-center gap-2">
              {sending ? <><div className="spinner" /> Sending...</> : <><span className="material-symbols-outlined text-base">campaign</span> Send Announcement</>}
            </button>
          </form>
        </div>

        {/* History */}
        <div>
          <h2 className="font-headline font-bold text-lg text-slate-900 mb-4">Sent Announcements</h2>
          {loading ? <LoadingSpinner /> : (
            <div className="space-y-4">
              {announcements.map(a => (
                <div key={a._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      {a.pinned && <span className="badge badge-review mb-1">Pinned</span>}
                      <h3 className="font-bold text-slate-900">{a.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">By {a.sentBy?.name} · {format(new Date(a.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="flex gap-1">
                      {a.targetRoles?.map(r => <span key={r} className={`badge badge-${r}`}>{r}</span>)}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{a.content}</p>
                </div>
              ))}
              {announcements.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No announcements sent yet.</p>}
            </div>
          )}
        </div>
      </div>
    </HRLayout>
  );
}
