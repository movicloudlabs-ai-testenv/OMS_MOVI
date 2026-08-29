import mongoose from 'mongoose';

const { Schema } = mongoose;

const IssueSchema = new Schema({
  ticketId: { type: String, unique: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open', index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  creatorRole: { type: String, required: true },
  recipients: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
}, { timestamps: true });

IssueSchema.index({ recipients: 1, createdAt: -1 });
IssueSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model('Issue', IssueSchema);
