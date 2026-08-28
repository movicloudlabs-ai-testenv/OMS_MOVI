import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Save, AlertCircle, CheckCircle, Lock, X, Check, Minus, ShieldAlert } from 'lucide-react';
import DynamicLayout from '../../components/shared/DynamicLayout';
import { adminAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/shared/AccessDenied';

// ── Role badge colour pool (cycles if more roles than colours) ────────────
const ROLE_COLOURS = [
  'bg-red-100 text-red-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-green-100 text-green-700',
  'bg-gray-100 text-gray-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
];

// ── Risk tiers ─────────────────────────────────────────────────────────────
// Prefer the backend riskLevel when set; otherwise derive from the action so
// dangerous permissions (delete/manage) always read as risky.
const ACTION_RISK = {
  delete: 'critical', manage: 'critical',
  update: 'high', approve: 'high',
  create: 'medium', export: 'medium', schedule: 'medium',
  read: 'low',
};
const RISK_META = {
  critical: { text: 'text-rose-600',  col: 'bg-rose-50/50',  dot: 'bg-rose-500',  label: 'Critical' },
  high:     { text: 'text-amber-600', col: 'bg-amber-50/40', dot: 'bg-amber-500', label: 'High' },
  medium:   { text: 'text-sky-600',   col: '',               dot: 'bg-sky-500',   label: 'Medium' },
  low:      { text: 'text-slate-500', col: '',               dot: 'bg-slate-300', label: 'Low' },
};
const riskOf = (perm) => {
  const lvl = (perm.riskLevel || '').toLowerCase();
  if (lvl === 'critical' || lvl === 'high' || lvl === 'medium') return lvl;
  return ACTION_RISK[perm.action] || 'low';
};

export default function AdminAccessMatrix() {
  const { hasPermission: authHasPermission, refreshUser } = useAuth();
  const canManageMatrix = authHasPermission('Roles', 'update');

  // ── State ─────────────────────────────────────────────────────────────────
  const [roles,       setRoles]       = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [matrix,      setMatrix]      = useState({});      // { roleId: [permissionId, ...] }
  const [originalMatrix, setOriginalMatrix] = useState({});
  const [isDirty,     setIsDirty]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [showToast,   setShowToast]   = useState(false);
  const [toastMsg,    setToastMsg]    = useState('');
  const [toastType,   setToastType]   = useState('success');
  const [loadError,   setLoadError]   = useState('');
  const [showDiff,    setShowDiff]    = useState(false);
  const [hoverRole,   setHoverRole]   = useState(null);   // cross-hair row
  const [hoverPerm,   setHoverPerm]   = useState(null);   // cross-hair column

  // ── Load access matrix from backend ──────────────────────────────────────
  const fetchMatrix = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await adminAPI.getAccessMatrix();
      const { roles: r, permissions: p, matrix: m } = response.data.data;
      setRoles(r || []);
      setPermissions(p || []);
      setMatrix(m || {});
      setOriginalMatrix(JSON.parse(JSON.stringify(m || {})));
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to load access matrix', err);
      setLoadError(err.response?.data?.message || 'Failed to load access matrix.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatrix(); }, []);

  // ── Group permissions by resource ─────────────────────────────────────────
  const resourceGroups = permissions.reduce((acc, perm) => {
    const resource = perm.resource || 'Other';
    if (!acc[resource]) acc[resource] = [];
    acc[resource].push(perm);
    return acc;
  }, {});
  const resourceNames = Object.keys(resourceGroups);
  const allPermIds = permissions.map(p => p._id);

  const editableRoles = roles.filter(r => r.slug !== 'super-admin');

  // ── Read helpers ──────────────────────────────────────────────────────────
  const isChecked = (roleId, permId) => (matrix[roleId] || []).includes(permId);
  const isChanged = (roleId, permId) => {
    const orig = (originalMatrix[roleId] || []).includes(permId);
    const cur  = (matrix[roleId] || []).includes(permId);
    return orig !== cur;
  };
  const roleChangedCount = (roleId) => {
    const orig = new Set(originalMatrix[roleId] || []);
    const cur  = new Set(matrix[roleId] || []);
    let n = 0;
    allPermIds.forEach(id => { if (orig.has(id) !== cur.has(id)) n++; });
    return n;
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const setRolePerms = (roleId, nextArr) => {
    setMatrix(prev => ({ ...prev, [roleId]: nextArr }));
    setIsDirty(true);
  };

  const handleToggle = (roleId, permissionId) => {
    if (!canManageMatrix) return;
    const role = roles.find(r => r._id === roleId);
    if (role?.slug === 'super-admin') return;
    const rolePerms = matrix[roleId] || [];
    setRolePerms(roleId, rolePerms.includes(permissionId)
      ? rolePerms.filter(id => id !== permissionId)
      : [...rolePerms, permissionId]);
  };

  // Bulk: whole role row → grant all / clear all
  const toggleRole = (roleId, grant) => {
    if (!canManageMatrix) return;
    const role = roles.find(r => r._id === roleId);
    if (role?.slug === 'super-admin') return;
    setRolePerms(roleId, grant ? [...allPermIds] : []);
  };

  // Bulk: one permission column → toggle across every editable role
  const toggleColumn = (permId) => {
    if (!canManageMatrix || editableRoles.length === 0) return;
    const allHave = editableRoles.every(r => (matrix[r._id] || []).includes(permId));
    setMatrix(prev => {
      const next = { ...prev };
      editableRoles.forEach(r => {
        const cur = new Set(next[r._id] || []);
        if (allHave) cur.delete(permId); else cur.add(permId);
        next[r._id] = [...cur];
      });
      return next;
    });
    setIsDirty(true);
  };

  // Bulk: entire resource group (all its actions) → toggle across every editable role
  const toggleResource = (resName) => {
    if (!canManageMatrix || editableRoles.length === 0) return;
    const ids = resourceGroups[resName].map(p => p._id);
    const allHave = editableRoles.every(r => {
      const set = new Set(matrix[r._id] || []);
      return ids.every(id => set.has(id));
    });
    setMatrix(prev => {
      const next = { ...prev };
      editableRoles.forEach(r => {
        const cur = new Set(next[r._id] || []);
        ids.forEach(id => { if (allHave) cur.delete(id); else cur.add(id); });
        next[r._id] = [...cur];
      });
      return next;
    });
    setIsDirty(true);
  };

  // ── Diff (matrix vs saved) ────────────────────────────────────────────────
  const computeDiff = () => {
    const labelOf = (id) => {
      const p = permissions.find(x => x._id === id);
      return p ? `${p.resource}·${p.action}` : id;
    };
    return roles.map(role => {
      const orig = new Set(originalMatrix[role._id] || []);
      const cur  = new Set(matrix[role._id] || []);
      const added   = [...cur].filter(id => !orig.has(id)).map(labelOf);
      const removed = [...orig].filter(id => !cur.has(id)).map(labelOf);
      return { role, added, removed };
    }).filter(d => d.added.length || d.removed.length);
  };
  const diff = showDiff ? computeDiff() : [];

  const showNotification = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const requestSave = () => { if (isDirty && canManageMatrix) setShowDiff(true); };
  const handleDiscard = () => {
    setMatrix(JSON.parse(JSON.stringify(originalMatrix)));
    setIsDirty(false);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      await adminAPI.saveAccessMatrix(matrix);
      setOriginalMatrix(JSON.parse(JSON.stringify(matrix)));
      setIsDirty(false);
      setShowDiff(false);
      showNotification('Access Matrix saved successfully', 'success');
      refreshUser?.();
    } catch (err) {
      console.error('Failed to save access matrix', err);
      showNotification(err.response?.data?.message || 'Failed to save. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading Skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <DynamicLayout title="Access Matrix">
        <div className="font-sans text-[#0F172A] w-full flex flex-col h-full gap-6 pb-20">
          <div>
            <div className="h-6 bg-[#E2E8F0] rounded w-48 mb-2 animate-pulse" />
            <div className="h-4 bg-[#E2E8F0] rounded w-72 animate-pulse" />
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-8 flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3 text-[#64748B]">
              <svg className="animate-spin h-8 w-8 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm font-medium">Loading access matrix...</p>
            </div>
          </div>
        </div>
      </DynamicLayout>
    );
  }

  // ── Load Error ────────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <DynamicLayout title="Access Matrix">
        <div className="font-sans text-[#0F172A] w-full flex flex-col h-full gap-6 pb-20">
          <div className="bg-[#FEF2F2] border border-[#DC2626] rounded-lg p-4 text-sm text-[#DC2626] font-medium flex items-center gap-3">
            <AlertCircle size={18} />
            <span>{loadError}</span>
            <button onClick={fetchMatrix} className="ml-auto text-xs underline">Retry</button>
          </div>
        </div>
      </DynamicLayout>
    );
  }

  if (!canManageMatrix) return <DynamicLayout title="Access Matrix"><AccessDenied message="You don't have permission to manage the Access Matrix." /></DynamicLayout>;

  return (
    <DynamicLayout
      title="Access Matrix"
      subtitle="Toggle permissions per role. Click a column or a module header to apply to all roles at once."
      actions={(
        <>
          <button className="border border-[#E2E8F0] bg-white text-[#0F172A] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
            <Download size={16} /> Export
          </button>
          <button
            onClick={requestSave}
            disabled={!isDirty || saving || !canManageMatrix}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-white ${
              isDirty && !saving && canManageMatrix ? 'bg-[#EA580C] hover:bg-[#C2410C]' : 'bg-[#94A3B8] cursor-not-allowed'
            }`}
          >
            <Save size={16} /> Review &amp; Save
            {isDirty && !saving && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
            )}
          </button>
        </>
      )}
    >
      <div className="font-sans text-[#0F172A] w-full flex flex-col h-full gap-5 pb-4 relative">

        {/* Risk legend */}
        <div className="flex items-center gap-4 text-[11px] text-[#64748B] -mt-1">
          <span className="font-semibold uppercase tracking-wider text-[#94A3B8]">Risk</span>
          {['critical', 'high', 'medium', 'low'].map(r => (
            <span key={r} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${RISK_META[r].dot}`} />
              {RISK_META[r].label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 ml-2">
            <span className="w-2.5 h-2.5 rounded-sm ring-2 ring-amber-400 bg-white" /> Unsaved change
          </span>
        </div>

        {/* Matrix Table — zoom 1.2 enlarges the matrix content (cells, text,
            checkboxes) without affecting the sidebar or page header. */}
        <div
          style={{ zoom: 1.2 }}
          className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex-1 flex flex-col relative overflow-hidden"
        >
          <div className="overflow-x-auto w-full custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse whitespace-nowrap" onMouseLeave={() => { setHoverRole(null); setHoverPerm(null); }}>
              <thead>
                {/* Resource group headers */}
                <tr className="bg-[#F8FAFC]">
                  <th className="sticky left-0 top-0 z-30 bg-[#F8FAFC] border-b border-r border-[#E2E8F0] min-w-[220px] max-w-[220px] p-0" />
                  {resourceNames.map((resName, i) => (
                    <th
                      key={resName}
                      colSpan={resourceGroups[resName].length}
                      onClick={() => toggleResource(resName)}
                      title={`Toggle all "${resName}" permissions for every role`}
                      className={`px-4 py-3 text-center font-semibold text-[#0F172A] text-xs uppercase tracking-wider border-b border-[#E2E8F0] bg-[#F1F5F9] cursor-pointer hover:bg-[#E2E8F0] transition-colors select-none ${
                        i !== resourceNames.length - 1 ? 'border-r-2' : ''
                      }`}
                    >
                      {resName}
                    </th>
                  ))}
                </tr>
                {/* Action-level headers */}
                <tr className="bg-white">
                  <th className="sticky left-0 top-0 z-30 bg-[#F8FAFC] px-5 py-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider border-b border-r border-[#E2E8F0] min-w-[220px] max-w-[220px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    Role
                  </th>
                  {resourceNames.map((resName, resIdx) =>
                    resourceGroups[resName].map((perm, permIdx) => {
                      const risk = riskOf(perm);
                      const meta = RISK_META[risk];
                      const isLastInGroup = permIdx === resourceGroups[resName].length - 1 && resIdx !== resourceNames.length - 1;
                      const colHot = hoverPerm === perm._id;
                      return (
                        <th
                          key={perm._id}
                          onClick={() => toggleColumn(perm._id)}
                          onMouseEnter={() => setHoverPerm(perm._id)}
                          title={`${perm.label || perm.name} · ${meta.label} risk — click to toggle for all roles`}
                          className={`w-[62px] min-w-[62px] text-center text-[11px] font-semibold px-1 py-3 border-b border-[#E2E8F0] cursor-pointer transition-colors select-none ${meta.text} ${colHot ? 'bg-[#EFF6FF]' : meta.col || 'bg-[#F8FAFC]'} ${isLastInGroup ? 'border-r-2' : ''}`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span>{perm.action?.charAt(0).toUpperCase() + perm.action?.slice(1) || perm.name}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          </div>
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>
              <tbody>
                {roles.map((role, roleIdx) => {
                  const isLocked = role.slug === 'super-admin';
                  const colour = ROLE_COLOURS[roleIdx % ROLE_COLOURS.length];
                  const changed = roleChangedCount(role._id);
                  const rowHot = hoverRole === role._id;

                  const zebra = roleIdx % 2 === 1 ? 'bg-[#FBFCFE]' : 'bg-white';
                  return (
                    <tr key={role._id} className={`border-b border-[#F1F5F9] last:border-0 group ${rowHot ? 'bg-[#F8FAFC]' : zebra}`}>
                      {/* Sticky Role Name Column */}
                      <td className={`sticky left-0 z-20 min-w-[220px] max-w-[220px] px-5 py-5 border-r border-[#E2E8F0] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${rowHot ? 'bg-[#F8FAFC]' : zebra}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase ${colour}`}>
                              {role.name}
                            </span>
                            {isLocked && <Lock size={13} className="text-[#94A3B8] flex-shrink-0" />}
                            {changed > 0 && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5">{changed}</span>
                            )}
                          </div>
                          {!isLocked && canManageMatrix && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button onClick={() => toggleRole(role._id, true)} title="Grant all" className="w-5 h-5 rounded flex items-center justify-center text-emerald-600 hover:bg-emerald-50 border border-[#E2E8F0]">
                                <Check size={12} />
                              </button>
                              <button onClick={() => toggleRole(role._id, false)} title="Clear all" className="w-5 h-5 rounded flex items-center justify-center text-rose-500 hover:bg-rose-50 border border-[#E2E8F0]">
                                <Minus size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Permission cells */}
                      {resourceNames.map((resName, resIdx) =>
                        resourceGroups[resName].map((perm, permIdx) => {
                          const checked = isChecked(role._id, perm._id);
                          const changedCell = isChanged(role._id, perm._id);
                          const isLastInGroup = permIdx === resourceGroups[resName].length - 1 && resIdx !== resourceNames.length - 1;
                          const meta = RISK_META[riskOf(perm)];
                          const crosshair = rowHot || hoverPerm === perm._id;

                          return (
                            <td
                              key={`${role._id}-${perm._id}`}
                              onMouseEnter={() => { setHoverRole(role._id); setHoverPerm(perm._id); }}
                              className={`w-[62px] min-w-[62px] text-center px-1 py-5 transition-colors ${isLastInGroup ? 'border-r-2 border-[#E2E8F0]' : ''} ${crosshair ? 'bg-[#EFF6FF]/60' : meta.col} `}
                            >
                              {isLocked ? (
                                <div className="flex items-center justify-center">
                                  <div className="w-[22px] h-[22px] rounded bg-[#E2E8F0] border border-[#CBD5E1] flex items-center justify-center cursor-not-allowed">
                                    <Lock size={11} className="text-[#94A3B8]" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <div
                                    onClick={() => canManageMatrix && handleToggle(role._id, perm._id)}
                                    className={`flex items-center justify-center w-[22px] h-[22px] rounded border transition-all ${canManageMatrix ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
                                      ${checked ? 'bg-[#EA580C] border-[#EA580C]' : 'bg-white border-[#CBD5E1] hover:border-[#94A3B8]'}
                                      ${changedCell ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                                  >
                                    {checked && <Check size={15} strokeWidth={3} className="text-white" />}
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}

                {roles.length === 0 && (
                  <tr>
                    <td colSpan={1 + permissions.length} className="px-4 py-12 text-center text-[#64748B] text-sm">
                      No roles or permissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unsaved Changes Banner */}
        <AnimatePresence>
          {isDirty && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-[#1E293B] text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] lg:pl-72"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="text-[#F59E0B]" size={20} />
                <p className="text-sm font-medium">You have unsaved changes to the Access Matrix</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button onClick={handleDiscard} className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium border border-[#64748B] text-white hover:bg-[#334155] transition-colors">
                  Discard
                </button>
                <button onClick={requestSave} className="flex-1 sm:flex-none bg-[#EA580C] hover:bg-[#C2410C] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  Review &amp; Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Diff Preview Modal */}
        <AnimatePresence>
          {showDiff && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setShowDiff(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                className="relative bg-white rounded-2xl shadow-xl border border-[#E2E8F0] w-full max-w-lg z-10 max-h-[85vh] flex flex-col"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9]">
                  <h2 className="text-lg font-semibold text-[#0F172A]">Review changes</h2>
                  <button onClick={() => !saving && setShowDiff(false)} className="text-[#94A3B8] hover:text-[#0F172A]"><X size={18} /></button>
                </div>
                <div className="px-6 py-4 overflow-y-auto space-y-4">
                  {diff.length === 0 ? (
                    <p className="text-sm text-[#64748B] py-4 text-center">No changes to save.</p>
                  ) : diff.map(({ role, added, removed }) => (
                    <div key={role._id} className="border border-[#E2E8F0] rounded-lg p-3">
                      <p className="text-[13px] font-semibold text-[#0F172A] mb-2">{role.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {added.map(l => (
                          <span key={`a-${l}`} className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">+ {l}</span>
                        ))}
                        {removed.map(l => (
                          <span key={`r-${l}`} className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">− {l}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-[#F1F5F9]">
                  <button onClick={() => setShowDiff(false)} disabled={saving} className="flex-1 border border-[#E2E8F0] text-[#0F172A] rounded-lg py-2.5 text-sm font-medium hover:bg-[#F8FAFC] disabled:opacity-50">Cancel</button>
                  <button onClick={doSave} disabled={saving || diff.length === 0} className="flex-1 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? 'Saving…' : `Confirm & Save`}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Toast Notification */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} transition={{ duration: 0.3 }}
              className={`fixed top-4 right-4 z-[110] ${toastType === 'success' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'} text-white rounded-lg px-4 py-3 flex items-center gap-2 shadow-lg`}
            >
              {toastType === 'success' ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
              <span className="text-sm font-medium">{toastMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </DynamicLayout>
  );
}
