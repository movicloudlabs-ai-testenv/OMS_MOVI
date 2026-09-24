import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bug, Download, ExternalLink, Send, FileSpreadsheet, Info, Eye, Hash, RefreshCw, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import PageWrapper from '../components/PageWrapper';
import { useAuth } from '../contexts/AuthContext';
import { bugsAPI } from '../utils/api';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1ZQXAj0bu_SYojJuGzZdsJU9n30UmOx2Ls8PW2WFy44A/edit?usp=sharing';
const SHEET_ID = '1ZQXAj0bu_SYojJuGzZdsJU9n30UmOx2Ls8PW2WFy44A';
const SCRIPT_URL = import.meta.env.VITE_BUG_SHEET_WEB_APP_URL || '';
const DOWNLOAD_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;

// A correctly-deployed Apps Script Web App URL always looks like this. If the
// configured URL doesn't match, every request will fail before it ever reaches
// Apps Script — so we catch that up front instead of showing a vague network error.
const SCRIPT_URL_LOOKS_VALID = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(SCRIPT_URL);
function urlConfigError() {
  if (!SCRIPT_URL) return 'VITE_BUG_SHEET_WEB_APP_URL is not set in frontend/.env — the app has no script URL to call at all.';
  if (!SCRIPT_URL_LOOKS_VALID) return `Configured URL doesn't look like an Apps Script Web App URL (should look like https://script.google.com/macros/s/AKfycb.../exec). Currently set to: ${SCRIPT_URL}`;
  return '';
}

// Bug Sheet is visible to Intern, HR and PMO only (see App.jsx route guard).
// Of those, only Intern and PMO are allowed to add bugs — HR is view-only.
const CAN_ADD_ROLES = new Set(['intern', 'pmo', 'pmo-lead']);

// Each project has its own tab in the spreadsheet. `value` must match the key
// used in the Apps Script's PROJECT_SHEETS map (google-apps-script/Code.gs).
const PROJECTS = [
  { value: 'cms', label: 'CMS' },
  { value: 'hms', label: 'HMS' },
  { value: 'spa', label: 'SPA' },
  { value: 'rms', label: 'RMS' },
  { value: 'boxway', label: 'Boxway' },
  { value: 'owms', label: 'OWMS' },
  { value: 'iws', label: 'IWS' },
  { value: 'ecommerce', label: 'E-Commerce' },
];

const STATUSES = ['Open', 'In Progress', 'Fail', 'Pass', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

const emptyForm = {
  module: '', scenario: '', description: '', precondition: '', steps: '', testData: '',
  expected: '', actual: '', status: 'Open', priority: 'Medium', severity: 'Medium',
  environment: '', remarks: '', startingTime: '', endTime: '', solvedBy: '', solvedDate: '',
  executedBy: '',
};

// dd-MM-yyyy, matching the format already used across the live sheet's rows.
function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export default function BugSheet() {
  const { user } = useAuth();
  const role = user?.role?.slug || (typeof user?.role === 'string' ? user.role : '');
  const roleName = useMemo(() => ({ 'hr-manager':'HR', 'pmo-lead':'PMO', 'super-admin':'Admin' }[role] || role || 'User'), [role]);
  // super-admin can always reach this page (global bypass) but isn't a filler by role definition,
  // so only Intern/PMO get the Add Bug form; HR (and anyone else) gets read-only access.
  const canAdd = CAN_ADD_ROLES.has(role);

  const [project, setProject] = useState(PROJECTS[0].value);
  const [preview, setPreview] = useState({ loading: false, testCaseId: '', bugId: '', error: '' });
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState(emptyForm);
  // Executed By used to be locked to the logged-in user's name — now it's a free-text
  // field (so anyone can type whoever actually executed the test), just pre-filled
  // with the logged-in user's name as a starting point.
  useEffect(() => { setForm((f) => (f.executedBy ? f : { ...f, executedBy: user?.name || roleName })); }, [user, roleName]);
  const [executionDate, setExecutionDate] = useState(() => formatDate(new Date()));

  // Pulls the next free Test Case ID / Bug ID for the selected project's tab so
  // whoever is filling the form can see up front that it won't collide with an
  // existing row. If Google Apps Script is unconfigured, seamlessly falls back to OWMS database.
  const loadPreview = useCallback(async (proj) => {
    setPreview((p) => ({ ...p, loading: true, error: '' }));

    // 1. Try Google Apps Script if URL is configured
    if (SCRIPT_URL && SCRIPT_URL_LOOKS_VALID) {
      try {
        const res = await fetch(`${SCRIPT_URL}?project=${encodeURIComponent(proj)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setPreview({ loading: false, testCaseId: data.nextTestCaseId, bugId: data.nextBugId, error: '', isLocal: false });
            return;
          }
        }
      } catch (err) {
        console.warn('Google Script preview fetch failed, using local OWMS database:', err);
      }
    }

    // 2. Local OWMS MongoDB fallback
    try {
      const res = await bugsAPI.getNextIds(proj);
      const data = res.data?.data || res.data;
      if (data && data.ok) {
        setPreview({
          loading: false,
          testCaseId: data.nextTestCaseId,
          bugId: data.nextBugId,
          error: '',
          isLocal: true,
        });
        return;
      }
    } catch (err) {
      console.warn('Local preview fetch failed:', err);
    }

    setPreview({ loading: false, testCaseId: 'TC-001', bugId: 'BUG-001', error: '', isLocal: true });
  }, []);

  useEffect(() => { if (canAdd) loadPreview(project); }, [project, canAdd, loadPreview]);

  const submitBug = async (e) => {
    e.preventDefault();
    if (!canAdd) {
      toast.error('HR has view-only access to the Bug Sheet.');
      return;
    }
    if (!form.scenario.trim() || !form.actual.trim()) {
      toast.error('Enter at least the Test Scenario and Actual Result');
      return;
    }

    setSending(true);

    const payload = {
      project,
      module: form.module.trim(),
      scenario: form.scenario.trim(),
      description: form.description.trim(),
      precondition: form.precondition.trim(),
      steps: form.steps.trim(),
      testData: form.testData.trim(),
      expected: form.expected.trim(),
      actual: form.actual.trim(),
      status: form.status,
      priority: form.priority,
      severity: form.severity,
      environment: form.environment.trim(),
      remarks: form.remarks.trim(),
      startingTime: form.startingTime.trim(),
      endTime: form.endTime.trim(),
      solvedBy: form.solvedBy.trim(),
      solvedDate: form.solvedDate.trim(),
      executedBy: form.executedBy.trim() || user?.name || roleName,
      executionDate,
      testCaseId: preview.testCaseId,
      bugId: preview.bugId,
    };

    // If Google Apps Script Web App URL is configured, also submit to Google Sheets
    if (SCRIPT_URL && SCRIPT_URL_LOOKS_VALID) {
      try {
        const iframeName = `bug-sheet-submit-${Date.now()}`;
        const iframe = document.createElement('iframe');
        iframe.name = iframeName;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const formEl = document.createElement('form');
        formEl.method = 'POST';
        formEl.action = SCRIPT_URL;
        formEl.target = iframeName;
        formEl.style.display = 'none';
        Object.entries(payload).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden'; input.name = key; input.value = value;
          formEl.appendChild(input);
        });
        document.body.appendChild(formEl);
        formEl.submit();

        setTimeout(() => {
          formEl.remove();
          iframe.remove();
        }, 3000);
      } catch (scriptErr) {
        console.warn('Google Sheet submission warning:', scriptErr);
      }
    }

    // Always reliably persist to internal OWMS MongoDB database
    try {
      const res = await bugsAPI.create(payload);
      const saved = res.data?.data || res.data;
      const tc = saved?.testCaseId || preview.testCaseId || 'TC';
      const bg = saved?.bugId || preview.bugId || 'BUG';

      setForm((f) => ({ ...emptyForm, executedBy: f.executedBy }));
      setExecutionDate(formatDate(new Date()));
      toast.success(`Bug logged successfully (${tc} / ${bg})`);
      await loadPreview(project);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit bug report');
    } finally {
      setSending(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600"><Bug className="w-5 h-5" /></div>
              <div><h1 className="text-2xl font-extrabold text-slate-900">Bug Sheet</h1><p className="text-sm text-slate-500">{canAdd ? 'Report bugs directly to the live per-project Google Sheet.' : 'View bugs reported to the live Google Sheet.'}</p></div>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={SHEET_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><ExternalLink className="w-4 h-4" /> Visit Sheet</a>
            <a href={DOWNLOAD_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"><Download className="w-4 h-4" /> Download</a>
          </div>
        </div>

        {canAdd ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex gap-3"><Info className="w-5 h-5 shrink-0" /><span>Pick the project first — each project has its own tab, and the bug is appended straight to that tab. Test Case ID and Bug ID are auto-generated from that tab's last row so numbers never repeat.</span></div>
        ) : (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-3"><Eye className="w-5 h-5 shrink-0" /><span>HR has view-only access to the Bug Sheet. Bugs can only be added by Interns and PMO — use Visit Sheet to see the live sheet, or Download for an XLSX copy.</span></div>
        )}

        {canAdd && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-600" /><h2 className="font-bold text-slate-900">Add Bug</h2></div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Project</label>
                <select value={project} onChange={(e) => setProject(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 cursor-pointer">
                  {PROJECTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <Hash className="w-4 h-4 text-slate-400 shrink-0" />
              {preview.loading ? (
                <span className="text-slate-500">Checking last test case number…</span>
              ) : preview.error ? (
                <span className="text-red-600">{preview.error}</span>
              ) : (
                <div className="flex items-center flex-wrap gap-2 text-slate-700">
                  <span>
                    Next Test Case ID: <span className="font-bold text-slate-900">{preview.testCaseId || '—'}</span>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>
                    Next Bug ID: <span className="font-bold text-slate-900">{preview.bugId || '—'}</span>
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${preview.isLocal ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    <Database className="w-3 h-3" /> {preview.isLocal ? 'OWMS Database' : 'Google Sheet Connected'}
                  </span>
                </div>
              )}
              <button type="button" onClick={() => loadPreview(project)} className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <form onSubmit={submitBug} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Module / Feature Name <span className="text-rose-500">*</span>
                </label>
                <input 
                  value={form.module} 
                  onChange={e=>setForm({...form,module:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="e.g. Student Management, Task Board, Profile" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Test Scenario <span className="text-rose-500">*</span>
                </label>
                <input 
                  value={form.scenario} 
                  onChange={e=>setForm({...form,scenario:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="e.g. Filter Function by Status and Date" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Test Case Description <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  rows="2" 
                  value={form.description} 
                  onChange={e=>setForm({...form,description:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none resize-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="Describe what this test case is verifying and the specific scenario requirements..." 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Precondition
                </label>
                <input 
                  value={form.precondition} 
                  onChange={e=>setForm({...form,precondition:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="e.g. User logged in with active Intern session" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Test Data
                </label>
                <input 
                  value={form.testData} 
                  onChange={e=>setForm({...form,testData:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="e.g. Email: arjun.p@owms.com, Role: Intern" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Test Steps <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  rows="3" 
                  value={form.steps} 
                  onChange={e=>setForm({...form,steps:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none resize-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="1. Navigate to page&#10;2. Perform action or click button&#10;3. Observe response" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Expected Result <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  rows="3" 
                  value={form.expected} 
                  onChange={e=>setForm({...form,expected:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none resize-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="Describe the expected correct behavior..." 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Actual Result <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  rows="3" 
                  value={form.actual} 
                  onChange={e=>setForm({...form,actual:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none resize-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="Describe what actually happened or went wrong..." 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Status
                </label>
                <select 
                  value={form.status} 
                  onChange={e=>setForm({...form,status:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10 cursor-pointer"
                >
                  {STATUSES.map(x=><option key={x}>{x}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Priority
                </label>
                <select 
                  value={form.priority} 
                  onChange={e=>setForm({...form,priority:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10 cursor-pointer"
                >
                  {PRIORITIES.map(x=><option key={x}>{x}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Severity
                </label>
                <select 
                  value={form.severity} 
                  onChange={e=>setForm({...form,severity:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10 cursor-pointer"
                >
                  {SEVERITIES.map(x=><option key={x}>{x}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Environment / Browser / OS
                </label>
                <input 
                  value={form.environment} 
                  onChange={e=>setForm({...form,environment:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="e.g. Chrome 120 / Windows 11 / Desktop" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Remarks / Comments
                </label>
                <textarea 
                  rows="2" 
                  value={form.remarks} 
                  onChange={e=>setForm({...form,remarks:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none resize-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="Additional notes, screenshots reference, or edge cases..." 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Executed By
                </label>
                <input 
                  value={form.executedBy} 
                  onChange={e=>setForm({...form,executedBy:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="Enter tester's name (e.g. Arjun Patel)" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Execution Date
                </label>
                <input 
                  value={executionDate} 
                  onChange={e=>setExecutionDate(e.target.value)} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="DD-MM-YYYY" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Test Case ID <span className="normal-case text-xs font-medium text-slate-400 ml-1">(auto-generated)</span>
                </label>
                <input 
                  value={preview.loading ? 'Loading…' : (preview.testCaseId || '—')} 
                  disabled 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm font-bold text-slate-700 cursor-not-allowed select-none shadow-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Bug ID / Defect ID <span className="normal-case text-xs font-medium text-slate-400 ml-1">(auto-generated)</span>
                </label>
                <input 
                  value={preview.loading ? 'Loading…' : (preview.bugId || '—')} 
                  disabled 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm font-bold text-slate-700 cursor-not-allowed select-none shadow-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Starting Time
                </label>
                <input 
                  value={form.startingTime} 
                  onChange={e=>setForm({...form,startingTime:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="e.g. 14:00" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  End Time
                </label>
                <input 
                  value={form.endTime} 
                  onChange={e=>setForm({...form,endTime:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="e.g. 14:30" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Solved By
                </label>
                <input 
                  value={form.solvedBy} 
                  onChange={e=>setForm({...form,solvedBy:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="Name of fixer (leave blank if open)" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Solved Date
                </label>
                <input 
                  value={form.solvedDate} 
                  onChange={e=>setForm({...form,solvedDate:e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                  placeholder="DD-MM-YYYY (leave blank if open)" 
                />
              </div>

              <div className="md:col-span-2 flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={sending} 
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 text-white px-6 py-3 text-sm font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 hover:shadow-xl transition-all disabled:opacity-60 cursor-pointer"
                >
                  <Send className="w-4 h-4" />{sending ? 'Adding...' : `Add as ${preview.testCaseId || 'next'} to ${PROJECTS.find((p) => p.value === project)?.label || project}`}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
