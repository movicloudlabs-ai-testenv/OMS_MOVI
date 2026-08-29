import Attendance from '../../models/Attendance.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const startOfToday = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

const to12Hour = (date) => {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

// GET /today — today's attendance record for the logged-in user (or null)
export const getTodayAttendance = async (req, res, next) => {
  try {
    const record = await Attendance.findOne({ user: req.user._id, date: startOfToday() });
    sendSuccess(res, record || null);
  } catch (error) {
    next(error);
  }
};

// POST /check-in — clock in for today
export const checkIn = async (req, res, next) => {
  try {
    const today = startOfToday();
    const existing = await Attendance.findOne({ user: req.user._id, date: today });

    if (existing && existing.checkIn) {
      return sendError(res, 'You have already checked in today', 400);
    }

    const now = new Date();
    let record;
    if (existing) {
      existing.checkIn = to12Hour(now);
      existing.status = 'Present';
      await existing.save();
      record = existing;
    } else {
      record = await Attendance.create({
        user: req.user._id,
        date: today,
        status: 'Present',
        checkIn: to12Hour(now),
      });
    }

    sendSuccess(res, record, 'Checked in successfully');
  } catch (error) {
    next(error);
  }
};

// POST /check-out — clock out for today
export const checkOut = async (req, res, next) => {
  try {
    const today = startOfToday();
    const record = await Attendance.findOne({ user: req.user._id, date: today });

    if (!record || !record.checkIn) {
      return sendError(res, 'You need to check in before checking out', 400);
    }
    if (record.checkOut) {
      return sendError(res, 'You have already checked out today', 400);
    }

    const now = new Date();
    record.checkOut = to12Hour(now);

    // Compute hours worked from checkIn -> now
    const parseTime = (str) => {
      const [time, ampm] = str.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      const d = new Date(today);
      d.setHours(h, m, 0, 0);
      return d;
    };
    const checkInTime = parseTime(record.checkIn);
    const hoursWorked = Math.max(0, (now - checkInTime) / (1000 * 60 * 60));
    record.hoursWorked = Math.round(hoursWorked * 100) / 100;

    // Mark half-day if worked less than 4.5 hours
    if (record.hoursWorked < 4.5) record.status = 'Half-Day';

    await record.save();

    sendSuccess(res, record, 'Checked out successfully');
  } catch (error) {
    next(error);
  }
};
