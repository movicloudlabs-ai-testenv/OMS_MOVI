import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../utils/api';

export default function AdminCreateDepartment() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', code: '', description: '', head: '', parentDepartment: '',
    status: 'active', costCenterId: '', location: 'hq',
    allowCrossDept: true, autoAssignPerms: true,
  });

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, deptsRes] = await Promise.all([
          adminAPI.getUsers({ limit: 1000 }),
          adminAPI.getDepartments({ limit: 1000 })
        ]);
        setUsers(usersRes.data.data || []);
        setDepartments(deptsRes.data.data || []);
      } catch (err) {
        toast.error('Failed to load form dependencies');
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toast.error('Name and Code are required');
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        head: formData.head || undefined,
        parentDepartment: formData.parentDepartment || undefined,
        status: formData.status === 'inactive' ? 'Inactive' : 'Active',
      };
      
      await adminAPI.createDepartment(payload);
      toast.success('Department created successfully');
      navigate('/admin/departments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout bare>
      <div className="font-sans text-[#0F172A] max-w-[1000px] mx-auto flex flex-col h-full gap-8 pb-24">
        
        {/* Page Header */}
        <div className="flex flex-col gap-2 border-b border-[#E2E8F0] pb-6">
          <div className="flex items-center gap-2 text-[13px] text-[#64748B] font-medium pt-2">
            <button onClick={() => navigate('/admin/departments')} className="hover:text-[#EA580C] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">domain</span> Departments
            </button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-[#0F172A]">Create Department</span>
          </div>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Create Department</h1>
            <p className="text-[15px] text-[#64748B] mt-1">Establish a new organizational unit, assign leadership, and configure operational settings.</p>
          </div>
        </div>

        {/* Split Layout Form Sections */}
        <div className="space-y-10 divide-y divide-[#E2E8F0]">
          
          {/* Section 1: Department Identity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
            <div className="lg:col-span-1">
              <h2 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#EA580C]">badge</span>
                Department Identity
              </h2>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                Provide the core details that will identify this department across the system, including its formal name and internal abbreviation.
              </p>
            </div>
            <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Department Name <span className="text-[#DC2626]">*</span></label>
                <input name="name" value={formData.name} onChange={handleChange} type="text" className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors" placeholder="e.g. Research & Development" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Department Code <span className="text-[#DC2626]">*</span></label>
                <input name="code" value={formData.code} onChange={handleChange} type="text" className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors uppercase" placeholder="e.g. RND" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Cost Center ID</label>
                <input name="costCenterId" value={formData.costCenterId} onChange={handleChange} type="text" className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors" placeholder="e.g. CC-4092" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="3" className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors resize-none" placeholder="Briefly describe the primary function of this department..."></textarea>
              </div>
            </div>
          </div>

          {/* Section 2: Leadership & Structure */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-10">
            <div className="lg:col-span-1">
              <h2 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#EA580C]">account_tree</span>
                Leadership & Structure
              </h2>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                Assign a Department Head and define where this unit fits within the broader organizational hierarchy.
              </p>
            </div>
            <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Department Head</label>
                <div className="relative">
                  <select disabled={fetching} name="head" value={formData.head} onChange={handleChange} className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors appearance-none cursor-pointer">
                    <option value="">Select Department Head (Optional)</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none text-[18px]">expand_more</span>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Parent Department</label>
                <div className="relative">
                  <select disabled={fetching} name="parentDepartment" value={formData.parentDepartment} onChange={handleChange} className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors appearance-none cursor-pointer">
                    <option value="">None (Top-Level Department)</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none text-[18px]">expand_more</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Operational Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-10">
            <div className="lg:col-span-1">
              <h2 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#EA580C]">settings</span>
                Operational Settings
              </h2>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                Configure default settings, operational states, and primary location mapping for all users assigned to this department.
              </p>
            </div>
            <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Primary Location</label>
                  <div className="relative">
                    <select name="location" value={formData.location} onChange={handleChange} className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors appearance-none cursor-pointer">
                      <option value="hq">Headquarters (San Francisco)</option>
                      <option value="london">London Office</option>
                      <option value="remote">Fully Remote</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none text-[18px]">expand_more</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Status</label>
                  <div className="relative">
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors appearance-none cursor-pointer">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none text-[18px]">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0]">
                <h3 className="text-[13px] font-semibold text-[#0F172A] mb-3">Default Configuration</h3>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input name="allowCrossDept" checked={formData.allowCrossDept} onChange={handleChange} type="checkbox" className="peer appearance-none w-4 h-4 rounded border border-[#CBD5E1] checked:bg-[#EA580C] checked:border-[#EA580C] transition-colors cursor-pointer" />
                      <span className="material-symbols-outlined absolute text-white text-[12px] opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
                    </div>
                    <div>
                      <span className="block text-[13px] font-medium text-[#0F172A] group-hover:text-[#EA580C] transition-colors">Allow Cross-Department Visibility</span>
                      <span className="block text-[12px] text-[#64748B]">Members can see user directories from other active departments.</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input name="autoAssignPerms" checked={formData.autoAssignPerms} onChange={handleChange} type="checkbox" className="peer appearance-none w-4 h-4 rounded border border-[#CBD5E1] checked:bg-[#EA580C] checked:border-[#EA580C] transition-colors cursor-pointer" />
                      <span className="material-symbols-outlined absolute text-white text-[12px] opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
                    </div>
                    <div>
                      <span className="block text-[13px] font-medium text-[#0F172A] group-hover:text-[#EA580C] transition-colors">Auto-Assign Default Permissions</span>
                      <span className="block text-[12px] text-[#64748B]">New users added to this department automatically inherit base access rules.</span>
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
            onClick={() => navigate('/admin/departments')}
            className="text-[14px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button className="border border-[#E2E8F0] bg-white text-[#0F172A] px-5 py-2.5 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors shadow-sm">
              Save as Draft
            </button>
            <button onClick={handleSubmit} disabled={loading} className="bg-[#EA580C] hover:bg-[#C2410C] text-white px-6 py-2.5 rounded-lg text-[13px] font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[18px]">domain_add</span>
              )}
              Create Department
            </button>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
