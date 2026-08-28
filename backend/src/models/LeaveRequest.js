import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * LeaveRequest Model
 * Leave applications submitted by employees/interns, reviewed by HR.
 */
const LeaveRequestSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['Casual', 'Sick', 'Annual', 'Emergency', 'Compensatory'],
    required: true,
  },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  days: { type: Number, required: true },
  reason: { type: String, required: true },
  document: String, // file path for supporting documents
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewNote: String,
  reviewedAt: Date,
  // PMO impact flag
  projectImpact: String,
}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────────────────────────────
LeaveRequestSchema.index({ user: 1 });
LeaveRequestSchema.index({ status: 1 });

const LeaveRequest = mongoose.model('LeaveRequest', LeaveRequestSchema);
export default LeaveRequest;
