import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import HRLayout from '../../components/hr/HRLayout';
import { hrAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['Applied', 'Interview Scheduled', 'Interviewed', 'Selected', 'On Hold', 'Rejected', 'Joined'];
const RESULT_OPTIONS = ['Pending', 'Selected', 'Rejected', 'On Hold'];

const STATUS_COLORS = {
  'Applied':              'bg-slate-100 text-slate-700',
  'Interview Scheduled':  'bg-[#3B82F6]/10 text-[#3B82F6]',
  'Interviewed':          'bg-[#8B5CF6]/10 text-[#8B5CF6]',
  'Selected':             'bg-[#16A34A]/10 text-[#16A34A]',
  'On Hold':              'bg-[#D97706]/10 text-[#D97706]',
  'Rejected':             'bg-[#DC2626]/10 text-[#DC2626]',
  'Joined':               'bg-[#059669]/10 text-[#059669]',
};

const DOC_TYPES = [
  { key: 'resume', label: 'Resume', icon: 'description' },
  { key: 'offerLetter', label: 'Offer Letter', icon: 'contract' },
  { key: 'nda', label: 'NDA', icon: 'gavel' },
];

export default function CandidateDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await hrAPI.getCandidate(id);
      setCandidate(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load candidate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const fileApiOrigin = (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');

  const patchCandidate = async (payload, successMsg) => {
    setSaving(true);
    try {
      const res = await hrAPI.updateCandidate(id, payload);
      setCandidate(res.data?.data || candidate);
      if (successMsg) toast.success(successMsg);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update candidate');
    } finally {
      setSaving(false);
    }
  };

  const handleDocFileSelect = async (docType, file) => {
    if (!file) return;
    setUploadingDoc(docType);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await hrAPI.uploadCandidateDocument(id, docType, fd);
      setCandidate(prev => ({ ...prev, documents: res.data?.data || res.data }));
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleDocDelete = async (docType) => {
    if (!confirm('Remove this document?')) return;
    try {
      const res = await hrAPI.deleteCandidateDocument(id, docType);
      setCandidate(prev => ({ ...prev, documents: res.data?.data || {} }));
      toast.success('Document removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove document');
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await hrAPI.addCandidateNote(id, noteText.trim());
      setNoteText('');
      toast.success('Note added');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove ${candidate.name} from the pipeline? This cannot be undone.`)) return;
    try {
      await hrAPI.deleteCandidate(id);
      toast.success('Candidate removed');
      navigate('/hr/recruitment');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete candidate');
    }
  };

  if (loading) {
    return <HRLayout bare><div className="py-20 text-center text-[#64748B]">Loading candidate...</div></HRLayout>;
  }

  if (error || !candidate) {
    return <HRLayout bare><div className="py-20 text-center text-[#DC2626]">{error || 'Candidate not found'}</div></HRLayout>;
  }

  const initials = candidate.name?.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '?';

  return (
    <HRLayout bare>
      <div className="font-sans text-[#0F172A] w-full flex flex-col gap-5 max-w-[1100px] mx-auto pb-10">

        {/* Back link */}
        <button onClick={() => navigate('/hr/recruitment')} className="flex items-center gap-1.5 text-[13px] text-[#64748B] hover:text-[#2563EB] mt-6 w-fit">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Recruitment Pipeline
        </button>

        {/* Header card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center font-bold text-[18px] shrink-0">
              {initials}
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-[#0F172A]">{candidate.name}</h1>
              <p className="text-[13px] text-[#64748B] mt-0.5">{candidate.appliedRole || 'Applied Role: Not specified'}</p>
              <div className="flex items-center gap-3 mt-2 text-[12px] text-[#64748B]">
                <a href={`mailto:${candidate.email}`} className="text-[#2563EB] hover:underline">{candidate.email}</a>
                {candidate.phone && <span>{candidate.phone}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold ${STATUS_COLORS[candidate.recruitmentStatus] || 'bg-slate-100 text-slate-700'}`}>
              {candidate.recruitmentStatus}
            </span>
            <button onClick={handleDelete} className="text-[#64748B] hover:text-red-600 transition-colors p-2" title="Remove candidate">
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Column 1: Profile info */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-5">
            <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#E2E8F0] pb-3">
              Candidate Details
            </h2>
            <InfoRow label="College Name" value={candidate.college || 'Not provided'} />
            <InfoRow label="Domain / Technology" value={candidate.domain || 'Not provided'} />
            <InfoRow label="Applied Role" value={candidate.appliedRole || 'Not provided'} />
            <InfoRow label="Joining Date" value={candidate.joiningDate ? new Date(candidate.joiningDate).toLocaleDateString() : 'Not scheduled'} />
            <InfoRow label="Added By" value={candidate.createdBy?.name || 'Unknown'} />
            {candidate.convertedTo && (
              <InfoRow label="Converted To User" value={`${candidate.convertedTo.name} (${candidate.convertedTo.employeeId || ''})`} />
            )}
          </div>

          {/* Column 2: Interview / status management */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-5">
            <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#E2E8F0] pb-3">
              Interview &amp; Status
            </h2>

            <div>
              <label className="block text-[12px] font-medium text-[#64748B] mb-1">Interview Date</label>
              <input
                type="date"
                defaultValue={candidate.interviewDate ? candidate.interviewDate.slice(0, 10) : ''}
                onBlur={(e) => patchCandidate({ interviewDate: e.target.value || null }, 'Interview date updated')}
                className="w-full border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#64748B] mb-1">Interview Result</label>
              <select
                value={candidate.interviewResult}
                onChange={(e) => patchCandidate({ interviewResult: e.target.value }, 'Interview result updated')}
                disabled={saving}
                className="w-full border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] focus:outline-none focus:border-[#2563EB] bg-white"
              >
                {RESULT_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#64748B] mb-1">Recruitment Status</label>
              <select
                value={candidate.recruitmentStatus}
                onChange={(e) => patchCandidate({ recruitmentStatus: e.target.value }, 'Recruitment status updated')}
                disabled={saving}
                className="w-full border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] focus:outline-none focus:border-[#2563EB] bg-white"
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {candidate.recruitmentStatus === 'Selected' && (
              <div>
                <label className="block text-[12px] font-medium text-[#64748B] mb-1">Joining Date</label>
                <input
                  type="date"
                  defaultValue={candidate.joiningDate ? candidate.joiningDate.slice(0, 10) : ''}
                  onBlur={(e) => patchCandidate({ joiningDate: e.target.value || null }, 'Joining date updated')}
                  className="w-full border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]"
                />
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  Once ready, mark status as "Joined" and create their account from Admin → Add User.
                </p>
              </div>
            )}
          </div>

          {/* Column 3: Documents */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#E2E8F0] pb-3">
              Documents
            </h2>
            {DOC_TYPES.map(({ key, label, icon }) => {
              const doc = candidate.documents?.[key];
              const inputId = `cand-doc-${key}`;
              return (
                <div key={key} className="flex items-center justify-between gap-3 border border-[#F1F5F9] rounded-lg p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${doc?.filePath ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-slate-100 text-slate-400'}`}>
                      <span className="material-symbols-outlined text-[16px]">{icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#0F172A]">{label}</p>
                      {doc?.filePath ? (
                        <p className="text-[11px] text-[#64748B] truncate max-w-[140px]">{doc.fileName}</p>
                      ) : (
                        <p className="text-[11px] text-[#94A3B8] italic">Not uploaded</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc?.filePath && (
                      <a href={`${fileApiOrigin}${doc.filePath}`} target="_blank" rel="noopener noreferrer" className="text-[#64748B] hover:text-[#2563EB]" title="View / Download">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                      </a>
                    )}
                    <label htmlFor={inputId} className="cursor-pointer text-[#64748B] hover:text-[#2563EB]" title={doc?.filePath ? 'Replace file' : 'Upload file'}>
                      <span className="material-symbols-outlined text-[18px]">{uploadingDoc === key ? 'sync' : 'upload'}</span>
                    </label>
                    <input
                      id={inputId}
                      type="file"
                      className="hidden"
                      disabled={uploadingDoc === key}
                      onChange={(e) => { handleDocFileSelect(key, e.target.files[0]); e.target.value = ''; }}
                    />
                    {doc?.filePath && (
                      <button onClick={() => handleDocDelete(key)} className="text-[#64748B] hover:text-red-600" title="Remove">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#E2E8F0] pb-3">
            Notes
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add an interview note or remark..."
              className="flex-1 border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            />
            <button
              onClick={handleAddNote}
              disabled={addingNote || !noteText.trim()}
              className="px-4 py-1.5 rounded-md text-[13px] font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {(candidate.notes || []).length === 0 && (
              <p className="text-[12px] text-[#94A3B8] italic">No notes yet.</p>
            )}
            {[...(candidate.notes || [])].reverse().map((n, idx) => (
              <div key={idx} className="text-[13px] bg-[#F8FAFC] border border-[#F1F5F9] rounded-md p-3">
                <p className="text-[#0F172A]">{n.text}</p>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  {n.addedBy?.name || 'HR'} &middot; {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HRLayout>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <span className="block text-[12px] font-medium text-[#64748B] mb-1">{label}</span>
      <span className="text-[14px] font-medium text-[#0F172A]">{value}</span>
    </div>
  );
}
