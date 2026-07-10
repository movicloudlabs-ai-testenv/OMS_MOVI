import { useNavigate } from 'react-router-dom';
import HRLayout from '../../components/hr/HRLayout';

export default function HRAddEmployee() {
  const navigate = useNavigate();

  return (
    <HRLayout bare>
      <div className="font-sans text-[#0F172A] max-w-[1000px] mx-auto flex flex-col h-full gap-8 pb-24">
        
        {/* Page Header */}
        <div className="flex flex-col gap-2 border-b border-[#E2E8F0] pb-6">
          <div className="flex items-center gap-2 text-[13px] text-[#64748B] font-medium pt-2">
            <button onClick={() => navigate('/hr/onboarding')} className="hover:text-[#2563EB] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">how_to_reg</span> Onboarding
            </button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-[#0F172A]">Submit New Hire</span>
          </div>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Submit New Hire Request</h1>
            <p className="text-[15px] text-[#64748B] mt-1">Configure identity, corporate structure, and system access for PMO approval.</p>
          </div>
        </div>

        {/* Split Layout Form Sections */}
        <div className="space-y-10 divide-y divide-[#E2E8F0]">
          
          {/* Section 1: Identity & Contact */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
            <div className="lg:col-span-1">
              <h2 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563EB]">badge</span>
                Identity & Contact
              </h2>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                Provide the user's legal name, corporate contact details, and their unique identifier. This information forms the basis of their system profile.
              </p>
            </div>
            <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Full Name <span className="text-[#DC2626]">*</span></label>
                <input type="text" className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors" placeholder="e.g. Jane Doe" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Email Address <span className="text-[#DC2626]">*</span></label>
                <input type="email" className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors" placeholder="jane.doe@movicloud.com" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Proposed Employee ID <span className="text-[#DC2626]">*</span></label>
                <input type="text" className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors" placeholder="e.g. EMP-1024" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Phone Number</label>
                <input type="tel" className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors" placeholder="+1 (555) 000-0000" />
              </div>
            </div>
          </div>

          {/* Section 2: Corporate Structure */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-10">
            <div className="lg:col-span-1">
              <h2 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563EB]">account_tree</span>
                Corporate Structure
              </h2>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                Define where the user sits within the organization. This determines their reporting lines and departmental budget.
              </p>
            </div>
            <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Department <span className="text-[#DC2626]">*</span></label>
                <div className="relative">
                  <select className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors appearance-none cursor-pointer">
                    <option value="">Select Department</option>
                    <option value="engineering">Engineering</option>
                    <option value="hr">Human Resources</option>
                    <option value="finance">Finance</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none text-[18px]">expand_more</span>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Job Title <span className="text-[#DC2626]">*</span></label>
                <input type="text" className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors" placeholder="e.g. Senior Developer" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Reporting Manager</label>
                <div className="relative">
                  <select className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors appearance-none cursor-pointer">
                    <option value="">Select Manager</option>
                    <option value="1">Sarah Johnson (Engineering)</option>
                    <option value="2">Michael Chen (Product)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none text-[18px]">expand_more</span>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Employment Type</label>
                <div className="relative">
                  <select className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors appearance-none cursor-pointer">
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contractor</option>
                    <option value="intern">Intern</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none text-[18px]">expand_more</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Requested Access & Setup */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-10">
            <div className="lg:col-span-1">
              <h2 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563EB]">security</span>
                Requested Access
              </h2>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                Propose the requested access role. The PMO will review this against the budget and departmental allocations before approving.
              </p>
            </div>
            <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Requested System Role <span className="text-[#DC2626]">*</span></label>
                  <div className="relative">
                    <select defaultValue="employee" className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors appearance-none cursor-pointer">
                      <option value="employee">Employee</option>
                      <option value="intern">Intern</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none text-[18px]">expand_more</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Requested Permission Group</label>
                  <div className="relative">
                    <select className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors appearance-none cursor-pointer">
                      <option value="default">Default Department Access</option>
                      <option value="elevated">Elevated Access</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none text-[18px]">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0]">
                <h3 className="text-[13px] font-semibold text-[#0F172A] mb-3">Onboarding Pre-Checks</h3>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input type="checkbox" defaultChecked className="peer appearance-none w-4 h-4 rounded border border-[#CBD5E1] checked:bg-[#2563EB] checked:border-[#2563EB] transition-colors cursor-pointer" />
                      <span className="material-symbols-outlined absolute text-white text-[12px] opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
                    </div>
                    <div>
                      <span className="block text-[13px] font-medium text-[#0F172A] group-hover:text-[#2563EB] transition-colors">Background Check Complete</span>
                      <span className="block text-[12px] text-[#64748B]">All reference checks and compliance requirements have been met.</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input type="checkbox" defaultChecked className="peer appearance-none w-4 h-4 rounded border border-[#CBD5E1] checked:bg-[#2563EB] checked:border-[#2563EB] transition-colors cursor-pointer" />
                      <span className="material-symbols-outlined absolute text-white text-[12px] opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
                    </div>
                    <div>
                      <span className="block text-[13px] font-medium text-[#0F172A] group-hover:text-[#2563EB] transition-colors">Offer Letter Signed</span>
                      <span className="block text-[12px] text-[#64748B]">Candidate has officially accepted the employment terms.</span>
                    </div>
                  </label>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Action Footer (Inline) */}
        <div className="flex items-center justify-between pt-8 mt-4 border-t border-[#E2E8F0]">
          <button 
            onClick={() => navigate('/hr/onboarding')}
            className="text-[14px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            Cancel Request
          </button>
          <div className="flex items-center gap-3">
            <button className="border border-[#E2E8F0] bg-white text-[#0F172A] px-5 py-2.5 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors shadow-sm">
              Save as Draft
            </button>
            <button 
              onClick={() => navigate('/hr/onboarding')}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-2.5 rounded-lg text-[13px] font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">send</span> Submit to PMO
            </button>
          </div>
        </div>

      </div>
    </HRLayout>
  );
}
