import Counter from '../models/Counter.js'
import User from '../models/User.js'
import ArchivedUser from '../models/ArchivedUser.js'

export const generateEmployeeId = async (type = 'Employee') => {
  const year    = new Date().getFullYear()
  const prefix  = type === 'Intern' ? 'INT' : 'EMP'
  const counterId = `${prefix}-${year}`

  let employeeId;
  let exists = true;

  while (exists) {
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
    employeeId = `${prefix}-${year}-${paddedSeq}`

    // Verify that the generated Employee ID does not already exist in User or ArchivedUser
    const userExists = await User.findOne({ employeeId });
    const archivedExists = await ArchivedUser.findOne({ employeeId });

    if (!userExists && !archivedExists) {
      exists = false;
    }
  }

  return employeeId
}
