import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import DynamicLayout from '../../components/shared/DynamicLayout';
import { adminAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminEditUser() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { hasPermission } = useAuth();

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', department: '',
    designation: '', employmentType: 'Full-time', role: '', status: 'Active',
  });

  const [roles, setRoles]             = useState([]);
  const [departments, setDepartments] = useState([]);
  const [fetching, setFetching]       = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const canReadRoles = hasPermission('Roles', 'read');
        const canReadDepts = hasPermission('Departments', 'read');

        const promises = [adminAPI.getUser(id)];
        if (canReadRoles) promises.push(adminAPI.getRoles());
        if (canReadDepts) promises.push(adminAPI.getDepartments());

        const results = await Promise.all(promises);
        const userRes = results[0];
        const u = userRes.data.data;

        let rolesData = [];
        let deptsData = [];
        let resIdx = 1;

        if (canReadRoles) {
          rolesData = results[resIdx++].data.data || [];
        } else if (u.role) {
          rolesData = [u.role];
        }

        if (canReadDepts) {
          deptsData = results[resIdx++].data.data || [];
        } else if (u.department) {
          deptsData = [u.department];
        }

        setFormData({
          name:           u.name || '',
          email:          u.email || '',
          phone:          u.phone || '',
          department:     u.department?._id || u.department || '',
          designation:    u.designation || '',
          employmentType: u.employmentType || 'Full-time',
          role:           u.role?._id || u.role || '',
          status:         u.status || 'Active',
        });
        setRoles(rolesData);
        setDepartments(deptsData);
      } catch (err) {
        toast.error('Failed to load user data');
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [id, hasPermission]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!formData.name.trim())  { setSubmitError('Full name is required.'); return; }
    if (!formData.email.trim()) { setSubmitError('Email address is required.'); return; }
    if (!formData.role)         { setSubmitError('System role is required.'); return; }
    if (!formData.department)   { setSubmitError('Department is required.'); return; }

    setSubmitting(true);
    try {
      await adminAPI.updateUser(id, {
        name:           formData.name.trim(),
        email:          formData.email.trim(),
        phone:          formData.phone || undefined,
        role:           formData.role,
        department:     formData.department,
        designation:    formData.designation || undefined,
        employmentType: formData.employmentType,
        status:         formData.status,
      });
      toast.success('User updated successfully');
      navigate(`/admin/users/${id}`);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to update user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls  = 'w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors';
  const selectCls = `${inputCls} bg-white appearance-none cursor-pointer`;

  const canReadRoles = hasPermission('Roles', 'read');
  const canReadDepts = hasPermission('Departments', 'read');

  if (fetching) {
    return (
      <DynamicLayout bare>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
        </div>
      </DynamicLayout>
    );
  }

  return (
    <DynamicLayout bare>
      <form onSubmit={handleSubmit} className="font-sans text-[#0F172A] max-w-[1000px] mx-auto flex flex-col h-full gap-8 pb-24">

        {/* Page Header */}
        <div className="flex flex-col gap-2 border-b border-[#E2E8F0] pb-6">
          <div className="flex items-center gap-2 text-[13px] text-[#64748B] font-medium pt-2">
            <button type="button" onClick={() => navigate('/admin/users')} className="hover:text-[#EA580C] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">group</span> Users
            </button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <button type="button" onClick={() => navigate(`/admin/users/${id}`)} className="hover:text-[#EA580C] transition-colors">
              {formData.name || 'User'}
            </button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-[#0F172A]">Edit</span>
          </div>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Edit User</h1>
            <p className="text-[15px] text-[#64748B] mt-1">Update identity, corporate structure, and system access for this user.</p>
          </div>
        </div>

        {submitError && (
          <div className="bg-[#FEF2F2] border border-[#DC2626] rounded-lg p-3 text-sm text-[#DC2626] font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {submitError}
          </div>
        )}

        <div className="space-y-10 divide-y divide-[#E2E8F0]">

          {/* Section 1: Identity & Contact */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
            <div className="lg:col-span-1">
              <h2 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#EA580C]">badge</span>
                Identity &amp; Contact
              </h2>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                The user's personal details and contact information.
              </p>
            </div>
            <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Full Name <span className="text-[#DC2626]">*</span></label>
                <input type="text" className={inputCls} placeholder="e.g. Jane Doe" value={formData.name} onChange={handleChange('name')} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Email Address <span className="text-[#DC2626]">*</span></label>
                <input type="email" className={inputCls} placeholder="jane.doe@movicloud.com" value={formData.email} onChange={handleChange('email')} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Phone Number</label>
                <input type="tel" className={inputCls} placeholder="+1 (555) 000-0000" value={formData.phone} onChange={handleChange('phone')} />
              </div>
            </div>
          </div>

          {/* Section 2: Corporate Structure */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-10">
            <div className="lg:col-span-1">
              <h2 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#EA580C]">account_tree</span>
                Corporate Structure
              </h2>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                Define where the user sits within the organization.
              </p>
            </div>
            <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Department <span className="text-[#DC2626]">*</span></label>
                <div className="relative">
                  <select disabled={!canReadDepts} className={selectCls} value={formData.department} onChange={handleChange('department')}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none text-[18px]">expand_more</span>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Job Title</label>
                <input type="text" className={inputCls} placeholder="e.g. Senior Developer" value={formData.designation} onChange={handleChange('designation')} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Employment Type</label>
                <div className="relative">
                  <select className={selectCls} value={formData.employmentType} onChange={handleChange('employmentType')}>
                    <option value="Full-time">Full Time</option>
                    <option value="Part-time">Part Time</option>
                    <option value="Contract">Contractor</option>
                    <option value="Intern">Intern</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none text-[18px]">expand_more</span>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Account Status</label>
                <div className="relative">
                  <select className={selectCls} value={formData.status} onChange={handleChange('status')}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none text-[18px]">expand_more</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Access & Security */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-10">
            <div className="lg:col-span-1">
              <h2 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#EA580C]">security</span>
                Access &amp; Security
              </h2>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                System role determines this user's permissions across OWMS.
              </p>
            </div>
            <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6">
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">System Role <span className="text-[#DC2626]">*</span></label>
                <div className="relative">
                  <select disabled={!canReadRoles} className={selectCls} value={formData.role} onChange={handleChange('role')}>
                    <option value="">Select Role</option>
                    {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none text-[18px]">expand_more</span>
                </div>
                <p className="text-[12px] text-[#64748B] mt-2">
                  To change granular permissions, use the <button type="button" onClick={() => navigate('/admin/access-matrix')} className="text-[#EA580C] hover:underline">Access Matrix</button>.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-8 mt-4 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => navigate(`/admin/users/${id}`)}
            className="text-[14px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/admin/users/${id}`)}
              className="border border-[#E2E8F0] bg-white text-[#0F172A] px-5 py-2.5 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors shadow-sm"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-[13px] font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[18px]">save</span>
              )}
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

      </form>
    </DynamicLayout>
  );
}
