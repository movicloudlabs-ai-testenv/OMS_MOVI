import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import HRLayout from '../../components/hr/HRLayout';
import { hrAPI } from '../../utils/api';
import AccessDenied from '../../components/shared/AccessDenied';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  Pending: 'bg-[#D97706]/10 text-[#D97706]',
  Approved: 'bg-[#16A34A]/10 text-[#16A34A]',
  Rejected: 'bg-[#DC2626]/10 text-[#DC2626]',
};

export default function HRLeaveApproval() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Leave', 'read');
  const canApprove = hasPermission('Leave', 'approve');

  const [tab, setTab] = useState('pending'); // pending | all
  const [pending, setPending] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null); // leave id being reviewed
  const [noteDraft, setNoteDraft] = useState('');
  const [activeAction, setActiveAction] = useState(null); // { id, status, leave }

  const load = async () => {
    if (!canRead) return;
    try {
      setLoading(true);
      const [pendingRes, allRes] = await Promise.all([
        hrAPI.getPendingLeaves(),
        hrAPI.getLeaves({ limit: 200 }),
      ]);
      setPending(pendingRes.data?.data || []);
      setAllLeaves(allRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [canRead]); // eslint-disable-line

  const openReview = (leave, status) => {
    setActiveAction({ id: leave._id, status, leave });
    setNoteDraft('');
  };

  const submitReview = async () => {
    if (!activeAction) return;
    setReviewing(activeAction.id);
    try {
      await hrAPI.reviewLeave(activeAction.id, { status: activeAction.status, reviewNote: noteDraft });
      toast.success(`Leave ${activeAction.status.toLowerCase()}`);
      setActiveAction(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to review leave request');
    } finally {
      setReviewing(null);
    }
  };

  if (!canRead) {
    return <HRLayout bare><AccessDenied message="You don't have permission to view leave requests." /></HRLayout>;
  }

  const list = tab === 'pending' ? pending : allLeaves;

  return (
    <HRLayout bare>
      <div className="font-sans text-[#0F172A] w-full flex flex-col gap-5 max-w-[1200px] mx-auto pb-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">Leave Approval</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">Review and approve leave requests from your team.</p>
          </div>
          {pending.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D97706]/10 text-[#D97706] text-[13px] font-semibold">
              <span className="material-symbols-outlined text-[16px]">pending_actions</span>
              {pending.length} pending
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-[#E2E8F0]">
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${tab === 'pending' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#64748B] hover:text-[#0F172A]'}`}
          >
            Pending ({pending.length})
          </button>
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${tab === 'all' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#64748B] hover:text-[#0F172A]'}`}
          >
            All Requests
          </button>
        </div>

        {/* List */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-4 py-12 text-center text-[14px] text-[#64748B]">Loading...</div>
          ) : list.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="flex flex-col items-center justify-center text-[#64748B]">
                <span className="material-symbols-outlined text-[#CBD5E1] text-[32px] mb-3">event_available</span>
                <p className="text-[14px] font-medium text-[#0F172A]">{tab === 'pending' ? 'No pending leave requests' : 'No leave requests found'}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Employee</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Type</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">From</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">To</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Reason</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase">Status</th>
                    {tab === 'pending' && <th className="px-4 py-3 text-[12px] font-semibold text-[#64748B] uppercase text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {list.map((l) => (
                    <tr key={l._id} className="border-b border-[#F1F5F9] last:border-0">
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-medium text-[#0F172A]">{l.user?.name}</div>
                        <div className="text-[11px] text-[#64748B]">{l.user?.employeeId}</div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#0F172A]">{l.type}</td>
                      <td className="px-4 py-3 text-[13px] text-[#64748B]">{new Date(l.fromDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-[13px] text-[#64748B]">{new Date(l.toDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-[13px] text-[#64748B] max-w-[220px] truncate">{l.reason || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${STATUS_COLORS[l.status] || 'bg-slate-100 text-slate-700'}`}>
                          {l.status}
                        </span>
                      </td>
                      {tab === 'pending' && (
                        <td className="px-4 py-3 text-right">
                          {canApprove ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openReview(l, 'Approved')}
                                className="px-3 py-1 rounded-md text-[12px] font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => openReview(l, 'Rejected')}
                                className="px-3 py-1 rounded-md text-[12px] font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#94A3B8] italic">View only</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review confirm modal */}
      {activeAction && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setActiveAction(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[16px] font-bold text-[#0F172A] mb-1">
              {activeAction.status === 'Approved' ? 'Approve' : 'Reject'} Leave Request
            </h2>
            <p className="text-[13px] text-[#64748B] mb-4">
              {activeAction.leave.user?.name} &middot; {activeAction.leave.type} &middot; {new Date(activeAction.leave.fromDate).toLocaleDateString()} - {new Date(activeAction.leave.toDate).toLocaleDateString()}
            </p>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">Note (optional)</label>
            <textarea
              rows={3}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Add a note for the employee..."
              className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB]"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setActiveAction(null)} className="px-4 py-2 rounded-md text-[13px] font-medium text-[#64748B] hover:bg-[#F1F5F9]">
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={reviewing === activeAction.id}
                className={`px-4 py-2 rounded-md text-[13px] font-semibold text-white transition-colors disabled:opacity-60 ${activeAction.status === 'Approved' ? 'bg-[#16A34A] hover:bg-[#15803D]' : 'bg-[#DC2626] hover:bg-[#B91C1C]'}`}
              >
                {reviewing === activeAction.id ? 'Saving...' : `Confirm ${activeAction.status}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </HRLayout>
  );
}
