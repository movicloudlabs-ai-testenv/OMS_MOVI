import Permission from '../../models/Permission.js';
import Role from '../../models/Role.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

export const getPermissions = async (req, res, next) => {
  try {
    const { resource, action, status, search } = req.query;
    const filter = {};

    if (resource) filter.resource = resource;
    if (action)   filter.action   = action;
    if (status)   filter.status   = status;
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { label: { $regex: search, $options: 'i' } },
      ];
    }

    const permissions = await Permission.find(filter).sort({ resource: 1, action: 1 });

    const permsWithRoleCounts = await Promise.all(
      permissions.map(async (perm) => {
        const roleCount = await Role.countDocuments({ permissions: perm._id });
        const permObj = perm.toJSON();
        permObj.assignedRolesCount = roleCount;
        return permObj;
      })
    );

    sendSuccess(res, permsWithRoleCounts);
  } catch (error) {
    next(error);
  }
};

export const getPermissionById = async (req, res, next) => {
  try {
    const perm = await Permission.findById(req.params.id);
    if (!perm) return sendError(res, 'Permission not found', 404);

    const roleCount = await Role.countDocuments({ permissions: perm._id });
    const permObj = perm.toJSON();
    permObj.assignedRolesCount = roleCount;

    sendSuccess(res, permObj);
  } catch (error) {
    next(error);
  }
};
