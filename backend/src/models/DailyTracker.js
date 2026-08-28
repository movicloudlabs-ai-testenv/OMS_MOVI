import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * DailyTracker Model
 * One row per user per date — filled by the intern/employee at end of day
 * (this doubles as their "EOD Report"), viewable & editable by HR/PMO.
 *
 * Columns mirror the requested tracker sheet:
 * S.No (derived from list position), Name (user), Project, Role,
 * Yesterday Status, Pending Reason, Today Task, Expected Completion,
 * Any Blockers, Module, Working Time, Hours, Report Submission,
 * Attendance, KT Completion, Productivity Metrics, AI Credits, Project Assignment.
 */
const DailyTrackerSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },

  project: { type: Schema.Types.ObjectId, ref: 'Project' },
  role: String, // designation/role at time of entry, e.g. "Frontend Intern"

  yesterdayStatus: {
    type: String,
    enum: ['Completed', 'Partially Completed', 'Not Started', 'Blocked'],
    default: 'Completed',
  },
  pendingReason: String,
  todayTask: { type: String, required: true },
  expectedCompletion: Date,
  blockers: String,
  module: String,

  workingTime: String, // e.g. "09:30 AM - 06:30 PM"
  hours: Number,

  reportSubmission: {
    type: String,
    enum: ['Submitted', 'Late', 'Pending'],
    default: 'Submitted',
  },
  attendance: {
    type: String,
    enum: ['Present', 'Absent', 'Half-Day', 'Leave', 'WFH'],
    default: 'Present',
  },

  ktCompletion: { type: Number, min: 0, max: 100 }, // % knowledge-transfer completion
  productivityMetrics: { type: Number, min: 0, max: 10 }, // self/HR rated score out of 10
  aiCredits: Number, // AI tool credits/tokens used that day
  projectAssignment: String, // free-text note on current assignment

  submittedAt: { type: Date, default: Date.now },
  lastEditedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// One tracker entry per user per date
DailyTrackerSchema.index({ user: 1, date: 1 }, { unique: true });

const DailyTracker = mongoose.model('DailyTracker', DailyTrackerSchema);
export default DailyTracker;
