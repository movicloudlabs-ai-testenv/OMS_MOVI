import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import { Users, ChevronRight, MessageSquare, Mail, Phone, Calendar, Network, MapPin, Briefcase } from 'lucide-react';

export default function EmployeeTeamDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock User Data based on Team.jsx mock data
  const user = {
    id: id || 'tm001',
    name: 'Sarah Connor',
    email: 'sarah.connor@movicloudlabs.com',
    phone: '+1 (555) 987-6543',
    department: 'Product',
    designation: 'Product Manager',
    role: 'Admin',
    status: 'Active',
    joined: 'January 15, 2022',
    manager: 'Michael Chen',
    hrRepresentative: 'Amanda Reed',
    location: 'San Francisco, CA (HQ)',
    sharedProjects: ['OWMS Internal Platform v2', 'Data Pipeline Automation']
  };

  const getAvatarInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2);
  };

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] max-w-6xl mx-auto space-y-6 pb-20">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-[13px] text-[#64748B] font-medium pt-2">
          <button onClick={() => navigate('/employee/team')} className="hover:text-[#2563EB] transition-colors flex items-center gap-1">
            <Users size={16} /> My Team
          </button>
          <ChevronRight size={16} />
          <span className="text-[#0F172A]">{user.name}</span>
        </div>

        {/* Profile Summary Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden p-6 sm:p-8 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-[32px] font-bold shrink-0 relative border border-[#E2E8F0] shadow-sm">
                {getAvatarInitials(user.name)}
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-[#16A34A] border-2 border-white rounded-full"></div>
              </div>
              
              {/* Name & Primary Details */}
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A] leading-none">{user.name}</h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-[#16A34A]/10 text-[#16A34A]">
                    {user.status}
                  </span>
                </div>
                <p className="text-[15px] text-[#0F172A] font-medium mb-1">
                  {user.designation} <span className="text-[#CBD5E1] mx-1">•</span> {user.department}
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#64748B] mt-3">
                   <div className="flex items-center gap-1.5">
                      <Network size={16} className="text-[#94A3B8]" />
                      Reporting to: <span className="font-medium text-[#2563EB] cursor-pointer hover:underline">{user.manager}</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <MapPin size={16} className="text-[#94A3B8]" />
                      {user.location}
                   </div>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-3 shrink-0">
              <button className="border border-[#E2E8F0] bg-white text-[#2563EB] px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-sm">
                <MessageSquare size={16} /> Message
              </button>
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
                <a href={`mailto:${user.email}`} className="text-[14px] font-medium text-[#2563EB] hover:underline flex items-center gap-1.5">
                  {user.email}
                </a>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Phone Number</span>
                <span className="text-[14px] font-medium text-[#0F172A] flex items-center gap-1.5">
                  <Phone size={14} className="text-[#94A3B8]" /> {user.phone}
                </span>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Joined Organization</span>
                <span className="text-[14px] font-medium text-[#0F172A] flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#94A3B8]" /> {user.joined}
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
                <span className="text-[14px] font-medium text-[#0F172A]">{user.department}</span>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Reporting Manager</span>
                <div className="flex items-center gap-2 mt-1 cursor-pointer group">
                  <div className="w-6 h-6 rounded-full bg-[#E2E8F0] text-[#475569] flex items-center justify-center text-[10px] font-bold">MC</div>
                  <span className="text-[14px] font-medium text-[#2563EB] group-hover:underline">{user.manager}</span>
                </div>
              </div>
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] mb-1">Assigned HR</span>
                <div className="flex items-center gap-2 mt-1 cursor-pointer group">
                  <div className="w-6 h-6 rounded-full bg-[#E2E8F0] text-[#475569] flex items-center justify-center text-[10px] font-bold">AR</div>
                  <span className="text-[14px] font-medium text-[#2563EB] group-hover:underline">{user.hrRepresentative}</span>
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
              {user.sharedProjects.map((project, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                  <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Briefcase size={14} />
                  </div>
                  <span className="text-[13px] font-medium text-[#0F172A]">{project}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </PageWrapper>
  );
}
