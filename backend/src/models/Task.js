import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Task Model
 * Tasks assigned to users within projects. Includes subtasks,
 * comments, attachments, and full status history for audit.
 */
const TaskSchema = new Schema({
  taskCode: { type: String, unique: true, sparse: true, index: true },
  title: { type: String, required: true },
  description: String,
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // Optional: becomes null when the assignee is offboarded/deleted (see needsReassignment).
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  // Optional: dedicated tester assigned to verify deliverable in QA
  assignedTester: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  qaRejectionNotes: { type: String, default: null },
  qaRejectedAt: { type: Date, default: null },
  // Set when the assignee was removed (e.g. user deleted) and the task needs a new owner.
  needsReassignment: { type: Boolean, default: false },
  priority: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Todo', 'In Progress', 'In Review', 'Blocked', 'Done', 'Cancelled', 'Testing'],
    default: 'Todo',
  },
  effortPoints: { type: Number, min: 1, max: 13 },
  storyPoints: { type: Number, min: 1, max: 13, default: 1 },
  sprint: { type: Schema.Types.ObjectId, ref: 'Sprint', default: null },
  startDate: { type: Date, default: Date.now },
  dueDate: Date,
  submittedAt: Date,
  approvedAt: Date,
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  blockedBy: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
  sprintHistory: [{
    sprint: { type: Schema.Types.ObjectId, ref: 'Sprint' },
    rolledOver: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
  }],
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

  // ─── Testing Workflow ──────────────────────────────────────────────────────
  // Set when leader sends task from "In Review" → "Testing"
  sentToTestingAt: { type: Date, default: null },
  // Tracks per-subtask QA results from the testing team
  testingStatus: {
    overallResult: {
      type: String,
      enum: ['Pending', 'Passed', 'Failed', 'Partial'],
      default: 'Pending',
    },
    testedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
    results: [{
      subtaskId: { type: Schema.Types.ObjectId },
      subtaskTitle: String,
      result: {
        type: String,
        enum: ['Pending', 'Pass', 'Fail'],
        default: 'Pending',
      },
      notes: String,
      testedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      testedAt: { type: Date },
    }],
  },

  // ─── EOD Submission Locking ────────────────────────────────────────────────
  // When an employee submits their EOD report containing this task/subtasks,
  // the completed task & subtasks become immutable and cannot be unchecked/reverted.
  eodSubmitted: { type: Boolean, default: false },
  eodSubmittedAt: { type: Date, default: null },
}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────────────────────────────
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ project: 1 });
TaskSchema.index({ sprint: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ dueDate: 1 });

const Task = mongoose.model('Task', TaskSchema);
export default Task;
