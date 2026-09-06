import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const MAX_BACKDATE_DAYS = 14;
const toDateInput = (d) => d.toISOString().slice(0, 10);
const todayStr = () => toDateInput(new Date());
const minDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - MAX_BACKDATE_DAYS);
  return toDateInput(d);
};

const emptyFields = {
  name: '', project: '', role: '', module: '', activities: '', issues: '', proposedSolution: '',
};

/**
 * Structured EOD update — Name, Project, Role, Module, Development & Testing
 * activities performed, Issues identified/Debugging, and an optional Proposed
 * solution — instead of one free-text box.
 *
 * `api` must expose: getMyEODToday(date?), submitEOD(fields, date?), and
 * optionally getProjects() to populate the Project dropdown.
 *
 * Pass `allowBackdate` on the dedicated EOD Report pages so the person can
 * fill in a missed day — left off (default) on compact dashboard widgets
 * where a date picker would just be clutter, since that view is always
 * "today".
 */
export default function EODQuickShare({ api, allowBackdate = false }) {
  const { user } = useAuth();
  const [fields, setFields] = useState(emptyFields);
  const [submittedForDate, setSubmittedForDate] = useState(null); // the saved entry, or null
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [projects, setProjects] = useState([]);

  const set = (field) => (e) => setFields((f) => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    const fetcher = api.getAllProjects || api.getProjects;
    if (!fetcher) return;
    fetcher().then((res) => setProjects(res.data?.data || [])).catch(() => setProjects([]));
  }, [api]);

  const load = async (dateStr) => {
    try {
      setLoading(true);
      const res = await api.getMyEODToday(dateStr === todayStr() ? undefined : dateStr);
      const entry = res.data?.data || null;
      setSubmittedForDate(entry);
      if (entry) {
        setFields({
          name: entry.name || user?.name || '',
          project: entry.project?._id || entry.project || '',
          role: entry.role || '',
          module: entry.module || '',
          activities: entry.activities || '',
          issues: entry.issues || '',
          proposedSolution: entry.proposedSolution || '',
        });
      } else {
        setFields({ ...emptyFields, name: user?.name || '' });
      }
      setEditing(false);
    } catch {
      setSubmittedForDate(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(selectedDate); }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!fields.activities.trim()) {
      toast.error('Describe the development & testing activities performed before sharing');
      return;
    }
    setSaving(true);
    try {
      const res = await api.submitEOD(fields, allowBackdate ? selectedDate : undefined);
      setSubmittedForDate(res.data?.data);
      setEditing(false);
      toast.success('EOD update shared with your team');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to share update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const inputCls = "w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]";
  const labelCls = "block text-[12px] font-semibold text-[#64748B] mb-1";

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[18px] text-[#2563EB]">forum</span>
        <h3 className="text-[14px] font-bold text-[#0F172A]">EOD Update</h3>
        {submittedForDate && !editing && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-[#059669]">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            {selectedDate === todayStr() ? 'Shared today' : 'Shared'}
          </span>
        )}
      </div>

      {allowBackdate && (
        <div className="mb-3">
          <label className={labelCls}>Date</label>
          <input
            type="date"
            value={selectedDate}
            min={minDateStr()}
            max={todayStr()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-48 border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[12.5px] focus:outline-none focus:border-[#2563EB]"
          />
          <p className="text-[11px] text-[#94A3B8] mt-1">You can fill in a missed day up to {MAX_BACKDATE_DAYS} days back.</p>
        </div>
      )}

      {submittedForDate && !editing ? (
        <div>
          <p className="text-[13px] text-[#0F172A] bg-[#F8FAFC] border border-[#F1F5F9] rounded-md p-3 whitespace-pre-wrap leading-relaxed">{submittedForDate.message}</p>
          <button
            onClick={() => setEditing(true)}
            className="mt-2 text-[12px] font-medium text-[#2563EB] hover:underline"
          >
            Edit update
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Name</label>
            <input value={fields.name} onChange={set('name')} placeholder="Your name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Project</label>
            <select value={fields.project} onChange={set('project')} className={`${inputCls} bg-white`}>
              <option value="">Select project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <input value={fields.role} onChange={set('role')} placeholder="e.g. QA Intern" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Module</label>
            <input value={fields.module} onChange={set('module')} placeholder="e.g. Student Management" className={inputCls} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Development & Testing activities performed</label>
            <textarea rows={3} value={fields.activities} onChange={set('activities')} placeholder="What did you build/test today?" className={`${inputCls} resize-y`} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Issues identified / Debugging</label>
            <textarea rows={3} value={fields.issues} onChange={set('issues')} placeholder="Any bugs or blockers found while working/testing" className={`${inputCls} resize-y`} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Proposed solution <span className="font-normal text-[#94A3B8] normal-case">(optional — if any bug solved)</span></label>
            <textarea rows={2} value={fields.proposedSolution} onChange={set('proposedSolution')} placeholder="How was it fixed, or how could it be fixed?" className={`${inputCls} resize-y`} />
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2 mt-1">
            {editing && (
              <button
                onClick={() => { setEditing(false); load(selectedDate); }}
                className="px-3 py-1.5 rounded-md text-[12px] font-medium text-[#64748B] hover:bg-[#F1F5F9]"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-1.5 rounded-md text-[12px] font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">send</span>
              {saving ? 'Sharing...' : 'Share Update'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
