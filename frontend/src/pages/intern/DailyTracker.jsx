import React, { useEffect, useState } from 'react';
import PageWrapper from '../../components/PageWrapper';
import { internAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const YESTERDAY_STATUS = ['Completed', 'Partially Completed', 'Not Started', 'Blocked'];
const ATTENDANCE_OPTIONS = ['Present', 'Half-Day', 'WFH', 'Leave', 'Absent'];

const emptyForm = {
  yesterdayStatus: 'Completed',
  pendingReason: '',
  todayTask: '',
  expectedCompletion: '',
  blockers: '',
  module: '',
  workingTime: '',
  hours: '',
  attendance: 'Present',
  ktCompletion: '',
  productivityMetrics: '',
  aiCredits: '',
  projectAssignment: '',
  project: '',
};

const MAX_BACKDATE_DAYS = 14;
const toDateInput = (d) => d.toISOString().slice(0, 10);
const todayStr = () => toDateInput(new Date());
const minDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - MAX_BACKDATE_DAYS);
  return toDateInput(d);
};

export default function InternDailyTracker() {
  const [form, setForm] = useState(emptyForm);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittedForDate, setSubmittedForDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [projects, setProjects] = useState([]);

  const loadProjects = async () => {
    try {
      const res = await internAPI.getAllProjects();
      setProjects(res.data?.data || []);
    } catch {
      setProjects([]);
    }
  };

  const loadForDate = async (dateStr) => {
    try {
      setLoading(true);
      const entryRes = await internAPI.getMyTrackerToday(dateStr === todayStr() ? undefined : dateStr);
      const entry = entryRes.data?.data;
      if (entry) {
        setSubmittedForDate(true);
        setForm({
          yesterdayStatus: entry.yesterdayStatus || 'Completed',
          pendingReason: entry.pendingReason || '',
          todayTask: entry.todayTask || '',
          expectedCompletion: entry.expectedCompletion ? entry.expectedCompletion.slice(0, 10) : '',
          blockers: entry.blockers || '',
          module: entry.module || '',
          workingTime: entry.workingTime || '',
          hours: entry.hours ?? '',
          attendance: entry.attendance || 'Present',
          ktCompletion: entry.ktCompletion ?? '',
          productivityMetrics: entry.productivityMetrics ?? '',
          aiCredits: entry.aiCredits ?? '',
          projectAssignment: entry.projectAssignment || '',
          project: entry.project?._id || entry.project || '',
        });
      } else {
        setSubmittedForDate(false);
        setForm(emptyForm);
      }
    } catch (err) {
      toast.error('Failed to load daily tracker');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const historyRes = await internAPI.getMyTrackerHistory();
      setHistory(historyRes.data?.data || []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => { loadForDate(selectedDate); }, [selectedDate]);
  useEffect(() => { loadHistory(); }, []);
  useEffect(() => { loadProjects(); }, []);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.todayTask.trim()) {
      toast.error("Please describe today's task");
      return;
    }
    setSaving(true);
    try {
      await internAPI.submitDailyTracker({
        ...form,
        date: selectedDate,
        hours: form.hours === '' ? undefined : Number(form.hours),
        ktCompletion: form.ktCompletion === '' ? undefined : Number(form.ktCompletion),
        productivityMetrics: form.productivityMetrics === '' ? undefined : Number(form.productivityMetrics),
        aiCredits: form.aiCredits === '' ? undefined : Number(form.aiCredits),
        expectedCompletion: form.expectedCompletion || undefined,
      });
      toast.success(submittedForDate ? 'Report updated' : 'EOD report submitted!');
      setSubmittedForDate(true);
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-screen bg-[#F8FAFC]">
          <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="w-full flex flex-col gap-6 max-w-[900px] mx-auto pb-10 font-sans text-left">

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-[#0F172A]">Daily Report / EOD Tracker</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {selectedDate === todayStr()
              ? (submittedForDate ? "You've submitted today's report — you can still update it below." : "Fill this out before you clock out today.")
              : (submittedForDate ? `Editing your report for ${selectedDate}.` : `No report was submitted for ${selectedDate} — you can fill it in now.`)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-5">

          <div>
            <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Report Date</label>
            <input
              type="date"
              value={selectedDate}
              min={minDateStr()}
              max={todayStr()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-56 border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]"
            />
            <p className="text-[11px] text-[#94A3B8] mt-1">You can fill in a missed day up to {MAX_BACKDATE_DAYS} days back.</p>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Today's Task *</label>
            <textarea
              rows={3}
              value={form.todayTask}
              onChange={set('todayTask')}
              placeholder="What did you work on today?"
              className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Yesterday's Status</label>
              <select value={form.yesterdayStatus} onChange={set('yesterdayStatus')} className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] bg-white focus:outline-none focus:border-[#2563EB]">
                {YESTERDAY_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Pending Reason (if any)</label>
              <input type="text" value={form.pendingReason} onChange={set('pendingReason')} placeholder="Why is anything pending?" className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Expected Completion</label>
              <input type="date" value={form.expectedCompletion} onChange={set('expectedCompletion')} className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Module</label>
              <input type="text" value={form.module} onChange={set('module')} placeholder="e.g. Auth, Dashboard" className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]" />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Any Blockers?</label>
            <input type="text" value={form.blockers} onChange={set('blockers')} placeholder="Anything blocking your progress?" className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Working Time</label>
              <input type="text" value={form.workingTime} onChange={set('workingTime')} placeholder="09:30 AM - 06:30 PM" className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Hours Worked</label>
              <input type="number" step="0.5" value={form.hours} onChange={set('hours')} placeholder="8" className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Attendance</label>
              <select value={form.attendance} onChange={set('attendance')} className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] bg-white focus:outline-none focus:border-[#2563EB]">
                {ATTENDANCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">KT Completion (%)</label>
              <input type="text" value={form.ktCompletion} onChange={set('ktCompletion')} placeholder="0-100" className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Self Productivity (0-10)</label>
              <input type="text" value={form.productivityMetrics} onChange={set('productivityMetrics')} placeholder="0-10" className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">AI Credits Used</label>
              <input type="text" value={form.aiCredits} onChange={set('aiCredits')} placeholder="0" className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]" />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Project</label>
            <select value={form.project} onChange={set('project')} className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB] bg-white">
              <option value="">Select project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Project Assignment Notes</label>
            <input type="text" value={form.projectAssignment} onChange={set('projectAssignment')} placeholder="Any note about current project assignment" className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]" />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#2563EB] text-white px-6 py-2.5 rounded-md text-[13px] font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-60"
            >
              {saving ? 'Submitting...' : submittedForDate ? 'Update Report' : 'Submit Report'}
            </button>
          </div>
        </form>

        {/* History */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-[14px] font-bold text-[#0F172A]">Your Submission History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase">Date</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase">Task</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase">Hours</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase">Attendance</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase">Report</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? history.map((h) => (
                  <tr key={h._id} className="border-b border-[#F1F5F9] last:border-0">
                    <td className="px-4 py-2.5 text-[12px] text-[#0F172A]">{new Date(h.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-[12px] text-[#0F172A] max-w-[280px] truncate">{h.todayTask}</td>
                    <td className="px-4 py-2.5 text-[12px] text-[#64748B]">{h.hours ?? '-'}</td>
                    <td className="px-4 py-2.5 text-[12px] text-[#64748B]">{h.attendance}</td>
                    <td className="px-4 py-2.5 text-[12px] text-[#059669] font-medium">{h.reportSubmission}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[12px] text-[#94A3B8]">No submissions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
