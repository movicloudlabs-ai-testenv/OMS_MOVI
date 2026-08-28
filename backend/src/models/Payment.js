import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Payment Model
 * Tracks intern stipends, disbursement slips, invoices, and payment statuses.
 */
const PaymentSchema = new Schema({
  internId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    trim: true,
    default: 'Internship Stipend',
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'rejected'],
    default: 'pending',
    index: true,
  },
  slipUrl: {
    type: String,
    default: '',
  },
  transactionId: {
    type: String,
    trim: true,
    default: '',
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

PaymentSchema.index({ internId: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', PaymentSchema);
export default Payment;
