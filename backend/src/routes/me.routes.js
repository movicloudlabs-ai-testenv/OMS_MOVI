import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateTokenPair } from '../utils/generateToken.js';
import Settings from '../models/Settings.js';
import Attendance from '../models/Attendance.js';

const router = Router();
router.use(protect);

// GET /api/me/profile
router.get('/profile', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({ path: 'role', populate: { path: 'permissions', select: 'name resource action status' } })
      .populate('department', 'name code')
      .populate('manager', 'name designation employeeId')
      .populate('hrManager', 'name employeeId')
      .select('-password -refreshToken');
    if (!user) return sendError(res, 'User not found', 404);
    sendSuccess(res, user);
  } catch (err) { next(err); }
});

// PATCH /api/me/profile
router.patch('/profile', async (req, res, next) => {
  try {
    const {
      name, username, profileImage, githubLink, projectLink,
      phone, address, bio, linkedIn, linkedin, emergencyContact, skills,
    } = req.body;
    const set = {};

    // Identity (self-service editable by any role)
    if (name        !== undefined && name.trim()) set.name = name.trim();
    if (profileImage !== undefined) set.profileImage = profileImage;
    if (githubLink  !== undefined) set.githubLink  = githubLink;
    if (projectLink !== undefined) set.projectLink = projectLink;

    // Username — enforce uniqueness across users
    if (username !== undefined) {
      const uname = (username || '').trim();
      if (uname) {
        const taken = await User.findOne({ username: uname, _id: { $ne: req.user._id } }).select('_id');
        if (taken) return sendError(res, 'That username is already taken', 409);
        set.username = uname;
      } else {
        set.username = undefined; // allow clearing
      }
    }

    if (phone       !== undefined) set.phone   = phone;
    if (address     !== undefined) set.address = address;
    if (bio         !== undefined) set.bio     = bio;
    if (skills      !== undefined) set.skills  = skills;
    // accept both spellings
    const li = linkedIn ?? linkedin;
    if (li !== undefined) set.linkedIn = li;
    // accept nested emergencyContact object
    if (emergencyContact) {
      if (emergencyContact.name     !== undefined) set['emergencyContact.name']     = emergencyContact.name;
      if (emergencyContact.phone    !== undefined) set['emergencyContact.phone']    = emergencyContact.phone;
      if (emergencyContact.relation !== undefined) set['emergencyContact.relation'] = emergencyContact.relation;
    }

    // Split $set / $unset so clearing username actually removes it (keeps sparse unique index happy)
    const update = {};
    const setOps = {};
    const unsetOps = {};
    for (const [k, v] of Object.entries(set)) {
      if (v === undefined) unsetOps[k] = '';
      else setOps[k] = v;
    }
    if (Object.keys(setOps).length) update.$set = setOps;
    if (Object.keys(unsetOps).length) update.$unset = unsetOps;

    const updated = await User.findByIdAndUpdate(
      req.user._id, update, { new: true, runValidators: false }
    )
      .populate('department', 'name code')
      .populate({ path: 'role', populate: { path: 'permissions', select: 'name resource action status' } })
      .select('-password -refreshToken');
    sendSuccess(res, updated, 'Profile updated successfully');
  } catch (err) { next(err); }
});

// POST /api/me/change-password
router.post('/change-password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword) return sendError(res, 'currentPassword and newPassword are required', 400);
    if (confirmPassword && newPassword !== confirmPassword) return sendError(res, 'Passwords do not match', 400);

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return sendError(res, 'User not found', 404);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return sendError(res, 'Current password is incorrect', 400);
    if (newPassword === currentPassword) return sendError(res, 'New password must differ from current', 400);

    const settings = await Settings.findOne({ key: 'global' });
    const sec = settings?.security || {};
    if (newPassword.length < (sec.minPasswordLength || 8)) {
      return sendError(res, `Password must be at least ${sec.minPasswordLength || 8} characters`, 400);
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    await user.save();
    
    // Automatically mark attendance for the day if not exists (since they just completed login flow)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingAttendance = await Attendance.findOne({
      user: user._id,
      date: today
    });
    if (!existingAttendance) {
      await Attendance.create({
        user: user._id,
        date: today,
        status: 'Present',
        checkIn: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        markedBy: user._id,
        note: 'Auto-marked after initial password change'
      });
    }

    const { token, refreshToken } = generateTokenPair(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    sendSuccess(res, { token, refreshToken }, 'Password changed successfully');
  } catch (err) { next(err); }
});

export default router;
