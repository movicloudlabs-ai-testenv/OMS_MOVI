import Counter from '../models/Counter.js';
import Task from '../models/Task.js';

/**
 * Generate a unique, human-readable task code in the enterprise format:
 * [PROJECT_CODE]-YYYYMMDD-001 (e.g. HMS-20260909-001)
 *
 * Uses MongoDB findOneAndUpdate with $inc for 100% atomic, race-condition-free sequences.
 */
export const generateTaskCode = async (projectOrCode = 'PRJ') => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const yyyymmdd = `${year}${month}${day}`;

  let rawCode = 'PRJ';
  if (typeof projectOrCode === 'string') {
    rawCode = projectOrCode;
  } else if (projectOrCode && typeof projectOrCode === 'object') {
    rawCode = projectOrCode.code || projectOrCode.name || 'PRJ';
  }

  const cleanPrefix = String(rawCode || 'PRJ').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) || 'PRJ';
  const counterId = `TASK-${cleanPrefix}-${yyyymmdd}`;

  let taskCode;
  let exists = true;

  while (exists) {
    const counter = await Counter.findOneAndUpdate(
      { _id: counterId },
      {
        $inc: { seq: 1 },
        $setOnInsert: {
          year: parseInt(year, 10),
          prefix: counterId,
        },
      },
      {
        new: true,
        upsert: true,
      }
    );

    const paddedSeq = String(counter.seq).padStart(3, '0');
    taskCode = `${cleanPrefix}-${yyyymmdd}-${paddedSeq}`;

    const duplicate = await Task.findOne({ taskCode });
    if (!duplicate) {
      exists = false;
    }
  }

  return taskCode;
};

export default generateTaskCode;
