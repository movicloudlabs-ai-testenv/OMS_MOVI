import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import PageWrapper from '../../components/PageWrapper';
import { pmoAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';
import toast from 'react-hot-toast';

export default function PMOLeaves() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Projects', 'read');
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchLeaves = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const response = await pmoAPI.getTeamLeaves();
      setLeaves(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load team leaves');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [canRead]);

  if (!canRead) {
    return (
      <PageWrapper>
        <AccessDenied message="You don't have permission to view team leaves." />
      </PageWrapper>
    );
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'Approved':
        return { color: 'text-[#16A34A]', bg: 'bg-[#DCFCE7]', icon: <CheckCircle2 size={16} /> };
      case 'Rejected':
        return { color: 'text-[#DC2626]', bg: 'bg-[#FEE2E2]', icon: <XCircle size={16} /> };
      default:
        return { color: 'text-[#D97706]', bg: 'bg-[#FEF3C7]', icon: <Clock size={16} /> };
    }
  };

  const filteredLeaves = leaves.filter(leave => {
    const term = searchTerm.toLowerCase();
    const nameMatch = leave.user?.name?.toLowerCase().includes(term);
    const idMatch = leave.user?.employeeId?.toLowerCase().includes(term);
    const typeMatch = leave.type?.toLowerCase().includes(term);
    const statusMatch = statusFilter === 'All' || leave.status === statusFilter;
    
    return (nameMatch || idMatch || typeMatch) && statusMatch;
  });

  return (
    <PageWrapper>
      <div className="font-sans text-[#0F172A] w-full flex flex-col h-full bg-[#F8FAFC]">
        {/* HEADER */}
        <div className="bg-white border-b border-[#E2E8F0] px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Team Leaves</h1>
              <p className="text-sm text-[#64748B] mt-1">View leave schedule for resources across your active projects</p>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* TOOLBAR */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
            <div className="relative w-full md:w-96">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input 
                type="text" 
                placeholder="Search by name, ID, or leave type..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#64748B] flex items-center gap-1">
                <Filter size={16} /> Status:
              </span>
              <div className="flex bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0]">
                {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${
                      statusFilter === status 
                        ? 'bg-white text-[#0F172A] shadow-sm' 
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TABLE */}
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex flex-col items-center">
              <CalendarIcon size={48} className="text-[#94A3B8] mb-4" />
              <p className="text-base font-bold text-[#0F172A]">No leaves found</p>
              <p className="text-sm text-[#64748B] mt-1">There are no leave records matching your filters.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm text-[#475569]">
                <thead className="bg-[#F8FAFC] text-xs uppercase font-bold text-[#64748B] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-6 py-4 font-bold">Employee</th>
                    <th className="px-6 py-4 font-bold">Leave Details</th>
                    <th className="px-6 py-4 font-bold">Duration</th>
                    <th className="px-6 py-4 font-bold">Reason</th>
                    <th className="px-6 py-4 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredLeaves.map(leave => {
                    const statusConfig = getStatusConfig(leave.status);
                    return (
                      <tr key={leave._id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={leave.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(leave.user?.name || 'U')}&background=EFF6FF&color=2563EB`} alt={leave.user?.name} className="w-9 h-9 rounded-full object-cover" />
                            <div>
                              <p className="font-bold text-[#0F172A]">{leave.user?.name}</p>
                              <p className="text-[11px] font-mono text-[#64748B]">{leave.user?.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-[#0F172A]">{leave.type} Leave</p>
                          <p className="text-xs text-[#64748B]">{leave.days} day(s)</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[#0F172A] font-medium text-[13px]">
                            {new Date(leave.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            <span className="text-[#94A3B8] mx-2">→</span>
                            {new Date(leave.toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </td>
                        <td className="px-6 py-4 max-w-[200px]">
                          <p className="text-xs text-[#475569] truncate" title={leave.reason}>{leave.reason}</p>
                          {leave.document && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-[#2563EB] mt-1 cursor-pointer hover:underline">
                              <FileText size={12} /> Document attached
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.icon} {leave.status}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center text-sm text-[#64748B]">
                <span>Showing {filteredLeaves.length} leave records</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
