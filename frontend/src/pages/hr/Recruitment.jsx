import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import HRLayout from '../../components/hr/HRLayout';
import { hrAPI } from '../../utils/api';
import AccessDenied from '../../components/shared/AccessDenied';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  'Applied':              'bg-slate-100 text-slate-700',
  'Interview Scheduled':  'bg-[#3B82F6]/10 text-[#3B82F6]',
  'Interviewed':          'bg-[#8B5CF6]/10 text-[#8B5CF6]',
  'Selected':             'bg-[#16A34A]/10 text-[#16A34A]',
  'On Hold':              'bg-[#D97706]/10 text-[#D97706]',
  'Rejected':             'bg-[#DC2626]/10 text-[#DC2626]',
  'Joined':               'bg-[#059669]/10 text-[#059669]',
};

const RESULT_COLORS = {
  'Pending':  'bg-slate-100 text-slate-600',
  'Selected': 'bg-[#16A34A]/10 text-[#16A34A]',
  'Rejected': 'bg-[#DC2626]/10 text-[#DC2626]',
  'On Hold':  'bg-[#D97706]/10 text-[#D97706]',
};

const STATUS_OPTIONS = ['Applied', 'Interview Scheduled', 'Interviewed', 'Selected', 'On Hold', 'Rejected', 'Joined'];

const emptyForm = { name: '', email: '', phone: '', college: '', domain: '', appliedRole: '', interviewDate: '' };

export default function HRRecruitment() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Recruitment', 'read');
  const canCreate = hasPermission('Recruitment', 'create');
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadCandidates = async () => {
    if (!canRead) return;
    try {
      setLoading(true);
      setError('');
      const response = await hrAPI.getCandidates({ page: 1, limit: 500 });
      setCandidates(response.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!canRead) return;
    try {
      const res = await hrAPI.getCandidateStats();
      setStats(res.data?.data || null);
    } catch {
      // stats are a nice-to-have, fail silently
    }
  };

  useEffect(() => {
    loadCandidates();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  const initialsFor = (name = '') => name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

  const domains = useMemo(() => [...new Set(candidates.map(c => c.domain).filter(Boolean))], [candidates]);

  const filteredCandidates = useMemo(() => candidates.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.college?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus ? c.recruitmentStatus === filterStatus : true;
    const matchesDomain = filterDomain ? c.domain === filterDomain : true;
    return matchesSearch && matchesStatus && matchesDomain;
  }), [candidates, searchTerm, filterStatus, filterDomain]);

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      await hrAPI.createCandidate(form);
      toast.success('Candidate added to pipeline');
      setShowAddModal(false);
      setForm(emptyForm);
      loadCandidates();
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add candidate');
    } finally {
      setSaving(false);
    }
  };

  if (!canRead) return <HRLayout bare><AccessDenied message="You don't have permission to view the recruitment pipeline." /></HRLayout>;

  return (
    <HRLayout bare>
      <div className="font-sans text-[#0F172A] w-full flex flex-col h-full gap-5 max-w-[1440px] mx-auto pb-8">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">Recruitment Pipeline</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Track candidates from application through interview to hiring decision.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#2563EB] text-white px-4 py-2 rounded-md text-[13px] font-medium hover:bg-[#1D4ED8] transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Add Candidate
            </button>
          )}
        </div>

        {/* STATS STRIP */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard label="Total Candidates" value={stats.total || 0} icon="groups" color="#2563EB" />
            <StatCard label="Applied" value={stats.byStatus?.Applied || 0} icon="description" color="#64748B" />
            <StatCard label="Interview Scheduled" value={stats.byStatus?.['Interview Scheduled'] || 0} icon="event" color="#3B82F6" />
            <StatCard label="Selected" value={stats.byResult?.Selected || 0} icon="check_circle" color="#16A34A" />
            <StatCard label="On Hold" value={stats.byResult?.['On Hold'] || 0} icon="pause_circle" color="#D97706" />
            <StatCard label="Joined" value={stats.byStatus?.Joined || 0} icon="how_to_reg" color="#059669" />
          </div>
        )}

        {/* TOOLBAR */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative w-full sm:w-[280px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input
                type="text"
                placeholder="Search by name, email, or college..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-md py-1.5 pl-9 pr-3 text-[13px] focus:outline-none focus:border-[#2563EB] transition-colors"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] cursor-pointer bg-white"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] cursor-pointer bg-white hidden lg:block"
            >
              <option value="">All Domains</option>
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {(searchTerm || filterStatus || filterDomain) && (
              <button
                onClick={() => { setSearchTerm(''); setFilterStatus(''); setFilterDomain(''); }}
                className="text-[13px] text-[#2563EB] hover:underline font-medium px-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* TABLE VIEW */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden flex-1">
          {loading && (
            <div className="px-4 py-12 text-center text-[14px] text-[#64748B]">Loading candidates...</div>
          )}

          {!loading && error && (
            <div className="px-4 py-12 text-center">
              <p className="text-[14px] font-medium text-[#DC2626]">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Candidate</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">College</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Domain</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Applied Role</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Interview Date</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Interview Result</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Status</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.length > 0 ? (
                    filteredCandidates.map((c) => (
                      <tr
                        key={c._id}
                        className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors last:border-0 cursor-pointer"
                        onClick={() => navigate(`/hr/recruitment/${c._id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center font-bold text-[12px] shrink-0">
                              {initialsFor(c.name)}
                            </div>
                            <div>
                              <div className="text-[14px] font-medium text-[#0F172A]">{c.name}</div>
                              <div className="text-[12px] text-[#64748B] mt-0.5">{c.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#0F172A]">{c.college || '-'}</td>
                        <td className="px-4 py-3 text-[13px] text-[#0F172A]">{c.domain || '-'}</td>
                        <td className="px-4 py-3 text-[13px] text-[#0F172A]">{c.appliedRole || '-'}</td>
                        <td className="px-4 py-3 text-[13px] text-[#64748B]">
                          {c.interviewDate ? new Date(c.interviewDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${RESULT_COLORS[c.interviewResult] || 'bg-slate-100 text-slate-700'}`}>
                            {c.interviewResult}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${STATUS_COLORS[c.recruitmentStatus] || 'bg-slate-100 text-slate-700'}`}>
                            {c.recruitmentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => navigate(`/hr/recruitment/${c._id}`)}
                              className="text-[#64748B] hover:text-[#2563EB] transition-colors"
                              title="View Details"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-[#64748B]">
                          <span className="material-symbols-outlined text-[#CBD5E1] text-[32px] mb-3">search_off</span>
                          <p className="text-[14px] font-medium text-[#0F172A]">No candidates found</p>
                          <p className="text-[12px] mt-1">Try adjusting your search or filters, or add a new candidate.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 py-3 border-t border-[#E2E8F0] bg-white flex items-center justify-between">
            <p className="text-[13px] text-[#64748B]">
              Showing <span className="font-medium text-[#0F172A]">{filteredCandidates.length}</span> results
            </p>
          </div>
        </div>
      </div>

      {/* ADD CANDIDATE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[16px] font-bold text-[#0F172A] mb-4">Add Candidate</h2>
            <form onSubmit={handleAddCandidate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Full Name *" value={form.name} onChange={(v) => setForm(p => ({ ...p, name: v }))} placeholder="Candidate name" />
                <FormField label="Email *" type="email" value={form.email} onChange={(v) => setForm(p => ({ ...p, email: v }))} placeholder="candidate@email.com" />
                <FormField label="Phone" value={form.phone} onChange={(v) => setForm(p => ({ ...p, phone: v }))} placeholder="+91 98765 43210" />
                <FormField label="College" value={form.college} onChange={(v) => setForm(p => ({ ...p, college: v }))} placeholder="College name" />
                <FormField label="Domain / Technology" value={form.domain} onChange={(v) => setForm(p => ({ ...p, domain: v }))} placeholder="e.g. Frontend" />
                <FormField label="Applied Role" value={form.appliedRole} onChange={(v) => setForm(p => ({ ...p, appliedRole: v }))} placeholder="e.g. Frontend Intern" />
                <FormField label="Interview Date" type="date" value={form.interviewDate} onChange={(v) => setForm(p => ({ ...p, interviewDate: v }))} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-md text-[13px] font-medium text-[#64748B] hover:bg-[#F1F5F9]">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-md text-[13px] font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60">
                  {saving ? 'Saving...' : 'Add Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </HRLayout>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-sm flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1A`, color }}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[18px] font-bold text-[#0F172A] leading-tight">{value}</p>
        <p className="text-[11px] text-[#64748B] truncate">{label}</p>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[#0F172A] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]"
      />
    </div>
  );
}
