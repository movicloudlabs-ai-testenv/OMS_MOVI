import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Task Model
 * Tasks assigned to users within projects. Includes subtasks,
 * comments, attachments, and full status history for audit.
 */
const TaskSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // Optional: becomes null when the assignee is offboarded/deleted (see needsReassignment).
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  // Set when the assignee was removed (e.g. user deleted) and the task needs a new owner.
  needsReassignment: { type: Boolean, default: false },
  priority: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Todo', 'In Progress', 'In Review', 'Blocked', 'Done'],
    default: 'Todo',
  },
  effortPoints: { type: Number, min: 1, max: 13 },
  dueDate: Date,
  submittedAt: Date,
  approvedAt: Date,
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  subtasks: [{
    _id: { type: Schema.Types.ObjectId, auto: true },
    title: String,
    completed: { type: Boolean, default: false },
  }],
  comments: [{
    _id: { type: Schema.Types.ObjectId, auto: true },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  attachments: [{
    name: String,
    path: String,
    size: String,
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  }],
  blockedReason: String,
  statusHistory: [{
    status: String,
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────────────────────────────
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ project: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ dueDate: 1 });

const Task = mongoose.model('Task', TaskSchema);
export default Task;
