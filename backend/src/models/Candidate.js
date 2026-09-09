import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Candidate Model
 * Represents a person in the HR recruitment pipeline, from application
 * through interview to a hiring decision. On being marked "Joined",
 * HR converts them into a real User (Employee/Intern) via the
 * Admin > Create User flow, referencing convertedTo.
 */
const CandidateSchema = new Schema({
  name:  { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },

  college: { type: String, trim: true },      // College Name
  domain:  { type: String, trim: true },      // Domain / Technology
  appliedRole: { type: String, trim: true },  // Applied Role

  interviewDate: Date,
  interviewResult: {
    type: String,
    enum: ['Pending', 'Selected', 'Rejected', 'On Hold'],
    default: 'Pending',
  },
  interviewNotes: String,

  joiningDate: Date,

  recruitmentStatus: {
    type: String,
    enum: ['Applied', 'Interview Scheduled', 'Interviewed', 'Selected', 'On Hold', 'Rejected', 'Joined'],
    default: 'Applied',
  },

  // Document Management (Resume, Offer Letter, NDA) — captured pre-joining
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
  },

  notes: [{
    text: String,
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],

  // Interviewer Evaluation Scorecard (Darwinbox / Greenhouse standard)
  interviewScorecard: {
    technical: { type: Number, min: 1, max: 5 },
    problemSolving: { type: Number, min: 1, max: 5 },
    cultureFit: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    overall: { type: Number, min: 1, max: 5 },
    recommendation: {
      type: String,
      enum: ['Strong Hire', 'Hire', 'Weak Hire', 'No Hire'],
      default: 'Hire',
    },
    notes: String,
    evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    evaluatedAt: Date,
  },

  // Official In-App Offer Letter Details (Strictly non-monetary: designation, terms, dates)
  offerDetails: {
    designation: String,
    department: String,
    joiningDate: Date,
    probationPeriod: String, // e.g. "3 Months", "6 Months"
    workMode: { type: String, enum: ['Office', 'Hybrid', 'Remote'], default: 'Office' },
    reportingManager: String,
    serialNumber: String, // e.g. "OFF-2026-8942"
    status: { type: String, enum: ['Draft', 'Issued', 'Accepted', 'Declined'], default: 'Issued' },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    issuedAt: Date,
  },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  convertedTo: { type: Schema.Types.ObjectId, ref: 'User' }, // set once Joined + converted to a real user account
}, { timestamps: true });

CandidateSchema.index({ name: 'text', email: 'text', college: 'text', domain: 'text' });

const Candidate = mongoose.model('Candidate', CandidateSchema);
export default Candidate;
