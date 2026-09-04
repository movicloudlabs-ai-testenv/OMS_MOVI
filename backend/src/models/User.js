import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const { Schema } = mongoose;

/**
 * User Model
 * Central user model for all roles: Super Admin, Admin, HR Manager,
 * PMO Lead, Employee, Intern. Role is a reference to the Role model.
 */
const UserSchema = new Schema({
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
    // Auto-generated: EMP-YYYY-XXX or INT-YYYY-XXX
  },
  name: { type: String, required: true, trim: true },
  username: { type: String, unique: true, sparse: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false, // Never returned in queries by default
  },
  avatar: { type: String, default: null }, // file path
  profileImage: { type: String, default: null }, // data URL / external image set via self-service profile
  githubLink: { type: String, default: '' },
  projectLink: { type: String, default: '' },
  role: {
    type: Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
  },
  department: { type: Schema.Types.ObjectId, ref: 'Department' },
  designation: { type: String },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Intern'],
    default: 'Full-time',
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active',
  },
  manager: { type: Schema.Types.ObjectId, ref: 'User' },
  hrManager: { type: Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },

  // Intern-specific fields
  college: String,
  domain: String, // e.g. Frontend, Backend, Data Science, UI/UX
  batch: String,  // e.g. "2026 Summer", "Jan-2026"
  internshipStart: Date,
  internshipEnd: Date,
  mentor: { type: Schema.Types.ObjectId, ref: 'User' },
  pmoLead: { type: Schema.Types.ObjectId, ref: 'User' },
  performanceRatings: [{
    week: Number,
    rating: Number,
    note: String,
    source: { type: String, enum: ['hr', 'pmo', 'admin'], default: 'hr' },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],

  // Employee-specific
  joinDate: Date,
  skills: [String],
  phone: String,
  address: String,
  linkedIn: String,
  emergencyContact: {
    name: String,
    phone: String,
    relation: String,
  },
  bio: String,

  // HR & PMO Management
  project: { type: Schema.Types.ObjectId, ref: 'Project' },
  onboardingComplete: { type: Boolean, default: false },
  onboardingChecklist: {
    welcomeEmail: { type: Boolean, default: false },
    idCardIssued: { type: Boolean, default: false },
    systemAccess: { type: Boolean, default: false },
    deptIntroduction: { type: Boolean, default: false },
    equipmentAssigned: { type: Boolean, default: false },
    hrDocumentation: { type: Boolean, default: false },
    mentorAssigned: { type: Boolean, default: false },
    firstWeekSchedule: { type: Boolean, default: false },
  },
  notes: [{
    text: String,
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],

  // Document Management (Resume, Offer Letter, NDA, ID Proof, Educational Certificate)
  documents: {
    resume: {
      fileName: String, filePath: String, uploadedAt: Date,
      uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    offerLetter: {
      fileName: String, filePath: String, uploadedAt: Date,
      uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    nda: {
      fileName: String, filePath: String, uploadedAt: Date,
      uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    idProof: {
      fileName: String, filePath: String, uploadedAt: Date,
      uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    educationalCertificate: {
      fileName: String, filePath: String, uploadedAt: Date,
      uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
  },

  // Auth
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  passwordChangedAt: Date,
  mustChangePassword: { type: Boolean, default: false },
  refreshToken: { type: String, select: false },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },

  // Soft delete
  deletedAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
UserSchema.index({ role: 1 });
UserSchema.index({ department: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ hrManager: 1, onboardingComplete: 1 });

// ─── Virtual: avatar URL ──────────────────────────────────────────────────────
UserSchema.virtual('avatarUrl').get(function () {
  if (this.avatar) {
    return `/uploads/avatars/${this.avatar}`;
  }
  return null;
});

// ─── Pre-save: hash password ──────────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = this.mustChangePassword ? 4 : (parseInt(process.env.BCRYPT_ROUNDS) || 12);
  this.password = await bcrypt.hash(this.password, rounds);
  this.passwordChangedAt = new Date();
  next();
});

// ─── Method: compare password ─────────────────────────────────────────────────
UserSchema.methods.comparePassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

// ─── Method: is account locked ────────────────────────────────────────────────
UserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// ─── Method: create password reset token ──────────────────────────────────────
// Returns the raw token (emailed to the user); stores only the SHA-256 hash.
UserSchema.methods.createPasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return rawToken;
};

// ─── Static: generate employee ID ─────────────────────────────────────────────
UserSchema.statics.generateEmployeeId = async function (type) {
  const prefix = type === 'Intern' ? 'INT' : 'EMP';
  const year = new Date().getFullYear();
  let count = await this.countDocuments({
    employeeId: new RegExp(`^${prefix}-${year}`),
  });

  let employeeId;
  let exists = true;
  while (exists) {
    const paddedSeq = String(count + 1).padStart(3, '0');
    employeeId = `${prefix}-${year}-${paddedSeq}`;

    // Verify that the generated Employee ID does not already exist in User or ArchivedUser
    const userExists = await this.findOne({ employeeId });
    const archivedExists = await mongoose.model('ArchivedUser').findOne({ employeeId });

    if (!userExists && !archivedExists) {
      exists = false;
    } else {
      count++;
    }
  }
  return employeeId;
};

const User = mongoose.model('User', UserSchema);
export default User;
