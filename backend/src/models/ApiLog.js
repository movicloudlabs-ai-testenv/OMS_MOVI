import mongoose from 'mongoose'

const { Schema } = mongoose

const ApiLogSchema = new Schema({
  // Request info
  method:     { type: String },                        // GET, POST, PUT, PATCH, DELETE
  url:        { type: String },                        // full URL with query e.g. /api/admin/users?page=1
  baseRoute:  { type: String },                        // URL without query e.g. /api/admin/users
  query:      { type: Schema.Types.Mixed },            // query params object
  body:       { type: Schema.Types.Mixed },            // request body (sanitized)

  // Who made the request
  userId:     { type: Schema.Types.ObjectId, ref: 'User', default: null },
  userName:   { type: String, default: 'Anonymous' },
  userRole:   { type: String, default: null },
  employeeId: { type: String, default: null },
  ipAddress:  { type: String },
  userAgent:  { type: String },

  // Response info
  statusCode:    { type: Number },                     // 200, 201, 400, 401, 403, 404, 500
  responseTime:  { type: Number },                     // in milliseconds
  success:       { type: Boolean },                    // true if statusCode < 400

  // Categorization
  module: { type: String },
  // Derived from URL: Admin, HR, PMO, Employee, Intern, Auth, Me, Notifications, Logs, System

  // Timestamps
  requestedAt: { type: Date, default: Date.now },
}, {
  timestamps: false,
})

// Indexes for fast querying
ApiLogSchema.index({ requestedAt: -1 })
ApiLogSchema.index({ userId: 1 })
ApiLogSchema.index({ statusCode: 1 })
ApiLogSchema.index({ method: 1 })
ApiLogSchema.index({ module: 1 })
ApiLogSchema.index({ success: 1 })

// TTL index — auto-delete logs older than 90 days
ApiLogSchema.index({ requestedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

export default mongoose.model('ApiLog', ApiLogSchema)
