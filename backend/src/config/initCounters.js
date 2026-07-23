import dotenv from 'dotenv'
dotenv.config()
import mongoose from 'mongoose'
import Counter from '../models/Counter.js'
import User from '../models/User.js'
import ArchivedUser from '../models/ArchivedUser.js'
import connectDB from './db.js'

const run = async () => {
  await connectDB()

  const year = new Date().getFullYear()

  // Find the highest EMP number ever issued
  // Must check BOTH active users AND archived users
  // because archived IDs must never be reused

  const allEmpIds = await Promise.all([
    User.find({
      employeeId: { $regex: `^EMP-${year}-` }
    }).select('employeeId').lean(),
    ArchivedUser.find({
      employeeId: { $regex: `^EMP-${year}-` }
    }).select('employeeId').lean(),
  ])

  const allIntIds = await Promise.all([
    User.find({
      employeeId: { $regex: `^INT-${year}-` }
    }).select('employeeId').lean(),
    ArchivedUser.find({
      employeeId: { $regex: `^INT-${year}-` }
    }).select('employeeId').lean(),
  ])

  // Extract and find highest sequence numbers
  const extractMax = (arrays) => {
    const all = arrays.flat()
    if (all.length === 0) return 0
    const numbers = all
      .map(u => u.employeeId)
      .map(id => {
        const parts = id.split('-')
        return parseInt(parts[2]) || 0
      })
      .filter(n => !isNaN(n))
    return numbers.length > 0 ? Math.max(...numbers) : 0
  }

  const maxEmp = extractMax(allEmpIds)
  const maxInt = extractMax(allIntIds)

  // Set counters to the current maximum
  // Next generation will increment from here
  // so no existing ID is ever reused

  if (maxEmp > 0) {
    await Counter.findOneAndUpdate(
      { _id: `EMP-${year}` },
      { $max: { seq: maxEmp }, $setOnInsert: { year, prefix: 'EMP' } },
      { upsert: true }
    )
    console.log(`✅ EMP counter set to ${maxEmp}`)
  } else {
    console.log('ℹ️  No existing EMP IDs found — counter starts at 0')
  }

  if (maxInt > 0) {
    await Counter.findOneAndUpdate(
      { _id: `INT-${year}` },
      { $max: { seq: maxInt }, $setOnInsert: { year, prefix: 'INT' } },
      { upsert: true }
    )
    console.log(`✅ INT counter set to ${maxInt}`)
  } else {
    console.log('ℹ️  No existing INT IDs found — counter starts at 0')
  }

  console.log('✅ Counter initialization complete')
  console.log(`Next EMP ID will be: EMP-${year}-${String(maxEmp+1).padStart(3,'0')}`)
  console.log(`Next INT ID will be: INT-${year}-${String(maxInt+1).padStart(3,'0')}`)
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
