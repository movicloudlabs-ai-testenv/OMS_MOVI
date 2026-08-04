import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import HRLayout from '../../components/hr/HRLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, UploadCloud, FileText, Play, ExternalLink, GraduationCap,
  CalendarDays, CheckCircle, Clock, Trash2,
} from 'lucide-react';
import { hrAPI } from '../../utils/api';
import toast from 'react-hot-toast';

// --- SUB-COMPONENTS ---
const AssignMaterialModal = ({ isOpen, onClose, internName, onAssign, saving }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Document');
  const [url, setUrl] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) return;
    onAssign({ title, type, url, dueDate: deadline || undefined, description, estimatedMinutes: Number(estimatedMinutes) || 0 });
    setTitle(''); setType('Document'); setUrl(''); setDeadline(''); setDescription(''); setEstimatedMinutes('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-center px-6 py-4 border-b border-[#E2E8F0] shrink-0">
            <div>
              <h2 className="text-xl font-bold text-[#0F172A]">Assign Learning Material</h2>
              <p className="text-sm text-[#64748B]">To: {internName}</p>
            </div>
            <button onClick={onClose} className="text-[#64748B] hover:bg-[#E2E8F0] p-1.5 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="overflow-y-auto p-6">
            <form id="assign-material-form" onSubmit={handleSubmit} className="space-y-5">
              
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Topic / Title *</label>
                <input 
                  type="text" required value={title} onChange={e=>setTitle(e.target.value)}
                  placeholder="e.g. React 18 Fundamentals"
                  className="w-full p-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB] text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Material Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['Document', 'Video', 'Course', 'Link'].map(t => (
                    <button
                      key={t} type="button" onClick={() => setType(t)}
                      className={`py-2 px-3 rounded-lg border text-sm font-semibold transition-colors ${type === t ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Resource URL <span className="text-[#64748B] font-normal">(Optional)</span></label>
                <input
                  type="url" value={url} onChange={e => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Deadline <span className="text-[#64748B] font-normal">(Optional)</span></label>
                  <input
                    type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Est. Minutes <span className="text-[#64748B] font-normal">(Optional)</span></label>
                  <input
                    type="number" min="0" value={estimatedMinutes} onChange={e => setEstimatedMinutes(e.target.value)}
                    placeholder="e.g. 60"
                    className="w-full p-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Instructions / Description</label>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Add any specific instructions for the intern..."
                  className="w-full p-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#2563EB] resize-none h-24"
                />
              </div>

            </form>
          </div>
          
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E2E8F0] shrink-0 bg-[#F8FAFC]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" form="assign-material-form" disabled={saving}
              className="px-5 py-2 text-sm font-bold bg-[#2563EB] text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? 'Assigning…' : 'Assign Material'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default function HRInternDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [activeTab, setActiveTab] = useState('overview');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [intern, setIntern] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchIntern = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await hrAPI.getIntern(id);
        setIntern(res.data?.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load intern details');
      } finally {
        setLoading(false);
      }
    };
    fetchIntern();
  }, [id]);

  const getDurationString = (start, end) => {
    if (!start || !end) return '-';
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.round(diffDays / 30);
    return `${months} Month${months !== 1 ? 's' : ''}`;
  };

  // Map intern to emp layout structure
  const emp = {
    id: intern?.employeeId || '-',
    name: intern?.name || 'Intern',
    email: intern?.email || '',
    phone: intern?.phone || '-',
    address: intern?.address || 'Not Provided',
    university: intern?.college || 'N/A',
    domain: intern?.domain || 'Not Assigned',
    batch: intern?.batch || 'Not Assigned',
    major: intern?.designation || '-',
    department: intern?.department?.name || '-',
    designation: intern?.designation || 'Intern',
    type: intern?.employmentType || 'Intern',
    status: intern?.status || 'Active',
    joined: intern?.internshipStart ? new Date(intern.internshipStart).toLocaleDateString() : '-',
    endDate: intern?.internshipEnd ? new Date(intern.internshipEnd).toLocaleDateString() : '-',
    duration: getDurationString(intern?.internshipStart, intern?.internshipEnd),
    mentor: intern?.mentor?.name || 'Unassigned',
    reportingManager: intern?.manager?.name || 'Unassigned',
    pmoAssigned: intern?.pmoLead?.name || 'Unassigned',
    role: intern?.role?.name || 'Intern',
    project: intern?.project?.name || 'Unassigned',
    hrRepresentative: intern?.hrManager?.name || 'Unassigned',
    location: intern?.address || 'N/A',
    leaveBalance: intern?.leaveBalance ? `${intern.leaveBalance.casual?.total - intern.leaveBalance.casual?.used} Days` : '0 Days',
    sickLeave: intern?.leaveBalance ? `${intern.leaveBalance.sick?.total - intern.leaveBalance.sick?.used} Days` : '0 Days'
  };

  const documents = intern?.documents || {};

  const activityHistory = [
    { id: 1, action: 'Mid-term evaluation submitted by mentor', time: 'April 15, 2024', icon: 'star_rate', color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 2, action: 'Completed module: "Frontend Architecture Basics"', time: 'March 10, 2024', icon: 'school', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 3, action: 'First pull request merged into main branch', time: 'Feb 20, 2024', icon: 'code', color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 4, action: 'Assigned to "Cloud Migration Phase 2" project', time: 'Jan 15, 2024', icon: 'work', color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 5, action: 'Onboarding completed successfully', time: 'Jan 12, 2024', icon: 'verified', color: 'text-indigo-500', bg: 'bg-indigo-50' },
  ];

  const [learningData, setLearningData]     = useState({ resources: [], progress: 0, total: 0, completed: 0 });
  const [learningLoading, setLearningLoading] = useState(false);
  const [assignSaving, setAssignSaving]     = useState(false);
  const [deletingId, setDeletingId]         = useState(null);
  const [uploadingDoc, setUploadingDoc]     = useState(null); // docType currently uploading
  const [internDocs, setInternDocs]         = useState({});

  useEffect(() => {
    if (intern?.documents) setInternDocs(intern.documents);
  }, [intern]);

  const DOC_TYPES = [
    { key: 'resume', label: 'Resume', icon: 'description' },
    { key: 'offerLetter', label: 'Offer Letter', icon: 'contract' },
    { key: 'nda', label: 'NDA', icon: 'gavel' },
    { key: 'idProof', label: 'ID Proof', icon: 'badge' },
    { key: 'educationalCertificate', label: 'Educational Certificate', icon: 'school' },
  ];

  const fileApiOrigin = (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');

  const handleDocFileSelect = async (docType, file) => {
    if (!file) return;
    setUploadingDoc(docType);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await hrAPI.uploadInternDocument(id, docType, fd);
      const updatedDocs = res.data?.data || res.data;
      setInternDocs(updatedDocs);
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
      const res = await hrAPI.deleteInternDocument(id, docType);
      const updatedDocs = res.data?.data || res.data;
      setInternDocs(updatedDocs || {});
      toast.success('Document removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove document');
    }
  };

  const loadLearning = async () => {
    setLearningLoading(true);
    try {
      const r = await hrAPI.getInternLearning(id);
      const d = r.data?.data || r.data;
      setLearningData({
        resources: d?.resources ?? [],
        progress:  d?.progress  ?? 0,
        total:     d?.total     ?? 0,
        completed: d?.completed ?? 0,
      });
    } catch { toast.error('Failed to load learning materials'); }
    finally { setLearningLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'learning') loadLearning();
  }, [activeTab, id]);

  const handleAssignMaterial = async (data) => {
    setAssignSaving(true);
    try {
      await hrAPI.assignInternLearning(id, data);
      toast.success('Material assigned');
      setIsAssignModalOpen(false);
      loadLearning();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to assign'); }
    finally { setAssignSaving(false); }
  };

  const handleDeleteMaterial = async (resourceId) => {
    setDeletingId(resourceId);
    try {
      await hrAPI.deleteInternLearning(id, resourceId);
      toast.success('Material removed');
      loadLearning();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to remove'); }
    finally { setDeletingId(null); }
  };

  const getIconForType = (type) => {
    switch(type) {
      case 'Video': return <Play size={16} className="text-[#DC2626]" />;
      case 'Document': return <FileText size={16} className="text-[#2563EB]" />;
      case 'Link': return <ExternalLink size={16} className="text-[#16A34A]" />;
      case 'Course': return <GraduationCap size={16} className="text-[#7C3AED]" />;
      default: return <FileText size={16} className="text-[#64748B]" />;
    }
  };

  const getBgForType = (type) => {
    switch(type) {
      case 'Video': return 'bg-[#FEF2F2]';
      case 'Document': return 'bg-[#EFF6FF]';
      case 'Link': return 'bg-[#DCFCE7]';
      case 'Course': return 'bg-[#F5F3FF]';
      default: return 'bg-slate-100';
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <HRLayout bare>
        <div className="flex justify-center items-center h-96">
          <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
        </div>
      </HRLayout>
    );
  }

  if (error) {
    return (
      <HRLayout bare>
        <div className="p-8 text-center text-[#DC2626] font-medium">{error}</div>
      </HRLayout>
    );
  }

  return (
    <HRLayout bare>
      <div className="font-sans text-[#0F172A] max-w-6xl mx-auto space-y-6 pb-20">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-[13px] text-[#64748B] font-medium pt-2">
          <button onClick={() => navigate('/hr/interns')} className="hover:text-[#2563EB] transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">school</span> Interns
          </button>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-[#0F172A]">{emp.name}</span>
        </div>

        {/* Profile Summary Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden p-6 sm:p-8 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center text-[32px] font-bold shrink-0 relative border border-[#A7F3D0]">
                {emp.name.split(' ').map(n=>n[0]).join('')}
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-[#16A34A] border-2 border-white rounded-full"></div>
              </div>
              
              {/* Name & Primary Details */}
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A] leading-none">{emp.name}</h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-[#16A34A]/10 text-[#16A34A]">
                    {emp.status}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-emerald-100 text-emerald-700">
                    {emp.type}
                  </span>
                </div>
                <p className="text-[15px] text-[#0F172A] font-medium mb-1">
                  {emp.designation} <span className="text-[#CBD5E1] mx-1">•</span> {emp.department}
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#64748B] mt-3">
                   <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">person</span>
                      Mentor: <span className="font-medium text-[#2563EB] cursor-pointer hover:underline">{emp.mentor}</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">supervisor_account</span>
                      Reporting Manager: <span className="font-medium text-[#2563EB] cursor-pointer hover:underline">{emp.reportingManager}</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">engineering</span>
                      PMO Assigned: <span className="font-medium text-[#2563EB] cursor-pointer hover:underline">{emp.pmoAssigned}</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">badge</span>
                      Assigned HR: <span className="font-medium text-[#2563EB] cursor-pointer hover:underline">{emp.hrRepresentative}</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      {emp.location}
                   </div>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-3 shrink-0">
              <button className="border border-[#E2E8F0] bg-white text-[#0F172A] px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">edit</span> Edit Profile
              </button>
              <button className="border border-[#E2E8F0] bg-white text-[#2563EB] px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">chat</span> Message
              </button>
            </div>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-6 border-b border-[#E2E8F0] px-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'overview' ? 'text-[#2563EB]' : 'text-[#64748B] hover:text-[#0F172A]'}`}
          >
            Overview
            {activeTab === 'overview' && <motion.div layoutId="hrInternTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB]" />}
          </button>
          <button 
            onClick={() => setActiveTab('learning')}
            className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'learning' ? 'text-[#2563EB]' : 'text-[#64748B] hover:text-[#0F172A]'}`}
          >
            Learning Management
            {activeTab === 'learning' && <motion.div layoutId="hrInternTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB]" />}
          </button>
          <button 
            onClick={() => setActiveTab('documents')}
            className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'documents' ? 'text-[#2563EB]' : 'text-[#64748B] hover:text-[#0F172A]'}`}
          >
            Documents
            {activeTab === 'documents' && <motion.div layoutId="hrInternTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB]" />}
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 3-Column Information Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Column 1: Identity & Education */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
                  <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                    <span className="material-symbols-outlined text-[#64748B]">badge</span>
                    Identity & Education
                  </h2>
                  <div className="space-y-5">
                    <div>
                      <span className="block text-[12px] font-medium text-[#64748B] mb-1">Intern ID</span>
                      <span className="text-[14px] font-medium text-[#0F172A] font-mono">{emp.id}</span>
                    </div>
                    <div>
                      <span className="block text-[12px] font-medium text-[#64748B] mb-1">University / College</span>
                      <span className="text-[14px] font-medium text-[#0F172A]">{emp.university}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[12px] font-medium text-[#64748B] mb-1">Domain</span>
                        <span className="text-[14px] font-medium text-[#0F172A]">{emp.domain}</span>
                      </div>
                      <div>
                        <span className="block text-[12px] font-medium text-[#64748B] mb-1">Batch</span>
                        <span className="text-[14px] font-medium text-[#0F172A]">{emp.batch}</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[12px] font-medium text-[#64748B] mb-1">Major / Degree</span>
                      <span className="text-[14px] font-medium text-[#0F172A]">{emp.major}</span>
                    </div>
                    <div>
                      <span className="block text-[12px] font-medium text-[#64748B] mb-1">Contact Details</span>
                      <div className="flex flex-col gap-1 mt-1">
                        <a href={`mailto:${emp.email}`} className="text-[13px] font-medium text-[#2563EB] hover:underline">{emp.email}</a>
                        <span className="text-[13px] font-medium text-[#0F172A]">{emp.phone}</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[12px] font-medium text-[#64748B] mb-1">Address</span>
                      <span className="text-[14px] font-medium text-[#0F172A]">{emp.address}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Mentorship & Progress */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
                  <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                    <span className="material-symbols-outlined text-[#64748B]">group</span>
                    Mentorship & Progress
                  </h2>
                  <div className="space-y-5">
                    <div>
                      <span className="block text-[12px] font-medium text-[#64748B] mb-1">Assigned Mentor</span>
                      <div className="flex items-center gap-2 mt-1 cursor-pointer group">
                        <div className="w-6 h-6 rounded-full bg-[#E2E8F0] text-[#475569] flex items-center justify-center text-[10px] font-bold">SJ</div>
                        <span className="text-[14px] font-medium text-[#2563EB] group-hover:underline">{emp.mentor}</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[12px] font-medium text-[#64748B] mb-1">Overall Progress Score</span>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex-1 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div className="h-full bg-[#10B981] w-[85%] rounded-full"></div>
                        </div>
                        <span className="text-[13px] font-bold text-[#10B981]">85%</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[12px] font-medium text-[#64748B] mb-1">Evaluations Completed</span>
                      <span className="text-[14px] font-medium text-[#0F172A]">1 of 2 (Mid-Term Done)</span>
                    </div>
                    <div>
                      <button className="text-[13px] font-medium text-[#2563EB] border border-[#2563EB] hover:bg-blue-50 px-3 py-1.5 rounded transition-colors w-full">
                        Request Final Evaluation
                      </button>
                    </div>
                  </div>
                </div>

                {/* Column 3: Internship Details */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6 relative">
                  <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                    <span className="material-symbols-outlined text-[#64748B]">work</span>
                    Internship Details
                  </h2>
                  <div className="space-y-5">
                    <div>
                      <span className="block text-[12px] font-medium text-[#64748B] mb-1">Duration</span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-[12px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                        {emp.duration} ({emp.joined} to {emp.endDate})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[12px] font-medium text-[#64748B] mb-1">Role</span>
                        <span className="text-[14px] font-medium text-[#0F172A]">{emp.role}</span>
                      </div>
                      <div>
                        <span className="block text-[12px] font-medium text-[#64748B] mb-1">Project</span>
                        <span className="text-[14px] font-medium text-[#0F172A]">{emp.project}</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[12px] font-medium text-[#64748B] mb-1">Reporting Manager / Team Lead</span>
                      <span className="text-[14px] font-medium text-[#0F172A]">{emp.reportingManager}</span>
                    </div>
                    <div>
                      <span className="block text-[12px] font-medium text-[#64748B] mb-1">PMO Assigned</span>
                      <span className="text-[14px] font-medium text-[#0F172A]">{emp.pmoAssigned}</span>
                    </div>
                    <div>
                      <span className="block text-[12px] font-medium text-[#64748B] mb-1">Annual Leave Balance</span>
                      <span className="text-[14px] font-medium text-[#16A34A] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">flight_takeoff</span>
                        {emp.leaveBalance}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[12px] font-medium text-[#64748B] mb-1">Sick Leave Balance</span>
                      <span className="text-[14px] font-medium text-[#D97706] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">medical_services</span>
                        {emp.sickLeave}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Intern Progress Timeline */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-8">
                <div className="flex justify-between items-center mb-8 border-b border-[#E2E8F0] pb-4">
                  <div>
                    <h2 className="text-[18px] font-bold text-[#0F172A]">Internship Progress Tracker</h2>
                    <p className="text-[13px] text-[#64748B] mt-1">A chronological timeline of {emp.name.split(' ')[0]}'s key milestones and evaluations.</p>
                  </div>
                  <button className="border border-[#E2E8F0] text-[#0F172A] px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">history</span> Full Event Log
                  </button>
                </div>
                
                <div className="relative pl-4 sm:pl-8">
                  <div className="absolute left-[27px] sm:left-[43px] top-4 bottom-4 w-[2px] bg-[#E2E8F0]"></div>
                  <div className="space-y-8">
                    {activityHistory.map((item, index) => (
                      <div key={item.id} className="relative flex items-start gap-6 group">
                        <div className={`w-10 h-10 rounded-full ${item.bg} ${item.color} flex items-center justify-center border-4 border-white shadow-sm relative z-10 shrink-0 group-hover:scale-110 transition-transform`}>
                          <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pt-2 gap-2">
                          <div>
                            <p className="text-[15px] font-medium text-[#0F172A]">{item.action}</p>
                            {index === 0 && <p className="text-[13px] text-[#64748B] mt-0.5">Rating: Exceeds Expectations. Noted strong problem-solving skills.</p>}
                            {index === 1 && <p className="text-[13px] text-[#64748B] mt-0.5">Score: 95%. Required module completed.</p>}
                          </div>
                          <span className="text-[13px] font-medium text-[#94A3B8] whitespace-nowrap">{item.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="relative flex items-center gap-6 mt-8">
                    <div className="w-10 h-10 flex items-center justify-center relative z-10 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-[#CBD5E1] border-2 border-white shadow-sm"></div>
                    </div>
                    <span className="text-[13px] font-medium text-[#94A3B8]">Start of Internship</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'learning' && (
            <div className="space-y-6">
              
              <div className="flex justify-between items-center bg-white border border-[#E2E8F0] p-6 rounded-xl shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A]">Assigned Learning Materials</h2>
                  <p className="text-sm text-[#64748B] mt-1">
                    {learningData.completed}/{learningData.total} completed &middot; {learningData.progress}% progress
                  </p>
                </div>
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                >
                  <UploadCloud size={18} /> Assign Material
                </button>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                {learningLoading ? (
                  <div className="flex justify-center py-12">
                    <span className="material-symbols-outlined text-[28px] text-[#2563EB] animate-spin">sync</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                          <th className="px-6 py-3 text-xs font-bold tracking-wider text-[#64748B] uppercase">Material</th>
                          <th className="px-6 py-3 text-xs font-bold tracking-wider text-[#64748B] uppercase">Assigned</th>
                          <th className="px-6 py-3 text-xs font-bold tracking-wider text-[#64748B] uppercase">Deadline</th>
                          <th className="px-6 py-3 text-xs font-bold tracking-wider text-[#64748B] uppercase">Status</th>
                          <th className="px-6 py-3 text-xs font-bold tracking-wider text-[#64748B] uppercase"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {learningData.resources.length === 0 && (
                          <tr><td colSpan="5" className="px-6 py-8 text-center text-sm text-[#64748B]">No materials assigned yet.</td></tr>
                        )}
                        {learningData.resources.map(mat => (
                          <tr key={mat._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getBgForType(mat.type)}`}>
                                  {getIconForType(mat.type)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-[#0F172A]">{mat.title}</p>
                                  <p className="text-xs text-[#64748B] mt-0.5">{mat.type}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-[#0F172A]">{formatDate(mat.createdAt)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-sm font-medium text-[#0F172A]">
                                <CalendarDays size={14} className="text-[#64748B]" />
                                {mat.dueDate ? formatDate(mat.dueDate) : '—'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {mat.status === 'Completed'   && <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-green-100 text-green-700 px-2.5 py-1 rounded"><CheckCircle size={12} /> Completed</span>}
                              {mat.status === 'In Progress' && <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2.5 py-1 rounded"><Clock size={12} /> In Progress</span>}
                              {mat.status === 'Pending'     && <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1 rounded">Pending</span>}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                disabled={deletingId === mat._id}
                                onClick={() => handleDeleteMaterial(mat._id)}
                                className="text-[#64748B] hover:text-red-600 disabled:opacity-40 transition-colors"
                                title="Remove material"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E2E8F0] p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-bold text-[#0F172A]">Intern Documents</h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Resume, Offer Letter, NDA, ID Proof &amp; Educational Certificate on file for {emp.name.split(' ')[0]}.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {DOC_TYPES.map(({ key, label, icon }) => {
                  const doc = internDocs?.[key];
                  const inputId = `doc-upload-${key}`;
                  return (
                    <div key={key} className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${doc?.filePath ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-slate-100 text-slate-400'}`}>
                          <span className="material-symbols-outlined">{icon}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#0F172A]">{label}</p>
                          {doc?.filePath ? (
                            <p className="text-xs text-[#64748B] mt-0.5 truncate max-w-[220px]">
                              {doc.fileName} &middot; {doc.uploadedAt ? formatDate(doc.uploadedAt) : ''}
                            </p>
                          ) : (
                            <p className="text-xs text-[#94A3B8] italic mt-0.5">Not uploaded yet</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {doc?.filePath && (
                          <a
                            href={`${fileApiOrigin}${doc.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#64748B] hover:text-[#2563EB] transition-colors"
                            title="View / Download"
                          >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                          </a>
                        )}
                        <label htmlFor={inputId} className="cursor-pointer text-[#64748B] hover:text-[#2563EB] transition-colors" title={doc?.filePath ? 'Replace file' : 'Upload file'}>
                          {uploadingDoc === key ? (
                            <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                          ) : (
                            <UploadCloud size={20} />
                          )}
                        </label>
                        <input
                          id={inputId}
                          type="file"
                          className="hidden"
                          disabled={uploadingDoc === key}
                          onChange={(e) => { handleDocFileSelect(key, e.target.files[0]); e.target.value = ''; }}
                        />
                        {doc?.filePath && (
                          <button
                            onClick={() => handleDocDelete(key)}
                            className="text-[#64748B] hover:text-red-600 transition-colors"
                            title="Remove document"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      <AssignMaterialModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        internName={emp.name}
        onAssign={handleAssignMaterial}
        saving={assignSaving}
      />
    </HRLayout>
  );
}
