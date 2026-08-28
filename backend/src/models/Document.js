import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['NDA', 'Offer Letter', 'ID Proof', 'Report', 'Other'], default: 'Other' },
  filePath: { type: String, required: true },
  originalName: { type: String },
  size: { type: Number, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

export default mongoose.model('Document', documentSchema);
