import Role from '../../models/Role.js';
import Permission from '../../models/Permission.js';
import AuditLog from '../../models/AuditLog.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

/**
 * GET /api/admin/access-matrix
 * Returns the full matrix of roles and permissions for the UI grid.
 */
export const getAccessMatrix = async (req, res, next) => {
  try {
    const [roles, permissions] = await Promise.all([
      Role.find({ status: 'Active' }).select('name slug color isSystem permissions'),
      Permission.find({ status: 'Active' }).select('name resource action label riskLevel'),
    ]);

    // Build matrix object: { "roleId": ["permId1", "permId2"] }
    const matrix = {};
    roles.forEach((role) => {
      matrix[role._id] = role.permissions.map((p) => p.toString());
    });

    sendSuccess(res, {
      roles,
      permissions,
      matrix,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/access-matrix
 * Bulk update the entire matrix.
 * Body: { matrix: { roleId: [permissionIds] } }
 */
export const updateAccessMatrix = async (req, res, next) => {
  try {
    const { matrix } = req.body;

    if (!matrix || typeof matrix !== 'object') {
      return sendError(res, 'Invalid matrix format provided', 400);
    }

    // Catalog of real permissions — used to ignore unknown IDs and to locate
    // the permission that grants Access Matrix management (roles.update).
    const allPerms = await Permission.find().select('_id name');
    const validIds = new Set(allPerms.map((p) => p._id.toString()));
    const manageMatrixId = allPerms.find((p) => p.name === 'roles.update')?._id.toString();

    const actingRoleId = req.user.role?._id?.toString();
    const isSuperAdmin = req.user.role?.slug === 'super-admin';

    let modifiedCount = 0;
    const changes = [];

    for (const [roleId, permissionIds] of Object.entries(matrix)) {
      const role = await Role.findById(roleId).populate('permissions', '_id');

      // Skip if role doesn't exist or is Super Admin (always fully privileged)
      if (!role || role.slug === 'super-admin') continue;

      // Validation — keep only real, de-duplicated permission IDs
      const cleaned = [...new Set(
        (permissionIds || []).map(String).filter((id) => validIds.has(id))
      )];

      // Self-lockout guard — an admin cannot strip their own ability to manage
      // the matrix (roles.update) from their own role.
      if (!isSuperAdmin && manageMatrixId && roleId === actingRoleId && !cleaned.includes(manageMatrixId)) {
        return sendError(res, 'You cannot remove your own access to manage the Access Matrix (Roles → Update).', 400);
      }

      // Compute a diff for the audit log
      const before = new Set(role.permissions.map((p) => p._id.toString()));
      const after = new Set(cleaned);
      const added = [...after].filter((id) => !before.has(id)).length;
      const removed = [...before].filter((id) => !after.has(id)).length;

      role.permissions = cleaned;
      await role.save();
      modifiedCount++;
      if (added || removed) changes.push(`${role.name}: +${added}/-${removed}`);
    }

    await AuditLog.create({
      user: req.user._id, userName: req.user.name,
      action: 'Update', module: 'Access Matrix',
      details: `Access matrix updated. ${modifiedCount} role(s) modified.${changes.length ? ` [${changes.join('; ')}]` : ''}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'], result: 'SUCCESS',
    }).catch(() => {});

    sendSuccess(res, null, `Access matrix updated successfully. ${modifiedCount} roles modified.`);
  } catch (error) {
    next(error);
  }
};
