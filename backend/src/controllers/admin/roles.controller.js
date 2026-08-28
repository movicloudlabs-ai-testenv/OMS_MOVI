import Role from '../../models/Role.js';
import User from '../../models/User.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js';
import { getPagination } from '../../utils/paginate.js';

/**
 * GET /api/admin/roles
 * List all roles with user counts.
 */
export const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.find()
      .populate('permissions', 'name resource action status')
      .sort({ name: 1 });

    // Add user counts to each role
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const userCount = await User.countDocuments({ role: role._id, status: 'Active' });
        const roleObj = role.toJSON();
        roleObj.userCount = userCount;
        return roleObj;
      })
    );

    sendSuccess(res, rolesWithCounts);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/roles
 * Create a new custom role.
 */
export const createRole = async (req, res, next) => {
  try {
    const { name, description, permissions, color } = req.body;

    if (!name) {
      return sendError(res, 'Role name is required', 400);
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/\s+/g, '-');

    const role = await Role.create({
      name, slug, description, permissions: permissions || [], color,
      isSystem: false,
    });

    const populated = await Role.findById(role._id)
      .populate('permissions', 'name resource action status');

    sendSuccess(res, populated, 'Role created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/roles/:id
 * Get single role with full permission details.
 */
export const getRoleById = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate('permissions', 'name label resource action status riskLevel');

    if (!role) {
      return sendError(res, 'Role not found', 404);
    }

    const userCount = await User.countDocuments({ role: role._id });
    const roleObj = role.toJSON();
    roleObj.userCount = userCount;

    sendSuccess(res, roleObj);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/roles/:id
 * Update role name, description, color. Cannot change slug of system roles.
 */
export const updateRole = async (req, res, next) => {
  try {
    const { name, description, color, status } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return sendError(res, 'Role not found', 404);
    }

    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (color) role.color = color;
    if (status) role.status = status;

    await role.save();

    sendSuccess(res, role, 'Role updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/roles/:id
 * Delete role. System roles (isSystem=true) cannot be deleted.
 */
export const deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return sendError(res, 'Role not found', 404);
    }

    if (role.isSystem) {
      return sendError(res, 'System roles cannot be deleted', 400);
    }

    // Check if any users have this role
    const userCount = await User.countDocuments({ role: role._id });
    if (userCount > 0) {
      return sendError(res, `Cannot delete role with ${userCount} assigned users. Reassign them first.`, 400);
    }

    await Role.findByIdAndDelete(req.params.id);
    sendSuccess(res, { _id: role._id, name: role.name }, 'Role deleted');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/roles/:id/users
 * Returns all users with this role. Paginated.
 */
export const getRoleUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [users, total] = await Promise.all([
      User.find({ role: req.params.id })
        .populate('department', 'name code')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ role: req.params.id }),
    ]);

    sendPaginated(res, users, {
      total, page, limit,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/roles/:id/permissions
 * Replace a role's permission array. This is how Access Matrix save works.
 * CRITICAL: After save, all users with this role immediately get new
 * permissions on their next request (auth middleware re-fetches).
 */
export const updateRolePermissions = async (req, res, next) => {
  try {
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return sendError(res, 'permissions must be an array of permission IDs', 400);
    }

    const role = await Role.findById(req.params.id);
    if (!role) {
      return sendError(res, 'Role not found', 404);
    }

    // Super Admin role permissions cannot be modified
    if (role.slug === 'super-admin') {
      return sendError(res, 'Super Admin permissions cannot be modified', 400);
    }

    role.permissions = permissions;
    await role.save();

    const populated = await Role.findById(role._id)
      .populate('permissions', 'name resource action status');

    sendSuccess(res, populated, `Permissions updated for role "${role.name}"`);
  } catch (error) {
    next(error);
  }
};
