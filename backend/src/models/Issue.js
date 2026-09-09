import mongoose from 'mongoose';

const { Schema } = mongoose;

const IssueSchema = new Schema({
  ticketId: { type: String, unique: true, index: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  priority: { type: String, enum: ['P0', 'P1', 'P2', 'P3', 'Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  severity: { type: String, enum: ['Blocker', 'Critical', 'Major', 'Minor', 'Trivial', 'Low', 'Medium', 'High'], default: 'Medium' },
  environment: { type: String, enum: ['Production', 'Staging', 'QA', 'UAT', 'Development'], default: 'Production' },
  module: { type: String, default: 'General' },
  stepsToReproduce: { type: String, default: '' },
  expectedBehavior: { type: String, default: '' },
  actualBehavior: { type: String, default: '' },
  attachments: [{
    url: { type: String, required: true },
    name: { type: String, default: 'attachment.png' },
    fileType: { type: String, default: 'image/png' },
    sizeBytes: { type: Number, default: 0 },
  }],
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open', index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  creatorRole: { type: String, required: true },
  recipients: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
  blockedBy: [{ type: Schema.Types.ObjectId, ref: 'Issue' }],
  fixCommitHash: { type: String, default: null },
  fixBranch: { type: String, default: null },
  fixPrUrl: { type: String, default: null },
  resolutionNotes: { type: String, default: null },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  reopenedCount: { type: Number, default: 0 },
  reopenedHistory: [{
    reopenedAt: { type: Date, default: Date.now },
    reopenedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: String,
  }],
  comments: [{
    _id: { type: Schema.Types.ObjectId, auto: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: String,
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

IssueSchema.index({ project: 1, status: 1 });
IssueSchema.index({ recipients: 1, createdAt: -1 });
IssueSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model('Issue', IssueSchema);
