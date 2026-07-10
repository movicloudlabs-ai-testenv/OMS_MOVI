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
    role: String, // "Developer", "Designer", "QA"
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
    status: {
      type: String,
      enum: ['upcoming', 'current', 'completed', 'overdue'],
      default: 'upcoming',
    },
  }],
  tags: [String],
  healthStatus: {
    type: String,
    enum: ['On Track', 'At Risk', 'Delayed'],
    default: 'On Track',
  },
}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────────────────────────────
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ manager: 1 });
ProjectSchema.index({ 'team.user': 1 });

const Project = mongoose.model('Project', ProjectSchema);
export default Project;
