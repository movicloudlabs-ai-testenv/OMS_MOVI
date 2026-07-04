import mongoose from 'mongoose';
const { Schema } = mongoose;

const AnnouncementSchema = new Schema({
  title:     { type: String, required: true, trim: true, maxlength: 120 },
  body:      { type: String, required: true, trim: true, maxlength: 500 },
  type:      { type: String, enum: ['general', 'maintenance', 'security', 'feature'], default: 'general' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

AnnouncementSchema.index({ createdAt: -1 });

export default mongoose.model('Announcement', AnnouncementSchema);
