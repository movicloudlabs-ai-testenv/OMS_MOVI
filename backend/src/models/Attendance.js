import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Attendance Model
 * One record per user per date. Marked by HR.
 * Compound unique index prevents duplicate entries.
 */

const BreakSessionSchema = new Schema({
  start: { type: Date, required: true },
  end: { type: Date, default: null },
}, { _id: true });

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
  checkInTime: Date,
  checkOutTime: Date,
  hoursWorked: Number,        // Gross shift duration (check-out minus check-in)
  totalBreakMinutes: { type: Number, default: 0 }, // Sum of all completed breaks in minutes
  netHoursWorked: Number,     // hoursWorked − (totalBreakMinutes / 60), written on check-out
  breaks: { type: [BreakSessionSchema], default: [] },
  workMode: {
    type: String,
    enum: ['Office', 'WFH', 'On-Duty', 'Remote', 'Client Site'],
    default: 'Office',
  },
  latitude: Number,
  longitude: Number,
  isGeofenced: { type: Boolean, default: false },
  isLate: { type: Boolean, default: false },
  markedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  note: String,
}, { timestamps: true });

// One attendance record per user per date
AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', AttendanceSchema);
export default Attendance;
