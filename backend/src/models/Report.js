import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    description: String,
    category:    { type: String, required: true },
    type:        { type: String, enum: ['system', 'custom'], default: 'system' },
    schedule: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly', 'Manual', 'On-Demand'],
      default: 'Manual',
    },
    nextRun:       Date,
    dataSource:    [String],
    outputFormats: { type: [String], default: ['CSV'] },
    fileSizes: {
      pdf:  { type: String, default: '—' },
      xlsx: { type: String, default: '—' },
      csv:  { type: String, default: '~50 KB' },
    },
    parameters:   { type: String, default: 'Default timeframe (30d), no filters applied' },
    generatorKey: String,
    filters:      [String],
    icon:         String,
    isArchived:   { type: Boolean, default: false },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Report', reportSchema);
