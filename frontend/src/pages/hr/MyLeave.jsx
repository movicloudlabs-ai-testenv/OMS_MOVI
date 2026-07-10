import { useState, useEffect } from 'react';
import HRLayout from '../../components/hr/HRLayout';
import { CalendarDays, Plus, X, Coffee, Heart, AlertCircle, Trash2, ArrowLeft } from 'lucide-react';
import { hrAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const fmt = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const wDays = (from, to) => {
  if (!from || !to) return 0;
  let count = 0, cur = new Date(from), end = new Date(to);
  while (cur <= end) { if (cur.getDay() !== 0 && cur.getDay() !== 6) count++; cur.setDate(cur.getDate() + 1); }
  return count;
};
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const isUpcoming = (lv) => new Date(lv.fromDate) > startOfToday();

const LEAVE_TYPES = [
  { id: 'Annual',    icon: CalendarDays, color: 'text-green-600',  activeBg: 'bg-green-50',  border: 'border-green-500'  },
  { id: 'Casual',    icon: Coffee,       color: 'text-blue-600',   activeBg: 'bg-blue-50',   border: 'border-blue-500'   },
  { id: 'Sick',      icon: Heart,        color: 'text-red-600',    activeBg: 'bg-red-50',    border: 'border-red-500'    },
  { id: 'Emergency', icon: AlertCircle,  color: 'text-orange-600', activeBg: 'bg-orange-50', border: 'border-orange-500' },
];
const BAL_CARDS = [
  { key: 'annual',    label: 'Annual',    color: 'text-green-600',  bg: 'bg-green-50'  },
  { key: 'casual',    label: 'Casual',    color: 'text-blue-600',   bg: 'bg-blue-50'   },
  { key: 'sick',      label: 'Sick',      color: 'text-red-600',    bg: 'bg-red-50'    },
  { key: 'emergency', label: 'Emergency', color: 'text-orange-600', bg: 'bg-orange-50' },
];
const STATUS_BADGE = {
  Approved: 'bg-green-100 text-green-700',
  Pending:  'bg-amber-100 text-amber-700',
  Rejected: 'bg-red-100 text-red-700',
};

function LeaveApplyModal({ onClose, onSubmit, balance, submitting }) {
  const today = new Date().toISOString().split('T')[0];
  const [type,     setType]     = useState('');
  const [fromDate, setFromDate] = useState(today);
  const [toDate,   setToDate]   = useState(today);
  const [reason,   setReason]   = useState('');
  const days = wDays(fromDate, toDate);
  const bal  = balance?.[type?.toLowerCase()];
  const exceeds = bal && days > (bal.total - bal.used);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-lg font-bold text-[#0F172A]">Apply for Leave</h2>
          <button onClick={onClose} className="text-[#64748B] hover:bg-[#E2E8F0] p-1.5 rounded-full"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Leave Type *</label>
            <div className="grid grid-cols-4 gap-2">
              {LEAVE_TYPES.map(opt => {
                const Icon = opt.icon; const active = type === opt.id;
                return (
                  <button key={opt.id} type="button" onClick={() => setType(opt.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${active ? `${opt.activeBg} ${opt.border}` : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'}`}>
                    <Icon size={20} className={active ? opt.color : 'text-[#64748B]'} />
                    <span className={`text-[10px] font-bold ${active ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>{opt.id}</span>
                  </button>
                );
              })}
            </div>
            {bal && (
              <p className="text-[11px] text-[#64748B] mt-1.5">
                Balance: <span className="font-bold text-[#0F172A]">{bal.total - bal.used} days remaining</span> ({bal.used}/{bal.total} used)
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">From *</label>
              <input type="date" value={fromDate} min={today}
                onChange={e => { setFromDate(e.target.value); if (e.target.value > toDate) setToDate(e.target.value); }}
                className="w-full p-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">To *</label>
              <input type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)}
                className="w-full p-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB] text-sm" />
            </div>
          </div>
          {days > 0 && (
            <p className="text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-3 py-1.5 rounded-lg -mt-2">
              {days} working day{days !== 1 ? 's' : ''}
              {exceeds && <span className="ml-2 text-red-600"> · Exceeds your balance!</span>}
            </p>
          )}
          <div>
            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Reason *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Describe the reason for your leave…"
              className="w-full p-3 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#2563EB] resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F1F5F9] rounded-lg">Cancel</button>
            <button disabled={submitting || !type || days === 0 || !reason.trim() || exceeds}
              onClick={() => onSubmit({ type, fromDate, toDate, reason })}
              className="px-5 py-2 text-sm font-bold bg-[#2563EB] text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Applying…' : 'Apply Leave'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HRMyLeave() {
  const navigate = useNavigate();
  const [balance,   setBalance]   = useState(null);
  const [leaves,    setLeaves]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, lRes] = await Promise.all([hrAPI.getMyLeaveBalance(), hrAPI.getMyLeaves()]);
      setBalance(bRes.data?.data || bRes.data);
      setLeaves(lRes.data?.data || []);
    } catch { toast.error('Failed to load leave data'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleApply = async (form) => {
    setSubmitting(true);
    try {
      await hrAPI.applyMyLeave(form);
      toast.success('Leave applied');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply leave');
    } finally { setSubmitting(false); }
  };

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await hrAPI.deleteMyLeave(id);
      toast.success('Leave cancelled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel leave');
    } finally { setCancelling(null); }
  };

  return (
    <HRLayout bare>
      <div className="w-full flex flex-col gap-5 max-w-[1200px] mx-auto pb-10 font-sans mt-5 px-4 lg:px-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/hr/profile')} className="p-2 bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] text-[#64748B] transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">My Leave</h1>
            <p className="text-xs text-[#64748B] mt-0.5">Manage your leave applications and balance</p>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 mt-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-2">
              <CalendarDays size={18} className="text-[#64748B]" /> Leave Balance & History
            </h2>
            <button onClick={() => setModal(true)}
              className="text-sm font-bold text-white bg-[#2563EB] hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
              <Plus size={16} /> Apply for Leave
            </button>
          </div>

          {/* Balance chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {BAL_CARDS.map(({ key, label, color, bg }) => {
              const b = balance?.[key] || { total: 0, used: 0 };
              const remaining = b.total - b.used;
              return (
                <div key={key} className={`${bg} border border-[#E2E8F0] rounded-xl px-4 py-3`}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">{label}</span>
                    <span className={`text-2xl font-black ${color}`}>{loading ? '–' : remaining}</span>
                  </div>
                  <p className="text-[10px] text-[#64748B] mt-1">{b.used}/{b.total} used</p>
                </div>
              );
            })}
          </div>

          {/* Leave list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="material-symbols-outlined text-[24px] text-[#2563EB] animate-spin">sync</span>
            </div>
          ) : leaves.length === 0 ? (
            <p className="text-center text-sm text-[#64748B] py-8 italic">No leave taken yet. Click "Apply for Leave" to add one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    {['Type', 'Duration', 'Days', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(lv => (
                    <tr key={lv._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] last:border-0">
                      <td className="px-4 py-3"><span className="text-xs font-bold bg-[#F1F5F9] text-[#475569] px-2 py-1 rounded uppercase">{lv.type}</span></td>
                      <td className="px-4 py-3 text-sm text-[#0F172A] whitespace-nowrap">{fmt(lv.fromDate)} → {fmt(lv.toDate)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-[#0F172A]">{lv.days}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${STATUS_BADGE[lv.status] || ''}`}>{lv.status}</span>
                        {isUpcoming(lv) && <span className="ml-2 text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-1 rounded uppercase">Upcoming</span>}
                      </td>
                      <td className="px-4 py-3">
                        {isUpcoming(lv) && (
                          <button onClick={() => handleCancel(lv._id)} disabled={cancelling === lv._id}
                            className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors">
                            <Trash2 size={14} /> {cancelling === lv._id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {modal && (
            <LeaveApplyModal onClose={() => setModal(false)} onSubmit={handleApply} balance={balance} submitting={submitting} />
          )}
        </div>
      </div>
    </HRLayout>
  );
}
