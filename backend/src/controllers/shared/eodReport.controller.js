import XLSX from 'xlsx';
import EODReport from '../../models/EODReport.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const startOfDay = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/* ───────────────────────── Self-service (intern / employee) ───────────────────────── */

// GET /my/today
export const getMyTodayEOD = async (req, res, next) => {
  try {
    const entry = await EODReport.findOne({ user: req.user._id, date: startOfDay() });
    sendSuccess(res, entry || null);
  } catch (error) {
    next(error);
  }
};

// GET /my — own history
export const getMyEODs = async (req, res, next) => {
  try {
    const entries = await EODReport.find({ user: req.user._id }).sort({ date: -1 }).limit(60);
    sendSuccess(res, entries);
  } catch (error) {
    next(error);
  }
};

// POST /my — submit/update today's EOD message (upsert)
export const submitMyEOD = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return sendError(res, 'Please share a short update before submitting', 400);
    }

    const date = startOfDay();
    const entry = await EODReport.findOneAndUpdate(
      { user: req.user._id, date },
      { user: req.user._id, date, message: message.trim(), submittedAt: new Date() },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    sendSuccess(res, entry, 'EOD update shared');
  } catch (error) {
    next(error);
  }
};

/* ───────────────────────── HR / PMO — view only ───────────────────────── */

// GET / — list EOD messages (optionally filtered by date)
export const getAllEODs = async (req, res, next) => {
  try {
    const { date, from, to, employmentType, college } = req.query;
    const filter = {};

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(from);
      if (to) {
        const end = startOfDay(to);
        end.setDate(end.getDate() + 1);
        filter.date.$lt = end;
      }
    } else if (date) {
      filter.date = startOfDay(date);
    }

    let entries = await EODReport.find(filter)
      .populate('user', 'name employeeId employmentType designation college')
      .sort({ date: -1, createdAt: -1 })
      .limit(2000);

    if (employmentType) {
      entries = entries.filter(e => e.user?.employmentType === employmentType);
    }
    if (college) {
      entries = entries.filter(e => e.user?.college === college);
    }

    sendSuccess(res, entries);
  } catch (error) {
    next(error);
  }
};

// GET /user/:userId — one person's EOD history
export const getUserEODs = async (req, res, next) => {
  try {
    const entries = await EODReport.find({ user: req.params.userId }).sort({ date: -1 }).limit(90);
    sendSuccess(res, entries);
  } catch (error) {
    next(error);
  }
};

// GET /export?from=&to=&label=&employmentType=&college=
// Downloads EOD updates for a date range as an .xlsx file.
export const exportEODs = async (req, res, next) => {
  try {
    const { from, to, employmentType, college, label } = req.query;

    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(from);
      if (to) {
        const end = startOfDay(to);
        end.setDate(end.getDate() + 1);
        filter.date.$lt = end;
      }
    }

    let entries = await EODReport.find(filter)
      .populate('user', 'name employeeId employmentType designation college')
      .sort({ date: 1 });

    if (employmentType) entries = entries.filter(e => e.user?.employmentType === employmentType);
    if (college) entries = entries.filter(e => e.user?.college === college);

    const header = ['S.No', 'Name', 'Employee ID', 'Type', 'College', 'Date', 'EOD Update'];
    const rows = entries.map((e, idx) => [
      idx + 1,
      e.user?.name || '',
      e.user?.employeeId || '',
      e.user?.employmentType || '',
      e.user?.college || '',
      e.date ? new Date(e.date).toLocaleDateString() : '',
      e.message || '',
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ws, 'EOD Reports');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const safeLabel = (label || 'EOD_Report').replace(/[^a-zA-Z0-9-_]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeLabel}.xlsx"`);
    res.status(200).send(buf);
  } catch (error) {
    next(error);
  }
};
