import mongoose from 'mongoose';

const { Schema } = mongoose;

const BugSchema = new Schema({
  project: { type: String, required: true, trim: true, default: 'owms', index: true },
  testCaseId: { type: String, trim: true, index: true },
  bugId: { type: String, trim: true, index: true },
  module: { type: String, trim: true, default: '' },
  scenario: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  precondition: { type: String, trim: true, default: '' },
  steps: { type: String, trim: true, default: '' },
  testData: { type: String, trim: true, default: '' },
  expected: { type: String, trim: true, default: '' },
  actual: { type: String, required: true, trim: true },
  status: { type: String, enum: ['Open', 'In Progress', 'Fail', 'Pass', 'Closed'], default: 'Open' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  environment: { type: String, trim: true, default: '' },
  remarks: { type: String, trim: true, default: '' },
  startingTime: { type: String, trim: true, default: '' },
  endTime: { type: String, trim: true, default: '' },
  solvedBy: { type: String, trim: true, default: '' },
  solvedDate: { type: String, trim: true, default: '' },
  executedBy: { type: String, trim: true, default: '' },
  executionDate: { type: String, trim: true, default: '' },
  reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

BugSchema.index({ project: 1, createdAt: -1 });

export default mongoose.model('Bug', BugSchema);
