import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * EODReport Model
 * Structured end-of-day report capturing what was accomplished, blockers,
 * learnings, tomorrow's plan, and energy level. One record per user per date.
 * The legacy `message` field is kept optional for backward compatibility.
 */
const EODReportSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },

  // Legacy free-text field — kept for backward compat; new submissions use structured fields
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
