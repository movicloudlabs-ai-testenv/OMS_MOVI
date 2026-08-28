import PageWrapper from '../../components/PageWrapper';

const ROLES = [
  { role: 'intern', permissions: ['View own tasks', 'Update task status', 'Submit status updates', 'View learning resources', 'Send messages', 'View own performance'], color: 'bg-indigo-100 text-indigo-700' },
  { role: 'hr', permissions: ['Create intern profiles', 'Mark attendance', 'Approve/reject leaves', 'Upload documents', 'Evaluate performance', 'Send announcements'], color: 'bg-pink-100 text-pink-700' },
  { role: 'pmo', permissions: ['Create projects', 'Assign tasks to interns', 'Monitor progress', 'Manage milestones', 'Approve/reject submissions'], color: 'bg-teal-100 text-teal-700' },
  { role: 'admin', permissions: ['Full user management (CRUD)', 'View all KPIs', 'Generate reports', 'System configuration', 'Access control management', 'Create any user role'], color: 'bg-purple-100 text-purple-700' },
];

export default function AdminAccess() {
  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="font-headline font-bold text-2xl text-slate-900">Access Control</h1>
          <p className="text-slate-500 text-sm mt-1">Role-based permission overview</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ROLES.map(({ role, permissions, color }) => (
            <div key={role} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <span className={`badge ${color} text-sm px-3 py-1.5 capitalize`}>{role}</span>
              </div>
              <ul className="space-y-2.5">
                {permissions.map(p => (
                  <li key={p} className="flex items-center gap-3 text-sm text-slate-700">
                    <span className="material-symbols-outlined text-emerald-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 rounded-2xl p-5 flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-500 text-xl mt-0.5">security</span>
          <div>
            <p className="font-bold text-blue-800 text-sm">JWT + RBAC Enforced</p>
            <p className="text-blue-700 text-sm mt-1">All permissions are enforced server-side via JWT middleware and role-based route guards. No permission can be bypassed from the client.</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
