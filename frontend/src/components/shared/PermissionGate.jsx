import { useAuth } from '../../contexts/AuthContext';

const PermissionGate = ({ resource, action, children, fallback = null }) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(resource, action)) return fallback;
  return children;
};

export default PermissionGate;
