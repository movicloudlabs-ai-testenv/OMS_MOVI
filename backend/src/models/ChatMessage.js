import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * ChatMessage Model
 * Company internal messaging and channel communications.
 */
const ChatMessageSchema = new Schema({
  channel: {
    type: String,
    trim: true,
    default: '#general',
    index: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  },
  attachments: [{
    url: String,
    name: String,
    fileType: String,
    sizeBytes: Number,
  }],
  messageType: {
    type: String,
    enum: ['text', 'system', 'task_card', 'media', 'eod_report'],
    default: 'text',
    index: true,
  },
  mentions: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    name: String,
  }],
  taskRef: {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    code: String,
    title: String,
    status: String,
    priority: String,
  },
  eodRef: {
    eodId: {
      type: Schema.Types.ObjectId,
      ref: 'EODReport',
    },
    tasksCompleted: String,
    blockers: String,
    learnings: String,
    plansTomorrow: String,
    mood: String,
    hoursWorked: Number,
    netHoursWorked: Number,
    date: String,
  },
  reactions: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    emoji: String,
  }],
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'ChatMessage',
  },
  readBy: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  }],
  deliveredTo: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deliveredAt: {
      type: Date,
      default: Date.now,
    },
  }],
  isPinned: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

ChatMessageSchema.index({ channel: 1, createdAt: -1 });
ChatMessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);
export default ChatMessage;
