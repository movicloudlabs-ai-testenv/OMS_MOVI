import Counter from '../models/Counter.js'
import User from '../models/User.js'

export const generateEmployeeId = async (type = 'Employee') => {
  const year    = new Date().getFullYear()
  const prefix  = type === 'Intern' ? 'INT' : 'EMP'
  const counterId = `${prefix}-${year}`

  // findOneAndUpdate with $inc is atomic in MongoDB
  // Even if two users are created at the exact same moment,
  // MongoDB guarantees each gets a unique seq number
  // This is the correct enterprise pattern (no race conditions)

  // Bug fix: seed scripts (seed.js / seedUsers.js) create demo users with
  // HARD-CODED employeeIds like "INT-2026-001" or "EMP-2026-001" without
  // ever touching this Counter collection. So on a freshly seeded database
  // the counter starts at 0 and the very first auto-generated ID collides
  // with one of those seeded accounts, throwing a duplicate-key error on
  // User.create(). To make this self-healing regardless of how the
  // collision happened (seed data, manual DB edits, restored backups,
  // etc.), we keep advancing the counter and re-checking against the
  // actual User collection until we land on a genuinely free ID, instead
  // of trusting the counter alone.
  for (let attempt = 0; attempt < 50; attempt++) {
    const counter = await Counter.findOneAndUpdate(
      { _id: counterId },
      {
        $inc: { seq: 1 },
        $setOnInsert: {
          year,
          prefix,
        }
      },
      {
        new:    true,    // return the UPDATED document
        upsert: true,    // create if doesn't exist
      }
    )

    // Format: EMP-2026-001, EMP-2026-023, EMP-2026-142
    const paddedSeq = String(counter.seq).padStart(3, '0')
    const candidateId = `${prefix}-${year}-${paddedSeq}`

    // eslint-disable-next-line no-await-in-loop
    const taken = await User.exists({ employeeId: candidateId })
    if (!taken) return candidateId
    // else: this number is already used (e.g. by seed data) — loop again,
    // the $inc above will advance the counter past it on the next pass.
  }

  throw new Error(`Could not generate a unique ${prefix} employee ID after 50 attempts`)
}
