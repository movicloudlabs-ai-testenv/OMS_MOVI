import crypto from 'crypto';
import AssessmentDrive from '../../models/AssessmentDrive.js';
import CandidateSession from '../../models/CandidateSession.js';
import Candidate from '../../models/Candidate.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

/**
 * Generate a clean, human-readable session code like MOVI-FL-8392
 */
const generateSessionCode = (prefix = 'MOVI') => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${rand}`;
};

// ─── HR MANAGEMENT CONTROLLERS ────────────────────────────────────────────────

export const getAssessmentDrives = async (req, res, next) => {
  try {
    const drives = await AssessmentDrive.find()
      .sort({ createdAt: -1 })
      .lean();

    // Aggregate submission stats for each drive
    const driveIds = drives.map((d) => d._id);
    const submissions = await CandidateSession.find({ assessmentDrive: { $in: driveIds } })
      .select('assessmentDrive score totalPoints percentage passed status tabSwitchCount')
      .lean();

    const drivesWithStats = drives.map((d) => {
      const driveSubs = submissions.filter((s) => s.assessmentDrive.toString() === d._id.toString());
      const completedSubs = driveSubs.filter((s) => s.status === 'Completed');
      const passCount = completedSubs.filter((s) => s.passed).length;
      const avgScore = completedSubs.length > 0
        ? Math.round(completedSubs.reduce((acc, s) => acc + (s.percentage || 0), 0) / completedSubs.length)
        : 0;

      return {
        ...d,
        stats: {
          totalSubmissions: driveSubs.length,
          completed: completedSubs.length,
          passed: passCount,
          avgScore,
          questionCount: d.questions ? d.questions.length : 0,
        },
      };
    });

    sendSuccess(res, drivesWithStats);
  } catch (error) {
    next(error);
  }
};

export const createAssessmentDrive = async (req, res, next) => {
  try {
    const {
      title,
      role,
      department = 'Engineering',
      durationMinutes = 30,
      passingScore = 70,
      sessionCode,
      questions = [],
    } = req.body;

    if (!title || !role) {
      return sendError(res, 'Title and Target Role are required', 400);
    }

    let code = sessionCode ? sessionCode.trim().toUpperCase() : generateSessionCode();
    // Verify code uniqueness
    let existing = await AssessmentDrive.findOne({ sessionCode: code });
    while (existing) {
      code = generateSessionCode();
      existing = await AssessmentDrive.findOne({ sessionCode: code });
    }

    const drive = await AssessmentDrive.create({
      title,
      role,
      department,
      durationMinutes,
      passingScore,
      sessionCode: code,
      questions,
      createdBy: req.user?._id,
    });

    sendSuccess(res, drive, 'Assessment drive created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateAssessmentDrive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, role, department, durationMinutes, passingScore, status } = req.body;

    const drive = await AssessmentDrive.findById(id);
    if (!drive) return sendError(res, 'Assessment drive not found', 404);

    if (title) drive.title = title;
    if (role) drive.role = role;
    if (department) drive.department = department;
    if (durationMinutes) drive.durationMinutes = durationMinutes;
    if (passingScore) drive.passingScore = passingScore;
    if (status) drive.status = status;

    await drive.save();
    sendSuccess(res, drive, 'Assessment drive updated');
  } catch (error) {
    next(error);
  }
};

export const addQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { questions } = req.body; // Can be a single question or array

    const drive = await AssessmentDrive.findById(id);
    if (!drive) return sendError(res, 'Assessment drive not found', 404);

    const questionList = Array.isArray(questions) ? questions : [questions];

    for (const q of questionList) {
      if (!q.questionText || !Array.isArray(q.options) || q.options.length < 2) {
        return sendError(res, 'Each question must have text and at least 2 options', 400);
      }
      drive.questions.push({
        questionText: q.questionText,
        category: q.category || 'Technical',
        difficulty: q.difficulty || 'Mid',
        options: q.options,
        correctOptionIndex: q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0,
        points: q.points || 10,
        codeSnippet: q.codeSnippet,
        explanation: q.explanation,
      });
    }

    await drive.save();
    sendSuccess(res, drive, `Added ${questionList.length} question(s) successfully`);
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (req, res, next) => {
  try {
    const { id, questionId } = req.params;
    const drive = await AssessmentDrive.findById(id);
    if (!drive) return sendError(res, 'Assessment drive not found', 404);

    drive.questions = drive.questions.filter((q) => q._id.toString() !== questionId);
    await drive.save();
    sendSuccess(res, drive, 'Question removed');
  } catch (error) {
    next(error);
  }
};

export const getDriveSubmissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const submissions = await CandidateSession.find({ assessmentDrive: id })
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, submissions);
  } catch (error) {
    next(error);
  }
};

// ─── CANDIDATE PUBLIC TEST-TAKER CONTROLLERS ─────────────────────────────────

export const startCandidateSession = async (req, res, next) => {
  try {
    const { sessionCode, candidateName, candidateEmail, candidatePhone } = req.body;

    if (!sessionCode || !candidateName || !candidateEmail) {
      return sendError(res, 'Session code, full name, and email are required', 400);
    }

    const drive = await AssessmentDrive.findOne({
      sessionCode: sessionCode.trim().toUpperCase(),
      status: 'Active',
    });

    if (!drive) {
      return sendError(res, 'Invalid or expired assessment session code. Please verify and try again.', 404);
    }

    if (!drive.questions || drive.questions.length === 0) {
      return sendError(res, 'This assessment drive has no active questions yet. Please contact the coordinator.', 400);
    }

    // Auto-link or create ATS Candidate record
    let candidate = await Candidate.findOne({ email: candidateEmail.toLowerCase().trim() });
    if (!candidate) {
      candidate = await Candidate.create({
        name: candidateName.trim(),
        email: candidateEmail.toLowerCase().trim(),
        phone: candidatePhone?.trim(),
        appliedRole: drive.role,
        domain: drive.department,
        recruitmentStatus: 'Applied',
      });
    }

    // Create Candidate Session
    const session = await CandidateSession.create({
      assessmentDrive: drive._id,
      candidateName: candidateName.trim(),
      candidateEmail: candidateEmail.toLowerCase().trim(),
      candidatePhone: candidatePhone?.trim(),
      startTime: new Date(),
      status: 'InProgress',
      linkedCandidateId: candidate._id,
    });

    // IMPORTANT: Strip correctOptionIndex and explanation from payload so candidate cannot cheat!
    const sanitizedQuestions = drive.questions.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      category: q.category,
      difficulty: q.difficulty,
      options: q.options,
      points: q.points,
      codeSnippet: q.codeSnippet,
    }));

    sendSuccess(res, {
      sessionId: session._id,
      drive: {
        id: drive._id,
        title: drive.title,
        role: drive.role,
        department: drive.department,
        durationMinutes: drive.durationMinutes,
        passingScore: drive.passingScore,
        totalQuestions: sanitizedQuestions.length,
      },
      questions: sanitizedQuestions,
    }, 'Assessment session initialized');
  } catch (error) {
    next(error);
  }
};

export const submitCandidateSession = async (req, res, next) => {
  try {
    const { sessionId, answers = {}, timeSpentSeconds = 0, tabSwitchCount = 0 } = req.body;

    const session = await CandidateSession.findById(sessionId).populate('assessmentDrive');
    if (!session) return sendError(res, 'Assessment session not found', 404);

    if (session.status === 'Completed') {
      return sendSuccess(res, {
        score: session.score,
        totalPoints: session.totalPoints,
        percentage: session.percentage,
        passed: session.passed,
        alreadySubmitted: true,
      }, 'This session was already submitted');
    }

    const drive = session.assessmentDrive;
    let earnedPoints = 0;
    let totalPoints = 0;

    // Evaluate answers
    for (const q of drive.questions) {
      const qPoints = q.points || 10;
      totalPoints += qPoints;
      const qId = q._id.toString();
      const selectedIndex = answers[qId];

      if (selectedIndex !== undefined && Number(selectedIndex) === q.correctOptionIndex) {
        earnedPoints += qPoints;
      }
    }

    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = percentage >= (drive.passingScore || 70);

    session.submittedAt = new Date();
    session.timeSpentSeconds = timeSpentSeconds;
    session.tabSwitchCount = tabSwitchCount;
    session.answers = answers;
    session.score = earnedPoints;
    session.totalPoints = totalPoints;
    session.percentage = percentage;
    session.passed = passed;
    session.status = 'Completed';
    await session.save();

    // ─── ATS PIPELINE SYNCHRONIZATION ──────────────────────────────────────────
    if (session.linkedCandidateId) {
      try {
        const cand = await Candidate.findById(session.linkedCandidateId);
        if (cand) {
          if (passed) {
            cand.recruitmentStatus = 'Interview Scheduled';
            cand.interviewResult = 'Pending';
          }
          cand.notes.push({
            text: `[Assessment Result] "${drive.title}": ${percentage}% (${earnedPoints}/${totalPoints} pts) - ${passed ? "PASSED (Advanced to Interview)" : "DID NOT PASS"}. Tab switches detected: ${tabSwitchCount}.`,
            createdAt: new Date(),
          });
          await cand.save();
        }
      } catch (e) {
        console.error('Failed to sync candidate ATS status:', e);
      }
    }

    sendSuccess(res, {
      sessionId: session._id,
      score: earnedPoints,
      totalPoints,
      percentage,
      passed,
      passingScore: drive.passingScore,
      candidateName: session.candidateName,
      status: 'Completed',
    }, 'Assessment submitted and scored successfully');
  } catch (error) {
    next(error);
  }
};

export const recordTabSwitch = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const session = await CandidateSession.findById(sessionId);
    if (!session) return sendError(res, 'Session not found', 404);

    session.tabSwitchCount = (session.tabSwitchCount || 0) + 1;
    await session.save();

    sendSuccess(res, { tabSwitchCount: session.tabSwitchCount });
  } catch (error) {
    next(error);
  }
};

export const getActiveDrivesStatus = async (req, res, next) => {
  try {
    const activeCount = await AssessmentDrive.countDocuments({ status: 'Active' });
    sendSuccess(res, {
      hasActiveDrives: activeCount > 0,
      activeCount,
    });
  } catch (error) {
    next(error);
  }
};

