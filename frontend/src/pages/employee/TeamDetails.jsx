import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import {
  Users,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  Network,
  MapPin,
  Briefcase,
  AlertCircle,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import { employeeAPI } from '../../utils/api';

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const getAvatarInitials = (name) => {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

export default function EmployeeTeamDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError('No teammate ID specified.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    employeeAPI
      .getTeamMember(id)
      .then((res) => {
        const data = res.data?.data || res.data;
        setUser(data);
      })
      .catch((err) => {
        const msg =
          err.response?.data?.message || 'Failed to load team member details';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-32 space-y-4 font-sans">
          <span className="material-symbols-outlined text-[40px] text-[#2563EB] animate-spin">
            sync
          </span>
          <p className="text-sm text-[#64748B]">Loading teammate profile…</p>
        </div>
      </PageWrapper>
    );
  }

  if (error || !user) {
    return (
      <PageWrapper>
        <div className="font-sans text-[#0F172A] max-w-xl mx-auto py-24 px-4 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-sm">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A] mb-2">
            Teammate Not Found
          </h2>
          <p className="text-sm text-[#64748B] mb-6 max-w-md mx-auto">
            {error ||
              'Unable to view this profile. You may only view colleagues with whom you share an active project.'}
          </p>
          <button
            onClick={() => navigate('/employee/team')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm"
          >
            <ArrowLeft size={16} /> Back to My Team
          </button>
        </div>
      </PageWrapper>
    );
  }

  const deptName =
    typeof user.department === 'object'
      ? user.department?.name
      : user.department || 'General';
  const roleName =
    user.role?.name ||
    (typeof user.role === 'string' ? user.role : 'Employee');
  const designationName =
    user.designation || user.roleInProject || roleName || 'Team Member';
  const managerName =
    user.manager?.name ||
    (typeof user.manager === 'string' ? user.manager : null);
  const hrName =
    user.hrManager?.name ||
    (typeof user.hrManager === 'string' ? user.hrManager : null);
  const sharedProjects = Array.isArray(user.sharedProjects)
    ? user.sharedProjects
    : [];

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] max-w-6xl mx-auto space-y-6 pb-20 mt-4 px-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-[13px] text-[#64748B] font-medium pt-2">
          <button
            onClick={() => navigate('/employee/team')}
            className="hover:text-[#2563EB] transition-colors flex items-center gap-1"
          >
            <Users size={16} /> My Team
          </button>
          <ChevronRight size={16} />
          <span className="text-[#0F172A] font-semibold">{user.name}</span>
        </div>

        {/* Profile Summary Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden p-6 sm:p-8 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-[30px] font-bold shrink-0 relative border border-[#E2E8F0] shadow-sm">
              {getAvatarInitials(user.name)}
              <div
                className={`absolute bottom-1 right-1 w-4 h-4 ${
                  user.status === 'Inactive' ? 'bg-[#94A3B8]' : 'bg-[#16A34A]'
                } border-2 border-white rounded-full`}
                title={user.status || 'Active'}
              />
            </div>

            {/* Name & Primary Details */}
            <div>
              <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight text-[#0F172A] leading-none">
                  {user.name}
                </h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${
                    user.status === 'Inactive'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-[#16A34A]/10 text-[#16A34A]'
                  }`}
                >
                  {user.status || 'Active'}
                </span>
              </div>
              <p className="text-[15px] text-[#0F172A] font-medium mb-1">
                {designationName}{' '}
                <span className="text-[#CBD5E1] mx-1">•</span> {deptName}
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#64748B] mt-3">
                <div className="flex items-center gap-1.5">
                  <Network size={16} className="text-[#94A3B8]" />
                  Reporting to:{' '}
                  <span className="font-medium text-[#2563EB]">
                    {managerName || 'Not Assigned'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-[#94A3B8]" />
                  {user.location || 'Remote / Office'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3 shrink-0">
            {user.email ? (
              <a
                href={`mailto:${user.email}`}
                className="border border-[#E2E8F0] bg-white text-[#2563EB] px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Mail size={16} /> Send Email
              </a>
            ) : null}
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
            <div className="space-y-4">
              {user.employeeId && (
                <div>
                  <span className="block text-[12px] font-medium text-[#64748B] mb-1">
                    Employee ID
                  </span>
                  <span className="text-[14px] font-medium text-[#0F172A]">
                    {user.employeeId}
                  </span>
                </div>
              )}
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">
                  Email Address
                </span>
                {user.email ? (
                  <a
                    href={`mailto:${user.email}`}
                    className="text-[14px] font-medium text-[#2563EB] hover:underline flex items-center gap-1.5 truncate"
                  >
                    {user.email}
                  </a>
                ) : (
                  <span className="text-[14px] text-[#94A3B8]">Not provided</span>
                )}
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">
                  Phone Number
                </span>
                <span className="text-[14px] font-medium text-[#0F172A] flex items-center gap-1.5">
                  <Phone size={14} className="text-[#94A3B8]" />{' '}
                  {user.phone || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">
                  Joined Organization
                </span>
                <span className="text-[14px] font-medium text-[#0F172A] flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#94A3B8]" />{' '}
                  {fmtDate(user.joinDate || user.createdAt)}
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
            <div className="space-y-4">
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">
                  Department
                </span>
                <span className="text-[14px] font-medium text-[#0F172A]">
                  {deptName}
                </span>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">
                  Role Permission
                </span>
                <span className="text-[14px] font-medium text-[#0F172A] flex items-center gap-1.5">
                  <Shield size={14} className="text-[#94A3B8]" /> {roleName}
                </span>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">
                  Reporting Manager
                </span>
                <span className="text-[14px] font-medium text-[#0F172A]">
                  {managerName || 'Not Assigned'}
                </span>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">
                  Assigned HR
                </span>
                <span className="text-[14px] font-medium text-[#0F172A]">
                  {hrName || 'Not Assigned'}
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: Shared Projects */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6 relative">
            <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <Briefcase size={16} className="text-[#64748B]" />
              Shared Projects ({sharedProjects.length})
            </h2>
            <div className="space-y-3">
              {sharedProjects.length === 0 ? (
                <p className="text-xs text-[#94A3B8] italic">
                  No active shared projects.
                </p>
              ) : (
                sharedProjects.map((project, index) => {
                  const projectName =
                    typeof project === 'string'
                      ? project
                      : project?.name || 'Project';
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                    >
                      <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Briefcase size={14} />
                      </div>
                      <span className="text-[13px] font-medium text-[#0F172A] truncate">
                        {projectName}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
