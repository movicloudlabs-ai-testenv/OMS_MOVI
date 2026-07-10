import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Radio, Search, ChevronRight, ChevronDown,
  ChevronLeft, Bot, SearchX, Flag, User, Grid2X2, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import DynamicLayout from '../../components/shared/DynamicLayout';
import { adminAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';

// --- HELPERS ---
const getActionColor = (action) => {
  if (!action) return 'bg-slate-100 text-slate-700';
  const a = action.toLowerCase();
  if (a.includes('create') || a.includes('login')) return 'bg-blue-100 text-blue-700';
  if (a.includes('update') || a.includes('edit')) return 'bg-amber-100 text-amber-700';
  if (a.includes('delete') || a.includes('remove')) return 'bg-red-100 text-red-700';
  if (a.includes('logout')) return 'bg-gray-100 text-gray-700';
  if (a.includes('permission') || a.includes('role')) return 'bg-purple-100 text-purple-700';
  if (a.includes('password') || a.includes('reset')) return 'bg-orange-100 text-orange-700';
  if (a.includes('export')) return 'bg-cyan-100 text-cyan-700';
  if (a.includes('read') || a.includes('view')) return 'bg-green-100 text-green-700';
  return 'bg-slate-100 text-slate-700';
};

const getModuleColor = (module) => {
  switch(module) {
    case 'Users': return 'bg-blue-100 text-blue-700';
    case 'Departments': return 'bg-violet-100 text-violet-700';
    case 'Roles': return 'bg-indigo-100 text-indigo-700';
    case 'Reports': return 'bg-cyan-100 text-cyan-700';
    case 'Audit Logs': return 'bg-slate-100 text-slate-700';
    case 'Projects': return 'bg-emerald-100 text-emerald-700';
    case 'Tasks': return 'bg-amber-100 text-amber-700';
    case 'Auth': return 'bg-slate-200 text-slate-800';
    case 'Security': return 'bg-red-100 text-red-700';
    case 'System': return 'bg-gray-200 text-gray-800';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getRoleColor = (role) => {
  if (!role) return 'bg-gray-200 text-gray-700';
  if (role === 'System') return 'bg-gray-200 text-gray-700';
  if (role === 'Super Admin') return 'bg-red-100 text-red-700';
  if (role === 'HR Manager') return 'bg-blue-100 text-blue-700';
  if (role === 'PMO Lead') return 'bg-purple-100 text-purple-700';
  if (role === 'Department Head') return 'bg-amber-100 text-amber-700';
  if (role === 'Intern') return 'bg-green-100 text-green-700';
  return 'bg-slate-100 text-slate-700';
};

const getResultColor = (result) => {
  switch(result) {
    case 'SUCCESS': return 'bg-[#DCFCE7] text-[#16A34A]';
    case 'FAILED': return 'bg-[#FEE2E2] text-[#DC2626]';
    case 'WARNING': return 'bg-[#FEF3C7] text-[#D97706]';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const formatDate = (isoString) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
};

// --- SUB-COMPONENTS ---
const FilterBar = ({ searchQuery, setSearchQuery, filters, setFilters, activeCount, onClear }) => {
  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by user, action, module, IP address, or details..."
          className="w-full bg-white border border-[#E2E8F0] rounded-lg pl-11 pr-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-colors"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#64748B] font-medium">From</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#EA580C] cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#64748B] font-medium">To</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#EA580C] cursor-pointer"
          />
        </div>

        <select
          value={filters.module} onChange={e => setFilters(f => ({ ...f, module: e.target.value }))}
          className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#EA580C] cursor-pointer"
        >
          <option value="">All Modules</option>
          {['Users', 'Departments', 'Roles', 'Reports', 'Audit Logs', 'Projects', 'Tasks', 'Auth', 'Security', 'System'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
          className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#EA580C] cursor-pointer"
        >
          <option value="">All Actions</option>
          {['Create', 'Read', 'Update', 'Delete', 'Login', 'Logout', 'Export', 'Permission Change', 'Password Reset'].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={filters.result} onChange={e => setFilters(f => ({ ...f, result: e.target.value }))}
          className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#EA580C] cursor-pointer"
        >
          <option value="">All Results</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="WARNING">Warning</option>
        </select>

        <input
          type="text"
          value={filters.ipAddress}
          onChange={e => setFilters(f => ({ ...f, ipAddress: e.target.value }))}
          placeholder="Filter by IP..."
          className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#EA580C] max-w-[130px]"
        />

        {activeCount > 0 && (
          <div className="flex items-center gap-3 ml-auto">
            <span className="bg-orange-50 text-[#EA580C] text-xs font-semibold px-2.5 py-1 rounded-full">
              {activeCount} active
            </span>
            <button
              onClick={onClear}
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const StatsBar = ({ total, success, failed, warning, onFilterResult }) => {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg px-6 py-3 flex gap-8 items-center mb-6 shadow-sm overflow-x-auto whitespace-nowrap">
      <div className="text-sm font-medium text-[#0F172A]">
        Total: <span className="font-bold">{total}</span>
      </div>
      <div className="w-[1px] h-4 bg-[#E2E8F0]"></div>
      <button onClick={() => onFilterResult('SUCCESS')} className="text-sm font-medium text-[#16A34A] hover:opacity-80 transition-opacity">
        ✓ Success: <span className="font-bold">{success}</span>
      </button>
      <div className="w-[1px] h-4 bg-[#E2E8F0]"></div>
      <button onClick={() => onFilterResult('FAILED')} className="text-sm font-medium text-[#DC2626] hover:opacity-80 transition-opacity">
        ✗ Failed: <span className="font-bold">{failed}</span>
      </button>
      <div className="w-[1px] h-4 bg-[#E2E8F0]"></div>
      <button onClick={() => onFilterResult('WARNING')} className="text-sm font-medium text-[#D97706] hover:opacity-80 transition-opacity">
        ⚠ Warning: <span className="font-bold">{warning}</span>
      </button>
    </div>
  );
};

const ExpandedLogPanel = ({ log, navigate }) => {
  const isSystem = !log.user;
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">Event Details</h4>
            <p className="text-sm text-[#0F172A] font-medium leading-relaxed mb-3">{log.details || '—'}</p>
            <div className="space-y-1">
              {log.resourceId && (
                <p className="text-xs text-[#64748B]">Resource ID: <span className="font-mono text-[#0F172A] ml-1">{String(log.resourceId)}</span></p>
              )}
              {log.sessionId && (
                <p className="text-xs text-[#64748B]">Session ID: <span className="font-mono text-[#0F172A] ml-1">{log.sessionId}</span></p>
              )}
              {log.requestId && (
                <p className="text-xs text-[#64748B]">Request ID: <span className="font-mono text-[#0F172A] ml-1">{log.requestId}</span></p>
              )}
              {log.errorMessage && (
                <p className="text-xs text-[#DC2626] mt-2 bg-[#FEE2E2] rounded px-2 py-1">{log.errorMessage}</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">Context</h4>
            <div className="space-y-1 mb-2">
              {(log.location || log.ipAddress) && (
                <p className="text-xs text-[#64748B]">
                  Location:{' '}
                  <span className="text-[#0F172A] ml-1">
                    {log.countryFlag ? `${log.countryFlag} ` : ''}{log.location || '—'}
                  </span>
                  {log.ipAddress && <span className="font-mono text-[#64748B] ml-1">({log.ipAddress})</span>}
                </p>
              )}
              {log.browser && (
                <p className="text-xs text-[#64748B]">Browser: <span className="text-[#0F172A] ml-1">{log.browser}</span></p>
              )}
              {log.os && (
                <p className="text-xs text-[#64748B]">OS: <span className="text-[#0F172A] ml-1">{log.os}</span></p>
              )}
              {log.device && (
                <p className="text-xs text-[#64748B]">Device: <span className="text-[#0F172A] ml-1">{log.device}</span></p>
              )}
            </div>
            {log.userAgent && (
              <p className="text-[11px] font-mono text-[#64748B] bg-[#E2E8F0]/50 p-2 rounded truncate max-w-full" title={log.userAgent}>
                {log.userAgent}
              </p>
            )}
            {!log.device && !log.userAgent && !log.location && <p className="text-sm text-[#94A3B8]">No context data</p>}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">Actions</h4>
            <div className="flex flex-col gap-2 items-start">
              {!isSystem && log.user?._id && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/admin/users/${log.user._id}`); }}
                  className="text-sm font-medium text-[#EA580C] hover:underline flex items-center gap-1.5"
                >
                  <User size={14} /> View User Profile
                </button>
              )}
              {log.action === 'Permission Change' && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/admin/access-matrix'); }}
                  className="text-sm font-medium text-[#EA580C] hover:underline flex items-center gap-1.5"
                >
                  <Grid2X2 size={14} /> View in Access Matrix
                </button>
              )}
              {log.result === 'FAILED' && (
                <span className="text-sm text-[#DC2626] flex items-center gap-1.5 mt-1">
                  <Flag size={14} /> Failed event
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const LogRow = ({ log, isExpanded, onToggle, navigate }) => {
  let borderHoverClass = '';
  if (log.result === 'FAILED') borderHoverClass = 'hover:border-l-[#DC2626] border-l-transparent border-l-2';
  else if (log.result === 'WARNING') borderHoverClass = 'hover:border-l-[#D97706] border-l-transparent border-l-2';
  else borderHoverClass = 'border-l-transparent border-l-2';

  const userName = log.user?.name || log.userName || 'System';
  const userRole = log.user?.role?.name || null;
  const isSystem = !log.user;
  const isSystemIp = !log.ipAddress || log.ipAddress === 'System' || log.ipAddress === 'Internal';

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-[#E2E8F0] cursor-pointer bg-white hover:bg-[#F8FAFC] transition-colors ${borderHoverClass}`}
      >
        <td className="px-4 py-4 w-10 text-center text-[#94A3B8]">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </td>

        <td className="px-4 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-[#0F172A]">{formatDate(log.createdAt)}</div>
          <div className="text-xs text-[#64748B] font-mono mt-0.5">{formatTime(log.createdAt)}</div>
        </td>

        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex items-center gap-2">
            {isSystem && <Bot size={14} className="text-[#64748B]" />}
            <span className="text-sm font-medium text-[#0F172A]">{userName}</span>
          </div>
          {userRole && (
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${getRoleColor(userRole)}`}>
              {userRole}
            </span>
          )}
        </td>

        <td className="px-4 py-4 whitespace-nowrap">
          <span className={`inline-flex px-2.5 py-1 rounded text-xs font-semibold ${getActionColor(log.action)}`}>
            {log.action || '—'}
          </span>
        </td>

        <td className="px-4 py-4 whitespace-nowrap">
          {log.module ? (
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getModuleColor(log.module)}`}>
              {log.module}
            </span>
          ) : '—'}
        </td>

        <td className="px-4 py-4 whitespace-nowrap">
          {isSystemIp ? (
            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-[#F1F5F9] text-[#64748B]">System</span>
          ) : (
            <div>
              <span className="font-mono text-sm text-[#0F172A]">{log.ipAddress}</span>
              {log.location && (
                <div className="text-xs text-[#64748B] mt-0.5 flex items-center gap-1">
                  {log.countryFlag && <span>{log.countryFlag}</span>}
                  {log.location}
                </div>
              )}
            </div>
          )}
        </td>

        <td className="px-4 py-4 whitespace-nowrap">
          <span className={`inline-flex px-3 py-1 rounded-full text-[11px] uppercase tracking-wider font-bold ${getResultColor(log.result)}`}>
            {log.result || '—'}
          </span>
        </td>

        <td className="px-4 py-4 whitespace-nowrap">
          {log.browser || log.os ? (
            <div className="max-w-[160px]" title={`${log.browser || ''}${log.os ? ` · ${log.os}` : ''}`}>
              <div className="text-sm text-[#0F172A] truncate">{log.browser || '—'}</div>
              <div className="text-xs text-[#64748B] truncate mt-0.5">
                {log.os}{log.os && log.device ? ' · ' : ''}{log.device}
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#64748B] truncate max-w-[120px]" title={log.device}>
              {log.device || '—'}
            </div>
          )}
        </td>

        <td className="px-4 py-4">
          <div className="text-sm text-[#0F172A] truncate max-w-[200px]" title={log.details}>
            {log.details || '—'}
          </div>
        </td>
      </tr>
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan="9" className="p-0 border-b border-[#E2E8F0]">
              <ExpandedLogPanel log={log} navigate={navigate} />
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
};

const SkeletonRows = () => (
  Array.from({ length: 8 }).map((_, i) => (
    <tr key={i} className="border-b border-[#E2E8F0]">
      {Array.from({ length: 9 }).map((__, j) => (
        <td key={j} className="px-4 py-4">
          <div className="h-4 bg-[#F1F5F9] rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  ))
);

const Pagination = ({ current, total, rowsPerPage, setRowsPerPage, onPageChange }) => {
  const totalPages = Math.ceil(total / rowsPerPage);
  if (total === 0) return null;

  const start = (current - 1) * rowsPerPage + 1;
  const end = Math.min(current * rowsPerPage, total);

  // Show up to 5 pages around current
  const pages = [];
  const delta = 2;
  for (let i = Math.max(1, current - delta); i <= Math.min(totalPages, current + delta); i++) {
    pages.push(i);
  }

  return (
    <div className="bg-white border-t border-[#E2E8F0] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-sm text-[#64748B]">
        Showing <span className="font-medium text-[#0F172A]">{start}</span> to{' '}
        <span className="font-medium text-[#0F172A]">{end}</span> of{' '}
        <span className="font-medium text-[#0F172A]">{total}</span> logs
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-1">
          {current > 3 && (
            <>
              <button onClick={() => onPageChange(1)} className="w-8 h-8 flex items-center justify-center rounded text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9]">1</button>
              {current > 4 && <span className="w-8 h-8 flex items-center justify-center text-[#64748B]">...</span>}
            </>
          )}
          {pages.map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors ${
                current === p ? 'bg-[#EA580C] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'
              }`}
            >
              {p}
            </button>
          ))}
          {current < totalPages - 2 && (
            <>
              {current < totalPages - 3 && <span className="w-8 h-8 flex items-center justify-center text-[#64748B]">...</span>}
              <button onClick={() => onPageChange(totalPages)} className="w-8 h-8 flex items-center justify-center rounded text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9]">{totalPages}</button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 border-l border-[#E2E8F0] pl-4">
          <select
            value={rowsPerPage}
            onChange={e => { setRowsPerPage(Number(e.target.value)); onPageChange(1); }}
            className="border border-[#E2E8F0] rounded py-1 px-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#EA580C] cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, current - 1))}
              disabled={current === 1}
              className="p-1.5 rounded border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, current + 1))}
              disabled={current === totalPages || totalPages === 0}
              className="p-1.5 rounded border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function AdminAuditLogs() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canRead   = hasPermission('Audit Logs', 'read');
  const canExport = hasPermission('Audit Logs', 'export');
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '', dateTo: '', module: '', action: '', result: '', ipAddress: ''
  });
  const [expandedRow, setExpandedRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [liveView, setLiveView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stats from current page (server-side stats would need a separate endpoint)
  const successCount = logs.filter(l => l.result === 'SUCCESS').length;
  const failedCount = logs.filter(l => l.result === 'FAILED').length;
  const warningCount = logs.filter(l => l.result === 'WARNING').length;

  const buildParams = useCallback(() => {
    const params = { page: currentPage, limit: rowsPerPage };
    if (searchQuery) params.search = searchQuery;
    if (filters.module) params.module = filters.module;
    if (filters.action) params.action = filters.action;
    if (filters.result) params.result = filters.result;
    if (filters.ipAddress) params.ipAddress = filters.ipAddress;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    return params;
  }, [currentPage, rowsPerPage, searchQuery, filters]);

  const fetchLogs = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getAuditLogs(buildParams());
      const data = res.data;
      setLogs(data.data || []);
      setPagination({
        total: data.pagination?.total || data.total || 0,
        pages: data.pagination?.pages || data.pages || 0,
      });
    } catch (err) {
      setError('Failed to load audit logs. Please try again.');
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Debounce search
  const searchTimer = useRef(null);
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setCurrentPage(1);
      fetchLogs();
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  // Re-fetch when filters, page, or rowsPerPage change
  useEffect(() => {
    fetchLogs();
  }, [filters, currentPage, rowsPerPage]);

  // Live view polling
  useEffect(() => {
    let interval;
    if (liveView) {
      interval = setInterval(() => fetchLogs(false), 30000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [liveView, fetchLogs]);

  const activeCount = Object.values(filters).filter(v => v !== '').length;

  const handleClearFilters = () => {
    setFilters({ dateFrom: '', dateTo: '', module: '', action: '', result: '', ipAddress: '' });
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleFilterResult = (result) => {
    setFilters(f => ({ ...f, result }));
    setCurrentPage(1);
  };

  const handleToggleRow = (id) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  const handleExport = () => {
    const params = buildParams();
    delete params.page;
    delete params.limit;
    // Remove undefined values so URLSearchParams doesn't serialize them as "undefined"
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
    const qs = new URLSearchParams(params).toString();
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const baseUrl = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;
    const token = localStorage.getItem('owms_token') || '';
    // Build URL — browser download requires GET with auth header; use a temporary link
    const url = `${baseUrl}/admin/audit-logs/export${qs ? `?${qs}` : ''}`;
    // Fetch with auth token and trigger download
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast.error('Export failed'));
  };

  if (!canRead) return <DynamicLayout title="Audit Logs"><AccessDenied message="You don't have permission to view audit logs." /></DynamicLayout>;

  return (
    <DynamicLayout
      title="Audit Logs"
      subtitle="Track system changes, security events, and administrative actions."
      actions={(
        <>
          {canExport && (
            <button
              onClick={handleExport}
              className="border border-[#E2E8F0] bg-white text-[#0F172A] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
            >
              <Download size={16} /> Export Logs
            </button>
          )}
          <button
            onClick={() => fetchLogs()}
            className="border border-[#E2E8F0] bg-white text-[#0F172A] px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setLiveView(!liveView)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border ${
              liveView ? 'bg-[#16A34A] border-[#16A34A] text-white hover:bg-green-700' : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
          >
            <Radio size={16} className={liveView ? "animate-pulse" : ""} /> Live View
          </button>
        </>
      )}
    >
      <div className="font-sans text-[#0F172A] w-full flex flex-col gap-4 pb-2">

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          filters={filters} setFilters={setFilters}
          activeCount={activeCount} onClear={handleClearFilters}
        />

        {/* Stats Strip */}
        <StatsBar
          total={pagination.total}
          success={successCount} failed={failedCount} warning={warningCount}
          onFilterResult={handleFilterResult}
        />

        {/* Error Banner */}
        {error && (
          <div className="bg-[#FEF2F2] border border-[#DC2626] rounded-lg p-3 text-sm text-[#DC2626] font-medium flex items-center justify-between gap-2">
            <span>{error}</span>
            <button onClick={() => fetchLogs()} className="underline text-[#DC2626]">Retry</button>
          </div>
        )}

        {/* Table Container — zoom 1.2 enlarges the log table (rows, text) to
            match the Access Matrix, without affecting the sidebar or header. */}
        <div
          style={{ zoom: 1.2 }}
          className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col"
        >
          <div className="overflow-x-auto w-full custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="w-10 px-4 py-3"></th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Module</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">IP / Location</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Result</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Device / Browser</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider w-[250px]">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : logs.length > 0 ? (
                  logs.map((log) => (
                    <LogRow
                      key={log._id} log={log}
                      isExpanded={expandedRow === log._id}
                      onToggle={() => handleToggleRow(log._id)}
                      navigate={navigate}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="py-24">
                      <div className="flex flex-col items-center justify-center text-center">
                        <SearchX size={48} className="text-[#CBD5E1] mb-4" />
                        <h3 className="text-lg font-medium text-[#0F172A] mb-1">No logs found</h3>
                        <p className="text-sm text-[#64748B] mb-4">Try adjusting your filters or search query to find what you're looking for.</p>
                        {activeCount > 0 && (
                          <button
                            onClick={handleClearFilters}
                            className="text-sm font-medium text-[#EA580C] hover:underline"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            current={currentPage} total={pagination.total}
            rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>

      </div>
    </DynamicLayout>
  );
}
