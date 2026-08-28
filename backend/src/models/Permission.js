import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Permission Model
 * Granular permissions like "users.create", "reports.export".
 * Each permission belongs to a resource and has an action type.
 */
const PermissionSchema = new Schema({
  name: { type: String, required: true, unique: true },
  // e.g. "users.create", "reports.export"
  label: { type: String, required: true },
  // e.g. "Create Users", "Export Reports"
  resource: {
    type: String,
    required: true,
    enum: [
      'Users', 'Departments', 'Roles', 'Reports',
      'Audit Logs', 'Projects', 'Tasks', 'Attendance',
      'Leave', 'Interns', 'Settings', 'Permissions', 'Recruitment',
      'Daily Tracker',
    ],
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'read', 'update', 'delete',
      'export', 'manage', 'schedule', 'approve'],
  },
  description: String,
  riskLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Low',
  },
  requiresApproval: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
}, { timestamps: true });

const Permission = mongoose.model('Permission', PermissionSchema);
export default Permission;
