import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import DynamicLayout from '../../components/shared/DynamicLayout';
import AccessDenied from '../../components/shared/AccessDenied';
import { adminAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const Field = ({ label, required, hint, children }) => (
  <div>
    <label className="block text-[12px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
      {label}{required && <span className="text-[#DC2626] ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-[11px] text-[#94A3B8] mt-1">{hint}</p>}
  </div>
);

const SelectWrapper = ({ children }) => (
  <div className="relative">
    {children}
    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none text-[18px]">expand_more</span>
  </div>
);

const SectionHeader = ({ number, icon, title, desc }) => (
  <div className="lg:col-span-1">
    <div className="flex items-center gap-2 mb-3">
      <span className="w-6 h-6 rounded-full bg-[#EA580C] text-white text-[11px] font-bold flex items-center justify-center shrink-0">{number}</span>
      <span className="material-symbols-outlined text-[#EA580C] text-[20px]">{icon}</span>
      <h2 className="text-[15px] font-bold text-[#0F172A]">{title}</h2>
    </div>
    <p className="text-[13px] text-[#64748B] leading-relaxed pl-8">{desc}</p>
  </div>
);

const EMP_TYPES = [
  { value: 'Full-time', label: 'Full-time',  icon: 'work',       desc: 'Permanent employee' },
  { value: 'Part-time', label: 'Part-time',  icon: 'schedule',   desc: 'Reduced hours'      },
  { value: 'Contract',  label: 'Contract',   icon: 'handshake',  desc: 'Fixed-term contract' },
  { value: 'Intern',    label: 'Intern',     icon: 'school',     desc: 'Internship program'  },
];

export default function AdminCreateUser() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetType = searchParams.get('type'); // 'employee' | 'intern' — set by HR "Add Employee"/"Add Intern" buttons
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('Users', 'create');

  const [formData, setFormData] = useState({
    name:                  '',
    email:                 '',
    employeeId:            '',
    phone:                 '',
    department:            '',
    designation:           '',
    manager:               '',
    hrManager:             '',
    employmentType:        presetType === 'intern' ? 'Intern' : 'Full-time',
    role:                  '',
    joinDate:              '',
    college:               '',
    domain:                '',
    batch:                 '',
    pmoLead:               '',
    internshipStart:       '',
    internshipEnd:         '',
    generatePassword:      true,
    sendInvite:            true,
    requirePasswordChange: true,
  });

  const [roles, setRoles]             = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers]       = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [deptLoading, setDeptLoading]   = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    adminAPI.getRoles()
      .then(r => {
        const fetchedRoles = r.data.data || [];
        setRoles(fetchedRoles);
        // Set default role to the first role if not already selected
        if (fetchedRoles.length > 0 && !formData.role) {
          setFormData(prev => ({ ...prev, role: fetchedRoles[0]._id }));
        }
      })
      .catch(() => setRoles([]))
      .finally(() => setRolesLoading(false));

    adminAPI.getDepartments()
      .then(r => setDepartments(r.data.data || []))
      .catch(() => setDepartments([]))
      .finally(() => setDeptLoading(false));

    adminAPI.getUsers({ status: 'Active', limit: 100 })
      .then(r => setManagers(r.data.data || []))
      .catch(() => setManagers([]));
  }, []);

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isIntern = formData.employmentType === 'Intern';

  const validateForm = () => {
    if (!formData.name.trim())  { setSubmitError('Full name is required.'); return false; }
    if (!formData.email.trim()) { setSubmitError('Email address is required.'); return false; }
    if (roles.length > 0 && !formData.role) { setSubmitError('System role is required.'); return false; }
    if (!formData.department)   { setSubmitError('Department is required.'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = {
        name:           formData.name.trim(),
        email:          formData.email.trim(),
        phone:          formData.phone || undefined,
        role:           formData.role,
        department:     formData.department,
        designation:    formData.designation || undefined,
        employmentType: formData.employmentType,
        manager:        formData.manager || undefined,
        hrManager:      formData.hrManager || undefined,
        ...(isIntern ? {
          college:         formData.college || undefined,
          domain:          formData.domain || undefined,
          batch:           formData.batch || undefined,
          pmoLead:         formData.pmoLead || undefined,
          internshipStart: formData.internshipStart || undefined,
          internshipEnd:   formData.internshipEnd || undefined,
        } : {
          joinDate: formData.joinDate || undefined,
        }),
      };
      const res = await adminAPI.createUser(payload);
      if (res.data?.data?.warning) toast?.error?.(res.data.data.warning);
      toast.success(isIntern ? 'Intern added successfully' : 'Employee added successfully');
      navigate(returnPath);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to create user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[13px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/10 transition-colors bg-white';
  const selectCls = `${inputCls} appearance-none cursor-pointer`;

  const returnPath  = presetType === 'intern' ? '/hr/interns' : presetType === 'employee' ? '/hr/employees' : '/admin/users';
  const returnLabel = presetType === 'intern' ? 'Interns' : presetType === 'employee' ? 'Employees' : 'Users';

  const selectedRole = roles.find(r => r._id === formData.role);

  if (!canCreate) return <DynamicLayout bare><AccessDenied message="You don't have permission to create users." /></DynamicLayout>;

  return (
    <DynamicLayout bare>
      <form onSubmit={handleSubmit} className="font-sans text-[#0F172A] max-w-[1040px] mx-auto flex flex-col gap-8 pb-24">

        {/* Header */}
        <div className="border-b border-[#E2E8F0] pb-5">
          <div className="flex items-center gap-1.5 text-[12px] text-[#64748B] mb-3">
            <button type="button" onClick={() => navigate(returnPath)} className="hover:text-[#EA580C] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">group</span> {returnLabel}
            </button>
            <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            <span className="text-[#0F172A] font-medium">Onboard New User</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-bold tracking-tight text-[#0F172A]">Onboard New User</h1>
              <p className="text-[14px] text-[#64748B] mt-1">Set up identity, organization structure, and system access for a new team member.</p>
            </div>
            {/* Step indicators */}
            <div className="hidden sm:flex items-center gap-2 shrink-0 mt-1">
              {['Identity', 'Structure', 'Access'].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#FFF7ED] border border-[#EA580C] text-[#EA580C] text-[10px] font-bold flex items-center justify-center">{i + 1}</div>
                    <span className="text-[11px] font-semibold text-[#64748B]">{s}</span>
                  </div>
                  {i < 2 && <span className="text-[#CBD5E1] text-[14px]">›</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {submitError && (
          <div className="bg-[#FEF2F2] border border-[#DC2626]/30 rounded-xl p-4 text-[13px] text-[#DC2626] font-medium flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
            {submitError}
          </div>
        )}

        <div className="space-y-0 divide-y divide-[#E2E8F0]">

          {/* ── SECTION 1: Identity & Contact ─────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8">
            <SectionHeader
              number="1" icon="badge" title="Identity & Contact"
              desc="The user's legal name and corporate email. Phone and address can be filled by the employee through their profile settings."
            />
            <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <Field label="Full Name" required>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">person</span>
                      <input type="text" className={`${inputCls} pl-10`} placeholder="e.g. Jane Doe" value={formData.name} onChange={set('name')} />
                    </div>
                  </Field>
                </div>
                <Field label="Work Email" required>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">mail</span>
                    <input type="email" className={`${inputCls} pl-10`} placeholder="jane@movicloud.com" value={formData.email} onChange={set('email')} />
                  </div>
                </Field>
                <Field label="Employee ID" hint="Leave blank to auto-generate (e.g. EMP-2025-001)">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">tag</span>
                    <input type="text" className={`${inputCls} pl-10 font-mono`} placeholder="Auto-generated" value={formData.employeeId} onChange={set('employeeId')} />
                  </div>
                </Field>
                <Field label="Phone Number" hint="Optional — employee can update via settings">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">call</span>
                    <input type="tel" className={`${inputCls} pl-10`} placeholder="+91 98765 43210" value={formData.phone} onChange={set('phone')} />
                  </div>
                </Field>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: Corporate Structure ────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8">
            <SectionHeader
              number="2" icon="account_tree" title="Corporate Structure"
              desc="Where this person fits in the organization — their team, title, employment type, and who they report to."
            />
            <div className="lg:col-span-2 space-y-5">

              {/* Employment Type — button group */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm px-6 py-5">
                <p className="text-[12px] font-semibold text-[#475569] uppercase tracking-wide mb-3">Employment Type <span className="text-[#DC2626]">*</span></p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {EMP_TYPES.map(({ value, label, icon, desc }) => {
                    const active = formData.employmentType === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, employmentType: value }))}
                        className={`flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-xl border-2 text-center transition-all ${
                          active
                            ? 'border-[#EA580C] bg-[#FFF7ED] shadow-sm'
                            : 'border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[22px] ${active ? 'text-[#EA580C]' : 'text-[#94A3B8]'}`}>{icon}</span>
                        <span className={`text-[12px] font-semibold ${active ? 'text-[#EA580C]' : 'text-[#475569]'}`}>{label}</span>
                        <span className="text-[10px] text-[#94A3B8] leading-snug">{desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dept + Designation + Date */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Department" required>
                  <SelectWrapper>
                    <select className={selectCls} value={formData.department} onChange={set('department')} required>
                      <option value="">{deptLoading ? 'Loading...' : 'Select Department'}</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </SelectWrapper>
                </Field>
                <Field label="Job Title / Designation">
                  <input type="text" className={inputCls} placeholder={isIntern ? 'e.g. Engineering Intern' : 'e.g. Senior Developer'} value={formData.designation} onChange={set('designation')} />
                </Field>
                {isIntern ? (
                  <>
                    <Field label="College / Institution" hint="University or college name">
                      <input type="text" className={inputCls} placeholder="e.g. IIT Madras" value={formData.college} onChange={set('college')} />
                    </Field>
                    <Field label="Domain" hint="e.g. Frontend, Backend, Data Science">
                      <input type="text" className={inputCls} placeholder="e.g. Frontend Development" value={formData.domain} onChange={set('domain')} />
                    </Field>
                    <Field label="Batch" hint="e.g. 2026 Summer, Jan-2026">
                      <input type="text" className={inputCls} placeholder="e.g. 2026 Summer Batch" value={formData.batch} onChange={set('batch')} />
                    </Field>
                    <div /> {/* spacer */}
                    <Field label="Internship Start Date">
                      <input type="date" className={inputCls} value={formData.internshipStart} onChange={set('internshipStart')} />
                    </Field>
                    <Field label="Internship End Date">
                      <input type="date" className={inputCls} value={formData.internshipEnd} onChange={set('internshipEnd')} />
                    </Field>
                  </>
                ) : (
                  <Field label="Join Date" hint="Date the employee officially joined the organization">
                    <input type="date" className={inputCls} value={formData.joinDate} onChange={set('joinDate')} />
                  </Field>
                )}
              </div>

              {/* Reporting */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Reporting Manager" hint="Who this person directly reports to">
                  <SelectWrapper>
                    <select className={selectCls} value={formData.manager} onChange={set('manager')}>
                      <option value="">Select Manager (optional)</option>
                      {managers.filter(m => m._id !== formData.email).map(m => (
                        <option key={m._id} value={m._id}>{m.name} — {m.department?.name || m.role?.name || ''}</option>
                      ))}
                    </select>
                  </SelectWrapper>
                </Field>
                <Field label="HR Manager" hint="The HR contact responsible for this user">
                  <SelectWrapper>
                    <select className={selectCls} value={formData.hrManager} onChange={set('hrManager')}>
                      <option value="">Select HR Manager (optional)</option>
                      {managers.map(m => (
                        <option key={m._id} value={m._id}>{m.name} — {m.role?.name || ''}</option>
                      ))}
                    </select>
                  </SelectWrapper>
                </Field>
                {isIntern && (
                  <Field label="PMO Assigned" hint="The PMO lead overseeing this intern's project work">
                    <SelectWrapper>
                      <select className={selectCls} value={formData.pmoLead} onChange={set('pmoLead')}>
                        <option value="">Select PMO Lead (optional)</option>
                        {managers.map(m => (
                          <option key={m._id} value={m._id}>{m.name} — {m.role?.name || ''}</option>
                        ))}
                      </select>
                    </SelectWrapper>
                  </Field>
                )}
              </div>

            </div>
          </div>

          {/* ── SECTION 3: Access & Security ─────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8">
            <SectionHeader
              number="3" icon="security" title="Access & Security"
              desc="Assign a system role that determines what this user can view and action within OWMS. Choose carefully — roles control all module access."
            />
            <div className="lg:col-span-2 space-y-5">

              {/* Role selector */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm px-6 py-5">
                <Field label="System Role" required>
                  <SelectWrapper>
                    <select className={selectCls} value={formData.role} onChange={set('role')} required>
                      <option value="">{rolesLoading ? 'Loading roles...' : 'Select a system role'}</option>
                      {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                    </select>
                  </SelectWrapper>
                </Field>
                {selectedRole && (
                  <div className="mt-3 flex items-start gap-2.5 bg-[#FFF7ED] border border-[#BFDBFE] rounded-lg px-3.5 py-3">
                    <span className="material-symbols-outlined text-[#EA580C] text-[18px] shrink-0 mt-0.5">shield</span>
                    <div>
                      <p className="text-[12px] font-semibold text-[#C2410C]">{selectedRole.name}</p>
                      {selectedRole.description && (
                        <p className="text-[12px] text-[#3B82F6] mt-0.5">{selectedRole.description}</p>
                      )}
                      {selectedRole.slug && (
                        <p className="text-[11px] text-[#64748B] mt-0.5 font-mono">slug: {selectedRole.slug}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Onboarding actions */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm px-6 py-5">
                <p className="text-[12px] font-semibold text-[#475569] uppercase tracking-wide mb-4">Onboarding Actions</p>
                <div className="space-y-4">
                  {[
                    { field: 'generatePassword',      label: 'Auto-generate temporary password', desc: 'A secure 12-character password is created and can be shared with the user.',    icon: 'key' },
                    { field: 'sendInvite',            label: 'Send invitation email',           desc: 'User receives a welcome email with login instructions and credentials.',        icon: 'mail' },
                    { field: 'requirePasswordChange', label: 'Require password change on login', desc: 'Ensures the user sets a personal password before accessing any module.',       icon: 'lock_reset' },
                  ].map(({ field, label, desc, icon }) => (
                    <label key={field} className="flex items-start gap-3.5 cursor-pointer group">
                      <div className="relative mt-0.5 flex items-center justify-center shrink-0">
                        <input
                          type="checkbox"
                          checked={formData[field]}
                          onChange={set(field)}
                          className="peer appearance-none w-4 h-4 rounded border-2 border-[#CBD5E1] checked:bg-[#EA580C] checked:border-[#EA580C] transition-colors cursor-pointer"
                        />
                        <span className="material-symbols-outlined absolute text-white text-[11px] opacity-0 peer-checked:opacity-100 pointer-events-none leading-none">check</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-[#94A3B8]">{icon}</span>
                          <span className="text-[13px] font-semibold text-[#0F172A] group-hover:text-[#EA580C] transition-colors">{label}</span>
                        </div>
                        <p className="text-[12px] text-[#64748B] mt-0.5 leading-snug">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Action Footer ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-6 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => navigate(returnPath)}
            className="text-[13px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            ← Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(returnPath)}
              className="border border-[#E2E8F0] bg-white text-[#0F172A] px-5 py-2.5 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors shadow-sm"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={submitting || !canCreate}
              title={!canCreate ? 'You do not have permission to create users. Contact your administrator.' : ''}
              className="bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-[13px] font-semibold transition-colors shadow-sm flex items-center gap-2"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[18px]">person_add</span>
              )}
              {submitting ? 'Creating user…' : 'Create User'}
            </button>
          </div>
        </div>

      </form>
    </DynamicLayout>
  );
}
