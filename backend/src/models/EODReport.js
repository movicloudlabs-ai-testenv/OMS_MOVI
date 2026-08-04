import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * EODReport Model
 * A simple end-of-day text update — "here's what I worked on today" —
 * separate from the detailed Daily Tracker spreadsheet. One per user per date.
 */
const EODReportSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  message: { type: String, required: true, trim: true },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

EODReportSchema.index({ user: 1, date: 1 }, { unique: true });

const EODReport = mongoose.model('EODReport', EODReportSchema);
export default EODReport;
