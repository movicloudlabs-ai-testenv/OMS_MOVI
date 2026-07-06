import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Upload } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import DeleteUserModal from '../../components/shared/DeleteUserModal';
import BulkImportModal from '../../components/shared/BulkImportModal';
import AccessDenied from '../../components/shared/AccessDenied';
import { adminAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

// ── Decorative sparkline ───────────────────────────────────────────────────────
function Sparkline({ points, className = 'text-orange-600' }) {
  const width = 220;
  const height = 34;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * (height - 6) - 3;
    return [x, y];
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`w-full h-[34px] ${className}`}
      fill="none"
    >
      <path d={line} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill="currentColor" opacity="0.55" />
      ))}
    </svg>
  );
}

// ── Hover card popup ──────────────────────────────────────────────────────────
function UserHoverCard({ user, style }) {
  if (!user) return null;
  const initials = user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const role = user.role?.slug || '';
  const avatarBg =
    role === 'intern'      ? 'bg-emerald-100 text-emerald-700' :
    role === 'hr-manager'  ? 'bg-violet-100 text-violet-700'   :
    role === 'pmo-lead'    ? 'bg-cyan-100 text-cyan-700'       :
    role === 'admin'       ? 'bg-orange-100 text-orange-700'   :
                             'bg-orange-100 text-orange-700';
  const isActive = user.status === 'Active';

  return (
    <div
      style={style}
      className="fixed z-50 w-[270px] bg-white border border-[#E2E8F0] rounded-xl shadow-2xl overflow-hidden pointer-events-none select-none"
    >
      {/* Top accent */}
      <div className={`h-1 ${role === 'intern' ? 'bg-emerald-500' : role === 'hr-manager' ? 'bg-violet-500' : role === 'pmo-lead' ? 'bg-cyan-500' : 'bg-[#EA580C]'}`} />
      <div className="px-4 pt-3.5 pb-4">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-bold shrink-0 ring-2 ring-white ${avatarBg}`}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-[#0F172A] truncate">{user.name}</p>
            <p className="text-[11px] text-[#64748B] truncate">{user.designation || user.role?.name || '—'}</p>
          </div>
          <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${isActive ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}>
            {user.status || 'Active'}
          </span>
        </div>

        {/* Details grid */}
        <div className="space-y-2">
          {[
            { icon: 'business',      label: user.department?.name || user.department || '—' },
            { icon: 'shield',        label: user.role?.name || '—' },
            { icon: 'work',          label: user.employmentType || 'Full-time' },
            { icon: 'mail',          label: user.email },
            { icon: 'manage_accounts', label: user.manager?.name ? `Reports to ${user.manager.name}` : null },
            { icon: 'badge',         label: user.hrManager?.name ? `HR: ${user.hrManager.name}` : null },
          ].filter(r => r.label).map(({ icon, label }, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[15px] text-[#94A3B8] shrink-0">{icon}</span>
              <span className="text-[12px] text-[#475569] truncate">{label}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[13px] text-[#94A3B8]">open_in_new</span>
          <span className="text-[11px] text-[#94A3B8]">Click to view full profile</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [selectedIds, setSelectedIds] = useState([]);
  const [showImport, setShowImport]   = useState(false);
  const [openMenuId, setOpenMenuId]   = useState(null);

  // ── Hover card state ──────────────────────────────────────────────────────
  const [hoveredUser, setHoveredUser]   = useState(null);
  const [hoverStyle, setHoverStyle]     = useState({});
  const hoverTimer = useRef(null);
  const menuRef = useRef(null);

  // ── Real data state ─────────────────────────────────────────────────────
  const [users, setUsers]           = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [currentPage, setCurrentPage]         = useState(1);
  const [rowsPerPage, setRowsPerPage]         = useState(10);
  const [searchQuery, setSearchQuery]         = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter]         = useState('All');

  // ── Accurate global stats (not filtered by current page) ─────────────────
  const [globalStats, setGlobalStats] = useState({ active: null, inactive: null });

  useEffect(() => {
    Promise.all([
      adminAPI.getUsers({ status: 'Active', limit: 1 }),
      adminAPI.getUsers({ status: 'Inactive', limit: 1 }),
    ]).then(([aRes, iRes]) => {
      setGlobalStats({
        active:   aRes.data.pagination?.total ?? aRes.data.total ?? 0,
        inactive: iRes.data.pagination?.total ?? iRes.data.total ?? 0,
      });
    }).catch(() => {});
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getUsers({
        page: currentPage,
        limit: rowsPerPage,
        search: searchQuery || undefined,
        department: departmentFilter !== 'All' ? departmentFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      });
      setUsers(response.data.data);
      setPagination(response.data.pagination || {});
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, rowsPerPage, searchQuery, departmentFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Close the row action menu on outside click ────────────────────────────
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    if (openMenuId) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [openMenuId]);

  // ── Selection helpers ────────────────────────────────────────────────────
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(users.map(u => u._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const [deleteTarget, setDeleteTarget] = useState(null);   // bulk: { ids, name }
  const [deleteUserTarget, setDeleteUserTarget] = useState(null); // single: { id, name }

  const handleUserDeleted = async () => {
    setDeleteUserTarget(null);
    await fetchUsers();
  };

  const executeBulkDelete = async () => {
    await Promise.all(deleteTarget.ids.map(id => adminAPI.deleteUser(id)));
    setSelectedIds([]);
    setDeleteTarget(null);
    await fetchUsers();
  };

  // ── Helper: display name for role ────────────────────────────────────────
  const getRoleName = (user) => user.role?.name || user.role || '—';
  const getDeptName = (user) => user.department?.name || user.department || '—';
  const getStatus   = (user) => user.status || 'Active';

  // ── Stats from pagination ─────────────────────────────────────────────────
  const total      = pagination.total  ?? users.length;
  const totalPages = pagination.pages  ?? 1;
  const hasPrev    = pagination.hasPrev ?? currentPage > 1;
  const hasNext    = pagination.hasNext ?? currentPage < totalPages;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const rangeEnd   = (currentPage - 1) * rowsPerPage + users.length;

  // Page numbers to show (windowed around current)
  const pageNumbers = [];
  const delta = 2;
  for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
    pageNumbers.push(i);
  }

  // ── Permission gates ─────────────────────────────────────────────────────
  const canRead   = hasPermission('Users', 'read');
  const canCreate = hasPermission('Users', 'create');
  const canUpdate = hasPermission('Users', 'update');
  const canDelete = hasPermission('Users', 'delete');
  const canExport = hasPermission('Users', 'export');

  // ── Loading skeleton ──────────────────────────────────────────────────────
  const SkeletonRow = () => (
    <tr className="border-b border-[#F1F5F9] animate-pulse">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-[#E2E8F0] rounded w-full" />
        </td>
      ))}
    </tr>
  );

  if (!canRead) return <AdminLayout title="Users"><AccessDenied message="You don't have permission to view users." /></AdminLayout>;

  return (
    <AdminLayout title="Users" subtitle="Manage user accounts, roles, and system access.">
      <div className="font-sans text-[#0F172A] w-full flex flex-col gap-4">

        {/* User Metrics Snapshot */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Users',
              value: loading ? null : total,
              sub: 'All registered users',
              icon: 'group',
              solid: true,
              spark: [4, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10],
            },
            {
              label: 'Active Users',
              value: globalStats.active,
              sub: (globalStats.active != null)
                ? `${Math.round((globalStats.active / ((globalStats.active + (globalStats.inactive || 0)) || 1)) * 100)}% of total users`
                : null,
              icon: 'how_to_reg',
              solid: false,
              spark: [5, 6, 5, 7, 6, 8, 7, 9, 8, 9, 9, 10],
            },
            {
              label: 'Inactive Users',
              value: globalStats.inactive,
              sub: (globalStats.inactive === 0 ? 'No inactive users' : 'Currently inactive'),
              icon: 'pending_actions',
              solid: false,
              spark: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
            },
            {
              label: 'On This Page',
              value: loading ? null : users.length,
              sub: `Page ${currentPage} of ${totalPages}`,
              icon: 'layers',
              solid: false,
              spark: [6, 5, 7, 6, 8, 7, 6, 8, 7, 9, 8, 7],
            },
          ].map(({ label, value, sub, icon, solid, spark }) => (
            <div key={label} className="bg-white border border-[#F1E8E2] rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-4 pb-2">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[20px] w-10 h-10 flex items-center justify-center rounded-xl shrink-0 bg-orange-50 text-orange-600">{icon}</span>
                  <div className="min-w-0">
                    <span className="text-[12px] font-semibold text-[#64748B]">{label}</span>
                    <div className="mt-0.5">
                      {value === null || value === undefined
                        ? <div className="h-7 w-12 bg-[#F1F5F9] rounded animate-pulse" />
                        : <span className="text-[24px] font-bold text-[#0F172A] leading-none">{value}</span>
                      }
                    </div>
                    {sub && value !== null && value !== undefined && (
                      <p className="text-[11px] text-[#94A3B8] mt-1 truncate">{sub}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-2 pb-2">
                <Sparkline points={spark} className={solid ? 'text-orange-500' : 'text-orange-300'} />
              </div>
            </div>
          ))}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-[#FEF2F2] border border-[#DC2626] rounded-lg p-3 text-sm text-[#DC2626] font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
            <button onClick={fetchUsers} className="ml-auto text-xs underline">Retry</button>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white border border-[#E2E8F0] rounded-md p-3 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input
                className="w-full border border-[#E2E8F0] rounded py-1.5 pl-9 pr-3 text-[13px] focus:outline-none focus:border-[#EA580C] transition-colors"
                placeholder="Search users..."
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <select
              className="border border-[#E2E8F0] text-[#0F172A] px-2 py-1.5 rounded text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (canUpdate || canDelete) && (
              <div className="flex items-center gap-2 mr-1 border-r border-[#E2E8F0] pr-4">
                <span className="text-[13px] text-[#64748B] font-medium">{selectedIds.length} selected</span>
                {canUpdate && <button className="text-[12px] font-medium text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] px-2 py-1 rounded transition-colors">Activate</button>}
                {canUpdate && <button className="text-[12px] font-medium text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] px-2 py-1 rounded transition-colors">Deactivate</button>}
                {canDelete && <button onClick={() => setDeleteTarget({ ids: selectedIds, name: `${selectedIds.length} selected user(s)` })} className="text-[12px] font-medium text-[#DC2626] bg-[#DC2626]/10 hover:bg-[#DC2626]/20 px-2 py-1 rounded transition-colors">Delete</button>}
              </div>
            )}
            <button onClick={fetchUsers} className="border border-[#E2E8F0] text-[#0F172A] px-3 py-1.5 rounded text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Refresh
            </button>
            {canExport && (
              <button className="border border-[#E2E8F0] text-[#0F172A] px-3 py-1.5 rounded text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">download</span>
                Export
              </button>
            )}
            {canCreate && (
              <button
                onClick={() => setShowImport(true)}
                className="border border-[#E2E8F0] bg-white text-[#0F172A] px-3 py-1.5 rounded text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
              >
                <Upload size={15} />
                Import CSV
              </button>
            )}
            {canCreate && (
              <button
                onClick={() => navigate('/admin/users/new')}
                className="bg-[#EA580C] hover:bg-[#C2410C] text-white px-4 py-1.5 rounded text-[13px] font-medium transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Create User
              </button>
            )}
          </div>
        </div>

        {/* Content Area - Table */}
        <div className="bg-white border border-[#E2E8F0] rounded-md shadow-sm overflow-hidden flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="px-4 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={!loading && users.length > 0 && selectedIds.length === users.length}
                      className="w-4 h-4 rounded border-[#CBD5E1] text-[#EA580C] focus:ring-[#EA580C] accent-[#EA580C]"
                    />
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Name</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Employee ID</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Department</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Role</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Status</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Email</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[#64748B] text-sm">
                      <span className="material-symbols-outlined text-[40px] text-[#CBD5E1] block mb-2">group</span>
                      {searchQuery ? 'No users found. Try clearing your search.' : 'No users found. Create the first user.'}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user._id}
                      className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors last:border-0 group"
                      onMouseEnter={(e) => {
                        clearTimeout(hoverTimer.current);
                        hoverTimer.current = setTimeout(() => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const top  = rect.top + rect.height / 2 - 80;
                          const left = Math.min(rect.right - 280, window.innerWidth - 290);
                          setHoverStyle({ top: Math.max(8, top), left: Math.max(8, left) });
                          setHoveredUser(user);
                        }, 300);
                      }}
                      onMouseLeave={() => { clearTimeout(hoverTimer.current); setHoveredUser(null); }}
                    >
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={selectedIds.includes(user._id)} onChange={() => handleSelect(user._id)} className="w-4 h-4 rounded border-[#CBD5E1] text-[#EA580C] focus:ring-[#EA580C] accent-[#EA580C]" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-50 text-[#EA580C] flex items-center justify-center font-bold text-[12px]">
                            {(user.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="text-[14px] font-medium text-[#0F172A]">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#64748B] font-mono">{user.employeeId || user._id?.slice(-6)}</td>
                      <td className="px-4 py-3 text-[13px] text-[#64748B]">{getDeptName(user)}</td>
                      <td className="px-4 py-3 text-[13px] text-[#64748B]">{getRoleName(user)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          getStatus(user) === 'Active' ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#E2E8F0] text-[#64748B]'
                        }`}>
                          {getStatus(user)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#64748B]">{user.email}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/admin/users/${user._id}`)} className="text-[#64748B] hover:text-[#EA580C] transition-colors p-1" title="View Details">
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <div className="relative" ref={openMenuId === user._id ? menuRef : null}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === user._id ? null : user._id); }}
                              className="text-[#64748B] hover:text-[#0F172A] transition-colors p-1"
                              title="More actions"
                            >
                              <span className="material-symbols-outlined text-[18px]">more_vert</span>
                            </button>
                            {openMenuId === user._id && (
                              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-20 py-1 text-left">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); navigate(`/admin/users/${user._id}`); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#0F172A] hover:bg-[#F8FAFC]"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-[#64748B]">visibility</span>
                                  View Details
                                </button>
                                <button
                                  disabled={!canUpdate}
                                  onClick={(e) => { e.stopPropagation(); if (canUpdate) { setOpenMenuId(null); navigate(`/admin/users/${user._id}/edit`); } }}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] ${canUpdate ? 'text-[#0F172A] hover:bg-[#F8FAFC]' : 'text-[#CBD5E1] cursor-not-allowed'}`}
                                >
                                  <span className={`material-symbols-outlined text-[16px] ${canUpdate ? 'text-[#64748B]' : 'text-[#CBD5E1]'}`}>edit</span>
                                  Edit
                                </button>
                                <button
                                  disabled={!canDelete}
                                  onClick={(e) => { e.stopPropagation(); if (canDelete) { setOpenMenuId(null); setDeleteUserTarget({ id: user._id, name: user.name }); } }}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] ${canDelete ? 'text-[#DC2626] hover:bg-[#FEF2F2]' : 'text-[#CBD5E1] cursor-not-allowed'}`}
                                >
                                  <Trash2 size={15} />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <p className="text-[13px] text-[#64748B]">
              {loading ? (
                'Loading...'
              ) : (
                <>Showing <span className="font-medium text-[#0F172A]">{rangeStart}</span> to <span className="font-medium text-[#0F172A]">{rangeEnd}</span> of <span className="font-medium text-[#0F172A]">{total}</span> users</>
              )}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  disabled={!hasPrev}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1 border border-[#E2E8F0] rounded text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                {pageNumbers.map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded text-[13px] font-medium transition-colors ${
                      currentPage === p ? 'bg-[#EA580C] text-white' : 'text-[#64748B] hover:bg-[#F8FAFC] border border-[#E2E8F0]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={!hasNext}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-1 border border-[#E2E8F0] rounded text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-[#E2E8F0] rounded px-2 py-1.5 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#EA580C] cursor-pointer"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      {/* Bulk delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        entityName={deleteTarget?.name}
        entityLabel="selection"
        onConfirm={executeBulkDelete}
      />

      {/* Single user — impact-aware offboarding */}
      {deleteUserTarget && (
        <DeleteUserModal
          userId={deleteUserTarget.id}
          userName={deleteUserTarget.name}
          onClose={() => setDeleteUserTarget(null)}
          onDeleted={handleUserDeleted}
        />
      )}

      <BulkImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onComplete={() => {
          setShowImport(false);
          fetchUsers();
          // Refresh global stats after import
          Promise.all([
            adminAPI.getUsers({ status: 'Active', limit: 1 }),
            adminAPI.getUsers({ status: 'Inactive', limit: 1 }),
          ]).then(([aRes, iRes]) => {
            setGlobalStats({
              active:   aRes.data.pagination?.total ?? aRes.data.total ?? 0,
              inactive: iRes.data.pagination?.total ?? iRes.data.total ?? 0,
            });
          }).catch(() => {});
        }}
      />
      <UserHoverCard user={hoveredUser} style={hoverStyle} />
    </AdminLayout>
  );
}
