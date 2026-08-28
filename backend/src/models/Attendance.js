import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Attendance Model
 * One record per user per date. Marked by HR.
 * Compound unique index prevents duplicate entries.
 */
const AttendanceSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Leave', 'Holiday', 'Half-Day'],
    required: true,
  },
  checkIn: String,   // "09:15 AM"
  checkOut: String,  // "06:30 PM"
  hoursWorked: Number,
  markedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  note: String,
}, { timestamps: true });

// One attendance record per user per date
AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', AttendanceSchema);
export default Attendance;
