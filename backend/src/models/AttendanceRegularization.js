import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * AttendanceRegularization Model
 * Allows employees and interns to submit punch regularizations / corrections
 * for missed punches, remote field duties, or technical glitches.
 */
const AttendanceRegularizationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
  },
  requestType: {
    type: String,
    enum: ['Check-In', 'Check-Out', 'Both', 'Status-Correction'],
    default: 'Both',
  },
  requestedCheckIn: {
    type: String,
    trim: true,
  },
  requestedCheckOut: {
    type: String,
    trim: true,
  },
  workMode: {
    type: String,
    enum: ['Office', 'WFH', 'On-Duty', 'Remote', 'Client Site'],
    default: 'Office',
  },
  reason: {
    type: String,
    required: [true, 'Reason is required for attendance regularization'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    index: true,
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewNote: {
    type: String,
    trim: true,
  },
  reviewedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

AttendanceRegularizationSchema.index({ user: 1, date: -1 });
AttendanceRegularizationSchema.index({ status: 1, createdAt: -1 });

const AttendanceRegularization = mongoose.model('AttendanceRegularization', AttendanceRegularizationSchema);
export default AttendanceRegularization;
