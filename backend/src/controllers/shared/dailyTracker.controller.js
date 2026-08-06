import XLSX from 'xlsx';
import User from '../../models/User.js';
import DailyTracker from '../../models/DailyTracker.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const startOfDay = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/* ───────────────────────── Self-service (intern / employee) ───────────────────────── */

// GET /my/today — fetch today's own entry (to pre-fill the form if already submitted)
export const getMyTodayEntry = async (req, res, next) => {
  try {
    const entry = await DailyTracker.findOne({ user: req.user._id, date: startOfDay() })
      .populate('project', 'name');
    sendSuccess(res, entry || null);
  } catch (error) {
    next(error);
  }
};

// GET /my — self history (own past submissions)
export const getMyEntries = async (req, res, next) => {
  try {
    const entries = await DailyTracker.find({ user: req.user._id })
      .populate('project', 'name')
      .sort({ date: -1 })
      .limit(60);
    sendSuccess(res, entries);
  } catch (error) {
    next(error);
  }
};

// POST /my — submit or update today's entry (upsert; this is the EOD report + tracker row)
export const submitMyEntry = async (req, res, next) => {
  try {
    const {
      project, role, yesterdayStatus, pendingReason, todayTask,
      expectedCompletion, blockers, module, workingTime, hours,
      reportSubmission, attendance, ktCompletion, productivityMetrics,
      aiCredits, projectAssignment,
    } = req.body;

    if (!todayTask || !todayTask.trim()) {
      return sendError(res, "Today's task is required", 400);
    }

    const date = startOfDay();
    const update = {
      user: req.user._id,
      date,
      project: project || undefined,
      role: role || req.user.designation,
      yesterdayStatus, pendingReason, todayTask, blockers, module,
      workingTime, hours, reportSubmission: reportSubmission || 'Submitted',
      attendance, ktCompletion, productivityMetrics, aiCredits, projectAssignment,
      expectedCompletion: expectedCompletion || undefined,
      submittedAt: new Date(),
    };

    const entry = await DailyTracker.findOneAndUpdate(
      { user: req.user._id, date },
      update,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    sendSuccess(res, entry, 'Daily report submitted successfully');
  } catch (error) {
    next(error);
  }
};

/* ───────────────────────── HR / PMO management views ───────────────────────── */

// GET / — list entries (EOD list + spreadsheet-style Daily Tracker view), filterable by date/user/project
export const getAllEntries = async (req, res, next) => {
  try {
    const { date, from, to, userId, project, employmentType, college } = req.query;

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
    if (userId) filter.user = userId;
    if (project) filter.project = project;

    let entries = await DailyTracker.find(filter)
      .populate({
        path: 'user',
        select: 'name employeeId employmentType designation department college',
        populate: { path: 'department', select: 'name' },
      })
      .populate('project', 'name')
      .populate('lastEditedBy', 'name')
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

// GET /day-status?date=&employmentType=&college=
// Every intern/employee for a given date, with whether they submitted a Daily Tracker entry or not.
export const getDayStatus = async (req, res, next) => {
  try {
    const { date, employmentType, college } = req.query;
    const targetDate = startOfDay(date);

    const userFilter = { employmentType: { $in: ['Intern', 'Full-time'] } };
    if (employmentType) userFilter.employmentType = employmentType;
    if (college) userFilter.college = college;

    const users = await User.find(userFilter)
      .select('name employeeId employmentType college designation')
      .sort({ name: 1 });

    const entries = await DailyTracker.find({
      date: targetDate,
      user: { $in: users.map(u => u._id) },
    }).populate('project', 'name');
    const entryMap = new Map(entries.map(e => [String(e.user), e]));

    const result = users.map((u) => {
      const entry = entryMap.get(String(u._id));
      return {
        user: u,
        submitted: !!entry,
        entry: entry || null,
      };
    });

    sendSuccess(res, { date: targetDate, results: result });
  } catch (error) {
    next(error);
  }
};

// GET /user/:userId — one person's full tracker/EOD history (the "detail view" per intern)
export const getUserEntries = async (req, res, next) => {
  try {
    const entries = await DailyTracker.find({ user: req.params.userId })
      .populate('project', 'name')
      .populate('lastEditedBy', 'name')
      .sort({ date: -1 })
      .limit(120);
    sendSuccess(res, entries);
  } catch (error) {
    next(error);
  }
};

// PATCH /:id — HR/PMO edits any field on an entry
export const updateEntry = async (req, res, next) => {
  try {
    const entry = await DailyTracker.findById(req.params.id);
    if (!entry) return sendError(res, 'Tracker entry not found', 404);

    const editable = [
      'project', 'role', 'yesterdayStatus', 'pendingReason', 'todayTask',
      'expectedCompletion', 'blockers', 'module', 'workingTime', 'hours',
      'reportSubmission', 'attendance', 'ktCompletion', 'productivityMetrics',
      'aiCredits', 'projectAssignment',
    ];
    editable.forEach((field) => {
      if (req.body[field] !== undefined) entry[field] = req.body[field];
    });
    entry.lastEditedBy = req.user._id;

    await entry.save();
    sendSuccess(res, entry, 'Tracker entry updated');
  } catch (error) {
    next(error);
  }
};

// GET /export?from=&to=&label=&employmentType=&college=
// Downloads the Daily Tracker sheet for a date range as an .xlsx file.
export const exportEntries = async (req, res, next) => {
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

    let entries = await DailyTracker.find(filter)
      .populate({ path: 'user', select: 'name employeeId employmentType designation college' })
      .populate('project', 'name')
      .sort({ date: 1, 'user.name': 1 });

    if (employmentType) entries = entries.filter(e => e.user?.employmentType === employmentType);
    if (college) entries = entries.filter(e => e.user?.college === college);

    const header = [
      'S.No', 'Name', 'Employee ID', 'Type', 'Date', 'Project', 'Role',
      'Yesterday Status', 'Pending Reason', 'Today Task', 'Expected Completion',
      'Blockers', 'Module', 'Working Time', 'Hours', 'Report Submission',
      'Attendance', 'KT Completion %', 'Productivity (0-10)', 'AI Credits', 'Project Assignment',
    ];

    const rows = entries.map((e, idx) => [
      idx + 1,
      e.user?.name || '',
      e.user?.employeeId || '',
      e.user?.employmentType || '',
      e.date ? new Date(e.date).toLocaleDateString() : '',
      e.project?.name || '',
      e.role || e.user?.designation || '',
      e.yesterdayStatus || '',
      e.pendingReason || '',
      e.todayTask || '',
      e.expectedCompletion ? new Date(e.expectedCompletion).toLocaleDateString() : '',
      e.blockers || '',
      e.module || '',
      e.workingTime || '',
      e.hours ?? '',
      e.reportSubmission || '',
      e.attendance || '',
      e.ktCompletion ?? '',
      e.productivityMetrics ?? '',
      e.aiCredits ?? '',
      e.projectAssignment || '',
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = header.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Tracker');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const safeLabel = (label || 'Daily_Tracker').replace(/[^a-zA-Z0-9-_]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeLabel}.xlsx"`);
    res.status(200).send(buf);
  } catch (error) {
    next(error);
  }
};
