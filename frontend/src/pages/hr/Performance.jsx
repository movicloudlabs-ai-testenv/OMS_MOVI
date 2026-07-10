import { useState, useEffect, useMemo } from 'react';
import HRLayout from '../../components/hr/HRLayout';
import { hrAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { Star, ShieldAlert, Plus, X, Award, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';

// ─── Shared helpers ────────────────────────────────────────────────────────────
function roleAvg(ratings, source) {
  const filtered = (ratings || []).filter(r => r.source === source);
  if (!filtered.length) return null;
  return filtered.reduce((a, r) => a + r.rating, 0) / filtered.length;
}

function combinedRating(ratings) {
  const hr  = roleAvg(ratings, 'hr');
  const pmo = roleAvg(ratings, 'pmo');
  if (hr !== null && pmo !== null) return ((hr + pmo) / 2).toFixed(1);
  if (hr !== null) return hr.toFixed(1);
  if (pmo !== null) return pmo.toFixed(1);
  return '0.0';
}

function StarRow({ rating, size = 12 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size}
          fill={i <= Math.round(rating) ? 'currentColor' : 'none'}
          className={i <= Math.round(rating) ? 'text-amber-400' : 'text-[#E2E8F0]'} />
      ))}
    </div>
  );
}

function RoleBreakdown({ ratings }) {
  const hr  = roleAvg(ratings, 'hr');
  const pmo = roleAvg(ratings, 'pmo');
  if (hr === null && pmo === null) return null;
  return (
    <div className="flex items-center gap-3 mt-1">
      {hr !== null && (
        <span className="flex items-center gap-1 text-[11px] text-[#64748B]">
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold text-[10px]">HR</span>
          {hr.toFixed(1)}★
        </span>
      )}
      {pmo !== null && (
        <span className="flex items-center gap-1 text-[11px] text-[#64748B]">
          <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded font-bold text-[10px]">PMO</span>
          {pmo.toFixed(1)}★
        </span>
      )}
    </div>
  );
}

// ─── Rating Panel (shared between intern & employee tabs) ──────────────────────
function RatingPanel({ person, label, onSubmit, onClose }) {
  const [week,        setWeek]        = useState(1);
  const [rating,      setRating]      = useState(5);
  const [note,        setNote]        = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [hover,       setHover]       = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(person._id, { week: Number(week), rating: Number(rating), note });
      toast.success('Evaluation submitted!');
      setWeek(w => w + 1);
      setNote('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full lg:w-1/3 bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex flex-col overflow-hidden max-h-[800px]">
      <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
        <div>
          <h3 className="text-[14px] font-bold text-[#0F172A]">{person.name}</h3>
          <p className="text-[12px] text-[#64748B]">{label} Performance Review</p>
        </div>
        <button onClick={onClose} className="text-[#64748B] hover:bg-[#E2E8F0] p-1.5 rounded-full transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Combined score summary */}
      {(person.performanceRatings?.length > 0) && (
        <div className="px-5 py-3 border-b border-[#E2E8F0] bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-amber-400" fill="currentColor" />
            <span className="text-[15px] font-bold text-[#0F172A]">{combinedRating(person.performanceRatings)}</span>
            <span className="text-[11px] text-[#94A3B8]">/ 5 combined</span>
          </div>
          <RoleBreakdown ratings={person.performanceRatings} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Submit form */}
        <form onSubmit={handleSubmit} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-4">
          <h4 className="text-[12px] font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
            <Plus size={14} /> Submit Evaluation
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Week</label>
              <input type="number" min="1" max="52" value={week}
                onChange={e => setWeek(e.target.value)} required
                className="w-full border border-[#E2E8F0] bg-white rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Stars</label>
              <div className="flex items-center gap-1 mt-2">
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button"
                    onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(s)} className="focus:outline-none">
                    <Star size={20} fill={(hover || rating) >= s ? 'currentColor' : 'none'}
                      className={(hover || rating) >= s ? 'text-amber-400' : 'text-[#CBD5E1]'} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Notes</label>
            <textarea rows="3" placeholder="Feedback on performance, strengths, areas to improve..."
              value={note} onChange={e => setNote(e.target.value)}
              className="w-full border border-[#E2E8F0] bg-white rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#2563EB] resize-none" />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-2 bg-[#2563EB] text-white rounded-lg text-[13px] font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-50">
            {submitting ? 'Saving...' : 'Submit Evaluation'}
          </button>
        </form>

        {/* History */}
        <div>
          <h4 className="text-[12px] font-bold text-[#0F172A] uppercase tracking-wider mb-3">Evaluation History</h4>
          {(person.performanceRatings || []).length > 0 ? (
            <div className="space-y-2.5">
              {[...person.performanceRatings].sort((a,b) => b.week - a.week).map((r, idx) => (
                <div key={idx} className="border border-[#E2E8F0] rounded-xl p-3 bg-white space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-[#0F172A]">Week {r.week}</span>
                      {r.source === 'pmo'
                        ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">PMO</span>
                        : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">HR</span>}
                    </div>
                    <StarRow rating={r.rating} />
                  </div>
                  {r.note && <p className="text-[12px] text-[#64748B] leading-relaxed">{r.note}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-[#E2E8F0] rounded-xl">
              <ShieldAlert size={22} className="text-[#CBD5E1] mx-auto mb-2" />
              <p className="text-[12px] text-[#64748B]">No evaluations yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── People Table ──────────────────────────────────────────────────────────────
function PeopleTable({ people, selectedId, onSelect, label }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() =>
    people.filter(p => p.name?.toLowerCase().includes(search.toLowerCase())),
    [people, search]
  );

  return (
    <div className="flex-1 bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[16px]">search</span>
          <input type="text" placeholder={`Search ${label}...`} value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-[#E2E8F0] rounded-md text-[13px] focus:outline-none focus:border-[#2563EB]" />
        </div>
        <span className="text-[12px] text-[#64748B]">{filtered.length} {label}</span>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="px-4 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Reviews</th>
              <th className="px-4 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Avg Rating</th>
              <th className="px-4 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map(person => {
              const avg = combinedRating(person.performanceRatings);
              const isSelected = selectedId === person._id;
              return (
                <tr key={person._id} onClick={() => onSelect(person)}
                  className={`border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors cursor-pointer last:border-0 ${isSelected ? 'bg-[#EFF6FF]' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold text-[11px] shrink-0">
                        {person.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0F172A]">{person.name}</p>
                        <p className="text-[11px] text-[#94A3B8]">{person.designation || label}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] font-mono text-[#64748B]">{person.employeeId || '—'}</td>
                  <td className="px-4 py-3 text-[13px] text-[#64748B]">{person.performanceRatings?.length || 0} review(s)</td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="flex items-center gap-1">
                        <Star size={13} className="text-amber-400" fill="currentColor" />
                        <span className="text-[13px] font-bold text-[#0F172A]">{avg}</span>
                        <span className="text-[11px] text-[#94A3B8]">/5</span>
                      </div>
                      <RoleBreakdown ratings={person.performanceRatings} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={e => { e.stopPropagation(); onSelect(person); }}
                      className="text-[#2563EB] hover:underline text-[12px] font-semibold flex items-center gap-1 ml-auto">
                      <Plus size={13} /> Evaluate
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[13px] text-[#94A3B8]">No {label} found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HRPerformance() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('Interns', 'read');
  const [activeTab, setActiveTab]     = useState('interns');
  const [interns,   setInterns]       = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [loading,   setLoading]       = useState(true);
  const [selected,  setSelected]      = useState(null);

  const loadData = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const [internRes, empRes] = await Promise.all([
        hrAPI.getInterns(),
        hrAPI.getEmployees(),
      ]);
      setInterns(internRes.data?.data || []);
      setEmployees(empRes.data?.data || []);
    } catch {
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (!canRead) return <HRLayout bare><AccessDenied message="You don't have permission to view performance data." /></HRLayout>;

  const isInternTab = activeTab === 'interns';
  const people      = isInternTab ? interns : employees;
  const label       = isInternTab ? 'Intern' : 'Employee';

  const handleRatingSubmit = async (id, data) => {
    if (isInternTab) {
      const res = await hrAPI.addInternPerformance(id, data);
      const updated = res.data.data;
      setInterns(prev => prev.map(i => i._id === id ? { ...i, performanceRatings: updated } : i));
      setSelected(prev => prev?._id === id ? { ...prev, performanceRatings: updated } : prev);
    } else {
      const res = await hrAPI.addEmployeePerformance(id, data);
      const updated = res.data.data;
      setEmployees(prev => prev.map(e => e._id === id ? { ...e, performanceRatings: updated } : e));
      setSelected(prev => prev?._id === id ? { ...prev, performanceRatings: updated } : prev);
    }
  };

  // Stats
  const totalReviews = people.reduce((a, p) => a + (p.performanceRatings?.length || 0), 0);
  const allRatings   = people.flatMap(p => p.performanceRatings || []);
  const avgRating    = combinedRating(allRatings);

  return (
    <HRLayout bare>
      <div className="font-sans text-[#0F172A] w-full flex flex-col gap-5 max-w-[1400px] mx-auto pb-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Performance Reviews</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">Submit weekly evaluations and track team performance</p>
          </div>
          <button onClick={loadData}
            className="border border-[#E2E8F0] text-[#0F172A] px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-1.5 self-start">
            <span className="material-symbols-outlined text-[16px]">sync</span> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Average Rating</p>
              <p className="text-[26px] font-bold text-[#0F172A] leading-none">{avgRating}<span className="text-[14px] text-[#94A3B8] font-normal"> / 5</span></p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FFFBEB] flex items-center justify-center">
              <Star size={20} className="text-amber-400" fill="currentColor" />
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Reviews Submitted</p>
              <p className="text-[26px] font-bold text-[#16A34A] leading-none">{totalReviews}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#ECFDF5] flex items-center justify-center">
              <Award size={20} className="text-[#16A34A]" />
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">{label}s Managed</p>
              <p className="text-[26px] font-bold text-[#2563EB] leading-none">{people.length}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center">
              <Users size={20} className="text-[#2563EB]" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-lg w-fit">
          {[
            { id: 'interns',   label: 'Intern Ratings',   count: interns.length },
            { id: 'employees', label: 'Employee Ratings',  count: employees.length },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelected(null); }}
              className={`px-5 py-2 rounded-md text-[12px] font-bold transition-all flex items-center gap-2 ${
                activeTab === tab.id ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}>
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-[#2563EB] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-5 items-stretch">
            <PeopleTable
              people={people}
              selectedId={selected?._id}
              onSelect={p => setSelected(prev => prev?._id === p._id ? null : p)}
              label={label}
            />
            {selected && (
              <RatingPanel
                person={selected}
                label={label}
                onSubmit={handleRatingSubmit}
                onClose={() => setSelected(null)}
              />
            )}
          </div>
        )}
      </div>
    </HRLayout>
  );
}
