import { useState, useEffect } from 'react';
import PageWrapper from '../../components/PageWrapper';
import { CheckCircle2, XCircle } from 'lucide-react';
import { hrAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const isIntern = (leave) => {
  const slug = leave.user?.role?.slug || '';
  return slug === 'intern' || slug === 'intern-student';
};

function ApprovedTable({ leaves }) {
  if (leaves.length === 0) return (
    <p className="text-center text-sm text-[#64748B] py-8 italic">No approved leaves in the last 60 days.</p>
  );
  return (
    <table className="w-full text-left border-collapse min-w-[560px]">
      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <tr>
          {['Member', 'Type', 'Duration', 'Days', 'Approved By', 'Date'].map(h => (
            <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {leaves.map(lv => {
          const initials = (lv.user?.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          return (
            <tr key={lv._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold shrink-0">{initials}</div>
                  <div>
                    <p className="text-xs font-semibold text-[#0F172A]">{lv.user?.name}</p>
                    <p className="text-[10px] text-[#64748B]">{lv.user?.employeeId || ''}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-[10px] font-bold bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded uppercase">{lv.type}</span>
              </td>
              <td className="px-4 py-3 text-xs text-[#0F172A] whitespace-nowrap">{fmtShort(lv.fromDate)} → {fmtShort(lv.toDate)}</td>
              <td className="px-4 py-3 text-xs font-bold text-[#0F172A]">{lv.days}</td>
              <td className="px-4 py-3 text-xs text-[#64748B]">{lv.reviewedBy?.name || '—'}</td>
              <td className="px-4 py-3 text-[10px] text-[#64748B]">{fmtDate(lv.reviewedAt)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function HRLeave() {
  const [teamLeaves,  setTeamLeaves]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [approvedTab, setApprovedTab] = useState('Employee');
  const [reviewing,   setReviewing]   = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const tRes = await hrAPI.getLeaves({});
      setTeamLeaves(tRes.data?.data || tRes.data || []);
    } catch { toast.error('Failed to load leave data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleReview = async (id, status) => {
    setReviewing(id);
    try {
      await hrAPI.reviewLeave(id, { status, reviewNote: `Reviewed by HR` });
      toast.success(`Leave ${status === 'Approved' ? 'approved ✓' : 'rejected'}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to review leave');
    } finally { setReviewing(null); }
  };

  // Pending team leaves
  const pendingTeam = teamLeaves.filter(l => l.status === 'Pending');

  // Approved within 60 days
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60);
  const recentApproved = teamLeaves.filter(l => l.status === 'Approved' && new Date(l.reviewedAt) >= cutoff);
  const approvedEmployees = recentApproved.filter(l => !isIntern(l));
  const approvedInterns   = recentApproved.filter(l =>  isIntern(l));

  return (
    <PageWrapper>
      <div className="w-full flex flex-col gap-6 max-w-[1100px] mx-auto pb-10 font-sans px-6 mt-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Leave Management</h1>
          <p className="text-sm text-[#64748B] mt-1">Review and approve leave requests from your team. Apply for your own leave from your profile.</p>
        </div>

        {/* ── TEAM PENDING QUEUE ─────────────────────────────────────── */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#0F172A]">Pending Leave Queue</span>
              {pendingTeam.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingTeam.length}</span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <span className="material-symbols-outlined text-[24px] text-[#2563EB] animate-spin">sync</span>
            </div>
          ) : pendingTeam.length === 0 ? (
            <p className="text-center text-sm text-[#64748B] py-6 italic">No pending leave requests.</p>
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="border-b border-[#E2E8F0]">
                <tr>
                  {['Member', 'Type', 'Duration', 'Days', 'Reason', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-2 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingTeam.map(lv => {
                  const initials = (lv.user?.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <tr key={lv._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center text-[10px] font-bold shrink-0">{initials}</div>
                          <div>
                            <p className="text-xs font-semibold text-[#0F172A]">{lv.user?.name}</p>
                            <p className="text-[10px] text-[#64748B]">{lv.user?.role?.name || 'Staff'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-bold bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded uppercase">{lv.type}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#0F172A] whitespace-nowrap">{fmtShort(lv.fromDate)} → {fmtShort(lv.toDate)}</td>
                      <td className="px-4 py-2.5 text-xs font-bold text-[#0F172A]">{lv.days}d</td>
                      <td className="px-4 py-2.5 text-xs text-[#64748B] max-w-[160px] truncate">{lv.reason || '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleReview(lv._id, 'Approved')}
                            disabled={reviewing === lv._id}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 disabled:opacity-50 transition-colors">
                            <CheckCircle2 size={13} /> Approve
                          </button>
                          <button
                            onClick={() => handleReview(lv._id, 'Rejected')}
                            disabled={reviewing === lv._id}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg border border-red-200 disabled:opacity-50 transition-colors">
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── APPROVED LEAVES (last 60 days) ──────────────────────── */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#0F172A]">Approved Leaves</span>
              <span className="text-[10px] text-[#64748B] font-medium">· last 60 days</span>
              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{recentApproved.length}</span>
            </div>
            {/* Employee / Intern tabs */}
            <div className="flex gap-1">
              {[['Employee', approvedEmployees.length], ['Intern', approvedInterns.length]].map(([label, count]) => (
                <button key={label} onClick={() => setApprovedTab(label)}
                  className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all ${
                    approvedTab === label ? 'bg-[#2563EB] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                  }`}>
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <ApprovedTable leaves={approvedTab === 'Employee' ? approvedEmployees : approvedInterns} />
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
