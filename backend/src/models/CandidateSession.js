import mongoose from 'mongoose';

const { Schema } = mongoose;

const CandidateSessionSchema = new Schema({
  assessmentDrive: {
    type: Schema.Types.ObjectId,
    ref: 'AssessmentDrive',
    required: true,
  },
  candidateName: { type: String, required: true, trim: true },
  candidateEmail: { type: String, required: true, trim: true, lowercase: true },
  candidatePhone: { type: String, trim: true },
  startTime: { type: Date, default: Date.now },
  submittedAt: { type: Date },
  timeSpentSeconds: { type: Number, default: 0 },
  answers: {
    type: Map,
    of: Number, // questionId string -> selected option index
    default: {},
  },
  score: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  tabSwitchCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['InProgress', 'Completed', 'TimedOut'],
    default: 'InProgress',
  },
  linkedCandidateId: {
    type: Schema.Types.ObjectId,
    ref: 'Candidate',
  },
}, { timestamps: true });

CandidateSessionSchema.index({ assessmentDrive: 1, candidateEmail: 1 });
CandidateSessionSchema.index({ status: 1 });

const CandidateSession = mongoose.model('CandidateSession', CandidateSessionSchema);
export default CandidateSession;
