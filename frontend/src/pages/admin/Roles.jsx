import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import AccessDenied from '../../components/shared/AccessDenied';
import { adminAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminRoles() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canRead   = hasPermission('Roles', 'read');
  const canCreate = hasPermission('Roles', 'create');
  const canDelete = hasPermission('Roles', 'delete');
  const [selectedIds, setSelectedIds] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getRoles();
      setRoles(res.data.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch roles');
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? roles.map(r => r._id) : []);
  };

  const handleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const [deleteTarget, setDeleteTarget] = useState(null);

  const executeDelete = async () => {
    try {
      await adminAPI.deleteRole(deleteTarget.id);
      setDeleteTarget(null);
      toast.success(`Role "${deleteTarget.name}" deleted`);
      await fetchRoles();
    } catch (err) {
      setDeleteTarget(null);
      toast.error(err.response?.data?.message || 'Failed to delete role');
    }
  };

  if (!canRead) return <AdminLayout title="Roles"><AccessDenied message="You don't have permission to view roles." /></AdminLayout>;

  return (
    <AdminLayout
      title="Roles"
      subtitle="Manage system access profiles and define standard operational roles."
      actions={canCreate && (
        <button
          onClick={() => navigate('/admin/roles/new')}
          className="bg-[#EA580C] hover:bg-[#C2410C] text-white px-4 py-2 rounded text-[13px] font-medium transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Role
        </button>
      )}
    >
      <div className="font-sans text-[#0F172A] w-full flex flex-col gap-4">

        {/* Toolbar */}
        <div className="bg-white border border-[#E2E8F0] rounded-md p-3 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input type="text" className="w-full border border-[#E2E8F0] rounded py-1.5 pl-9 pr-3 text-[13px] focus:outline-none focus:border-[#EA580C] transition-colors" placeholder="Search roles..." />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 mr-4 border-r border-[#E2E8F0] pr-4">
                <span className="text-[13px] text-[#64748B] font-medium">{selectedIds.length} selected</span>
                <button className="text-[12px] font-medium text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] px-2 py-1 rounded transition-colors">Duplicate</button>
                <button className="text-[12px] font-medium text-[#DC2626] bg-[#DC2626]/10 hover:bg-[#DC2626]/20 px-2 py-1 rounded transition-colors">Deactivate</button>
              </div>
            )}
            <button className="border border-[#E2E8F0] text-[#0F172A] px-3 py-1.5 rounded text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export
            </button>
          </div>
        </div>

        {/* Content Area - Table */}
        <div className="bg-white border border-[#E2E8F0] rounded-md shadow-sm overflow-hidden flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="px-4 py-3 w-10 text-center">
                    <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === roles.length && roles.length > 0} className="w-4 h-4 rounded border-[#CBD5E1] text-[#EA580C] focus:ring-[#EA580C] accent-[#EA580C]" />
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Role Name</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Type</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Total Users</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Status</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Created Date</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-[#64748B]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
                        Loading roles...
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-[#DC2626]">{error}</td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-[#64748B]">No roles found.</td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role._id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors last:border-0 group">
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={selectedIds.includes(role._id)} onChange={() => handleSelect(role._id)} className="w-4 h-4 rounded border-[#CBD5E1] text-[#EA580C] focus:ring-[#EA580C] accent-[#EA580C]" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span onClick={() => navigate(`/admin/roles/${role._id}`)} className="text-[14px] font-medium text-[#0F172A] cursor-pointer hover:underline">{role.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#64748B]">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${role.isSystem ? 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]' : 'bg-[#E0E7FF] text-[#4338CA] border border-[#C7D2FE]'}`}>
                          {role.isSystem ? 'System Default' : 'Custom'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#64748B] font-mono">{role.userCount || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${role.status === 'Active' ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#E2E8F0] text-[#64748B]'}`}>
                          {role.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#64748B]">{role.createdAt ? new Date(role.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => navigate(`/admin/roles/${role._id}`)} className="text-[#64748B] hover:text-[#EA580C] transition-colors" title="View Details">
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (canDelete) setDeleteTarget({ id: role._id, name: role.name }); }}
                            disabled={!canDelete}
                            title={canDelete ? 'Delete role' : 'You do not have permission to delete roles. Contact your administrator.'}
                            className={`transition-colors ${canDelete ? 'text-[#64748B] hover:text-[#DC2626]' : 'text-[#CBD5E1] cursor-not-allowed'}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#E2E8F0] flex items-center justify-between bg-white">
            <p className="text-[13px] text-[#64748B]">Showing <span className="font-medium text-[#0F172A]">{roles.length}</span> results</p>
          </div>
        </div>

      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        entityName={deleteTarget?.name}
        entityLabel="role"
        onConfirm={executeDelete}
      />
    </AdminLayout>
  );
}
