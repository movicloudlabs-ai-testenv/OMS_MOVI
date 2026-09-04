import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Message Model
 * Direct 1-on-1 conversations between system users (HR, Intern, PMO, Employee, Admin)
 */
const MessageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
  readAt: Date,
}, { timestamps: true });

MessageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
MessageSchema.index({ receiver: 1, read: 1 });

const Message = mongoose.model('Message', MessageSchema);
export default Message;
