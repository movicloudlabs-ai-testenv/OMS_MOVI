import { useNavigate } from 'react-router-dom';
import PageWrapper from '../PageWrapper';

export default function RestrictedPage({ resource, action }) {
  const navigate = useNavigate();

  const actionLabel = {
    read:   'view',
    create: 'create',
    update: 'edit',
    delete: 'delete',
    manage: 'manage',
    export: 'export',
    approve:'approve',
  }[action] || action || 'access';

  return (
    <PageWrapper>
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 font-sans">

        {/* Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-[#FEF2F2] flex items-center justify-center">
            <span className="material-symbols-outlined text-[40px] text-[#DC2626]">lock</span>
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#DC2626] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[14px]">close</span>
          </div>
        </div>

        {/* Text */}
        <div className="text-center max-w-[420px]">
          <h1 className="text-[22px] font-bold text-[#0F172A] mb-2 tracking-tight">
            Access Restricted
          </h1>
          <p className="text-[14px] text-[#475569] leading-relaxed">
            {resource
              ? <>Your role doesn't have permission to <strong>{actionLabel}</strong> <strong>"{resource}"</strong>.</>
              : <>You don't have permission to access this page.</>
            }
          </p>
          <div className="mt-4 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl px-4 py-3 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#D97706] text-[18px] shrink-0 mt-0.5">info</span>
            <p className="text-[12px] text-[#92400E] text-left leading-relaxed">
              Contact your system administrator to grant access via the <strong>Access Matrix</strong>.
              Required permission: <code className="font-mono bg-[#FEF3C7] px-1 rounded">{resource?.toLowerCase().replace(/\s+/g, '_')}.{action}</code>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 border border-[#E2E8F0] bg-white text-[#0F172A] px-4 py-2.5 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">home</span>
            My Dashboard
          </button>
        </div>

      </div>
    </PageWrapper>
  );
}
