import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Grid2X2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../utils/api';

export default function AdminRoleDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [role, setRole] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const handleToggleStatus = async () => {
    if (!role) return;
    const newStatus = role.status === 'Active' ? 'Inactive' : 'Active';
    setToggling(true);
    try {
      await adminAPI.updateRole(id, { status: newStatus });
      toast.success(`Role ${newStatus === 'Active' ? 'activated' : 'deactivated'}`);
      const res = await adminAPI.getRole(id);
      setRole(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    const fetchRoleData = async () => {
      try {
        const [roleRes, usersRes] = await Promise.all([
          adminAPI.getRole(id),
          adminAPI.getUsers({ role: id, limit: 100 })
        ]);
        setRole(roleRes.data.data);
        setUsers(usersRes.data.data || []);
      } catch (err) {
        toast.error('Failed to load role details');
      } finally {
        setLoading(false);
      }
    };
    fetchRoleData();
  }, [id]);

  if (loading) {
    return (
      <AdminLayout bare>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!role) return null;

  return (
    <AdminLayout bare>
      <div className="font-sans text-[#0F172A] max-w-6xl mx-auto space-y-6 pb-10">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div>
            <div className="flex items-center gap-2 text-[13px] text-[#64748B] mb-2">
              <button onClick={() => navigate('/admin/roles')} className="hover:text-[#EA580C] transition-colors">Roles</button>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-[#0F172A] font-medium">{role.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-[#E2E8F0] text-[#64748B] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px]">badge</span>
              </div>
              <div>
                <h1 className="text-[24px] font-semibold tracking-tight text-[#0F172A] flex items-center gap-3">
                  {role.name}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide ${role.isSystem ? 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]' : 'bg-[#E0E7FF] text-[#4338CA] border border-[#C7D2FE]'}`}>
                    {role.isSystem ? 'SYSTEM DEFAULT' : 'CUSTOM'}
                  </span>
                </h1>
                <p className="text-[14px] text-[#64748B] mt-0.5">Status: <span className="text-[#16A34A] font-medium">{role.status || 'Active'}</span></p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin/access-matrix")} className="border border-[#E2E8F0] text-[#0F172A] px-3 py-1.5 rounded text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
              <Grid2X2 size={16} />
              View in Access Matrix
            </button>
            <button
              onClick={handleToggleStatus}
              disabled={toggling || role.slug === 'super-admin'}
              className="border border-[#E2E8F0] text-[#DC2626] hover:bg-[#DC2626]/5 px-3 py-1.5 rounded text-[13px] font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {toggling ? (
                <div className="w-4 h-4 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[16px]">archive</span>
              )}
              {role.status === 'Active' ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => navigate(`/admin/roles/${id}/edit`)}
              className="bg-[#EA580C] hover:bg-[#C2410C] text-white px-4 py-1.5 rounded text-[13px] font-medium transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Edit Role
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Role Information */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-md shadow-sm">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] rounded-t-md">
              <h2 className="text-[15px] font-semibold text-[#0F172A]">Role Configuration</h2>
            </div>
            <div className="p-5 space-y-6">
              <div>
                <span className="block text-[12px] font-medium text-[#64748B] uppercase tracking-wider mb-1">Description</span>
                <span className="text-[14px] text-[#0F172A] leading-relaxed">{role.description || 'No description provided.'}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[12px] font-medium text-[#64748B] uppercase tracking-wider mb-1">Created Date</span>
                  <span className="text-[14px] text-[#0F172A]">{new Date(role.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="block text-[12px] font-medium text-[#64748B] uppercase tracking-wider mb-1">Key Permissions</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {role.permissions?.slice(0, 5).map(p => (
                      <span key={p._id || p} className="bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] text-[11px] font-medium px-2 py-0.5 rounded">{p.name || p}</span>
                    ))}
                    {role.permissions?.length > 5 && (
                      <span className="text-[12px] text-[#EA580C] cursor-pointer hover:underline mt-1">+{role.permissions.length - 5} more in matrix</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Role Statistics */}
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-sm">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] rounded-t-md">
              <h2 className="text-[15px] font-semibold text-[#0F172A]">Assignment Stats</h2>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-medium text-[#64748B] uppercase">Total Assigned</span>
                <span className="text-[20px] font-medium text-[#0F172A]">{users.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-medium text-[#64748B] uppercase">Active Users</span>
                <span className="text-[20px] font-medium text-[#16A34A]">{users.filter(u => u.status === 'Active').length}</span>
              </div>
              <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="bg-[#16A34A] h-1.5" style={{ width: `${users.length ? (users.filter(u => u.status === 'Active').length / users.length) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Users with this Role */}
        <div className="bg-white border border-[#E2E8F0] rounded-md shadow-sm overflow-hidden mt-6">
          <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
            <h2 className="text-[15px] font-semibold text-[#0F172A]">Users with this Role</h2>
            <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input type="text" placeholder="Search users..." className="w-full border border-[#E2E8F0] rounded py-1 pl-9 pr-3 text-[13px] focus:outline-none focus:border-[#EA580C]" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Name</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Department</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Status</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Email</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Joined</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-[#64748B] uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors last:border-0 group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 cursor-pointer hover:underline text-[#0F172A]" onClick={() => navigate(`/admin/users/${u._id}`)}>
                        <div className="w-7 h-7 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center font-bold text-[11px]">
                          {u.name.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[13px] font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-[#64748B]">{u.department?.name || 'N/A'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${u.status === 'Active' ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#E2E8F0] text-[#64748B]'}`}>
                        {u.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-[#64748B]">{u.email}</td>
                    <td className="px-5 py-3 text-[13px] text-[#64748B]">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => navigate(`/admin/users/${u._id}`)} className="text-[#64748B] hover:text-[#EA580C]" title="View user">
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-[#E2E8F0] bg-white flex justify-between items-center text-[13px] text-[#64748B]">
            Showing {users.length} users
            <button onClick={() => navigate('/admin/users')} className="text-[#EA580C] font-medium hover:underline">View All Users</button>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
