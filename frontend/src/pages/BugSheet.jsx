import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bug, Download, ExternalLink, Send, FileSpreadsheet, Info, Eye, Hash, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import PageWrapper from '../components/PageWrapper';
import { useAuth } from '../contexts/AuthContext';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1ZQXAj0bu_SYojJuGzZdsJU9n30UmOx2Ls8PW2WFy44A/edit?usp=sharing';
const SHEET_ID = '1ZQXAj0bu_SYojJuGzZdsJU9n30UmOx2Ls8PW2WFy44A';
const SCRIPT_URL = import.meta.env.VITE_BUG_SHEET_WEB_APP_URL || '';
const DOWNLOAD_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;

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
  environment: '', remarks: '', bugsResolved: 'NOT RESOLVED',
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
  const [executionDate, setExecutionDate] = useState(() => formatDate(new Date()));

  // Pulls the next free Test Case ID / Bug ID for the selected project's tab so
  // whoever is filling the form can see up front that it won't collide with an
  // existing row. The actual write re-checks this server-side at submit time.
  const loadPreview = useCallback(async (proj) => {
    if (!SCRIPT_URL) return;
    setPreview((p) => ({ ...p, loading: true, error: '' }));
    try {
      const res = await fetch(`${SCRIPT_URL}?project=${encodeURIComponent(proj)}`);
      const data = await res.json();
      if (data.ok) {
        setPreview({ loading: false, testCaseId: data.nextTestCaseId, bugId: data.nextBugId, error: '' });
      } else {
        setPreview({ loading: false, testCaseId: '', bugId: '', error: data.error || 'Could not load sheet numbers' });
      }
    } catch (err) {
      setPreview({ loading: false, testCaseId: '', bugId: '', error: 'Could not reach the Bug Sheet script' });
    }
  }, []);

  useEffect(() => { if (canAdd) loadPreview(project); }, [project, canAdd, loadPreview]);

  const submitBug = (e) => {
    e.preventDefault();
    if (!canAdd) {
      toast.error('HR has view-only access to the Bug Sheet.');
      return;
    }
    if (!SCRIPT_URL) {
      toast.error('Bug Sheet connection is not configured. Add VITE_BUG_SHEET_WEB_APP_URL in frontend .env');
      return;
    }
    if (!form.scenario.trim() || !form.actual.trim()) {
      toast.error('Enter at least the Test Scenario and Actual Result');
      return;
    }

    setSending(true);
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
      bugsResolved: form.bugsResolved,
      executedBy: user?.name || roleName,
      executionDate,
    };

    Object.entries(payload).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden'; input.name = key; input.value = value;
      formEl.appendChild(input);
    });
    document.body.appendChild(formEl);
    formEl.submit();

    setTimeout(() => {
      setSending(false);
      formEl.remove(); iframe.remove();
      setForm(emptyForm);
      setExecutionDate(formatDate(new Date()));
      toast.success(`Added to the ${PROJECTS.find((p) => p.value === project)?.label || project} sheet`);
      // Refresh the preview so the next entry shows the correct next number.
      loadPreview(project);
    }, 1200);
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
                <label className="label !mb-0">Project</label>
                <select value={project} onChange={(e) => setProject(e.target.value)} className="input !w-auto py-2">
                  {PROJECTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <Hash className="w-4 h-4 text-slate-400 shrink-0" />
              {preview.loading ? (
                <span className="text-slate-500">Checking last test case number…</span>
              ) : preview.error ? (
                <span className="text-red-600">{preview.error}</span>
              ) : (
                <span className="text-slate-700">
                  Next Test Case ID: <span className="font-bold text-slate-900">{preview.testCaseId || '—'}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  Next Bug ID: <span className="font-bold text-slate-900">{preview.bugId || '—'}</span>
                </span>
              )}
              <button type="button" onClick={() => loadPreview(project)} className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <form onSubmit={submitBug} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="label">Module / Feature Name</label><input value={form.module} onChange={e=>setForm({...form,module:e.target.value})} className="input" placeholder="e.g. Student Management" /></div>
              <div><label className="label">Test Scenario</label><input value={form.scenario} onChange={e=>setForm({...form,scenario:e.target.value})} className="input" placeholder="e.g. Filter Function" /></div>

              <div className="md:col-span-2"><label className="label">Test Case Description</label><textarea rows="2" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="input resize-none" placeholder="What is this test case verifying?" /></div>

              <div><label className="label">Precondition</label><input value={form.precondition} onChange={e=>setForm({...form,precondition:e.target.value})} className="input" placeholder="e.g. User logged in" /></div>
              <div><label className="label">Test Data</label><input value={form.testData} onChange={e=>setForm({...form,testData:e.target.value})} className="input" placeholder="e.g. Valid credentials" /></div>

              <div className="md:col-span-2"><label className="label">Test Steps</label><textarea rows="3" value={form.steps} onChange={e=>setForm({...form,steps:e.target.value})} className="input resize-none" placeholder="1. Login... 2. Open... 3. Click..." /></div>

              <div><label className="label">Expected Result</label><textarea rows="3" value={form.expected} onChange={e=>setForm({...form,expected:e.target.value})} className="input resize-none" /></div>
              <div><label className="label">Actual Result</label><textarea rows="3" value={form.actual} onChange={e=>setForm({...form,actual:e.target.value})} className="input resize-none" /></div>

              <div><label className="label">Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="input">{STATUSES.map(x=><option key={x}>{x}</option>)}</select></div>
              <div><label className="label">Priority</label><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="input">{PRIORITIES.map(x=><option key={x}>{x}</option>)}</select></div>
              <div><label className="label">Severity</label><select value={form.severity} onChange={e=>setForm({...form,severity:e.target.value})} className="input">{SEVERITIES.map(x=><option key={x}>{x}</option>)}</select></div>
              <div><label className="label">Environment / Browser / OS</label><input value={form.environment} onChange={e=>setForm({...form,environment:e.target.value})} className="input" placeholder="e.g. Chrome / Windows 11" /></div>

              <div className="md:col-span-2"><label className="label">Remarks / Comments</label><textarea rows="2" value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} className="input resize-none" /></div>

              <div><label className="label">Executed By</label><input value={user?.name || roleName} disabled className="input opacity-70" /></div>
              <div><label className="label">Execution Date</label><input value={executionDate} onChange={e=>setExecutionDate(e.target.value)} className="input" placeholder="DD-MM-YYYY" /></div>

              <div>
                <label className="label">Test Case ID <span className="normal-case font-medium text-slate-400">(auto)</span></label>
                <input value={preview.loading ? 'Loading…' : (preview.testCaseId || '—')} disabled className="input opacity-70 font-semibold" />
              </div>
              <div>
                <label className="label">Bug ID / Defect ID <span className="normal-case font-medium text-slate-400">(auto)</span></label>
                <input value={preview.loading ? 'Loading…' : (preview.bugId || '—')} disabled className="input opacity-70 font-semibold" />
              </div>

              <div className="md:col-span-2">
                <label className="label">Bugs Resolved</label>
                <select value={form.bugsResolved} onChange={e=>setForm({...form,bugsResolved:e.target.value})} className="input">
                  <option>NOT RESOLVED</option>
                  <option>RESOLVED</option>
                </select>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-red-600 text-white px-5 py-3 text-sm font-bold hover:bg-red-700 disabled:opacity-60">
                  <Send className="w-4 h-4" />{sending ? 'Adding...' : `Add as ${preview.testCaseId || 'next'} to ${PROJECTS.find((p) => p.value === project)?.label || project}`}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      <style>{`.label{display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:6px}.input{width:100%;border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:11px 13px;font-size:14px;outline:none}.input:focus{box-shadow:0 0 0 3px rgba(59,130,246,.1);border-color:#93c5fd}`}</style>
    </PageWrapper>
  );
}
