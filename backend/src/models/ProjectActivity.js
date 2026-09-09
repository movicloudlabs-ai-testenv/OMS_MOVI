import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * ProjectActivity Model
 * Immutable event stream documenting all project lifecycle mutations:
 * bug resolutions, deployments, member assignments, milestone updates, and secret reveals.
 */
const ProjectActivitySchema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actorName: { type: String, required: true },
  action: {
    type: String,
    enum: [
      'resolved_bug',
      'reported_bug',
      'reopened_bug',
      'deployed',
      'added_member',
      'updated_member',
      'removed_member',
      'created_milestone',
      'updated_milestone',
      'revealed_secret',
      'added_secret',
      'created_sprint',
      'started_sprint',
      'completed_sprint',
      'moved_task',
    ],
    required: true,
  },
  title: { type: String, required: true },
  details: { type: String, default: '' },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

ProjectActivitySchema.index({ project: 1, createdAt: -1 });

const ProjectActivity = mongoose.model('ProjectActivity', ProjectActivitySchema);
export default ProjectActivity;
