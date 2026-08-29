import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, LifeBuoy, RefreshCw, Send, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import PageWrapper from '../components/PageWrapper';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { issuesAPI } from '../utils/api';

const ROLE_SLUGS = {
  intern: 'Intern',
  employee: 'Employee',
  'hr-manager': 'HR',
  hr: 'HR',
  'pmo-lead': 'PMO',
  pmo: 'PMO',
  admin: 'Admin',
  'super-admin': 'Admin',
};

const statusMeta = {
  Open: { icon: AlertCircle, cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  'In Progress': { icon: Clock3, cls: 'bg-blue-50 text-blue-700 border-blue-100' },
  Resolved: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  Closed: { icon: CheckCircle2, cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const priorityCls = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-blue-50 text-blue-700',
  High: 'bg-orange-50 text-orange-700',
  Critical: 'bg-red-50 text-red-700',
};

export default function IssueSupport() {
  const { user } = useAuth();
  const role = user?.role?.slug || (typeof user?.role === 'string' ? user.role : '');
  const canRaise = ['intern', 'employee', 'hr-manager', 'hr', 'pmo-lead', 'pmo'].includes(role);
  const isAdmin = ['admin', 'super-admin'].includes(role);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusSaving, setStatusSaving] = useState('');
  const [form, setForm] = useState({ title: '', category: 'Technical', priority: 'Medium', description: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await issuesAPI.getAll();
      setIssues(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load support issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pageCopy = useMemo(() => {
    if (isAdmin) return { title: 'Issue Support', subtitle: 'Review and manage issues raised by HR and PMO.' };
    if (['hr-manager', 'hr'].includes(role)) return { title: 'Issue Support', subtitle: 'Raise an issue to Admin or manage issues reported by employees and interns.' };
    if (['pmo-lead', 'pmo'].includes(role)) return { title: 'Issue Support', subtitle: 'Raise an issue to Admin or manage issues reported by employees and interns.' };
    return { title: 'Issue Support', subtitle: 'Report a workplace or technical issue to HR and PMO.' };
  }, [isAdmin, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Please enter a title and description');
      return;
    }
    setSending(true);
    try {
      const res = await issuesAPI.create(form);
      setIssues(prev => [res.data?.data, ...prev]);
      setForm({ title: '', category: 'Technical', priority: 'Medium', description: '' });
      toast.success(['hr-manager', 'hr', 'pmo-lead', 'pmo'].includes(role)
        ? 'Issue raised and sent to Admin'
        : 'Issue reported to HR and PMO');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report issue');
    } finally {
      setSending(false);
    }
  };

  const handleStatus = async (issue, status) => {
    setStatusSaving(issue._id);
    try {
      const res = await issuesAPI.updateStatus(issue._id, status);
      const updated = res.data?.data;
      setIssues(prev => prev.map(item => item._id === issue._id ? updated : item));
      toast.success(`Issue marked ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update issue');
    } finally {
      setStatusSaving('');
    }
  };

  return (
    <PageWrapper>
      <div className="w-full max-w-6xl mx-auto px-4 md:px-7 py-7 space-y-6 font-sans text-left">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <LifeBuoy className="w-6 h-6 text-orange-600" />
              <h1 className="text-2xl font-bold text-[#0F172A]">{pageCopy.title}</h1>
            </div>
            <p className="text-sm text-[#64748B] mt-1">{pageCopy.subtitle}</p>
          </div>
          <button onClick={load} className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {canRaise && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <ShieldAlert className="w-5 h-5 text-orange-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Raise an Issue</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {['hr-manager', 'hr', 'pmo-lead', 'pmo'].includes(role) ? 'This issue will be routed to Admin.' : 'This issue will be routed to HR and PMO.'}
                </p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Issue Title</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Short summary of the issue" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-100" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
                  {['Technical', 'Access / Account', 'HR / People', 'Project', 'Workplace', 'Other'].map(x => <option key={x}>{x}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Priority</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
                  {['Low', 'Medium', 'High', 'Critical'].map(x => <option key={x}>{x}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</label>
                <textarea rows={5} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Explain the issue, what happened, and any useful details..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-orange-100" />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 text-white px-5 py-3 text-sm font-bold hover:bg-orange-700 disabled:opacity-60">
                  <Send className="w-4 h-4" /> {sending ? 'Submitting...' : 'Submit Issue'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">{isAdmin ? 'All Support Issues' : 'Issue History'}</h2>
            <p className="text-xs text-slate-500 mt-1">{isAdmin ? 'Issues raised by HR and PMO are routed here for action.' : 'Track the status of your reported issues and issues assigned to your team.'}</p>
          </div>
          {loading ? <div className="p-8"><LoadingSpinner /></div> : issues.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">No support issues found.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {issues.map(issue => {
                const meta = statusMeta[issue.status] || statusMeta.Open;
                const Icon = meta.icon;
                const creator = issue.createdBy;
                const creatorRole = ROLE_SLUGS[issue.creatorRole] || issue.creatorRole;
                return (
                  <div key={issue._id} className="p-5 md:p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs font-extrabold text-slate-400">{issue.ticketId}</span>
                          <span className={`px-2 py-1 rounded-lg text-[11px] font-bold ${priorityCls[issue.priority] || priorityCls.Medium}`}>{issue.priority}</span>
                          <span className={`px-2 py-1 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1 ${meta.cls}`}><Icon className="w-3 h-3" />{issue.status}</span>
                        </div>
                        <h3 className="text-[15px] font-bold text-slate-900">{issue.title}</h3>
                        <p className="text-[13px] text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">{issue.description}</p>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 text-[11px] text-slate-400">
                          <span>Category: <b className="text-slate-500">{issue.category}</b></span>
                          <span>Raised by: <b className="text-slate-500">{creator?.name || 'Unknown'} ({creatorRole})</b></span>
                          <span>{new Date(issue.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      {(isAdmin || issue.recipients?.some(r => r._id === user?._id) || issue.createdBy?._id === user?._id) && (
                        <div className="shrink-0 lg:w-40">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Update Status</label>
                          <select disabled={statusSaving === issue._id} value={issue.status} onChange={e => handleStatus(issue, e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none">
                            {['Open', 'In Progress', 'Resolved', 'Closed'].map(x => <option key={x}>{x}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
