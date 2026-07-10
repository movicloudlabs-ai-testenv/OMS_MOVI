import { useState, useEffect, useMemo } from 'react';
import HRLayout from '../../components/hr/HRLayout';
import { hrAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { Star, ShieldAlert, Plus, X, Award, Users, Search, Filter, RefreshCw, ChevronDown } from 'lucide-react';
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

function TinyTrend({ color = '#F97316' }) {
  // Match Projects page sparkline (line with dotted points)
  const points = [
    { x: 2, y: 18 },
    { x: 18, y: 15 },
    { x: 34, y: 14 },
    { x: 50, y: 12 },
    { x: 66, y: 13 },
    { x: 82, y: 11 },
    { x: 98, y: 13 },
    { x: 118, y: 10 },
  ];
  const d = `M${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L${p.x} ${p.y}`).join(' ');
  return (
    <svg viewBox="0 0 120 24" className="h-6 w-full">
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {points.map((p, idx) => (
        <circle key={idx} cx={p.x} cy={p.y} r="2.4" fill="white" stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
}

function MetricCard({ title, value, suffix, iconBg, iconColor, icon: Icon, trendColor, subtitle }) {
  return (
    <div className="rounded-[20px] border border-[#F3E8DE] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-[#6B7280]">{title}</p>
          <div className="mt-1.5 flex items-end gap-1">
            <span className="text-[28px] font-bold leading-none text-[#111827]">{value}</span>
            {suffix ? <span className="pb-0.5 text-[13px] text-[#9CA3AF]">{suffix}</span> : null}
          </div>
          {subtitle ? <p className="mt-1 text-[11px] text-[#9CA3AF]">{subtitle}</p> : null}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
      <div className="mt-3">
        <TinyTrend color={trendColor} />
      </div>
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
function PeopleTable({ people, selectedId, onSelect, label, activeTab, onTabChange, internCount, employeeCount }) {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const departments = useMemo(() => {
    const unique = [...new Set((people || []).map((p) => p.department?.name).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [people]);

  const filtered = useMemo(() =>
    people.filter((p) => {
      const matchesSearch =
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.employeeId?.toLowerCase().includes(search.toLowerCase());
      const matchesDepartment = departmentFilter === 'all' || p.department?.name === departmentFilter;
      return matchesSearch && matchesDepartment;
    }),
    [people, search, departmentFilter]
  );

  return (
    <div className="flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-[20px] border border-[#F3E8DE] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      {/* Tabs — flush to card top like reference */}
      <div className="flex items-center gap-1 border-b border-[#F6EADF] px-5 pt-3">
        {[
          { id: 'interns', label: 'Intern Ratings', count: internCount },
          { id: 'employees', label: 'Employee Ratings', count: employeeCount },
        ].map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`inline-flex items-center gap-2 border-b-2 px-3 pb-2.5 pt-1 text-[13px] font-semibold transition-colors ${
              activeTab === tab.id
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-[#9CA3AF] hover:text-[#6B7280]'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
              activeTab === tab.id ? 'bg-[#FFF1E8] text-[#F97316]' : 'bg-[#F3F4F6] text-[#9CA3AF]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search / filters — tight under tabs */}
      <div className="flex flex-col gap-2.5 border-b border-[#F6EADF] px-5 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-[420px]">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder={`Search ${label.toLowerCase()}s by name or ID...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#EEE5DB] bg-[#FFFDFC] py-2.5 pl-10 pr-4 text-[13px] focus:border-[#F97316] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[190px]">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-[#EEE5DB] bg-white py-2.5 pl-3.5 pr-9 text-[13px] text-[#374151] focus:border-[#F97316] focus:outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          </div>
          <button
            type="button"
            className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-[#EEE5DB] bg-white text-[#6B7280] transition hover:bg-[#F9FAFB]"
          >
            <Filter size={17} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#F6EADF] bg-[#FFFEFD]">
              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">Name</th>
              <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">ID</th>
              <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">Department</th>
              <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">Reviews</th>
              <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">Avg Rating</th>
              <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">Last Review</th>
              <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">Status</th>
              <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map(person => {
              const avg = combinedRating(person.performanceRatings);
              const isSelected = selectedId === person._id;
              const lastReview = person.performanceRatings?.length
                ? [...person.performanceRatings].sort((a, b) => b.week - a.week)[0]
                : null;
              return (
                <tr key={person._id} onClick={() => onSelect(person)}
                  className={`cursor-pointer border-b border-[#FAEFE7] transition-colors last:border-0 hover:bg-[#FFFBF8] ${isSelected ? 'bg-[#FFF7F2]' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF1E8] font-bold text-[11px] text-[#F97316]">
                        {person.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0F172A]">{person.name}</p>
                        <p className="text-[11px] text-[#94A3B8]">{person.designation || label}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[12px] font-mono text-[#64748B]">{person.employeeId || '—'}</td>
                  <td className="px-3 py-3 text-[12px] text-[#64748B]">{person.department?.name || '—'}</td>
                  <td className="px-3 py-3 text-[13px] text-[#64748B]">{person.performanceRatings?.length || 0}</td>
                  <td className="px-3 py-3">
                    <div>
                      <div className="flex items-center gap-1">
                        <Star size={13} className="text-amber-400" fill="currentColor" />
                        <span className="text-[13px] font-bold text-[#0F172A]">{avg}</span>
                        <span className="text-[11px] text-[#94A3B8]">/5</span>
                      </div>
                      <RoleBreakdown ratings={person.performanceRatings} />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-[#64748B]">
                    {lastReview ? `Week ${lastReview.week}` : 'No review yet'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      (person.performanceRatings?.length || 0) > 0
                        ? 'bg-[#ECFDF5] text-[#16A34A]'
                        : 'bg-[#FFF7ED] text-[#D97706]'
                    }`}>
                      {(person.performanceRatings?.length || 0) > 0 ? 'Reviewed' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={e => { e.stopPropagation(); onSelect(person); }}
                      className="ml-auto inline-flex items-center gap-1 rounded-xl border border-[#F3E8DE] bg-[#FFF8F3] px-3 py-1.5 text-[12px] font-semibold text-[#F97316] transition hover:bg-[#FFF1E8]">
                      <Plus size={13} /> Evaluate
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={8} className="px-4 py-10">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF8F3] text-[#F59E0B]">
                      <ShieldAlert size={24} />
                    </div>
                    <p className="text-[18px] font-semibold text-[#111827]">No {label.toLowerCase()} found</p>
                    <p className="mt-1 text-[13px] text-[#9CA3AF]">No {label.toLowerCase()}s match your current filters.</p>
                    <button
                      type="button"
                      className="mt-5 rounded-xl border border-[#F3E8DE] bg-[#FFF8F3] px-4 py-2 text-[13px] font-semibold text-[#F97316]"
                    >
                      Add New {label}
                    </button>
                  </div>
                </td>
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
      <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col gap-3 pb-4 font-sans text-[#0F172A]">

        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Performance Reviews</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">Submit weekly evaluations and track team performance</p>
          </div>
          <button onClick={loadData}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-[13px] font-medium text-[#111827] transition hover:bg-[#F9FAFB] self-start">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard
            title="Average Rating"
            value={avgRating}
            suffix="/ 5"
            subtitle="Based on all reviews"
            icon={Star}
            iconBg="bg-[#FFF7ED]"
            iconColor="text-[#F97316]"
            trendColor="#F59E0B"
          />
          <MetricCard
            title="Reviews Submitted"
            value={totalReviews}
            subtitle="This period"
            icon={Award}
            iconBg="bg-[#ECFDF5]"
            iconColor="text-[#16A34A]"
            trendColor="#22C55E"
          />
          <MetricCard
            title={`${label}s Managed`}
            value={people.length}
            subtitle={`Total ${label.toLowerCase()}s under review`}
            icon={Users}
            iconBg="bg-[#EFF6FF]"
            iconColor="text-[#3B82F6]"
            trendColor="#60A5FA"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <span className="material-symbols-outlined text-[32px] text-[#2563EB] animate-spin">sync</span>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-3">
            <PeopleTable
              people={people}
              selectedId={selected?._id}
              onSelect={p => setSelected(prev => prev?._id === p._id ? null : p)}
              label={label}
              activeTab={activeTab}
              onTabChange={(tab) => { setActiveTab(tab); setSelected(null); }}
              internCount={interns.length}
              employeeCount={employees.length}
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
