/**
 * PMO Scope Middleware
 * Ensures PMO Leads only see projects they manage and data related to those projects,
 * while Super Admin can see all data.
 * Attaches a `projectFilter` object to the request which can be spread into Mongoose queries.
 */
export const pmoScope = async (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (req.user.role.slug === 'super-admin' || req.user.role.slug === 'admin' || req.user.role.slug === 'hr-manager') {
      req.projectFilter = {}; // Corporate administrators and HR managers have enterprise-wide portfolio visibility
      return next();
    }

    if (req.user.role.slug === 'pmo-lead') {
      // PMO Lead sees their managed projects or projects they are part of
      req.projectFilter = {
        $or: [
          { manager: req.user._id },
          { 'team.user': req.user._id },
        ],
      };
      return next();
    }

    if (req.user.role.slug === 'employee' || req.user.role.slug === 'intern') {
      req.projectFilter = {
        $or: [
          { manager: req.user._id },
          { 'team.user': req.user._id },
          { 'interns.user': req.user._id },
        ],
      };
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'PMO access required',
    });
  } catch (error) {
    next(error);
  }
};
