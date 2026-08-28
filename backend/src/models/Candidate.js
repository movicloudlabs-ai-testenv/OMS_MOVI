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

  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  convertedTo: { type: Schema.Types.ObjectId, ref: 'User' }, // set once Joined + converted to a real user account
}, { timestamps: true });

CandidateSchema.index({ name: 'text', email: 'text', college: 'text', domain: 'text' });

const Candidate = mongoose.model('Candidate', CandidateSchema);
export default Candidate;
