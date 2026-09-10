import { useState, useEffect } from 'react';
import PageWrapper from '../../components/PageWrapper';
import { Search, Mail, Briefcase, Users } from 'lucide-react';
import { employeeAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';

const ROLE_COLORS = {
  'pmo-lead':   'bg-purple-600',
  'hr-manager': 'bg-rose-500',
  'employee':   'bg-blue-600',
  'intern':     'bg-amber-500',
};
const roleColor = (slug) => ROLE_COLORS[slug] || 'bg-slate-500';

export default function EmployeeTeam() {
  const [team,    setTeam]    = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    employeeAPI.getTeam()
      .then(r => setTeam(r.data?.data || []))
      .catch(() => toast.error('Failed to load team'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = team.filter(m =>
    !search ||
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.designation?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-6 px-6 mt-6 pb-10 font-sans">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
              <Users size={22} className="text-[#2563EB]" /> My Team
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              {loading ? 'Loading…' : `${team.length} colleague${team.length !== 1 ? 's' : ''} across your projects`}
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search teammates…"
              className="w-full pl-9 pr-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#2563EB]" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[#64748B]">
            {search ? 'No teammates match your search.' : 'No teammates yet — your PMO lead will add team members to your project.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(member => {
              const initials = (member.name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
              const color    = roleColor(member.role?.slug || member.roleSlug);
              const projects = member.sharedProjects || [];
              return (
                <div key={member._id} className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#CBD5E1] transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full ${color} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#0F172A] truncate">{member.name}</h3>
                      <p className="text-xs text-[#64748B] truncate">{member.designation || member.roleInProject || 'Team Member'}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-[#64748B]">
                    {member.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail size={12} className="shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                    {member.roleInProject && (
                      <div className="flex items-center gap-2">
                        <Briefcase size={12} className="shrink-0" />
                        <span>{member.roleInProject}</span>
                      </div>
                    )}
                    {member.joinDate && (
                      <p className="text-[11px] text-[#94A3B8]">Joined {fmtDate(member.joinDate)}</p>
                    )}
                  </div>

                  {projects.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex flex-wrap gap-1">
                      {projects.map((p, i) => (
                        <span key={i} className="text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded truncate max-w-[160px]">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
