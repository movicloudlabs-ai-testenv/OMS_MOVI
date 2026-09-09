import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import { 
  Users, ChevronRight, MessageSquare, Mail, Phone, Calendar, 
  Network, MapPin, Briefcase, AlertCircle, ArrowLeft, Shield 
} from 'lucide-react';
import { employeeAPI } from '../../utils/api';

const ROLE_COLORS = {
  'pmo-lead':   'bg-purple-600',
  'hr-manager': 'bg-rose-500',
  'employee':   'bg-blue-600',
  'intern':     'bg-amber-500',
};
const roleColor = (slug) => ROLE_COLORS[slug] || 'bg-[#1E293B]';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

export default function EmployeeTeamDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');

    employeeAPI.getTeamMember(id)
      .then(res => {
        setMember(res.data?.data || null);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load team member details');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <span className="material-symbols-outlined text-4xl text-[#2563EB] animate-spin">sync</span>
          <p className="text-sm text-[#64748B]">Loading teammate profile…</p>
        </div>
      </PageWrapper>
    );
  }

  if (error || !member) {
    return (
      <PageWrapper>
        <div className="max-w-xl mx-auto mt-16 p-8 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm text-center font-sans">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-[#0F172A] mb-2">Teammate Not Found</h2>
          <p className="text-sm text-[#64748B] mb-6">{error || 'This teammate could not be found or you do not share any active projects with them.'}</p>
          <button
            onClick={() => navigate('/employee/team')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Team
          </button>
        </div>
      </PageWrapper>
    );
  }

  const initials = (member.name || '?')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const color = roleColor(member.role?.slug || member.roleSlug);
  const sharedProjects = member.sharedProjects || [];

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] max-w-6xl mx-auto space-y-6 pb-20">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-[13px] text-[#64748B] font-medium pt-2">
          <button onClick={() => navigate('/employee/team')} className="hover:text-[#2563EB] transition-colors flex items-center gap-1">
            <Users size={16} /> My Team
          </button>
          <ChevronRight size={16} />
          <span className="text-[#0F172A]">{member.name}</span>
        </div>

        {/* Profile Summary Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden p-6 sm:p-8 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              {/* Avatar */}
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full ${color} text-white flex items-center justify-center text-[32px] font-bold shrink-0 relative border border-[#E2E8F0] shadow-sm`}>
                {initials}
                {member.status === 'Active' && (
                  <div className="absolute bottom-1 right-1 w-4 h-4 bg-[#16A34A] border-2 border-white rounded-full"></div>
                )}
              </div>
              
              {/* Name & Primary Details */}
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A] leading-none">{member.name}</h1>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${
                    member.status === 'Active' ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {member.status || 'Active'}
                  </span>
                </div>
                <p className="text-[15px] text-[#0F172A] font-medium mb-1">
                  {member.designation || member.roleInProject || member.role?.name || 'Team Member'} 
                  <span className="text-[#CBD5E1] mx-1">•</span> 
                  {member.department?.name || 'General'}
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#64748B] mt-3">
                   {member.manager?.name && (
                     <div className="flex items-center gap-1.5">
                        <Network size={16} className="text-[#94A3B8]" />
                        Reporting to: <span className="font-medium text-[#2563EB]">{member.manager.name}</span>
                     </div>
                   )}
                   <div className="flex items-center gap-1.5">
                      <MapPin size={16} className="text-[#94A3B8]" />
                      {member.address || 'Headquarters'}
                   </div>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-3 shrink-0">
              <a 
                href={`mailto:${member.email}?subject=Message via OWMS`}
                className="border border-[#E2E8F0] bg-white text-[#2563EB] px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                <MessageSquare size={16} /> Message
              </a>
            </div>
        </div>

        {/* 3-Column Information Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1: Identity & Contact */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
            <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <Mail size={16} className="text-[#64748B]" />
              Identity & Contact
            </h2>
            <div className="space-y-5">
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Email Address</span>
                <a href={`mailto:${member.email}`} className="text-[14px] font-medium text-[#2563EB] hover:underline flex items-center gap-1.5 truncate">
                  {member.email}
                </a>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Employee ID</span>
                <span className="text-[14px] font-medium text-[#0F172A]">
                  {member.employeeId || '—'}
                </span>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Phone Number</span>
                <span className="text-[14px] font-medium text-[#0F172A] flex items-center gap-1.5">
                  <Phone size={14} className="text-[#94A3B8]" /> {member.phone || 'Not Provided'}
                </span>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Joined Organization</span>
                <span className="text-[14px] font-medium text-[#0F172A] flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#94A3B8]" /> {fmtDate(member.joinDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Corporate Structure */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
            <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <Network size={16} className="text-[#64748B]" />
              Corporate Structure
            </h2>
            <div className="space-y-5">
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Department</span>
                <span className="text-[14px] font-medium text-[#0F172A]">{member.department?.name || 'General'}</span>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Role</span>
                <span className="text-[14px] font-medium text-[#0F172A] flex items-center gap-1.5">
                  <Shield size={14} className="text-[#94A3B8]" />
                  {member.role?.name || member.designation || 'Team Member'}
                </span>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Reporting Manager</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[14px] font-medium text-[#0F172A]">
                    {member.manager?.name || 'Unassigned'}
                  </span>
                </div>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Assigned HR</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[14px] font-medium text-[#0F172A]">
                    {member.hrManager?.name || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Shared Projects */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6 relative">
            <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <Briefcase size={16} className="text-[#64748B]" />
              Shared Projects
            </h2>
            <div className="space-y-3">
              {sharedProjects.length > 0 ? (
                sharedProjects.map((project, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                    <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Briefcase size={14} />
                    </div>
                    <span className="text-[13px] font-medium text-[#0F172A]">{project}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#94A3B8]">No active shared projects</p>
              )}
            </div>

            {member.skills && member.skills.length > 0 && (
              <div className="pt-4 border-t border-[#E2E8F0]">
                <span className="block text-[12px] font-medium text-[#64748B] mb-2">Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {member.skills.map((skill, idx) => (
                    <span key={idx} className="text-[11px] font-medium bg-[#EFF6FF] text-[#2563EB] px-2.5 py-1 rounded-md">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </PageWrapper>
  );
}
