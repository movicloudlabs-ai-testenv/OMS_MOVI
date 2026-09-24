import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RestrictedPage from '../components/shared/RestrictedPage';

// Maps real backend role slugs → dashboard paths
const ROLE_HOME = {
  'super-admin': '/admin/dashboard',
  'admin':       '/admin/dashboard',
  'hr-manager':  '/hr/dashboard',
  'hr':          '/hr/dashboard',
  'pmo-lead':    '/pmo/dashboard',
  'pmo':         '/pmo/dashboard',
  'employee':    '/employee/dashboard',
  'intern':      '/intern/dashboard',
};

// For backwards-compat with short slugs used in App.jsx
const LEGACY_SLUG_MAP = {
  admin:    ['admin', 'super-admin'],
  hr:       ['hr-manager'],
  pmo:      ['pmo-lead'],
  employee: ['employee'],
  intern:   ['intern'],
};

function resolveSlug(user) {
  if (!user) return null;
  if (user.role?.slug) return user.role.slug;
  if (typeof user.role === 'string') return user.role;
  return null;
}

/**
 * ProtectedRoute
 *
 * allowedRoles  — array of role slugs that have access to this route (e.g. ['admin', 'hr'])
 * permission    — { resource, action } — optional Access Matrix permission checked for the allowed role
 *
 * Decision rules:
 *   1. super-admin                          → always allow
 *   2. user role not in allowedRoles        → redirect to /unauthorized
 *   3. user role in allowedRoles:
 *        - if permission specified & denied → show RestrictedPage
 *        - otherwise                        → allow
 */
export function ProtectedRoute({ children, allowedRoles, permission }) {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-[#64748B] font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Force password change before allowing any other page
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  const userSlug = resolveSlug(user);

  // Super-admin bypasses everything
  if (userSlug === 'super-admin') return children;

  // Build the set of accepted role slugs
  const accepted = new Set(
    (allowedRoles || []).flatMap((r) => LEGACY_SLUG_MAP[r] ?? [r])
  );
  const roleAllowed = !allowedRoles || accepted.has(userSlug);

  // If role is explicitly not allowed, redirect to unauthorized
  if (!roleAllowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check Access Matrix permission if defined for this role
  if (permission && !hasPermission(permission.resource, permission.action)) {
    return <RestrictedPage resource={permission.resource} action={permission.action} />;
  }

  return children;
}

export { ROLE_HOME };
