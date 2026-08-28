import mongoose from 'mongoose';

const { Schema } = mongoose;

const LeaveBalanceSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  year: { type: Number, required: true },
  casual: {
    total: { type: Number, default: 10 },
    used: { type: Number, default: 0 },
  },
  sick: {
    total: { type: Number, default: 7 },
    used: { type: Number, default: 0 },
  },
  annual: {
    total: { type: Number, default: 15 },
    used: { type: Number, default: 0 },
  },
  emergency: {
    total: { type: Number, default: 2 },
    used: { type: Number, default: 0 },
  },
  compensatory: {
    total: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
  },
}, { timestamps: true });

LeaveBalanceSchema.index({ user: 1, year: 1 }, { unique: true });

const LeaveBalance = mongoose.model('LeaveBalance', LeaveBalanceSchema);
export default LeaveBalance;
