import mongoose from 'mongoose';

const { Schema } = mongoose;

const MessageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
  read: { type: Boolean, default: false },
  readAt: Date,
}, { timestamps: true });

MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, read: 1, createdAt: -1 });

export default mongoose.model('Message', MessageSchema);
