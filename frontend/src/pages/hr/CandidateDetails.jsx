import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import HRLayout from '../../components/hr/HRLayout';
import { hrAPI, adminAPI } from '../../utils/api';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Departments & Roles for conversion
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);

  // Onboard Modal State
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    employmentType: 'Full-time',
    department: '',
    role: '',
    designation: '',
    joiningDate: '',
    password: 'Pass@1234',
  });
  const [converting, setConverting] = useState(false);
  const [convertedSuccessUser, setConvertedSuccessUser] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [candRes, deptsRes, rolesRes] = await Promise.all([
        hrAPI.getCandidate(id),
        adminAPI.getDepartments().catch(() => ({ data: { data: [] } })),
        adminAPI.getRoles().catch(() => ({ data: { data: [] } })),
      ]);

      const cand = candRes.data?.data || null;
      setCandidate(cand);
      setDepartments(deptsRes.data?.data || []);
      setRoles(rolesRes.data?.data || []);

      if (cand) {
        setOnboardForm({
          employmentType: cand.appliedRole?.toLowerCase().includes('intern') ? 'Intern' : 'Full-time',
          department: '',
          role: '',
          designation: cand.appliedRole || '',
          joiningDate: cand.joiningDate ? cand.joiningDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
          password: 'Pass@1234',
        });
      }

      if (searchParams.get('onboard') === 'true' && cand && !cand.convertedTo) {
        setIsOnboardModalOpen(true);
      }
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
      const updated = res.data?.data || candidate;
      setCandidate(updated);
      if (successMsg) toast.success(successMsg);

      // If user selected "Joined" and candidate is not yet converted, prompt onboarding modal
      if (payload.recruitmentStatus === 'Joined' && !updated.convertedTo) {
        setIsOnboardModalOpen(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update candidate');
    } finally {
      setSaving(false);
    }
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    setConverting(true);
    try {
      const payload = {
        ...onboardForm,
        joiningDate: onboardForm.joiningDate || undefined,
        department: onboardForm.department || undefined,
        role: onboardForm.role || undefined,
      };

      const res = await hrAPI.convertCandidateToUser(id, payload);
      const createdUser = res.data?.data?.user;

      setConvertedSuccessUser(createdUser);
      setCandidate(prev => ({
        ...prev,
        recruitmentStatus: 'Joined',
        convertedTo: createdUser,
      }));

      setIsOnboardModalOpen(false);
      toast.success(`Candidate onboarded as ${createdUser.employeeId}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to onboard candidate');
    } finally {
      setConverting(false);
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

        {/* Success Banner if just converted */}
        {convertedSuccessUser && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#059669] text-[24px]">verified</span>
              <div>
                <h3 className="text-[14px] font-bold text-[#065F46]">Candidate Successfully Onboarded!</h3>
                <p className="text-[12px] text-[#047857]">
                  Account created for <strong>{convertedSuccessUser.name}</strong> with Employee ID <strong>{convertedSuccessUser.employeeId}</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/hr/onboarding')}
              className="bg-[#059669] hover:bg-[#047857] text-white px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
            >
              View in Onboarding Pipeline
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        )}

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
          <div className="flex items-center gap-3 flex-wrap">
            {candidate.convertedTo ? (
              <div className="flex items-center gap-2 bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1.5 rounded-lg text-[#059669] text-[12px] font-bold">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                User ID: {candidate.convertedTo.employeeId || 'Active'}
              </div>
            ) : (
              (candidate.recruitmentStatus === 'Joined' || candidate.recruitmentStatus === 'Selected') && (
                <button
                  onClick={() => setIsOnboardModalOpen(true)}
                  className="bg-[#059669] hover:bg-[#047857] text-white px-3.5 py-1.5 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  Onboard as User
                </button>
              )
            )}

            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-semibold ${STATUS_COLORS[candidate.recruitmentStatus] || 'bg-slate-100 text-slate-700'}`}>
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
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Converted To User</span>
                <button
                  onClick={() => navigate('/hr/onboarding')}
                  className="text-[14px] font-bold text-[#2563EB] hover:underline flex items-center gap-1"
                >
                  {candidate.convertedTo.name} ({candidate.convertedTo.employeeId || 'View'})
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </button>
              </div>
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
              </div>
            )}

            {!candidate.convertedTo && (candidate.recruitmentStatus === 'Joined' || candidate.recruitmentStatus === 'Selected') && (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-3 text-left">
                <p className="text-[12px] text-[#15803D] font-semibold">Ready to initialize employee profile?</p>
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(true)}
                  className="mt-2 w-full bg-[#16A34A] hover:bg-[#15803D] text-white py-1.5 rounded-md text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                  Open Onboarding Modal
                </button>
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

        {/* ONBOARD CANDIDATE MODAL */}
        {isOnboardModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[540px] overflow-hidden flex flex-col animate-in fade-in">
              <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <div>
                  <h3 className="font-bold text-[17px] text-[#0F172A]">Onboard Candidate into Organization</h3>
                  <p className="text-[12px] text-[#64748B]">Auto-provisions user account & starts 8-step onboarding pipeline.</p>
                </div>
                <button onClick={() => setIsOnboardModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleConvertSubmit} className="p-6 space-y-4 text-left">
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3.5 text-[12px] text-[#1E40AF] space-y-1">
                  <p><strong>Candidate:</strong> {candidate.name} ({candidate.email})</p>
                  <p><strong>College / Domain:</strong> {candidate.college || 'N/A'} • {candidate.domain || 'N/A'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-[#0F172A] mb-1.5">Employment Type *</label>
                    <select
                      value={onboardForm.employmentType}
                      onChange={e => setOnboardForm({ ...onboardForm, employmentType: e.target.value })}
                      className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-[13px] bg-white focus:outline-none focus:border-[#2563EB]"
                      required
                    >
                      <option value="Full-time">Full-time (Employee)</option>
                      <option value="Intern">Intern</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[#0F172A] mb-1.5">Department</label>
                    <select
                      value={onboardForm.department}
                      onChange={e => setOnboardForm({ ...onboardForm, department: e.target.value })}
                      className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-[13px] bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="">Auto / Select Department</option>
                      {departments.map(d => (
                        <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-[#0F172A] mb-1.5">Designation</label>
                    <input
                      type="text"
                      value={onboardForm.designation}
                      onChange={e => setOnboardForm({ ...onboardForm, designation: e.target.value })}
                      placeholder="e.g. Frontend Developer"
                      className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-[13px] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[#0F172A] mb-1.5">Joining Date *</label>
                    <input
                      type="date"
                      value={onboardForm.joiningDate}
                      onChange={e => setOnboardForm({ ...onboardForm, joiningDate: e.target.value })}
                      className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-[13px] focus:outline-none focus:border-[#2563EB]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#0F172A] mb-1.5">Initial Password</label>
                  <input
                    type="text"
                    value={onboardForm.password}
                    onChange={e => setOnboardForm({ ...onboardForm, password: e.target.value })}
                    className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-[13px] focus:outline-none focus:border-[#2563EB]"
                  />
                  <span className="text-[11px] text-[#64748B] mt-0.5 block">Default: Pass@1234 (User can reset on first login)</span>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsOnboardModalOpen(false)}
                    className="px-4 py-2 text-[13px] font-bold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={converting}
                    className="px-5 py-2 text-[13px] font-bold bg-[#059669] hover:bg-[#047857] text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {converting ? 'Provisioning Account...' : 'Complete Onboarding'}
                    <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
