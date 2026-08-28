import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const ROLE_HOME = { 
  intern: '/intern/dashboard', 
  hr: '/hr/dashboard', 
  pmo: '/pmo/dashboard', 
  admin: '/admin/dashboard',
  dept: '/dept/dashboard' 
};

export default function Unauthorized() {
  const { user } = useAuth();
  
  // Determine where to send them back based on their role
  const backLink = user ? (ROLE_HOME[user.role] || '/') : '/login';
  const backText = user ? 'Go to your dashboard' : 'Back to login';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        <div className="bg-white py-12 px-4 shadow-sm border border-[#E2E8F0] sm:rounded-xl sm:px-10 text-center">
          
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[#FEF2F2] mb-6">
            <ShieldAlert className="h-8 w-8 text-[#DC2626]" />
          </div>
          
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-2">
            Access Denied
          </h2>
          
          <p className="text-sm text-[#64748B] mb-8 max-w-sm mx-auto">
            You don't have permission to view this page. If you believe this is a mistake, please contact your system administrator.
          </p>
          
          <Link 
            to={backLink} 
            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backText}
          </Link>
          
        </div>
        
      </div>
    </div>
  );
}
