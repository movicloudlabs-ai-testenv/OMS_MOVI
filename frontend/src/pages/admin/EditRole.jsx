import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import DynamicLayout from '../../components/shared/DynamicLayout';
import { adminAPI } from '../../utils/api';

export default function AdminEditRole() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({ name: '', description: '' });
  const [permissions, setPermissions] = useState([]);       // all permissions
  const [selectedPerms, setSelectedPerms] = useState([]);  // selected perm _ids
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [roleRes, permsRes] = await Promise.all([
          adminAPI.getRole(id),
          adminAPI.getPermissions({ limit: 200 }),
        ]);
        const role = roleRes.data.data;
        setFormData({ name: role.name || '', description: role.description || '' });
        // role.permissions may be populated objects or plain ids
        setSelectedPerms((role.permissions || []).map(p => typeof p === 'object' ? p._id : p));
        setPermissions(permsRes.data.data || []);
      } catch (err) {
        toast.error('Failed to load role data');
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const togglePerm = (permId) => {
    setSelectedPerms(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Role name and description are required');
      return;
    }
    setLoading(true);
    try {
      await adminAPI.updateRole(id, {
        name:        formData.name.trim(),
        description: formData.description.trim(),
      });
      if (selectedPerms.length > 0) {
        await adminAPI.updateRolePermissions(id, selectedPerms);
      }
      toast.success('Role updated successfully');
      navigate(`/admin/roles/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  // Group permissions by module
  const grouped = permissions.reduce((acc, p) => {
    const mod = p.module || 'General';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {});

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
      <div className="font-sans text-[#0F172A] max-w-[1000px] mx-auto flex flex-col h-full gap-8 pb-24">

        {/* Page Header */}
        <div className="flex flex-col gap-2 border-b border-[#E2E8F0] pb-6">
          <div className="flex items-center gap-2 text-[13px] text-[#64748B] font-medium pt-2">
            <button onClick={() => navigate('/admin/roles')} className="hover:text-[#EA580C] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">badge</span> Roles
            </button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <button onClick={() => navigate(`/admin/roles/${id}`)} className="hover:text-[#EA580C] transition-colors">
              {formData.name || 'Role'}
            </button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-[#0F172A]">Edit</span>
          </div>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Edit Role</h1>
            <p className="text-[15px] text-[#64748B] mt-1">Update the role's name, description, and assigned permissions.</p>
          </div>
        </div>

        <div className="space-y-10 divide-y divide-[#E2E8F0]">

          {/* Section 1: Role Identity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
            <div className="lg:col-span-1">
              <h2 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#EA580C]">fingerprint</span>
                Role Identity
              </h2>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                The role's name and description as displayed across the platform.
              </p>
            </div>
            <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Role Title <span className="text-[#DC2626]">*</span></label>
                <input
                  name="name" value={formData.name} onChange={handleChange} type="text"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors"
                  placeholder="e.g. Audit Manager"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">Description <span className="text-[#DC2626]">*</span></label>
                <textarea
                  name="description" value={formData.description} onChange={handleChange} rows="3"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors resize-none"
                  placeholder="Describe what users with this role do in the system..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Permissions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-10">
            <div className="lg:col-span-1">
              <h2 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#EA580C]">key</span>
                Permissions
              </h2>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                Select the permissions this role should have. Grouped by module.
              </p>
              <div className="mt-4 bg-[#FFF7ED] border border-[#BFDBFE] rounded-lg p-3 text-[12px] text-[#1E40AF]">
                <span className="font-semibold">{selectedPerms.length}</span> permission{selectedPerms.length !== 1 ? 's' : ''} selected
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              {Object.keys(grouped).length === 0 ? (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 text-center text-[13px] text-[#64748B]">
                  No permissions found. Permissions are auto-generated from the system config on server startup.
                </div>
              ) : (
                Object.entries(grouped).map(([module, perms]) => (
                  <div key={module} className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                      <h3 className="text-[13px] font-semibold text-[#0F172A]">{module}</h3>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setSelectedPerms(prev => [...new Set([...prev, ...perms.map(p => p._id)])])} className="text-[11px] text-[#EA580C] hover:underline">Select all</button>
                        <span className="text-[#E2E8F0]">·</span>
                        <button type="button" onClick={() => setSelectedPerms(prev => prev.filter(pid => !perms.find(p => p._id === pid)))} className="text-[11px] text-[#64748B] hover:underline">Clear</button>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map(perm => (
                        <label key={perm._id} className="flex items-start gap-3 p-3 border border-[#E2E8F0] rounded-lg cursor-pointer hover:bg-[#F8FAFC] transition-colors">
                          <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                            <input
                              type="checkbox"
                              checked={selectedPerms.includes(perm._id)}
                              onChange={() => togglePerm(perm._id)}
                              className="peer appearance-none w-4 h-4 rounded border border-[#CBD5E1] checked:bg-[#EA580C] checked:border-[#EA580C] transition-colors cursor-pointer"
                            />
                            <span className="material-symbols-outlined absolute text-white text-[12px] opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[13px] font-medium text-[#0F172A] leading-snug">{perm.name}</span>
                            {perm.description && <span className="block text-[11px] text-[#64748B] mt-0.5 leading-snug">{perm.description}</span>}
                            <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 bg-[#F1F5F9] text-[#64748B] rounded font-mono">{perm.action}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-8 mt-4 border-t border-[#E2E8F0]">
          <button
            onClick={() => navigate(`/admin/roles/${id}`)}
            className="text-[14px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/admin/roles/${id}`)}
              className="border border-[#E2E8F0] bg-white text-[#0F172A] px-5 py-2.5 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors shadow-sm"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-[#EA580C] hover:bg-[#C2410C] text-white px-6 py-2.5 rounded-lg text-[13px] font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[18px]">save</span>
              )}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

      </div>
    </DynamicLayout>
  );
}
