import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';

/**
 * Impact-aware user deletion.
 * Shows what deleting a user affects (managed projects, team memberships,
 * open tasks), requires a replacement manager for any project they manage,
 * then runs the offboarding cascade.
 */
export default function DeleteUserModal({ userId, userName, onClose, onDeleted }) {
  const [loading, setLoading] = useState(true);
  const [impact, setImpact] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [reassignments, setReassignments] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await adminAPI.getUserDeletionImpact(userId);
        const data = res.data?.data;
        if (!active) return;
        setImpact(data);
        if (data?.requiresManagerReassignment) {
          const ures = await adminAPI.getUsers({ status: 'Active', limit: 200 });
          const list = ures.data?.data || [];
          if (!active) return;
          setCandidates(list.filter((u) => u._id !== userId && u.employmentType !== 'Intern'));
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load deletion impact');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  const managed = impact?.managedProjects || [];
  const members = impact?.memberProjects || [];
  const openTasks = impact?.openTaskCount || 0;
  const allManagersChosen = managed.every((p) => reassignments[p._id]);
  const noImpact = !loading && managed.length === 0 && members.length === 0 && openTasks === 0;

  const handleDelete = async () => {
    if (!allManagersChosen || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await adminAPI.deleteUser(userId, { managerReassignments: reassignments });
      const r = res.data?.data;
      toast.success(`${userName} removed${r?.tasksUnassigned ? ` · ${r.tasksUnassigned} task(s) flagged for reassignment` : ''}`);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={submitting ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl border border-[#E2E8F0] max-w-lg w-full shadow-xl z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-6">
          <div className="bg-[#FEE2E2] rounded-full p-2.5 flex-shrink-0">
            <AlertTriangle size={22} className="text-[#DC2626]" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[#0F172A]">Delete {userName}?</h2>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Review what this affects. The user's work is handed over before they're removed.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[#64748B] text-sm">
              <Loader2 size={16} className="animate-spin" /> Checking impact…
            </div>
          ) : (
            <>
              {noImpact && (
                <div className="text-[13px] text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-4 py-3">
                  No active projects or open tasks. This user can be safely removed.
                </div>
              )}

              {openTasks > 0 && (
                <div className="text-[13px] bg-[#FFF7ED] border border-[#FED7AA] rounded-lg px-4 py-3 text-[#9A3412]">
                  <strong>{openTasks}</strong> open task(s) will be <strong>unassigned</strong> and flagged for reassignment on the task board.
                </div>
              )}

              {members.length > 0 && (
                <div className="text-[13px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-4 py-3 text-[#475569]">
                  Will be removed from <strong>{members.length}</strong> team(s):{' '}
                  {members.map((p) => p.name).join(', ')}
                </div>
              )}

              {managed.length > 0 && (
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-3">
                  <p className="text-[13px] text-[#991B1B] font-medium mb-2">
                    Manages {managed.length} project(s) — choose a replacement manager:
                  </p>
                  <div className="space-y-2.5">
                    {managed.map((p) => (
                      <div key={p._id} className="flex items-center gap-2">
                        <span className="text-[13px] text-[#0F172A] flex-1 min-w-0 truncate" title={p.name}>
                          {p.name}
                        </span>
                        <select
                          value={reassignments[p._id] || ''}
                          onChange={(e) => setReassignments((prev) => ({ ...prev, [p._id]: e.target.value }))}
                          className="text-[13px] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-[#2563EB] max-w-[200px]"
                        >
                          <option value="">Select manager…</option>
                          {candidates.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name}{c.role?.name ? ` (${c.role.name})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-[12px] text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#F1F5F9]">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 border border-[#E2E8F0] text-[#0F172A] rounded-lg py-2.5 text-sm font-medium hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || submitting || !allManagersChosen}
            title={!allManagersChosen ? 'Choose a replacement manager for every managed project' : ''}
            className="flex-1 bg-[#DC2626] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#B91C1C] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (<><Loader2 size={14} className="animate-spin" /> Removing…</>) : 'Delete & hand over'}
          </button>
        </div>
      </div>
    </div>
  );
}
