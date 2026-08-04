import Candidate from '../../models/Candidate.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js';
import { getPagination } from '../../utils/paginate.js';

const ALLOWED_DOC_TYPES = ['resume', 'offerLetter', 'nda'];

// GET /api/hr/recruitment — list candidates with search/filter/pagination
export const getCandidates = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, recruitmentStatus, interviewResult, domain } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } },
        { appliedRole: { $regex: search, $options: 'i' } },
      ];
    }

    if (recruitmentStatus) filter.recruitmentStatus = recruitmentStatus;
    if (interviewResult) filter.interviewResult = interviewResult;
    if (domain) filter.domain = { $regex: domain, $options: 'i' };

    const [candidates, total] = await Promise.all([
      Candidate.find(filter)
        .populate('createdBy', 'name')
        .populate('convertedTo', 'name employeeId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Candidate.countDocuments(filter),
    ]);

    sendPaginated(res, candidates, {
      total, page, limit,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/hr/recruitment/stats — quick pipeline counts for dashboard widgets
export const getCandidateStats = async (req, res, next) => {
  try {
    const [byStatus, byResult, total] = await Promise.all([
      Candidate.aggregate([{ $group: { _id: '$recruitmentStatus', count: { $sum: 1 } } }]),
      Candidate.aggregate([{ $group: { _id: '$interviewResult', count: { $sum: 1 } } }]),
      Candidate.countDocuments(),
    ]);

    const statusMap = Object.fromEntries(byStatus.map(s => [s._id, s.count]));
    const resultMap = Object.fromEntries(byResult.map(r => [r._id, r.count]));

    sendSuccess(res, {
      total,
      byStatus: statusMap,
      byResult: resultMap,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/hr/recruitment/:id
export const getCandidateById = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('convertedTo', 'name employeeId')
      .populate('notes.addedBy', 'name');

    if (!candidate) return sendError(res, 'Candidate not found', 404);

    sendSuccess(res, candidate);
  } catch (error) {
    next(error);
  }
};

// POST /api/hr/recruitment
export const createCandidate = async (req, res, next) => {
  try {
    const {
      name, email, phone, college, domain, appliedRole,
      interviewDate, joiningDate,
    } = req.body;

    if (!name || !email) return sendError(res, 'Name and email are required', 400);

    const existing = await Candidate.findOne({ email: email.toLowerCase() });
    if (existing) return sendError(res, 'A candidate with this email already exists', 409);

    const candidate = await Candidate.create({
      name, email: email.toLowerCase(), phone, college, domain, appliedRole,
      interviewDate: interviewDate || undefined,
      joiningDate: joiningDate || undefined,
      createdBy: req.user._id,
    });

    sendSuccess(res, candidate, 'Candidate added successfully', 201);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/hr/recruitment/:id
export const updateCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return sendError(res, 'Candidate not found', 404);

    const editable = [
      'name', 'email', 'phone', 'college', 'domain', 'appliedRole',
      'interviewDate', 'interviewResult', 'interviewNotes', 'joiningDate',
      'recruitmentStatus',
    ];

    editable.forEach((field) => {
      if (req.body[field] !== undefined) candidate[field] = req.body[field];
    });

    // Convenience: setting interviewResult to Selected/Rejected auto-advances the
    // overall recruitment status unless the caller explicitly set one already.
    if (req.body.interviewResult && req.body.recruitmentStatus === undefined) {
      if (req.body.interviewResult === 'Selected') candidate.recruitmentStatus = 'Selected';
      else if (req.body.interviewResult === 'Rejected') candidate.recruitmentStatus = 'Rejected';
      else if (req.body.interviewResult === 'On Hold') candidate.recruitmentStatus = 'On Hold';
    }

    await candidate.save();

    sendSuccess(res, candidate, 'Candidate updated successfully');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/hr/recruitment/:id
export const deleteCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) return sendError(res, 'Candidate not found', 404);

    sendSuccess(res, null, 'Candidate removed');
  } catch (error) {
    next(error);
  }
};

// POST /api/hr/recruitment/:id/notes
export const addCandidateNote = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return sendError(res, 'Note text is required', 400);

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return sendError(res, 'Candidate not found', 404);

    candidate.notes.push({ text, addedBy: req.user._id });
    await candidate.save();

    sendSuccess(res, candidate.notes, 'Note added');
  } catch (error) {
    next(error);
  }
};

// POST /api/hr/recruitment/:id/documents/:docType
export const uploadCandidateDocument = async (req, res, next) => {
  try {
    const { docType } = req.params;

    if (!ALLOWED_DOC_TYPES.includes(docType)) {
      return sendError(res, `Invalid document type. Allowed: ${ALLOWED_DOC_TYPES.join(', ')}`, 400);
    }
    if (!req.file) return sendError(res, 'No file uploaded', 400);

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return sendError(res, 'Candidate not found', 404);

    if (!candidate.documents) candidate.documents = {};
    candidate.documents[docType] = {
      fileName: req.file.originalname,
      filePath: `/uploads/documents/${req.file.filename}`,
      uploadedAt: new Date(),
      uploadedBy: req.user._id,
    };

    await candidate.save();

    sendSuccess(res, candidate.documents, 'Document uploaded successfully');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/hr/recruitment/:id/documents/:docType
export const deleteCandidateDocument = async (req, res, next) => {
  try {
    const { docType } = req.params;

    if (!ALLOWED_DOC_TYPES.includes(docType)) {
      return sendError(res, `Invalid document type. Allowed: ${ALLOWED_DOC_TYPES.join(', ')}`, 400);
    }

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return sendError(res, 'Candidate not found', 404);

    if (candidate.documents) candidate.documents[docType] = undefined;
    await candidate.save();

    sendSuccess(res, candidate.documents, 'Document removed successfully');
  } catch (error) {
    next(error);
  }
};
