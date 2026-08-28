import mongoose from 'mongoose';

const { Schema } = mongoose;

const LearningResourceSchema = new Schema({
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['Video', 'Document', 'Link', 'Course'],
    required: true,
  },
  url: String,
  description: String,
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project' },
  dueDate: Date,
  estimatedMinutes: Number,
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending',
  },
  completedAt: Date,
}, { timestamps: true });

const LearningResource = mongoose.model('LearningResource', LearningResourceSchema);
export default LearningResource;
