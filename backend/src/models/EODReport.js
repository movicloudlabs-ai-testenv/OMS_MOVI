import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * EODReport Model
 * Structured end-of-day report capturing activities, project, role, module,
 * accomplishments, blockers, learnings, and tomorrow's plan. One record per user per date.
 * `message` is maintained for backward compatibility and formatted exports.
 */
const EODReportSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },

  // Project & Module Context
  name: { type: String, trim: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project' },
  role: { type: String, trim: true },
  module: { type: String, trim: true },
  activities: { type: String, trim: true }, // Development & Testing activities performed
  issues: { type: String, trim: true },     // Issues identified / Debugging
  proposedSolution: { type: String, trim: true }, // optional — if any bug solved

  // Free-text / Auto-generated composite message
  message: { type: String, trim: true },

  // Structured enterprise fields
  tasksCompleted: { type: String, trim: true },   // What was accomplished today
  blockers: { type: String, trim: true },          // Challenges / blockers encountered
  learnings: { type: String, trim: true },          // Key learnings from the day
  plansTomorrow: { type: String, trim: true },     // Priority plan for tomorrow
  mood: {
    type: String,
    enum: ['exhausted', 'low', 'neutral', 'good', 'energized'],
    default: 'neutral',
  },
  hoursWorked: { type: Number, default: 8.0 },     // Gross hours (check-in → check-out)
  netHoursWorked: { type: Number },                // Net hours after breaks deducted

  // Reference to the chat message dispatched to the project channel
  chatMessageId: { type: Schema.Types.ObjectId, ref: 'ChatMessage', default: null },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

EODReportSchema.index({ user: 1, date: 1 }, { unique: true });

const EODReport = mongoose.model('EODReport', EODReportSchema);
export default EODReport;
