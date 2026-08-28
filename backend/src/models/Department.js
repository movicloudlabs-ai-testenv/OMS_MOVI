import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Department Model
 * Represents organizational departments (Engineering, HR, Design, etc.)
 */
const DepartmentSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, unique: true, uppercase: true },
  description: String,
  head: { type: Schema.Types.ObjectId, ref: 'User' },
  parentDepartment: { type: Schema.Types.ObjectId, ref: 'Department' },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  color: String, // for UI badge coloring
  memberCount: { type: Number, default: 0 },
}, { timestamps: true });

const Department = mongoose.model('Department', DepartmentSchema);
export default Department;
