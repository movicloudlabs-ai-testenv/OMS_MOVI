import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Project Model
 * Projects managed by PMO, with team members, interns, milestones, and budget tracking.
 */
const ProjectSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, unique: true },
  // e.g. "PRJ-2024-001"
  description: String,
  status: {
    type: String,
    enum: ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'],
    default: 'Planning',
  },
  priority: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: 'Medium',
  },
  manager: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hrManager: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  department: { type: Schema.Types.ObjectId, ref: 'Department' },
  team: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    role: String, // "Developer", "Designer", "QA", "Architect"
    allocationPercentage: { type: Number, default: 100, min: 0, max: 100 },
    addedAt: { type: Date, default: Date.now },
  }],
  interns: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
  }],
  startDate: Date,
  endDate: Date,
  budget: Number,
  budgetSpent: { type: Number, default: 0 },
  milestones: [{
    _id: { type: Schema.Types.ObjectId, auto: true },
    name: String,
    date: Date,
    startDate: Date,
    baselineStartDate: Date,
    baselineEndDate: Date,
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['upcoming', 'current', 'completed', 'overdue', 'pending'],
      default: 'upcoming',
    },
    deliverable: String,
    blockedBy: [{ type: Schema.Types.ObjectId }],
  }],
  tags: [String],
  healthStatus: {
    type: String,
    enum: ['On Track', 'At Risk', 'Delayed'],
    default: 'On Track',
  },
  repositoryUrl: String,
  cicdUrl: String,
  documentationUrl: String,
  techStack: [String],
  architectureNotes: String,
  currentVersion: { type: String, default: 'v1.0.0' },
  releaseCadence: { type: String, default: 'Bi-weekly Sprint' },
  targetChannel: { type: String, default: 'Production' },
  releaseNotes: String,
  deployments: [{
    _id: { type: Schema.Types.ObjectId, auto: true },
    environment: {
      type: String,
      enum: ['Production', 'Staging', 'QA', 'Development'],
      default: 'Staging',
    },
    url: String,
    status: {
      type: String,
      enum: ['Live', 'Building', 'Degraded', 'Offline'],
      default: 'Live',
    },
    version: String,
    previousVersion: String,
    pipelineRunUrl: String,
    durationSeconds: { type: Number, default: 0 },
    deployedAt: { type: Date, default: Date.now },
    deployedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  }],
  credentials: [{
    _id: { type: Schema.Types.ObjectId, auto: true },
    key: { type: String, required: true },
    env: {
      type: String,
      enum: ['Production', 'Staging', 'QA', 'Development'],
      default: 'Staging',
    },
    encryptedValue: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    keyVersion: { type: Number, default: 1 },
    description: String,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  }],
}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────────────────────────────
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ manager: 1 });
ProjectSchema.index({ 'team.user': 1 });

const Project = mongoose.model('Project', ProjectSchema);
export default Project;
