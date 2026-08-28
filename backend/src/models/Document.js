import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Document Model
 * Compliance, HR, and Intern documents (NDAs, Offer Letters, ID Proofs, Reports, etc.)
 */
const DocumentSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  originalName: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    enum: ['NDA', 'Offer Letter', 'ID Proof', 'Report', 'Other'],
    default: 'Other',
  },
  filePath: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
  },
  size: {
    type: Number,
    default: 0,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

DocumentSchema.index({ user: 1, createdAt: -1 });
DocumentSchema.index({ category: 1 });

const Document = mongoose.model('Document', DocumentSchema);
export default Document;
