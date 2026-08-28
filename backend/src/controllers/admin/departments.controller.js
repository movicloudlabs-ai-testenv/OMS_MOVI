import Department from '../../models/Department.js';
import User from '../../models/User.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js';
import { getPagination } from '../../utils/paginate.js';

/**
 * GET /api/admin/departments
 * List all departments with optional search and pagination.
 */
export const getDepartments = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, status } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) filter.status = status;

    const [departments, total] = await Promise.all([
      Department.find(filter)
        .populate('head', 'name employeeId designation avatar')
        .populate('parentDepartment', 'name')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Department.countDocuments(filter),
    ]);

    // Add member counts
    const deptsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        const count = await User.countDocuments({
          department: dept._id,
          status: 'Active',
        });
        const deptObj = dept.toJSON();
        deptObj.memberCount = count;
        return deptObj;
      })
    );

    sendPaginated(res, deptsWithCounts, {
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
 * POST /api/admin/departments
 * Create a new department.
 */
export const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, head, parentDepartment, color } = req.body;

    if (!name) {
      return sendError(res, 'Department name is required', 400);
    }

    const department = await Department.create({
      name, code, description, head, parentDepartment, color,
    });

    const populated = await Department.findById(department._id)
      .populate('head', 'name employeeId')
      .populate('parentDepartment', 'name');

    sendSuccess(res, populated, 'Department created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/departments/:id
 * Get single department with head and member count.
 */
export const getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('head', 'name employeeId designation avatar')
      .populate('parentDepartment', 'name code');

    if (!department) {
      return sendError(res, 'Department not found', 404);
    }

    const memberCount = await User.countDocuments({
      department: department._id,
      status: 'Active',
    });

    const deptObj = department.toJSON();
    deptObj.memberCount = memberCount;

    sendSuccess(res, deptObj);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/departments/:id
 * Update department fields.
 */
export const updateDepartment = async (req, res, next) => {
  try {
    const { name, code, description, head, parentDepartment, status, color } = req.body;

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name, code, description, head, parentDepartment, status, color },
      { new: true, runValidators: true }
    ).populate('head', 'name employeeId').populate('parentDepartment', 'name');

    if (!department) {
      return sendError(res, 'Department not found', 404);
    }

    sendSuccess(res, department, 'Department updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/departments/:id
 * Delete department. Fails if it has active members.
 */
export const deleteDepartment = async (req, res, next) => {
  try {
    const memberCount = await User.countDocuments({
      department: req.params.id,
      status: 'Active',
    });

    if (memberCount > 0) {
      return sendError(res, `Cannot delete department with ${memberCount} active members. Reassign them first.`, 400);
    }

    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      return sendError(res, 'Department not found', 404);
    }

    sendSuccess(res, { _id: department._id, name: department.name }, 'Department deleted');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/departments/:id/members
 * Returns all users in a department. Paginated.
 */
export const getDepartmentMembers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [members, total] = await Promise.all([
      User.find({ department: req.params.id })
        .populate('role', 'name slug color')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ department: req.params.id }),
    ]);

    sendPaginated(res, members, {
      total, page, limit,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    next(error);
  }
};
