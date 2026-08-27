import Project from '../../models/Project.js';
import User from '../../models/User.js';
import InternRequest from '../../models/InternRequest.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { sendNotification } from '../../utils/sendNotification.js';

export const getInterns = async (req, res, next) => {
  try {
    const interns = await User.find({
      employmentType: 'Intern',
      deletedAt: { $exists: false },
    })
      .populate('department', 'name code')
      .populate('project', 'name code status')
      .populate('manager', 'name')
      .populate('hrManager', 'name')
      .populate('pmoLead', 'name')
      .populate('mentor', 'name')
      .select('-password')
      .sort({ createdAt: -1 });

    const projects = await Project.find({}).select('name code interns');
    const userToProjectMap = new Map();
    projects.forEach(p => {
      (p.interns || []).forEach(i => {
        if (i.user) {
          userToProjectMap.set(i.user.toString(), { _id: p._id, name: p.name, code: p.code, addedAt: i.addedAt });
        }
      });
    });

    const result = interns.map(intern => {
      const proj = intern.project || userToProjectMap.get(intern._id.toString()) || null;
      const joinedAt = userToProjectMap.get(intern._id.toString())?.addedAt || intern.internshipStart || intern.createdAt;
      return {
        user: intern,
        project: proj ? { _id: proj._id, name: proj.name, code: proj.code } : null,
        joinedAt,
      };
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const addPerformanceRating = async (req, res, next) => {
  try {
    const { week, rating, note } = req.body;
    if (!week || !rating) return sendError(res, 'Week and rating are required', 400);

    const intern = await User.findOne({ _id: req.params.id, employmentType: 'Intern' });
    if (!intern) return sendError(res, 'Intern not found', 404);

    const existingIndex = intern.performanceRatings.findIndex(
      r => r.week === week && r.addedBy?.toString() === req.user._id.toString()
    );
    if (existingIndex !== -1) {
      intern.performanceRatings[existingIndex].rating = rating;
      intern.performanceRatings[existingIndex].note = note;
      intern.performanceRatings[existingIndex].source = 'pmo';
    } else {
      intern.performanceRatings.push({ week, rating, note, source: 'pmo', addedBy: req.user._id });
    }
    await intern.save({ validateBeforeSave: false });

    await sendNotification({
      recipient: intern._id,
      type: 'system_alert',
      title: 'Performance Evaluation Added',
      message: `Week ${week} evaluation submitted by PMO Lead ${req.user.name}.`,
      link: '/intern/profile',
      sender: req.user._id,
    });

    sendSuccess(res, intern.performanceRatings, 'Performance rating saved');
  } catch (error) {
    next(error);
  }
};

export const getInternById = async (req, res, next) => {
  try {
    const intern = await User.findOne({
      _id: req.params.id,
      employmentType: 'Intern',
      deletedAt: { $exists: false },
    })
      .populate('department', 'name code')
      .populate('project', 'name code status')
      .populate('manager', 'name')
      .populate('hrManager', 'name')
      .populate('pmoLead', 'name')
      .populate('mentor', 'name')
      .select('-password');

    if (!intern) return sendError(res, 'Intern not found', 404);

    if (!intern.project) {
      const proj = await Project.findOne({ 'interns.user': intern._id }).select('name code status');
      if (proj) {
        intern.project = proj;
      }
    }

    sendSuccess(res, intern);
  } catch (error) {
    next(error);
  }
};

export const requestInterns = async (req, res, next) => {
  try {
    const { projectId, department, duration, skills, note } = req.body;

    if (!projectId || !department || !duration) {
      return sendError(res, 'Project ID, department, and duration are required', 400);
    }

    const project = await Project.findOne({ _id: projectId, ...req.projectFilter });
    if (!project) return sendError(res, 'Project not found', 404);

    const request = await InternRequest.create({
      requestedBy: req.user._id,
      project: projectId,
      department,
      duration,
      skills,
      note,
    });

    // Notify HR
    // Ideally find all HR Managers, here we send a general notification to an HR user if possible, 
    // or just the system.
    const hrUsers = await User.find({ status: 'Active' })
      .populate({ path: 'role', match: { slug: 'hr-manager' } });
      
    const activeHrUsers = hrUsers.filter(u => u.role);
    
    for (const hr of activeHrUsers) {
      await sendNotification({
        recipient: hr._id,
        type: 'system_alert',
        title: 'New Intern Request',
        message: `${req.user.name} (PMO Lead) has requested interns for project ${project.name}.`,
        link: `/hr/interns`,
        sender: req.user._id,
      });
    }

    sendSuccess(res, request, 'Intern request sent to HR successfully', 201);
  } catch (error) {
    next(error);
  }
};
