import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import { pmoAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';
import toast from 'react-hot-toast';
import { Users, Search, X } from 'lucide-react';

function Avatar({ name = '', size = 40 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const colors = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777'];
  const bg = name ? colors[name.charCodeAt(0) % colors.length] : '#64748B';
  return (
    <div
      style={{ width: size, height: size, background: bg, borderRadius: '50%', flexShrink: 0 }}
      className="flex items-center justify-center font-bold text-white text-[13px]"
    >
      {initials}
    </div>
  );
}

const WORKLOAD_STYLES = {
  low:    { bar: 'bg-[#10B981]', text: 'text-[#059669]', bg: 'bg-[#ECFDF5]', label: 'Low' },
  medium: { bar: 'bg-[#F59E0B]', text: 'text-[#D97706]', bg: 'bg-[#FFFBEB]', label: 'Medium' },
  high:   { bar: 'bg-[#EF4444]', text: 'text-[#DC2626]', bg: 'bg-[#FEF2F2]', label: 'High' },
};

function workloadLevel(pct) {
  if (pct >= 80) return 'high';
  if (pct >= 40) return 'medium';
  return 'low';
}

export default function PMOEmployees() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const canRead = hasPermission('Users', 'read');

  const [teamData, setTeamData] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  const fetchTeam = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const res = await pmoAPI.getTeam();
      // Filter to only employee-type members (not interns or PM leads)
      const employees = (res.data.data || []).filter(
        m => m.user?.role?.slug === 'employee' || 
             m.user?.role === 'employee' || 
             (!m.user?.role?.slug?.includes('intern') && 
              !m.user?.role?.slug?.includes('pmo') && 
              !m.user?.role?.slug?.includes('hr') && 
              !m.user?.role?.slug?.includes('admin') && 
              m.user?.employmentType !== 'Intern')
      );
      setTeamData(employees);
    } catch {
      toast.error('Failed to load team employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, [canRead]);

  if (!canRead) return (
    <PageWrapper>
      <AccessDenied message="You don't have permission to view team employees." />
    </PageWrapper>
  );

  const filtered = useMemo(() => {
    if (!search) return teamData;
    const q = search.toLowerCase();
    return teamData.filter(m =>
      m.user?.name?.toLowerCase().includes(q) ||
      m.user?.designation?.toLowerCase().includes(q) ||
      m.user?.department?.name?.toLowerCase().includes(q)
    );
  }, [teamData, search]);

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] w-full flex flex-col gap-6 max-w-[1200px] mx-auto pb-12 text-left">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">Team Employees</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">Employees in your team across all active projects</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 shadow-sm w-full sm:w-auto">
            <Search size={15} className="text-[#94A3B8] shrink-0" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-[13px] outline-none flex-1 min-w-0 bg-transparent placeholder:text-[#CBD5E1]"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X size={14} className="text-[#94A3B8] hover:text-[#0F172A]" />
              </button>
            )}
          </div>
        </div>

        {/* Summary stat */}
        <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl px-5 py-3 shadow-sm w-fit">
          <Users size={16} className="text-[#2563EB]" />
          <span className="text-[13px] font-semibold text-[#0F172A]">{teamData.length} team members</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={32} className="text-[#CBD5E1] mb-3" />
            <p className="text-[14px] font-medium text-[#0F172A]">
              {search ? 'No employees match your search' : 'No team employees found'}
            </p>
            <p className="text-[12px] text-[#94A3B8] mt-1">
              {search ? 'Try a different search term.' : 'Team members will appear here once assigned to a project.'}
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(member => {
              const pct   = Math.min(Math.round((member.stats?.workload || 0)), 100);
              const level = workloadLevel(pct);
              const wl    = WORKLOAD_STYLES[level];
              return (
                <div
                  key={member.user?._id}
                  onClick={() => navigate(`/pmo/employees/${member.user?._id}`)}
                  className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#2563EB] transition-all cursor-pointer group"
                >
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={member.user?.name} size={40} />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#0F172A] truncate group-hover:text-[#2563EB] transition-colors">
                        {member.user?.name}
                      </p>
                      <p className="text-[11px] text-[#94A3B8] truncate">{member.user?.designation || 'Employee'}</p>
                    </div>
                  </div>

                  {/* Department */}
                  {(member.user?.department?.name || member.user?.department) && (
                    <div className="mb-3">
                      <span className="text-[11px] font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                        {member.user?.department?.name || member.user?.department}
                      </span>
                    </div>
                  )}

                  {/* Workload */}
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-[#94A3B8]">Workload</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${wl.bg} ${wl.text}`}>
                        {wl.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${wl.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-[#94A3B8]">{member.stats?.activeTasks || 0} active tasks</span>
                      <span className="text-[10px] text-[#64748B] font-medium">{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
