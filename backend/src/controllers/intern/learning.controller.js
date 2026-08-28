import LearningResource from '../../models/LearningResource.js';
import User from '../../models/User.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { sendNotification } from '../../utils/sendNotification.js';

export const getMyLearning = async (req, res, next) => {
  try {
    const resources = await LearningResource.find({ assignedTo: req.user._id })
      .populate('assignedBy', 'name role')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    const total = resources.length;
    const completed = resources.filter(r => r.status === 'Completed').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    sendSuccess(res, {
      progress,
      total,
      completed,
      resources,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLearningStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!['In Progress', 'Completed'].includes(status)) {
      return sendError(res, 'Invalid status', 400);
    }

    const resource = await LearningResource.findOne({ _id: req.params.id, assignedTo: req.user._id });
    if (!resource) return sendError(res, 'Resource not found', 404);

    resource.status = status;
    if (status === 'Completed') resource.completedAt = new Date();

    await resource.save();

    // Check if 100% complete
    const allResources = await LearningResource.find({ assignedTo: req.user._id });
    const isAllDone = allResources.every(r => r.status === 'Completed');

    if (status === 'Completed' && isAllDone) {
      const user = await User.findById(req.user._id).select('hrManager pmoLead name');
      
      // Notify HR
      if (user.hrManager) {
        await sendNotification({
          recipient: user.hrManager,
          type: 'system_alert',
          title: 'Intern Learning Complete',
          message: `${user.name} has completed all assigned learning resources.`,
          link: `/hr/interns/${user._id}`,
          sender: req.user._id,
        });
      }

      // Notify PMO
      if (user.pmoLead) {
        await sendNotification({
          recipient: user.pmoLead,
          type: 'system_alert',
          title: 'Intern Ready',
          message: `${user.name} has completed learning resources and is ready for tasks.`,
          link: `/pmo/interns`,
          sender: req.user._id,
        });
      }
    }

    sendSuccess(res, resource, `Status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};
