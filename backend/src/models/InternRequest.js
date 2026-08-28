import mongoose from 'mongoose';

const { Schema } = mongoose;

const InternRequestSchema = new Schema({
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  department: String,
  duration: String,
  skills: [String],
  note: String,
  status: {
    type: String,
    enum: ['Pending', 'Fulfilled', 'Rejected'],
    default: 'Pending',
  },
}, { timestamps: true });

const InternRequest = mongoose.model('InternRequest', InternRequestSchema);
export default InternRequest;
