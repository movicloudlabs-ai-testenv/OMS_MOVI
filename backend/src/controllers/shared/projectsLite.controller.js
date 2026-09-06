import Project from '../../models/Project.js';
import { sendSuccess } from '../../utils/apiResponse.js';

// GET /all — every active project, id + name only. Unlike getMyProjects (which only
// returns projects the caller is a team/intern member of), this is meant for dropdowns
// like the EOD Update / Daily Tracker "Project" field, where anyone (Intern, Employee,
// PMO) should be able to pick ANY project — e.g. QA/testing work often spans projects
// a person isn't formally assigned to on the team roster.
export const getAllActiveProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ status: { $ne: 'Cancelled' } })
      .select('name status')
      .sort('name')
      .lean();
    sendSuccess(res, projects);
  } catch (error) {
    next(error);
  }
};
