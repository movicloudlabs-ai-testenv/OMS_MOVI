import mongoose from 'mongoose'

const { Schema } = mongoose

const CounterSchema = new Schema({
  _id:     { type: String, required: true },
  // _id is the counter name e.g. "EMP-2026" or "INT-2026"

  seq:     { type: Number, default: 0 },
  // seq is the last used sequence number
  // starts at 0, increments to 1 on first use
  // NEVER decremented under any circumstances

  year:    { type: Number, required: true },
  prefix:  { type: String, required: true },
  // 'EMP' or 'INT'
}, { timestamps: true })

export default mongoose.model('Counter', CounterSchema)
