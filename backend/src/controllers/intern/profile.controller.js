import User from '../../models/User.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('role', 'name slug permissions')
      .populate('department', 'name code')
      .populate('project', 'name')
      .populate('mentor', 'name email avatar')
      .populate('hrManager', 'name email avatar')
      .populate('pmoLead', 'name email avatar');

    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { avatar } = req.body;
    
    // Interns can ONLY update their avatar
    const updateData = {};
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('role', 'name')
      .populate('department', 'name');

    sendSuccess(res, user, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};
