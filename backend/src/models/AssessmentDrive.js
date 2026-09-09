import mongoose from 'mongoose';

const { Schema } = mongoose;

const AssessmentQuestionSchema = new Schema({
  questionText: { type: String, required: true },
  category: {
    type: String,
    enum: ['Technical', 'Aptitude', 'Behavioral', 'System Design'],
    default: 'Technical',
  },
  difficulty: {
    type: String,
    enum: ['Junior', 'Mid', 'Senior'],
    default: 'Mid',
  },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true, default: 0 },
  points: { type: Number, default: 10 },
  codeSnippet: { type: String },
  explanation: { type: String },
}, { _id: true });

const AssessmentDriveSchema = new Schema({
  title: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  department: { type: String, trim: true, default: 'Engineering' },
  sessionCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  durationMinutes: { type: Number, default: 30 },
  passingScore: { type: Number, default: 70 }, // percentage
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Archived'],
    default: 'Active',
  },
  questions: [AssessmentQuestionSchema],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

AssessmentDriveSchema.index({ status: 1 });

const AssessmentDrive = mongoose.model('AssessmentDrive', AssessmentDriveSchema);
export default AssessmentDrive;
