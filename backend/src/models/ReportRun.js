import mongoose from 'mongoose';
import crypto from 'crypto';

const reportRunSchema = new mongoose.Schema(
  {
    report: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
    runId: {
      type:    String,
      default: () => `run_${crypto.randomBytes(4).toString('hex')}`,
      unique:  true,
    },
    status: {
      type:    String,
      enum:    ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
    },
    startedAt:    { type: Date, default: Date.now },
    completedAt:  Date,
    recordCount:  { type: Number, default: 0 },
    fileSize:     String,
    duration:     String,
    errorMessage: String,
    executedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('ReportRun', reportRunSchema);
