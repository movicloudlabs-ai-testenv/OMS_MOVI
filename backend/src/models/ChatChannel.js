import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * ChatChannel Model
 * Supports company-wide public channels, dedicated private project channels,
 * and 1:1 direct messaging threads.
 */
const ChatChannelSchema = new Schema({
  channelId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
  },
  topic: {
    type: String,
    default: '',
    trim: true,
  },
  channelType: {
    type: String,
    enum: ['company', 'project', 'direct'],
    default: 'company',
    index: true,
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    index: true,
  },
  avatar: {
    type: String,
    default: null,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  members: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      default: 'Member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
  }],
  readReceipts: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  lastMessage: {
    message: String,
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdAt: Date,
  },
  messageCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

ChatChannelSchema.index({ channelType: 1, isPrivate: 1 });
ChatChannelSchema.index({ 'members.user': 1 });

const ChatChannel = mongoose.model('ChatChannel', ChatChannelSchema);
export default ChatChannel;
