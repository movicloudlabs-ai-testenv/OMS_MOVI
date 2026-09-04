import Project from '../../models/Project.js';
import User from '../../models/User.js';
import InternRequest from '../../models/InternRequest.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { sendNotification } from '../../utils/sendNotification.js';

export const getInterns = async (req, res, next) => {
  try {
    // 1. Fetch all active interns from User collection
    const interns = await User.find({
      employmentType: 'Intern',
      deletedAt: { $exists: false },
    })
      .populate('department', 'name code')
      .populate('project', 'name status')
      .populate('pmoLead', 'name employeeId email')
      .populate('manager', 'name')
      .select('name email college avatar department domain employmentType status internshipStart internshipEnd performanceRatings pmoLead project manager createdAt');

    // 2. Fetch all projects to map intern project assignments
    const projects = await Project.find({}).populate('manager', 'name');
    const projectMap = new Map();
    projects.forEach(project => {
      project.interns?.forEach(item => {
        if (item.user) {
          projectMap.set(item.user.toString(), {
            _id: project._id,
            name: project.name,
            manager: project.manager,
            joinedAt: item.joinedAt,
          });
        }
      });
    });

    const isSuperOrAdmin = req.user.role?.slug === 'super-admin' || req.user.role?.slug === 'admin';
    const pmoUserId = req.user._id ? req.user._id.toString() : '';

    // 3. Construct intern list
    const result = [];
    interns.forEach(userObj => {
      const uId = userObj._id.toString();
      const projectItem = projectMap.get(uId);
      const proj = projectItem
        ? { _id: projectItem._id, name: projectItem.name }
        : (userObj.project ? { _id: userObj.project._id, name: userObj.project.name } : null);

      const assignedPmoId = userObj.pmoLead?._id ? userObj.pmoLead._id.toString() : (userObj.pmoLead ? userObj.pmoLead.toString() : '');
      const projManagerId = projectItem?.manager?._id ? projectItem.manager._id.toString() : (projectItem?.manager ? projectItem.manager.toString() : '');

      const isAssignedToThisPmo = assignedPmoId === pmoUserId || projManagerId === pmoUserId;

      // Include intern if super-admin/admin, OR assigned to this PMO, OR if PMO leads view all active interns
      if (isSuperOrAdmin || isAssignedToThisPmo || userObj.pmoLead || proj || req.user.role?.slug === 'pmo-lead' || req.user.role?.slug === 'pmo') {
        result.push({
          user: userObj,
          project: proj,
          joinedAt: projectItem?.joinedAt || userObj.internshipStart || userObj.createdAt,
        });
      }
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
      status: 'Active',
    })
      .populate('department', 'name code')
      .populate('manager', 'name')
      .populate('hrManager', 'name')
      .select('-password');

    if (!intern) return sendError(res, 'Intern not found', 404);

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
