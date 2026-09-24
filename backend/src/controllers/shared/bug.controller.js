import Bug from '../../models/Bug.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const generateNextIds = async (project = 'owms') => {
  const lastBug = await Bug.findOne({ project }).sort({ createdAt: -1 });
  let nextNum = 1;

  if (lastBug && lastBug.testCaseId) {
    const match = lastBug.testCaseId.match(/(\d+)\s*$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  } else {
    const count = await Bug.countDocuments({ project });
    nextNum = count + 1;
  }

  const nextTestCaseId = `TC-${String(nextNum).padStart(3, '0')}`;
  const nextBugId = `BUG-${String(nextNum).padStart(3, '0')}`;
  return { nextTestCaseId, nextBugId, nextNum };
};

export const getNextIds = async (req, res, next) => {
  try {
    const { project = 'owms' } = req.query;
    const { nextTestCaseId, nextBugId, nextNum } = await generateNextIds(project);
    return sendSuccess(res, {
      ok: true,
      nextTestCaseId,
      nextBugId,
      count: nextNum - 1,
    });
  } catch (err) {
    next(err);
  }
};

export const createBug = async (req, res, next) => {
  try {
    const {
      project = 'owms',
      module = '',
      scenario = '',
      description = '',
      precondition = '',
      steps = '',
      testData = '',
      expected = '',
      actual = '',
      status = 'Open',
      priority = 'Medium',
      severity = 'Medium',
      environment = '',
      remarks = '',
      startingTime = '',
      endTime = '',
      solvedBy = '',
      solvedDate = '',
      executedBy = '',
      executionDate = '',
      testCaseId: clientTestCaseId,
      bugId: clientBugId,
    } = req.body;

    if (!scenario?.trim() || !actual?.trim()) {
      return sendError(res, 'Test Scenario and Actual Result are required', 400);
    }

    let testCaseId = clientTestCaseId;
    let bugId = clientBugId;

    if (!testCaseId || !bugId) {
      const generated = await generateNextIds(project);
      testCaseId = testCaseId || generated.nextTestCaseId;
      bugId = bugId || generated.nextBugId;
    }

    const bug = await Bug.create({
      project,
      testCaseId,
      bugId,
      module: module.trim(),
      scenario: scenario.trim(),
      description: description.trim(),
      precondition: precondition.trim(),
      steps: steps.trim(),
      testData: testData.trim(),
      expected: expected.trim(),
      actual: actual.trim(),
      status,
      priority,
      severity,
      environment: environment.trim(),
      remarks: remarks.trim(),
      startingTime: startingTime.trim(),
      endTime: endTime.trim(),
      solvedBy: solvedBy.trim(),
      solvedDate: solvedDate.trim(),
      executedBy: executedBy.trim() || req.user?.name || 'Anonymous',
      executionDate: executionDate.trim(),
      reportedBy: req.user?._id,
    });

    return sendSuccess(res, bug, `Bug logged successfully (${testCaseId} / ${bugId})`, 201);
  } catch (err) {
    next(err);
  }
};

export const getBugs = async (req, res, next) => {
  try {
    const { project } = req.query;
    const filter = {};
    if (project) filter.project = project;

    const bugs = await Bug.find(filter)
      .populate('reportedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(200);

    return sendSuccess(res, bugs);
  } catch (err) {
    next(err);
  }
};
