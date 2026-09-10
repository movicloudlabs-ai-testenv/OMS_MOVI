import { useEffect, useState } from 'react';
import { announcementsAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ALL_ROLES = ['employee', 'intern', 'hr', 'pmo', 'admin'];
// Only Admin, HR, and PMO can compose/send — everyone else gets a read-only feed.
// Mirrors the server-side check in announcements.controller.js.
const CAN_SEND_ROLES = ['hr', 'hr-manager', 'pmo', 'pmo-lead', 'admin', 'super-admin'];

/**
 * Composer + feed for broadcast announcements. Visible to every role; only
 * HR and PMO see the compose form (enforced server-side too) — everyone else
 * gets a read-only feed of what's been sent to them. Every announcement can
 * carry an optional Zoom Link, which is included in the in-app notification
 * and the email sent to every targeted user.
 */
export default function CommunicationBoard() {
  const { user } = useAuth();
  const role = (user?.role?.slug || (typeof user?.role === 'string' ? user.role : '') || '').toLowerCase();
  const roleName = (user?.role?.name || '').toLowerCase();
  const canSend = CAN_SEND_ROLES.includes(role) || roleName.includes('hr') || roleName.includes('pmo') || roleName.includes('admin');

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', content: '', zoomLink: '', targetRoles: [], pinned: false });
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await announcementsAPI.getAll();
      setAnnouncements(res.data?.data || []);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    if (canSend) {
      announcementsAPI.getRecipients().then(r => setRecipients(r.data?.data || [])).catch(() => {});
    }
  }, [canSend]);

  const toggleRole = (role) => {
    setForm(p => ({
      ...p,
      targetRoles: p.targetRoles.includes(role) ? p.targetRoles.filter(r => r !== role) : [...p.targetRoles, role]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Please enter a title and message');
      return;
    }
    if (form.targetRoles.length === 0 && selectedUsers.length === 0) {
      toast.error('Select Everyone, a role, or specific people');
      return;
    }
    setSending(true);
    try {
      const res = await announcementsAPI.create({ ...form, targetUsers: selectedUsers, zoomLink: form.zoomLink.trim() });
      setAnnouncements(p => [res.data?.data, ...p]);
      setForm({ title: '', content: '', zoomLink: '', targetRoles: [], pinned: false });
      setSelectedUsers([]);
      toast.success('Announcement broadcasted — email + notification sent to everyone selected');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send announcement');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await announcementsAPI.delete(id);
      setAnnouncements(p => p.filter(a => a._id !== id));
      toast.success('Announcement deleted');
    } catch {
      toast.error('Failed to delete announcement');
    }
  };

  const handleTogglePin = async (id) => {
    try {
      const res = await announcementsAPI.togglePin(id);
      const updated = res.data?.data;
      setAnnouncements(p => p.map(a => a._id === id ? updated : a).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)));
      toast.success(updated.pinned ? 'Announcement pinned' : 'Announcement unpinned');
    } catch {
      toast.error('Failed to update pin status');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto text-left py-2">

      {/* Compose — Admin, HR and PMO */}
      {canSend && (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline font-bold text-lg text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">campaign</span>
            New Broadcast Announcement
          </h2>
          <button
            type="button"
            onClick={() => { setForm(p => ({ ...p, targetRoles: ['all'] })); setSelectedUsers([]); }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Send to Everyone
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Subject</label>
            <input
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. All-Hands Meeting or Tech Stack Update..."
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Message Content</label>
            <textarea
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              rows={4}
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Write your announcement details..."
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">videocam</span>
              Zoom Link <span className="normal-case font-medium text-slate-400">(optional)</span>
            </label>
            <input
              type="url"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              value={form.zoomLink}
              onChange={e => setForm(p => ({ ...p, zoomLink: e.target.value }))}
              placeholder="https://zoom.us/j/..."
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-3">Target Audience</label>
            <div className="flex gap-2 flex-wrap items-center">
              <button type="button" onClick={() => setForm(p => ({ ...p, targetRoles: p.targetRoles.includes('all') ? [] : ['all'] }))} className={`px-4 py-2 rounded-xl text-xs font-bold ${form.targetRoles.includes('all') ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>Everyone</button>
              {ALL_ROLES.map(r => (
                <button type="button" key={r} onClick={() => { setForm(p => ({ ...p, targetRoles: p.targetRoles.filter(x => x !== 'all') })); toggleRole(r); }} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize ${form.targetRoles.includes(r) ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{r}</button>
              ))}
            </div>
            <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between gap-3 mb-3"><span className="text-xs font-bold text-slate-600">Or select specific people</span><span className="text-[10px] font-bold text-primary">{selectedUsers.length} selected</span></div>
              <input value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} placeholder="Search name, email or employee ID..." className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
              <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
                {recipients.filter(u => !recipientSearch || `${u.name} ${u.email} ${u.employeeId || ''}`.toLowerCase().includes(recipientSearch.toLowerCase())).slice(0, 30).map(u => { const checked = selectedUsers.includes(u._id); return <label key={u._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white cursor-pointer"><input type="checkbox" checked={checked} onChange={() => setSelectedUsers(p => checked ? p.filter(id => id !== u._id) : [...p, u._id])} /><span className="text-xs font-semibold text-slate-700 truncate">{u.name}</span><span className="text-[10px] text-slate-400 ml-auto">{u.employeeId || u.email}</span></label>; })}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={e => setForm(p => ({ ...p, pinned: e.target.checked }))}
                className="rounded text-primary focus:ring-primary/20"
              />
              Pin to top of feed
            </label>
            <button type="submit" disabled={sending} className="btn-primary px-8 py-3 text-sm flex items-center gap-2">
              {sending ? <><div className="spinner" /> Broadcasting...</> : <><span className="material-symbols-outlined text-base">campaign</span> Send Broadcast</>}
            </button>
          </div>
        </form>
      </div>
      )}

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline font-bold text-lg text-slate-900">{canSend ? 'Sent Announcements & History' : 'Announcements'}</h2>
          <button onClick={loadAnnouncements} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">refresh</span> Refresh
          </button>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div className="space-y-4">
            {announcements.map(a => (
              <div key={a._id} className={`bg-white rounded-2xl border ${a.pinned ? 'border-primary/40 bg-primary/[0.01]' : 'border-slate-100'} shadow-sm p-6 transition-all`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {a.pinned && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">push_pin</span> Pinned
                        </span>
                      )}
                      <h3 className="font-bold text-slate-900 text-base">{a.title}</h3>
                    </div>
                    <p className="text-xs text-slate-400">By {a.sentBy?.name || 'HR Manager'} · {format(new Date(a.createdAt), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[...(a.targetRoles || []), ...((a.targetUsers || []).length ? [`${a.targetUsers.length} people`] : [])].map(r => (
                        <span key={r} className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md">
                          {r}
                        </span>
                      ))}
                    </div>
                    {canSend && (
                    <button
                      onClick={() => handleTogglePin(a._id)}
                      className="text-slate-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                      title={a.pinned ? 'Unpin' : 'Pin'}
                    >
                      <span className="material-symbols-outlined text-sm">{a.pinned ? 'keep_off' : 'push_pin'}</span>
                    </button>
                    )}
                    {canSend && (
                    <button
                      onClick={() => handleDelete(a._id)}
                      className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                {a.zoomLink && (
                  <a
                    href={a.zoomLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                  >
                    <span className="material-symbols-outlined text-sm">videocam</span>
                    Join Zoom Meeting
                  </a>
                )}
              </div>
            ))}
            {announcements.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <span className="material-symbols-outlined text-slate-300 text-5xl mb-2">forum</span>
                <p className="text-slate-500 font-semibold text-sm">No announcements sent yet</p>
                <p className="text-slate-400 text-xs mt-1">Broadcast messages to notify your team</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
