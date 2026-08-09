import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import HRLayout from '../../components/hr/HRLayout';
import { hrAPI } from '../../utils/api';
import AccessDenied from '../../components/shared/AccessDenied';
import BulkImportModal from '../../components/shared/BulkImportModal';

const STATUS_COLORS = {
  'Active': 'bg-[#16A34A]/10 text-[#16A34A]',
  'Onboarding': 'bg-[#3B82F6]/10 text-[#3B82F6]',
  'Graduated': 'bg-[#8B5CF6]/10 text-[#8B5CF6]',
  'Terminated': 'bg-[#DC2626]/10 text-[#DC2626]'
};

export default function HRInterns() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Interns', 'read');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUniversity, setFilterUniversity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInterns();
  }, [canRead]); // eslint-disable-line

  const loadInterns = async () => {
    if (!canRead) return;
    try {
      setLoading(true);
      setError('');
      const response = await hrAPI.getInterns({ page: 1, limit: 500 });
      setInterns(response.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load intern records');
    } finally {
      setLoading(false);
    }
  };

  const initialsFor = (name = '') => name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

  const getDurationString = (start, end) => {
    if (!start || !end) return '-';
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.round(diffDays / 30);
    return `${months} Month${months !== 1 ? 's' : ''}`;
  };

  // Derived unique lists for filters
  const universities = useMemo(() => [...new Set(interns.map(e => e.college).filter(Boolean))], [interns]);
  const statuses = useMemo(() => [...new Set(interns.map(e => e.status).filter(Boolean))], [interns]);
  const domains = useMemo(() => [...new Set(interns.map(e => e.domain).filter(Boolean))], [interns]);

  // Filter logic
  const filteredInterns = useMemo(() => interns.filter(emp => {
    const id = emp.employeeId || '';
    const matchesSearch = emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUniv = filterUniversity ? emp.college === filterUniversity : true;
    const matchesStatus = filterStatus ? emp.status === filterStatus : true;
    const matchesDomain = filterDomain ? emp.domain === filterDomain : true;
    
    return matchesSearch && matchesUniv && matchesStatus && matchesDomain;
  }), [interns, filterUniversity, filterStatus, filterDomain, searchTerm]);

  if (!canRead) return <HRLayout bare><AccessDenied message="You don't have permission to view interns." /></HRLayout>;

  return (
    <HRLayout bare>
      <div className="font-sans text-[#0F172A] w-full flex flex-col gap-5 max-w-[1440px] mx-auto pb-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">Intern Directory</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              View and manage intern records, university affiliations, and mentorship.
            </p>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-[280px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input
                type="text"
                placeholder="Search by name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-md py-1.5 pl-9 pr-3 text-[13px] focus:outline-none focus:border-[#2563EB] transition-colors"
              />
            </div>
            
            {/* Filters */}
            <select
              value={filterUniversity}
              onChange={(e) => setFilterUniversity(e.target.value)}
              className="border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] cursor-pointer bg-white"
            >
              <option value="">All Universities</option>
              {universities.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] cursor-pointer bg-white hidden md:block"
            >
              <option value="">All Statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="border border-[#E2E8F0] rounded-md py-1.5 px-3 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] cursor-pointer bg-white hidden lg:block"
            >
              <option value="">All Domains</option>
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {(searchTerm || filterUniversity || filterStatus || filterDomain) && (
              <button 
                onClick={() => { setSearchTerm(''); setFilterUniversity(''); setFilterStatus(''); setFilterDomain(''); }}
                className="text-[13px] text-[#2563EB] hover:underline font-medium px-2"
              >
                Clear
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button className="border border-[#E2E8F0] text-[#0F172A] px-3 py-1.5 rounded-md text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export
            </button>
            {hasPermission('Users', 'create') && (
              <button
                onClick={() => setShowBulkImport(true)}
                className="border border-[#E2E8F0] text-[#0F172A] px-3 py-1.5 rounded-md text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                Bulk Add
              </button>
            )}
            {hasPermission('Users', 'create') && (
              <button
                onClick={() => navigate('/admin/users/new?type=intern')}
                className="bg-[#2563EB] text-white px-3 py-1.5 rounded-md text-[13px] font-medium hover:bg-[#1D4ED8] transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                Add Intern
              </button>
            )}
          </div>
        </div>

        {showBulkImport && (
          <BulkImportModal
            isOpen={showBulkImport}
            onClose={() => setShowBulkImport(false)}
            onComplete={() => { setShowBulkImport(false); loadInterns(); }}
          />
        )}

        {/* TABLE VIEW */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
          {loading && (
            <div className="px-4 py-12 text-center text-[14px] text-[#64748B]">Loading intern records...</div>
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
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Intern</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">ID</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Phone</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Education</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Domain / Batch</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Mentor</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Duration</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Status</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInterns.length > 0 ? (
                  filteredInterns.map((emp) => (
                    <tr 
                      key={emp._id} 
                      className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors last:border-0 cursor-pointer"
                      onClick={() => navigate(`/hr/interns/${emp._id}`)}
                    >
                      {/* Avatar + Name + Email */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center font-bold text-[12px] shrink-0">
                            {initialsFor(emp.name)}
                          </div>
                          <div>
                            <div className="text-[14px] font-medium text-[#0F172A]">{emp.name}</div>
                            <div className="text-[12px] text-[#64748B] mt-0.5">{emp.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* ID */}
                      <td className="px-4 py-3 text-[13px] font-mono text-[#64748B]">
                        {emp.employeeId || '-'}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-[13px] text-[#64748B]">
                        {emp.phone || '-'}
                      </td>

                      {/* Education */}
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-medium text-[#0F172A]">{emp.college || '-'}</div>
                        <div className="text-[12px] text-[#64748B] mt-0.5">{emp.designation || '-'}</div>
                      </td>

                      {/* Domain / Batch */}
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-medium text-[#0F172A]">{emp.domain || '-'}</div>
                        <div className="text-[12px] text-[#64748B] mt-0.5">{emp.batch || '-'}</div>
                      </td>

                      {/* Mentor */}
                      <td className="px-4 py-3">
                        {emp.mentor ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#F1F5F9] rounded-md border border-[#E2E8F0]">
                            <span className="material-symbols-outlined text-[14px] text-[#64748B]">person</span>
                            <span className="text-[12px] font-medium text-[#0F172A]">{emp.mentor.name}</span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#94A3B8] italic">Unassigned</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 text-[13px] text-[#64748B]">
                        <span className="font-medium text-[#0F172A]">{getDurationString(emp.internshipStart, emp.internshipEnd)}</span>
                        <div className="text-[11px] mt-0.5">
                          Started: {emp.internshipStart ? new Date(emp.internshipStart).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${STATUS_COLORS[emp.status] || 'bg-slate-100 text-slate-700'}`}>
                          {emp.status}
                        </span>
                      </td>

                      {/* Actions (Always Visible) */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => navigate(`/hr/interns/${emp._id}`)}
                            className="text-[#64748B] hover:text-[#2563EB] transition-colors"
                            title="View Progress"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button 
                            className="text-[#64748B] hover:text-[#10B981] transition-colors"
                            title="Message"
                          >
                            <span className="material-symbols-outlined text-[18px]">chat</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-[#64748B]">
                        <span className="material-symbols-outlined text-[#CBD5E1] text-[32px] mb-3">search_off</span>
                        <p className="text-[14px] font-medium text-[#0F172A]">No interns found</p>
                        <p className="text-[12px] mt-1">Try adjusting your search or filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
          
          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-[#E2E8F0] bg-white flex items-center justify-between">
            <p className="text-[13px] text-[#64748B]">
              Showing <span className="font-medium text-[#0F172A]">{filteredInterns.length}</span> results
            </p>
            <div className="flex gap-1">
              <button className="p-1 border border-[#E2E8F0] rounded text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50" disabled>
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button className="p-1 border border-[#E2E8F0] rounded text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50" disabled>
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </HRLayout>
  );
}
