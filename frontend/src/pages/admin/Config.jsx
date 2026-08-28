import { useState } from 'react';
import PageWrapper from '../../components/PageWrapper';
import toast from 'react-hot-toast';

export default function AdminConfig() {
  const [config, setConfig] = useState({
    jwt_expires: '7d',
    max_upload_size: '10',
    allow_self_registration: false,
    maintenance_mode: false,
    default_intern_password: 'Intern@123',
    default_password: 'Password@123',
  });

  const handleSave = (e) => {
    e.preventDefault();
    // In production, this would call PATCH /api/config
    toast.success('Configuration saved (server-side persistence coming in v2)');
  };

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-headline font-bold text-2xl text-slate-900">System Configuration</h1>
          <p className="text-slate-500 text-sm mt-1">Global system settings</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Auth Settings */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Authentication</h3>
            <div>
              <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">JWT Expiry</label>
              <input className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" value={config.jwt_expires} onChange={e => setConfig(p => ({ ...p, jwt_expires: e.target.value }))} />
              <p className="text-xs text-slate-400 mt-1">e.g. 7d, 24h, 30d</p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Default Intern Password</label>
              <input className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" value={config.default_intern_password} onChange={e => setConfig(p => ({ ...p, default_intern_password: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-700 text-sm">Allow Self-Registration</p>
                <p className="text-xs text-slate-400">Users can register without admin invite</p>
              </div>
              <button type="button" onClick={() => setConfig(p => ({ ...p, allow_self_registration: !p.allow_self_registration }))}
                className={`w-12 h-6 rounded-full transition-colors ${config.allow_self_registration ? 'bg-primary' : 'bg-slate-200'} relative`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${config.allow_self_registration ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Storage Settings */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3">File Storage</h3>
            <div>
              <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Max Upload Size (MB)</label>
              <input type="number" min={1} max={100} className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" value={config.max_upload_size} onChange={e => setConfig(p => ({ ...p, max_upload_size: e.target.value }))} />
            </div>
          </div>

          {/* Maintenance */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-700 text-sm">Maintenance Mode</p>
                <p className="text-xs text-slate-400">Temporarily disable access for non-admin users</p>
              </div>
              <button type="button" onClick={() => setConfig(p => ({ ...p, maintenance_mode: !p.maintenance_mode }))}
                className={`w-12 h-6 rounded-full transition-colors ${config.maintenance_mode ? 'bg-rose-500' : 'bg-slate-200'} relative`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${config.maintenance_mode ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary px-8 py-3 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base">save</span> Save Configuration
          </button>
        </form>
      </div>
    </PageWrapper>
  );
}
