import User from '../../models/User.js';
import Attendance from '../../models/Attendance.js';
import DailyTracker from '../../models/DailyTracker.js';
import EODReport from '../../models/EODReport.js';
import Task from '../../models/Task.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const round = (n, d = 1) => Math.round(n * 10 ** d) / 10;
const workingDays = (year, month) => {
  const now = new Date();
  const current = now.getFullYear() === year && now.getMonth() === month;
  const last = current ? now.getDate() : new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= last; d++) { const day = new Date(year, month, d).getDay(); if (day !== 0 && day !== 6) count++; }
  return count;
};

export const getMonthlyPerformance = async (req, res, next) => {
  try {
    const now = new Date();
    const year = Number(req.query.year || now.getFullYear());
    const month = Number(req.query.month || now.getMonth() + 1);
    if (!Number.isInteger(year) || month < 1 || month > 12) return sendError(res, 'Invalid month/year', 400);

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const user = await User.findOne({ _id: req.user._id, employmentType: 'Intern', deletedAt: { $exists: false } })
      .populate('project', 'name status').populate('role', 'name slug');
    if (!user) return sendError(res, 'Intern profile not found', 404);

    const [attendance, trackers, eods, tasks] = await Promise.all([
      Attendance.find({ user: user._id, date: { $gte: start, $lt: end } }).lean(),
      DailyTracker.find({ user: user._id, date: { $gte: start, $lt: end } }).lean(),
      EODReport.find({ user: user._id, date: { $gte: start, $lt: end } }).lean(),
      Task.find({ assignedTo: user._id, createdAt: { $lt: end }, $or: [{ dueDate: { $gte: start, $lt: end } }, { createdAt: { $gte: start, $lt: end } }] }).select('project status dueDate').lean(),
    ]);

    const days = workingDays(year, month);
    const present = attendance.filter(a => ['Present', 'Half-Day'].includes(a.status)).length;
    const attendancePct = days ? round((present / days) * 100) : 0;
    const productivityValues = trackers.map(t => t.productivityMetrics).filter(v => Number.isFinite(v));
    const ktValues = trackers.map(t => t.ktCompletion).filter(v => Number.isFinite(v));
    const avgProductivity = productivityValues.length ? round(productivityValues.reduce((a,b)=>a+b,0) / productivityValues.length) : 0;
    const avgKT = ktValues.length ? round(ktValues.reduce((a,b)=>a+b,0) / ktValues.length) : 0;
    const totalHours = round(trackers.reduce((s,t)=>s+(Number(t.hours)||0),0));
    const taskDone = tasks.filter(t => t.status === 'Done').length;
    const taskCompletion = tasks.length ? round((taskDone / tasks.length) * 100) : 0;
    const eodCompletion = days ? round(Math.min(100, (eods.length / days) * 100)) : 0;
    const projectContribution = taskCompletion;
    const ratings = (user.performanceRatings || []).filter(r => r.createdAt && new Date(r.createdAt) >= start && new Date(r.createdAt) < end && Number.isFinite(r.rating));
    const ratingAvg = ratings.length ? round(ratings.reduce((s,r)=>s+r.rating,0)/ratings.length) : 0;
    const ratingScore = ratingAvg ? round((ratingAvg / 5) * 10) : 0;

    const attendanceScore = round(Math.min(100, attendancePct) / 10);
    const trackerScore = round((avgProductivity / 10) * 10);
    const eodScore = round(eodCompletion / 10);
    const taskScore = round(taskCompletion / 10);
    const projectScore = round(projectContribution / 10);
    const overallScore = round(attendanceScore*0.20 + trackerScore*0.15 + eodScore*0.10 + taskScore*0.20 + projectScore*0.15 + ratingScore*0.20);

    const managementRatings = ratings.map(r => ({ week: r.week, rating: r.rating, note: r.note, source: r.source, addedBy: r.addedBy, createdAt: r.createdAt }));
    sendSuccess(res, {
      period: `${String(month).padStart(2,'0')}/${year}`,
      month, year, workingDays: days,
      overallScore, project: user.project, role: user.role,
      breakdown: {
        attendance: { score: attendanceScore, percentage: attendancePct, presentDays: present },
        dailyTracker: { score: trackerScore, averageProductivity: avgProductivity, averageKT: avgKT, reports: trackers.length, totalHours },
        eod: { score: eodScore, submitted: eods.length, percentage: eodCompletion },
        tasks: { score: taskScore, total: tasks.length, completed: taskDone, completion: taskCompletion },
        projectContribution: { score: projectScore, completion: projectContribution },
        managementRating: { score: ratingScore, average: ratingAvg, reviews: ratings.length, ratings: managementRatings },
      },
    });
  } catch (error) { next(error); }
};

export const getPerformanceHistory = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('performanceRatings').lean();
    const ratings = (user?.performanceRatings || []).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    sendSuccess(res, ratings);
  } catch (error) { next(error); }
};
