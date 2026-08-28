export const RESOURCES_CONFIG = [
  { resource: 'Users',      actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'Departments', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'Roles',      actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'Projects',   actions: ['create', 'read', 'update', 'delete', 'manage'] },
  { resource: 'Tasks',      actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'Attendance', actions: ['read', 'update', 'export'] },
  { resource: 'Leave',      actions: ['create', 'read', 'update', 'approve'] },
  { resource: 'Reports',    actions: ['read', 'export', 'schedule'] },
  { resource: 'Audit Logs', actions: ['read', 'export'] },
  { resource: 'Settings',   actions: ['read', 'update'] },
  { resource: 'Interns',    actions: ['read', 'update', 'manage'] },
  { resource: 'Recruitment', actions: ['create', 'read', 'update', 'delete', 'manage'] },
  { resource: 'Daily Tracker', actions: ['read', 'update'] },
];

export const generatePermissionDefinitions = () => {
  const definitions = [];
  for (const { resource, actions } of RESOURCES_CONFIG) {
    for (const action of actions) {
      definitions.push({
        name: `${resource.toLowerCase().replace(/\s+/g, '_')}.${action}`,
        label: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
        resource,
        action,
        status: 'Active',
      });
    }
  }
  return definitions;
};
