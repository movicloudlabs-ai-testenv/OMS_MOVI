import Permission from '../models/Permission.js';
import Role from '../models/Role.js';
import { generatePermissionDefinitions } from '../config/permissionsConfig.js';

export const syncPermissions = async () => {
  const definitions = generatePermissionDefinitions();
  let created = 0;
  for (const def of definitions) {
    const exists = await Permission.findOne({ name: def.name });
    if (!exists) {
      await Permission.create(def);
      created++;
    }
  }
  if (created > 0) {
    console.log(`✅ Synced ${created} new permission(s) from config`);
  } else {
    console.log('✅ Permissions in sync (0 new)');
  }

  // Ensure HR Manager has roles.read permission so they can select roles when onboarding/editing users
  try {
    const hrRole = await Role.findOne({ slug: 'hr-manager' });
    const readRolesPerm = await Permission.findOne({ name: 'roles.read' });
    if (hrRole && readRolesPerm) {
      if (!hrRole.permissions.includes(readRolesPerm._id)) {
        hrRole.permissions.push(readRolesPerm._id);
        await hrRole.save();
        console.log('✅ Granted roles.read permission to HR Manager');
      }
    }
  } catch (err) {
    console.error('Failed to sync roles.read to HR Manager:', err.message);
  }

  // Generic helper: grant all permissions of a resource to a role (by slug)
  const grantResourceToRole = async (roleSlug, resource) => {
    try {
      const role = await Role.findOne({ slug: roleSlug });
      const perms = await Permission.find({ resource });
      if (role && perms.length) {
        let changed = false;
        for (const perm of perms) {
          if (!role.permissions.includes(perm._id)) {
            role.permissions.push(perm._id);
            changed = true;
          }
        }
        if (changed) {
          await role.save();
          console.log(`✅ Granted ${resource} permissions to ${roleSlug}`);
        }
      }
    } catch (err) {
      console.error(`Failed to sync ${resource} permissions to ${roleSlug}:`, err.message);
    }
  };

  await grantResourceToRole('hr-manager', 'Recruitment');
  await grantResourceToRole('hr-manager', 'Daily Tracker');
  await grantResourceToRole('pmo-lead', 'Daily Tracker');
};
