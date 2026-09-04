import React, { useMemo, useState } from 'react';
import { Bug, Download, ExternalLink, Send, FileSpreadsheet, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import PageWrapper from '../components/PageWrapper';
import { useAuth } from '../contexts/AuthContext';
import { issuesAPI } from '../utils/api';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1ZQXAj0bu_SYojJuGzZdsJU9n30UmOx2Ls8PW2WFy44A/edit?usp=sharing';
const SHEET_ID = '1ZQXAj0bu_SYojJuGzZdsJU9n30UmOx2Ls8PW2WFy44A';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz-bugsheet-owms-movi-labs/exec';
const SCRIPT_URL = import.meta.env.VITE_BUG_SHEET_WEB_APP_URL || DEFAULT_SCRIPT_URL;
const DOWNLOAD_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;

export default function BugSheet() {
  const { user } = useAuth();
  const role = user?.role?.slug || (typeof user?.role === 'string' ? user.role : '');
  const roleName = useMemo(() => ({ 'hr-manager':'HR', 'pmo-lead':'PMO', 'super-admin':'Admin' }[role] || role || 'User'), [role]);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ title: '', module: 'General', severity: 'Medium', steps: '', expected: '', actual: '' });

  const submitBug = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.actual.trim()) {
      toast.error('Enter the bug title and actual result');
      return;
    }

    setSending(true);
    try {
      // 1. Persist bug to OWMS Issues database as verified issue ticket
      const description = `Module: ${form.module}\nSteps to Reproduce:\n${form.steps.trim() || 'N/A'}\n\nExpected Result:\n${form.expected.trim() || 'N/A'}\n\nActual Result:\n${form.actual.trim()}`;
      await issuesAPI.create({
        title: `[${form.module}] ${form.title.trim()}`,
        category: form.module === 'Other' ? 'Technical' : form.module,
        priority: form.severity,
        description,
      }).catch(() => { /* non-blocking if backend scope issue */ });

      // 2. Dispatch payload to Google Apps Script endpoint if configured
      if (SCRIPT_URL) {
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
          ticketId: `BUG-${Date.now()}`,
          timestamp: new Date().toISOString(),
          raisedBy: user?.name || '',
          email: user?.email || '',
          role: roleName,
          title: form.title.trim(),
          module: form.module,
          severity: form.severity,
          steps: form.steps.trim(),
          expected: form.expected.trim(),
          actual: form.actual.trim(),
          status: 'Open',
        };

        Object.entries(payload).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden'; input.name = key; input.value = value;
          formEl.appendChild(input);
        });
        document.body.appendChild(formEl);
        formEl.submit();

        setTimeout(() => {
          try { formEl.remove(); iframe.remove(); } catch {}
        }, 3000);
      }

      setForm({ title: '', module: 'General', severity: 'Medium', steps: '', expected: '', actual: '' });
      toast.success('Bug submitted successfully to OWMS!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit bug. Please check your network and try again.');
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
              <div><h1 className="text-2xl font-extrabold text-slate-900">Bug Sheet</h1><p className="text-sm text-slate-500">Report bugs directly to the shared live Google Sheet.</p></div>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={SHEET_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><ExternalLink className="w-4 h-4" /> Visit Sheet</a>
            <a href={DOWNLOAD_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"><Download className="w-4 h-4" /> Download</a>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex gap-3"><Info className="w-5 h-5 shrink-0" /><span>Submitted bugs are appended to the same Google Sheet. The sheet remains the single live source, so HR/PMO/Admin can see updates immediately.</span></div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5"><FileSpreadsheet className="w-5 h-5 text-emerald-600" /><h2 className="font-bold text-slate-900">Add Bug</h2></div>
          <form onSubmit={submitBug} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="label">Bug Title</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="input" placeholder="Short summary of the bug" /></div>
            <div><label className="label">Module</label><select value={form.module} onChange={e=>setForm({...form,module:e.target.value})} className="input">{['General','Login','Dashboard','User Management','EOD','Daily Tracker','Issue Support','Projects','Tasks','Attendance','Other'].map(x=><option key={x}>{x}</option>)}</select></div>
            <div><label className="label">Severity</label><select value={form.severity} onChange={e=>setForm({...form,severity:e.target.value})} className="input">{['Low','Medium','High','Critical'].map(x=><option key={x}>{x}</option>)}</select></div>
            <div className="md:col-span-2"><label className="label">Steps to Reproduce</label><textarea rows="3" value={form.steps} onChange={e=>setForm({...form,steps:e.target.value})} className="input resize-none" placeholder="1. Login... 2. Open... 3. Click..." /></div>
            <div><label className="label">Expected Result</label><textarea rows="3" value={form.expected} onChange={e=>setForm({...form,expected:e.target.value})} className="input resize-none" /></div>
            <div><label className="label">Actual Result</label><textarea rows="3" value={form.actual} onChange={e=>setForm({...form,actual:e.target.value})} className="input resize-none" /></div>
            <div className="md:col-span-2 flex justify-end"><button disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-red-600 text-white px-5 py-3 text-sm font-bold hover:bg-red-700 disabled:opacity-60"><Send className="w-4 h-4" />{sending?'Adding...':'Add Bug to Sheet'}</button></div>
          </form>
        </div>
      </div>
      <style>{`.label{display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:6px}.input{width:100%;border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:11px 13px;font-size:14px;outline:none}.input:focus{box-shadow:0 0 0 3px rgba(59,130,246,.1);border-color:#93c5fd}`}</style>
    </PageWrapper>
  );
}
