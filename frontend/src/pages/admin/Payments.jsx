import { useEffect, useState } from 'react';
import { paymentsAPI, usersAPI } from '../../api';
import PageWrapper from '../../components/PageWrapper';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
};

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create / Edit modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [form, setForm] = useState({ internId: '', amount: '', description: '', status: 'pending', slipUrl: '' });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resPayments, resUsers] = await Promise.all([
        paymentsAPI.getAll(),
        usersAPI.getAll({ role: 'intern' })
      ]);
      setPayments(resPayments.data?.data || []);
      setInterns(resUsers.data?.data || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openModal = (payment = null) => {
    setEditingPayment(payment);
    if (payment) {
      setForm({
        internId: payment.internId?._id || '',
        amount: payment.amount || '',
        description: payment.description || '',
        status: payment.status || 'pending',
        slipUrl: payment.slipUrl || ''
      });
    } else {
      setForm({ internId: '', amount: '', description: '', status: 'pending', slipUrl: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.internId || !form.amount) {
      toast.error('Please fill required fields');
      return;
    }
    setSaving(true);
    try {
      if (editingPayment) {
        await paymentsAPI.update(editingPayment._id, form);
        toast.success('Payment updated');
      } else {
        await paymentsAPI.create(form);
        toast.success('Invoice created');
      }
      closeModal();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    try {
      await paymentsAPI.delete(id);
      setPayments(p => p.filter(x => x._id !== id));
      toast.success('Payment deleted');
    } catch {
      toast.error('Failed to delete payment');
    }
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-headline font-bold text-2xl text-slate-900">Manage Payments</h1>
            <p className="text-slate-500 text-sm mt-1">Create invoices and manage intern stipends</p>
          </div>
          <button onClick={() => openModal()} className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">add</span> Create Invoice
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-slate-200 text-5xl mb-3">account_balance_wallet</span>
              <p className="text-slate-500 font-semibold text-sm">No recorded payments</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/50">
                    <th className="text-left px-6 py-3 text-[11px] uppercase tracking-widest font-extrabold text-slate-400">Intern</th>
                    <th className="text-left px-6 py-3 text-[11px] uppercase tracking-widest font-extrabold text-slate-400">Amount</th>
                    <th className="text-left px-6 py-3 text-[11px] uppercase tracking-widest font-extrabold text-slate-400">Description</th>
                    <th className="text-left px-6 py-3 text-[11px] uppercase tracking-widest font-extrabold text-slate-400">Status</th>
                    <th className="text-left px-6 py-3 text-[11px] uppercase tracking-widest font-extrabold text-slate-400">Date</th>
                    <th className="text-right px-6 py-3 text-[11px] uppercase tracking-widest font-extrabold text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{p.internId?.name || 'Unknown'}</p>
                        <p className="text-[10px] text-slate-400">{p.internId?.email}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">₹{p.amount?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate" title={p.description}>{p.description}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${STATUS_STYLES[p.status] || STATUS_STYLES.pending}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{format(new Date(p.createdAt), 'MMM d, yyyy')}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openModal(p)} className="text-blue-500 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50 transition-colors mr-1">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(p._id)} className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPayment ? 'Edit Payment' : 'Create Invoice'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Intern</label>
            <select
              required
              disabled={editingPayment}
              className="w-full bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              value={form.internId}
              onChange={e => setForm(p => ({ ...p, internId: e.target.value }))}
            >
              <option value="">Select Intern</option>
              {interns.map(i => <option key={i._id} value={i._id}>{i.name} ({i.email})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Amount (₹)</label>
            <input
              type="number"
              required min="0" step="1"
              value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. 10000"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Description</label>
            <input
              type="text"
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Internship Stipend - Jan 2026"
            />
          </div>
          {editingPayment && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Status</label>
                <select
                  value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Slip URL</label>
                <input
                  type="url"
                  value={form.slipUrl} onChange={e => setForm(p => ({ ...p, slipUrl: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}
          <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 mt-4">
            <button type="button" onClick={closeModal} className="px-5 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary px-5 py-2 text-sm">
              {saving ? 'Saving...' : editingPayment ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
