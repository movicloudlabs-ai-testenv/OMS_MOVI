import LearningResource from '../../models/LearningResource.js';
import User from '../../models/User.js';
import Project from '../../models/Project.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { sendNotification } from '../../utils/sendNotification.js';

export const getInternLearning = async (req, res, next) => {
  try {
    const resources = await LearningResource.find({ assignedTo: req.params.id })
      .populate('assignedBy', 'name role')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    const total     = resources.length;
    const completed = resources.filter(r => r.status === 'Completed').length;
    const progress  = total > 0 ? Math.round((completed / total) * 100) : 0;

    sendSuccess(res, { progress, total, completed, resources });
  } catch (error) {
    next(error);
  }
};

export const assignLearning = async (req, res, next) => {
  try {
    const { title, type, url, description, dueDate, estimatedMinutes, projectId } = req.body;

    if (!title || !type) return sendError(res, 'title and type are required', 400);

    const intern = await User.findById(req.params.id).select('_id name hrManager pmoLead');
    if (!intern) return sendError(res, 'Intern not found', 404);

    const resource = await LearningResource.create({
      title,
      type,
      url:               url || '',
      description:       description || '',
      assignedTo:        intern._id,
      assignedBy:        req.user._id,
      project:           projectId || null,
      dueDate:           dueDate   || null,
      estimatedMinutes:  estimatedMinutes || 0,
    });

    await sendNotification({
      recipient: intern._id,
      type:      'system_alert',
      title:     'New Learning Resource Assigned',
      message:   `${req.user.name} assigned you a new learning resource: "${title}".`,
      link:      '/intern/learning',
      sender:    req.user._id,
    });

    sendSuccess(res, resource, 'Learning resource assigned');
  } catch (error) {
    next(error);
  }
};

export const deleteLearning = async (req, res, next) => {
  try {
    const resource = await LearningResource.findOne({
      _id:        req.params.resourceId,
      assignedTo: req.params.id,
    });
    if (!resource) return sendError(res, 'Resource not found', 404);

    await resource.deleteOne();
    sendSuccess(res, null, 'Learning resource removed');
  } catch (error) {
    next(error);
  }
};
