import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Announcement Model
 * Broadcast messages and team communications created by HR / Admin.
 */
const AnnouncementSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 3000,
  },
  targetRoles: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  pinned: {
    type: Boolean,
    default: false,
  },
  sentBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

AnnouncementSchema.index({ createdAt: -1 });
AnnouncementSchema.index({ pinned: -1, createdAt: -1 });

const Announcement = mongoose.model('Announcement', AnnouncementSchema);
export default Announcement;
