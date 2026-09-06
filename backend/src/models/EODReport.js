import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * EODReport Model
 * A structured end-of-day update — Name, Project, Role, Module, Development &
 * Testing activities performed, Issues identified/Debugging, and an optional
 * Proposed solution — separate from the detailed Daily Tracker spreadsheet.
 * One per user per date.
 *
 * `message` is auto-generated server-side from the structured fields (a neatly
 * labelled composite string) so existing views/exports that just read
 * `.message` (HR/PMO list pages, the PDF export) keep working unchanged.
 */
const EODReportSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },

  name: { type: String, trim: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project' },
  role: { type: String, trim: true },
  module: { type: String, trim: true },
  activities: { type: String, trim: true }, // Development & Testing activities performed
  issues: { type: String, trim: true },     // Issues identified / Debugging
  proposedSolution: { type: String, trim: true }, // optional — if any bug solved

  message: { type: String, required: true, trim: true },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

EODReportSchema.index({ user: 1, date: 1 }, { unique: true });

const EODReport = mongoose.model('EODReport', EODReportSchema);
export default EODReport;
