import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Role Model
 * Defines roles (Super Admin, Admin, HR Manager, PMO Lead, Employee, Intern)
 * with associated permissions. isSystem=true prevents deletion.
 */
const RoleSchema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, unique: true, lowercase: true },
  // e.g. "super-admin", "hr-manager", "pmo-lead"
  description: String,
  permissions: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
  isSystem: { type: Boolean, default: false },
  // isSystem=true means cannot be deleted (Admin, HR, PMO, etc.)
  color: String,
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
}, { timestamps: true });

const Role = mongoose.model('Role', RoleSchema);
export default Role;
