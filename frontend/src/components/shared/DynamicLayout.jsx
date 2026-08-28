import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../admin/AdminLayout';
import HRLayout from '../hr/HRLayout';
import PageWrapper from '../PageWrapper';
import { normalizeRoleSlug } from '../../utils/notificationRouter';

/**
 * DynamicLayout — wraps shared pages (like Users, Departments, Roles, etc.)
 * in the appropriate layout depending on the user's role.
 * 
 * - admin / super-admin -> AdminLayout
 * - hr-manager -> HRLayout
 * - everyone else -> PageWrapper
 */
export default function DynamicLayout(props) {
  const { user } = useAuth();
  
  // Resolve slug robustly using normalizeRoleSlug
  const userSlug = normalizeRoleSlug(user);
  
  if (userSlug === 'admin' || userSlug === 'super-admin') {
    return <AdminLayout {...props} />;
  }
  
  if (userSlug === 'hr-manager' || userSlug === 'hr') {
    return <HRLayout {...props} />;
  }

  // Fallback for PMO, Employee, Intern
  // Since PageWrapper doesn't accept `title` and `subtitle` props directly
  // like AdminLayout does, we just render it. The internal page content will
  // have to handle rendering its own header if needed (or we can add a small header here if bare is false, but typically the inner page does it).
  return (
    <PageWrapper>
      {/* 
        If the shared page expects the layout to render the header (which AdminLayout does if !bare), 
        we should render a minimal header here for PageWrapper users to keep the title consistent.
      */}
      {!props.bare && (props.title || props.subtitle) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">{props.title}</h1>
            {props.subtitle && (
              <p className="text-[13px] text-[#64748B] mt-0.5">{props.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {props.actions}
          </div>
        </div>
      )}
      {props.children}
    </PageWrapper>
  );
}
