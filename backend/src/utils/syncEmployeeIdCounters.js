import User from '../models/User.js';
import Counter from '../models/Counter.js';

/**
 * Scans all existing employeeId values (e.g. from hard-coded seed data like
 * "INT-2026-001") and bumps each prefix-year Counter up to at least the
 * highest number already in use, so generateEmployeeId() never issues an
 * ID that collides with a manually-seeded one.
 *
 * Safe to run repeatedly — only raises a counter's seq, never lowers it.
 */
export const syncEmployeeIdCounters = async () => {
  const users = await User.find({}, 'employeeId').lean();
  const maxByKey = {};

  for (const u of users) {
    const m = /^(EMP|INT)-(\d{4})-(\d+)$/.exec(u.employeeId || '');
    if (!m) continue;
    const [, prefix, year, seqStr] = m;
    const key = `${prefix}-${year}`;
    const seq = parseInt(seqStr, 10);
    if (!maxByKey[key] || seq > maxByKey[key]) maxByKey[key] = seq;
  }

  for (const [counterId, maxSeq] of Object.entries(maxByKey)) {
    const [prefix, yearStr] = counterId.split('-');
    const existing = await Counter.findById(counterId);
    if (!existing || existing.seq < maxSeq) {
      await Counter.findOneAndUpdate(
        { _id: counterId },
        { $set: { seq: maxSeq, year: Number(yearStr), prefix } },
        { upsert: true }
      );
    }
  }
};
