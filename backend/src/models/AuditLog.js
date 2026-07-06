import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * AuditLog Model
 * Immutable audit trail for compliance. Records are NEVER updated or deleted.
 * Auto-created by the audit middleware on every write operation.
 */
const AuditLogSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  userName: String, // denormalized — preserved even if user is deleted
  action: { type: String, required: true },
  module: { type: String, required: true },
  resource: String,
  resourceId: Schema.Types.ObjectId,
  details: String,
  ipAddress: String,
  userAgent: String,
  device: String,
  browser: String,       // e.g. "Chrome 120"
  os: String,            // e.g. "Windows 11"
  location: String,      // e.g. "Kochi, India" or "Local"
  country: String,       // ISO country code, e.g. "IN"
  countryFlag: String,   // flag emoji, e.g. "🇮🇳"
  result: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'WARNING'],
    default: 'SUCCESS',
  },
  errorMessage: String,
  sessionId: String,
  requestId: String,
}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────────────────────────────
AuditLogSchema.index({ user: 1 });
AuditLogSchema.index({ module: 1 });
AuditLogSchema.index({ result: 1 });
AuditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;
