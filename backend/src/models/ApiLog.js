import mongoose from 'mongoose'

const { Schema, ObjectId } = mongoose

const ApiLogSchema = new Schema({
  // Request info
  method:     { type: String },  // GET, POST, PUT, PATCH, DELETE
  url:        { type: String },  // full URL path e.g. /api/admin/users
  baseRoute:  { type: String },  // e.g. /api/admin/users (without query string)
  query:      { type: Schema.Types.Mixed }, // query params object
  body:       { type: Schema.Types.Mixed }, // request body (sanitized)

  // Who made the request
  userId:     { type: ObjectId, ref: 'User', default: null },
  userName:   { type: String, default: 'Anonymous' },
  userRole:   { type: String, default: null },
  employeeId: { type: String, default: null },
  ipAddress:  { type: String },
  userAgent:  { type: String },

  // Response info
  statusCode:    { type: Number },  // 200, 201, 400, 401, 403, 404, 500
  responseTime:  { type: Number },  // in milliseconds
  success:       { type: Boolean }, // true if statusCode < 400

  // Categorization
  module: { type: String },
  // Derived from URL: Admin, HR, PMO, Employee, Intern, Auth, System

  // Timestamps
  requestedAt: { type: Date, default: Date.now },
}, {
  timestamps: false,
  // Use capped collection for automatic size management
  // Keeps last 50,000 logs automatically, older ones auto-deleted
  capped: { size: 52428800, max: 50000 }
  // 50MB max size, 50,000 documents max
})

// Indexes for fast querying
ApiLogSchema.index({ requestedAt: -1 })
ApiLogSchema.index({ userId: 1 })
ApiLogSchema.index({ statusCode: 1 })
ApiLogSchema.index({ method: 1 })
ApiLogSchema.index({ module: 1 })
ApiLogSchema.index({ success: 1 })

export default mongoose.model('ApiLog', ApiLogSchema)
