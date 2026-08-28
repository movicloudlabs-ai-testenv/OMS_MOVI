import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import { pmoAPI } from '../../utils/api';

export default function PMOEmployeeDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await pmoAPI.getEmployee(id);
        setEmployee(res.data?.data || null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const initials = useMemo(() => {
    return (employee?.name || '')
      .split(' ').filter(Boolean).slice(0, 2)
      .map(p => p[0].toUpperCase()).join('') || '?';
  }, [employee?.name]);

  const emp = useMemo(() => {
    if (!employee) return null;
    const leave = employee.leaveBalance || {};
    const annualRemaining = Math.max((leave.annual?.total || 0) - (leave.annual?.used || 0), 0);
    const sickRemaining = Math.max((leave.sick?.total || 0) - (leave.sick?.used || 0), 0);
    return {
      id: employee.employeeId || '-',
      name: employee.name,
      email: employee.email,
      phone: employee.phone || '-',
      department: employee.department?.name || '-',
      designation: employee.designation || '-',
      type: employee.employmentType || '-',
      status: employee.status || '-',
      joined: employee.joinDate
        ? new Date(employee.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '-',
      manager: employee.manager?.name || 'Unassigned',
      hrRepresentative: employee.hrManager?.name || 'Unassigned',
      location: employee.address || '-',
      leaveBalance: `${annualRemaining} Days (Annual)`,
      sickLeave: `${sickRemaining} Days (Sick)`,
    };
  }, [employee]);

  const activityHistory = useMemo(() => {
    return (employee?.notes || []).slice().reverse().slice(0, 5).map((note, i) => ({
      id: note._id || `${i}`,
      action: note.text,
      time: new Date(note.createdAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      icon: 'description',
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    }));
  }, [employee]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="font-sans text-[#0F172A] max-w-6xl mx-auto py-10 text-[14px] text-[#64748B]">
          Loading profile...
        </div>
      </PageWrapper>
    );
  }

  if (error || !emp) {
    return (
      <PageWrapper>
        <div className="font-sans text-[#0F172A] max-w-6xl mx-auto py-10">
          <p className="text-[14px] font-medium text-[#DC2626]">{error || 'Profile not found'}</p>
          <button onClick={() => navigate(-1)}
            className="mt-4 border border-[#E2E8F0] bg-white text-[#0F172A] px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors">
            Go Back
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] max-w-6xl mx-auto space-y-6 pb-20">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px] text-[#64748B] font-medium pt-2">
          <button onClick={() => navigate(-1)} className="hover:text-[#2563EB] transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back
          </button>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-[#0F172A]">{emp.name}</span>
        </div>

        {/* Profile Summary Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden p-6 sm:p-8 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center text-[32px] font-bold shrink-0 relative border border-[#E2E8F0]">
              {initials}
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-[#16A34A] border-2 border-white rounded-full"></div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A] leading-none">{emp.name}</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-[#16A34A]/10 text-[#16A34A]">{emp.status}</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-blue-100 text-blue-700">{emp.type}</span>
              </div>
              <p className="text-[15px] text-[#0F172A] font-medium mb-1">
                {emp.designation} <span className="text-[#CBD5E1] mx-1">•</span> {emp.department}
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#64748B] mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  Reporting to: <span className="font-medium text-[#2563EB]">{emp.manager}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">badge</span>
                  Assigned HR: <span className="font-medium text-[#2563EB]">{emp.hrRepresentative}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                  {emp.location}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Identity & Contact */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
            <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <span className="material-symbols-outlined text-[#64748B]">badge</span> Identity & Contact
            </h2>
            <div className="space-y-5">
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Employee ID</span>
                <span className="text-[14px] font-medium text-[#0F172A] font-mono">{emp.id}</span>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Email Address</span>
                <a href={`mailto:${emp.email}`} className="text-[14px] font-medium text-[#2563EB] hover:underline flex items-center gap-1.5">
                  {emp.email} <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Phone Number</span>
                <span className="text-[14px] font-medium text-[#0F172A]">{emp.phone}</span>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Joined Organization</span>
                <span className="text-[14px] font-medium text-[#0F172A]">{emp.joined}</span>
              </div>
            </div>
          </div>

          {/* Corporate Structure */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
            <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <span className="material-symbols-outlined text-[#64748B]">account_tree</span> Corporate Structure
            </h2>
            <div className="space-y-5">
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Department</span>
                <span className="text-[14px] font-medium text-[#0F172A]">{emp.department}</span>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Reporting Manager (PMO Lead)</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-full bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center text-[10px] font-bold">
                    {emp.manager.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <span className="text-[14px] font-medium text-[#0F172A]">{emp.manager}</span>
                </div>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Assigned HR</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-full bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center text-[10px] font-bold">
                    {emp.hrRepresentative.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <span className="text-[14px] font-medium text-[#0F172A]">{emp.hrRepresentative}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
            <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <span className="material-symbols-outlined text-[#64748B]">work</span> Employment Details
            </h2>
            <div className="space-y-5">
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Employment Type</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded text-[12px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">{emp.type}</span>
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

        {/* Activity Timeline */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-8">
          <div className="flex justify-between items-center mb-8 border-b border-[#E2E8F0] pb-4">
            <div>
              <h2 className="text-[18px] font-bold text-[#0F172A]">Activity Story</h2>
              <p className="text-[13px] text-[#64748B] mt-1">Recent events and records for {emp.name.split(' ')[0]}.</p>
            </div>
          </div>
          <div className="relative pl-4 sm:pl-8">
            <div className="absolute left-[27px] sm:left-[43px] top-4 bottom-4 w-[2px] bg-[#E2E8F0]"></div>
            <div className="space-y-8">
              {activityHistory.length > 0 ? activityHistory.map((item, index) => (
                <div key={item.id} className="relative flex items-start gap-6 group">
                  <div className={`w-10 h-10 rounded-full ${item.bg} ${item.color} flex items-center justify-center border-4 border-white shadow-sm relative z-10 shrink-0 group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pt-2 gap-2">
                    <p className="text-[15px] font-medium text-[#0F172A]">{item.action}</p>
                    <span className="text-[13px] font-medium text-[#94A3B8] whitespace-nowrap">{item.time}</span>
                  </div>
                </div>
              )) : (
                <p className="text-[13px] text-[#64748B]">No recent activity records.</p>
              )}
            </div>
            <div className="relative flex items-center gap-6 mt-8">
              <div className="w-10 h-10 flex items-center justify-center relative z-10 shrink-0">
                <div className="w-3 h-3 rounded-full bg-[#CBD5E1] border-2 border-white shadow-sm"></div>
              </div>
              <span className="text-[13px] font-medium text-[#94A3B8]">End of recent records</span>
            </div>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
