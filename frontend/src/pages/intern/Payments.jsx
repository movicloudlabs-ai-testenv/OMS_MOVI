import { useEffect, useState } from 'react';
import { paymentsAPI } from '../../api';
import PageWrapper from '../../components/PageWrapper';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
};
const STATUS_ICONS = { pending: 'schedule', paid: 'check_circle', rejected: 'cancel' };

export default function InternPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    paymentsAPI.getMy()
      .then(r => setPayments(r.data?.data || []))
      .catch(() => toast.error('Failed to load payments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const paid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="font-headline font-bold text-2xl text-slate-900">My Payments</h1>
          <p className="text-slate-500 text-sm mt-1">View your stipend and payment history</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Invoiced', value: total, icon: 'receipt_long', color: 'text-slate-700', bg: 'bg-slate-50' },
            { label: 'Paid', value: paid, icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending', value: pending, icon: 'schedule', color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(({ label, value, icon, color, bg }) => (
            <div key={label} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <span className={`material-symbols-outlined ${color} text-2xl`}>{icon}</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-extrabold text-slate-400">{label}</p>
                <p className={`font-headline font-bold text-xl mt-0.5 ${color}`}>₹{value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Payments table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="font-bold text-slate-900">Payment History</p>
            <button onClick={load} className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">refresh</span> Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-slate-200 text-5xl mb-3">payments</span>
              <p className="text-slate-500 font-semibold text-sm">No payments yet</p>
              <p className="text-slate-400 text-xs mt-1">Your invoices will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="text-left px-6 py-3 text-[11px] uppercase tracking-widest font-extrabold text-slate-400">Description</th>
                    <th className="text-left px-6 py-3 text-[11px] uppercase tracking-widest font-extrabold text-slate-400">Amount</th>
                    <th className="text-left px-6 py-3 text-[11px] uppercase tracking-widest font-extrabold text-slate-400">Status</th>
                    <th className="text-left px-6 py-3 text-[11px] uppercase tracking-widest font-extrabold text-slate-400">Date</th>
                    <th className="text-left px-6 py-3 text-[11px] uppercase tracking-widest font-extrabold text-slate-400">Slip</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">{p.description || 'Internship Stipend'}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">₹{p.amount?.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[p.status] || STATUS_STYLES.pending}`}>
                          <span className="material-symbols-outlined text-[12px]">{STATUS_ICONS[p.status] || 'schedule'}</span>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{format(new Date(p.createdAt), 'MMM d, yyyy')}</td>
                      <td className="px-6 py-4">
                        {p.slipUrl ? (
                          <a href={p.slipUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary text-xs font-semibold hover:underline">
                            <span className="material-symbols-outlined text-sm">download</span> Download
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
