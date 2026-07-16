import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * ArchivedUser Model
 * Stores deleted users for data retention. Users moved here via the archive
 * flow keep their original _id as `originalId` so all cross-references
 * (audit logs, tasks, projects) remain valid forever.
 */
const ArchivedUserSchema = new Schema({
  // Preserve the original user _id so all references remain valid
  originalId: {
    type: Schema.Types.ObjectId,
    required: true,
    unique: true,
  },

  // ─── Original user fields (preserved exactly) ────────────────────────────
  employeeId:     { type: String },
  name:           { type: String },
  email:          { type: String },  // original clean email
  avatar:         { type: String },
  role:           { type: Schema.Types.ObjectId, ref: 'Role' },
  department:     { type: Schema.Types.ObjectId, ref: 'Department' },
  designation:    { type: String },
  employmentType: { type: String },
  joinDate:       { type: Date },
  skills:         [String],

  // ─── Archive metadata ────────────────────────────────────────────────────
  archivedAt: {
    type: Date,
    default: Date.now,
  },
  archivedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    // Not required — null for system migrations
  },
  archivedByName: {
    type: String, // denormalized — in case admin is also deleted later
  },
  archiveReason: {
    type: String,
    default: 'Deleted by administrator',
  },

  // ─── Restore tracking ────────────────────────────────────────────────────
  restoredAt:  { type: Date, default: null },
  restoredBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  isRestored:  { type: Boolean, default: false },

  // ─── Full original document snapshot ─────────────────────────────────────
  // Kept so nothing is ever truly lost — even fields not in this schema
  originalDocument: {
    type: Schema.Types.Mixed,
  },
}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────────────────────────────
ArchivedUserSchema.index({ name: 'text', email: 'text', employeeId: 'text' });
ArchivedUserSchema.index({ archivedAt: -1 });
ArchivedUserSchema.index({ originalId: 1 }, { unique: true });

const ArchivedUser = mongoose.model('ArchivedUser', ArchivedUserSchema);
export default ArchivedUser;
