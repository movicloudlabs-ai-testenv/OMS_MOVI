import PDFDocument from 'pdfkit';
import User from '../../models/User.js';
import Project from '../../models/Project.js';
import EODReport from '../../models/EODReport.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const startOfDay = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// How far back a self-submitted entry can be backdated.
const MAX_BACKDATE_DAYS = 14;

const resolveEntryDate = (dateStr) => {
  const today = startOfDay();
  if (!dateStr) return { date: today };

  const requested = startOfDay(dateStr);
  if (Number.isNaN(requested.getTime())) {
    return { error: 'Invalid date' };
  }
  if (requested.getTime() > today.getTime()) {
    return { error: 'Cannot submit a report for a future date' };
  }
  const earliestAllowed = new Date(today);
  earliestAllowed.setDate(earliestAllowed.getDate() - MAX_BACKDATE_DAYS);
  if (requested.getTime() < earliestAllowed.getTime()) {
    return { error: `Cannot backdate more than ${MAX_BACKDATE_DAYS} days` };
  }
  return { date: requested };
};

/* ───────────────────────── Self-service (intern / employee) ───────────────────────── */

// GET /my/today — fetch own EOD for today, or for ?date=YYYY-MM-DD if given
export const getMyTodayEOD = async (req, res, next) => {
  try {
    const { date: dateStr } = req.query;
    const { date, error } = resolveEntryDate(dateStr);
    if (error) return sendError(res, error, 400);

    const entry = await EODReport.findOne({ user: req.user._id, date }).populate('project', 'name');
    sendSuccess(res, entry || null);
  } catch (error) {
    next(error);
  }
};

// GET /my — own history
export const getMyEODs = async (req, res, next) => {
  try {
    const entries = await EODReport.find({ user: req.user._id }).populate('project', 'name').sort({ date: -1 }).limit(60);
    sendSuccess(res, entries);
  } catch (error) {
    next(error);
  }
};

// Builds the labelled composite text stored in `message`, so every existing view/export
// that just reads `.message` (HR/PMO list pages, the PDF export) keeps working unchanged
// even though the data is now entered as separate structured fields.
const buildComposedMessage = ({ name, projectName, role, module, activities, issues, proposedSolution }) => {
  const lines = [];
  if (name) lines.push(`Name: ${name}`);
  if (projectName) lines.push(`Project: ${projectName}`);
  if (role) lines.push(`Role: ${role}`);
  if (module) lines.push(`Module: ${module}`);
  if (activities) lines.push(`Development & Testing activities performed: ${activities}`);
  if (issues) lines.push(`Issues identified/Debugging: ${issues}`);
  if (proposedSolution) lines.push(`Proposed solution: ${proposedSolution}`);
  return lines.join('\n');
};

// POST /my — submit/update an EOD for today, or for body.date if given (upsert).
// Backdating is allowed up to MAX_BACKDATE_DAYS so a missed day can still be filled in.
export const submitMyEOD = async (req, res, next) => {
  try {
    const {
      name, project, role, module, activities, issues, proposedSolution,
      date: dateStr,
    } = req.body;

    if (!activities || !activities.trim()) {
      return sendError(res, 'Please describe the development & testing activities performed', 400);
    }

    const { date, error } = resolveEntryDate(dateStr);
    if (error) return sendError(res, error, 400);

    let projectName = '';
    if (project) {
      const proj = await Project.findById(project).select('name');
      projectName = proj?.name || '';
    }

    const fields = {
      name: (name || '').trim(),
      project: project || undefined,
      role: (role || '').trim(),
      module: (module || '').trim(),
      activities: activities.trim(),
      issues: (issues || '').trim(),
      proposedSolution: (proposedSolution || '').trim(),
    };

    const message = buildComposedMessage({ ...fields, projectName });

    const entry = await EODReport.findOneAndUpdate(
      { user: req.user._id, date },
      { user: req.user._id, date, ...fields, message, submittedAt: new Date() },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    await entry.populate('project', 'name');

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
      .populate('project', 'name')
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
// Every intern/employee for a given date, with whether they submitted an EOD or not.
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

    const entries = await EODReport.find({
      date: targetDate,
      user: { $in: users.map(u => u._id) },
    });
    const entryMap = new Map(entries.map(e => [String(e.user), e]));

    const result = users.map((u) => {
      const entry = entryMap.get(String(u._id));
      return {
        user: u,
        submitted: !!entry,
        eod: entry || null,
      };
    });

    // Two-tiered sort: Submitted users first (A-Z), followed by Not Submitted users (A-Z)
    result.sort((a, b) => {
      if (a.submitted !== b.submitted) {
        return a.submitted ? -1 : 1;
      }
      return (a.user?.name || '').localeCompare(b.user?.name || '');
    });

    sendSuccess(res, { date: targetDate, results: result });
  } catch (error) {
    next(error);
  }
};

// GET /user/:userId — one person's EOD history
export const getUserEODs = async (req, res, next) => {
  try {
    const entries = await EODReport.find({ user: req.params.userId }).populate('project', 'name').sort({ date: -1 }).limit(90);
    sendSuccess(res, entries);
  } catch (error) {
    next(error);
  }
};

// GET /export?from=&to=&label=&title=&employmentType=&college=
// Downloads EOD updates for a date range as a readable .pdf document (not a spreadsheet —
// EOD updates are free-text, so a document reads far better than a grid of cells).
export const exportEODs = async (req, res, next) => {
  try {
    const { from, to, employmentType, college, label, title } = req.query;

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
      .populate('project', 'name')
      .sort({ date: 1, 'user.name': 1 });

    if (employmentType) entries = entries.filter(e => e.user?.employmentType === employmentType);
    if (college) entries = entries.filter(e => e.user?.college === college);

    const buf = await buildEodPdf({
      title: title || 'EOD Report',
      entries,
    });

    const safeLabel = (label || 'EOD_Report').replace(/[^a-zA-Z0-9-_]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeLabel}.pdf"`);
    res.status(200).send(buf);
  } catch (error) {
    next(error);
  }
};

// ─── PDF builder: renders EOD updates as a readable document, not a spreadsheet ───
function buildEodPdf({ title, entries }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      bufferPages: true,
      info: {
        Title: title,
        Author: 'OWMS — Movi Cloud Labs',
        Creator: 'OWMS Reporting Engine',
        Subject: 'EOD Report',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PW = doc.page.width;
    const M = 50;
    const CW = PW - M * 2;
    const PAGE_BOTTOM = doc.page.height - M;

    const C_BLUE = '#2563EB';
    const C_DARK = '#0F172A';
    const C_GRAY = '#64748B';
    const C_BORD = '#E2E8F0';

    const drawPageHeader = () => {
      doc.rect(0, 0, PW, 50).fill(C_BLUE);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(13)
        .text('OWMS', M, 14, { continued: true })
        .font('Helvetica').fillColor('#BFDBFE').fontSize(10)
        .text('  ·  Movi Cloud Labs');
      doc.fillColor('#93C5FD').font('Helvetica').fontSize(7.5)
        .text('Confidential · EOD Report', M, 33);
      const dt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.fillColor('white').font('Helvetica').fontSize(7.5)
        .text(dt, M, 33, { width: CW, align: 'right' });
    };

    drawPageHeader();
    doc.y = 68;

    doc.fillColor(C_DARK).font('Helvetica-Bold').fontSize(18).text(title, M);
    doc.moveDown(0.25);
    doc.fillColor(C_GRAY).font('Helvetica').fontSize(8.5)
      .text(`Generated on ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}   ·   ${entries.length} update${entries.length !== 1 ? 's' : ''}`, M);

    doc.moveDown(0.8);
    doc.moveTo(M, doc.y).lineTo(PW - M, doc.y).strokeColor(C_BORD).lineWidth(0.75).stroke();
    doc.moveDown(1);

    if (entries.length === 0) {
      doc.fillColor(C_GRAY).font('Helvetica').fontSize(11).text('No EOD updates found for this period.', { align: 'center' });
      doc.end();
      return;
    }

    const ensureSpace = (needed) => {
      if (doc.y + needed > PAGE_BOTTOM) {
        doc.addPage();
        drawPageHeader();
        doc.y = 68;
      }
    };

    let lastDateKey = null;

    entries.forEach((e) => {
      const dateStr = e.date ? new Date(e.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';
      const dateKey = e.date ? new Date(e.date).toDateString() : '';

      // Date section header (only when the date changes — keeps weekly/monthly docs organized)
      if (dateKey !== lastDateKey) {
        ensureSpace(30);
        doc.moveDown(0.3);
        doc.fillColor(C_BLUE).font('Helvetica-Bold').fontSize(11).text(dateStr, M);
        doc.moveTo(M, doc.y + 2).lineTo(PW - M, doc.y + 2).strokeColor(C_BORD).lineWidth(0.5).stroke();
        doc.moveDown(0.6);
        lastDateKey = dateKey;
      }

      const name = e.user?.name || 'Unknown';
      const meta = [e.user?.employeeId, e.user?.employmentType, e.user?.college].filter(Boolean).join('  ·  ');
      const message = e.message || '';

      doc.font('Helvetica').fontSize(9);
      const msgHeight = doc.heightOfString(message, { width: CW - 10, lineGap: 2 });
      ensureSpace(36 + msgHeight);

      doc.fillColor(C_DARK).font('Helvetica-Bold').fontSize(10.5).text(name, M, doc.y);
      if (meta) {
        doc.fillColor(C_GRAY).font('Helvetica').fontSize(8).text(meta, M, doc.y + 1);
      }
      doc.moveDown(0.35);
      doc.fillColor(C_DARK).font('Helvetica').fontSize(9)
        .text(message, M + 10, doc.y, { width: CW - 10, lineGap: 2 });
      doc.moveDown(0.9);
    });

    // Footer page numbers
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.fillColor(C_GRAY).font('Helvetica').fontSize(7.5)
        .text(`Page ${i + 1} of ${range.count}`, M, doc.page.height - 30, { width: CW, align: 'center' });
    }

    doc.end();
  });
}
