import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AccessDenied = ({
  message = "You don't have permission to access this page.",
  showBackButton = true,
}) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
      <div className="bg-[#FEE2E2] rounded-full p-4 mb-4">
        <ShieldX size={40} className="text-[#DC2626]" />
      </div>
      <h2 className="text-xl font-semibold text-[#0F172A] mb-2">Access Denied</h2>
      <p className="text-sm text-[#64748B] max-w-md mb-6">{message}</p>
      <p className="text-xs text-[#94A3B8] mb-6">Contact your administrator to request access.</p>
      {showBackButton && (
        <button
          onClick={() => navigate(-1)}
          className="border border-[#E2E8F0] text-[#0F172A] px-4 py-2 rounded-lg text-sm hover:bg-[#F8FAFC] transition"
        >
          Go Back
        </button>
      )}
    </div>
  );
};

export default AccessDenied;
