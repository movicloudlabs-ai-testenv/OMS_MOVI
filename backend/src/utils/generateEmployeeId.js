import Counter from '../models/Counter.js'

export const generateEmployeeId = async (type = 'Employee') => {
  const year    = new Date().getFullYear()
  const prefix  = type === 'Intern' ? 'INT' : 'EMP'
  const counterId = `${prefix}-${year}`

  // findOneAndUpdate with $inc is atomic in MongoDB
  // Even if two users are created at the exact same moment,
  // MongoDB guarantees each gets a unique seq number
  // This is the correct enterprise pattern (no race conditions)

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
  return `${prefix}-${year}-${paddedSeq}`
}
