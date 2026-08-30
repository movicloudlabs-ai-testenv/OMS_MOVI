import User     from '../../models/User.js';
import Role     from '../../models/Role.js';
import Settings from '../../models/Settings.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { sendNotification } from '../../utils/sendNotification.js';

// Returns all HR users with their current onboarding load + cap info
export const getHRList = async (req, res, next) => {
  try {
    const settings = await Settings.findOne({ key: 'global' }).select('hr');
    const cap      = settings?.hr?.onboardingHRCap ?? 10;

    const hrRole = await Role.findOne({ slug: 'hr-manager' }).select('_id');
    if (!hrRole) return sendSuccess(res, []);

    const hrUsers = await User.find({
      role:      hrRole._id,
      status:    'Active',
      deletedAt: { $exists: false },
    }).select('_id name employeeId department');

    if (!hrUsers.length) return sendSuccess(res, []);

    const hrIds = hrUsers.map(hr => hr._id);
    const loads = await User.aggregate([
      {
        $match: {
          hrManager: { $in: hrIds },
          onboardingComplete: false,
          deletedAt: { $exists: false }
        }
      },
      {
        $group: {
          _id: '$hrManager',
          count: { $sum: 1 }
        }
      }
    ]);

    const loadMap = {};
    loads.forEach(l => {
      loadMap[l._id.toString()] = l.count;
    });

    const withLoad = hrUsers.map(hr => {
      const load = loadMap[hr._id.toString()] || 0;
      return { _id: hr._id, name: hr.name, employeeId: hr.employeeId, load, cap, atCap: load >= cap };
    });

    withLoad.sort((a, b) => a.load - b.load);
    sendSuccess(res, withLoad);
  } catch (error) {
    next(error);
  }
};

// Reassign a user's onboarding HR
export const reassignHR = async (req, res, next) => {
  try {
    const { hrManagerId } = req.body;
    if (!hrManagerId) return sendError(res, 'hrManagerId is required', 400);

    const employee = await User.findOne({ $and: [{ _id: req.params.id }, req.scopeFilter || {}] });
    if (!employee) return sendError(res, 'User not in scope', 404);

    const newHR = await User.findById(hrManagerId).select('_id name');
    if (!newHR) return sendError(res, 'HR user not found', 404);

    const oldHRId = employee.hrManager;
    employee.hrManager = newHR._id;
    await employee.save({ validateBeforeSave: false });

    // Notify new HR
    await sendNotification({
      recipient: newHR._id,
      type:      'system_alert',
      title:     'Onboarding Assignment',
      message:   `You have been assigned as the onboarding HR for ${employee.name} (${employee.employeeId}).`,
      link:      '/hr/onboarding',
      sender:    req.user._id,
    });

    // Notify old HR
    if (oldHRId && oldHRId.toString() !== newHR._id.toString()) {
      await sendNotification({
        recipient: oldHRId,
        type:      'system_alert',
        title:     'Onboarding Reassigned',
        message:   `${employee.name} (${employee.employeeId}) has been reassigned to ${newHR.name}.`,
        link:      '/hr/onboarding',
        sender:    req.user._id,
      });
    }

    sendSuccess(res, { hrManager: newHR }, 'HR reassigned successfully');
  } catch (error) {
    next(error);
  }
};

export const getPendingOnboarding = async (req, res, next) => {
  try {
    const filter = {
      ...req.scopeFilter,
      status: 'Active',
      onboardingComplete: { $ne: true },
    };

    const pendingUsers = await User.find(filter)
      .populate('department', 'name')
      .populate('role', 'name color')
      .populate('hrManager', 'name employeeId')
      .select('name employeeId avatar department role hrManager onboardingChecklist createdAt')
      .sort({ createdAt: -1 });

    // Calculate completion percentage
    const usersWithProgress = pendingUsers.map(u => {
      const user = u.toJSON();
      const checklist = user.onboardingChecklist || {};
      const items = Object.values(checklist);
      const completed = items.filter(Boolean).length;
      user.onboardingProgress = Math.round((completed / 8) * 100) || 0;
      return user;
    });

    sendSuccess(res, usersWithProgress);
  } catch (error) {
    next(error);
  }
};

export const getCompletedOnboarding = async (req, res, next) => {
  try {
    const filter = {
      ...req.scopeFilter,
      status: 'Active',
      onboardingComplete: true,
    };

    const completedUsers = await User.find(filter)
      .populate('department', 'name')
      .populate('role', 'name color')
      .populate('hrManager', 'name')
      .select('name employeeId avatar department role hrManager updatedAt')
      .sort({ updatedAt: -1 });

    sendSuccess(res, completedUsers);
  } catch (error) {
    next(error);
  }
};

export const updateChecklist = async (req, res, next) => {
  try {
    const { item, completed } = req.body;
    
    const validItems = [
      'welcomeEmail', 'idCardIssued', 'systemAccess', 'deptIntroduction',
      'equipmentAssigned', 'hrDocumentation', 'mentorAssigned', 'firstWeekSchedule'
    ];

    if (!validItems.includes(item)) {
      return sendError(res, 'Invalid checklist item', 400);
    }

    const user = await User.findOne({ $and: [{ _id: req.params.id }, req.scopeFilter || {}] })
      .populate('pmoLead', 'name');

    if (!user) return sendError(res, 'User not found or not in scope', 404);

    // Initialize if undefined
    if (!user.onboardingChecklist) user.onboardingChecklist = {};
    
    user.onboardingChecklist[item] = !!completed;

    // Check if all complete
    const items = Object.values(user.onboardingChecklist);
    const numCompleted = items.filter(Boolean).length;
    
    if (numCompleted === 8 && !user.onboardingComplete) {
      user.onboardingComplete = true;
      
      // Notify user
      // Notify user of onboarding completion
        await sendNotification({
          recipient: user._id,
          type: 'system_alert',
          title: 'Onboarding Complete',
          message: 'Your onboarding is complete! Welcome to Movi Cloud Labs.',
          link: '/profile',
          sender: req.user._id,
        });

        // Create an approval for the PMO Lead
        if (user.pmoLead) {
          const { createApproval } = await import('../../utils/createApproval.js');
          await createApproval({
            type: 'Onboarding',
            title: 'Team Member Ready',
            message: `${user.name} has completed onboarding and is ready for tasks.`,
            link: '/pmo/team',
            recipientId: user.pmoLead._id,
            createdById: req.user._id,
          });
        }

      // Notify PMO Lead if they have one
      if (user.pmoLead) {
        await sendNotification({
          recipient: user.pmoLead._id,
          type: 'system_alert',
          title: 'Team Member Ready',
          message: `${user.name} has completed onboarding and is ready for tasks.`,
          link: `/pmo/team`,
          sender: req.user._id,
        });
      }
    } else if (numCompleted < 8 && user.onboardingComplete) {
      user.onboardingComplete = false;
    }

    await user.save({ validateBeforeSave: false });

    sendSuccess(res, user.onboardingChecklist, 'Checklist updated');
  } catch (error) {
    next(error);
  }
};
