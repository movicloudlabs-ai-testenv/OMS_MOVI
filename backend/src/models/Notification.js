import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Notification Model
 * In-app notifications for all users. Supports typed notifications
 * with links for frontend navigation and metadata for extra context.
 */
const NotificationSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'task_assigned', 'task_approved', 'task_rejected',
      'task_submitted_for_review', 'task_blocked', 'task_comment',
      'leave_approved', 'leave_rejected', 'leave_requested',
      'project_assigned', 'project_updated',
      'user_created', 'permission_changed',
      'system_alert', 'milestone_reached',
      'intern_assigned', 'attendance_marked',
    ],
  },
  title: String,
  message: { type: String, required: true },
  link: String, // frontend route to navigate to
  read: { type: Boolean, default: false },
  readAt: Date,
  sender: { type: Schema.Types.ObjectId, ref: 'User' },
  metadata: Schema.Types.Mixed, // extra context data
}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────────────────────────────
NotificationSchema.index({ recipient: 1 });
NotificationSchema.index({ read: 1 });

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
