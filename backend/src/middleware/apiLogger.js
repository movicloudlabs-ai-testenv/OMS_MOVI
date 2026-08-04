import ApiLog from '../models/ApiLog.js'

// ─── Derive module from the FULL original URL ────────────────────────────────
const getModule = (url) => {
  if (url.startsWith('/api/admin'))        return 'Admin'
  if (url.startsWith('/api/hr'))           return 'HR'
  if (url.startsWith('/api/pmo'))          return 'PMO'
  if (url.startsWith('/api/employee'))     return 'Employee'
  if (url.startsWith('/api/intern'))       return 'Intern'
  if (url.startsWith('/api/auth'))         return 'Auth'
  if (url.startsWith('/api/me'))           return 'Me'
  if (url.startsWith('/api/notifications'))return 'Notifications'
  if (url.startsWith('/api/logs'))         return 'Logs'
  return 'System'
}

// ─── Strip sensitive fields from request body ────────────────────────────────
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body
  const sensitive = [
    'password', 'newPassword', 'currentPassword',
    'confirmPassword', 'smtpPass', 'token',
    'refreshToken', 'secret'
  ]
  const cleaned = { ...body }
  sensitive.forEach(key => {
    if (cleaned[key]) cleaned[key] = '[REDACTED]'
  })
  return cleaned
}

// ─── Strip query string from a URL ───────────────────────────────────────────
const stripQuery = (url) => {
  const idx = url.indexOf('?')
  return idx === -1 ? url : url.substring(0, idx)
}

// ─── Middleware ───────────────────────────────────────────────────────────────
export const apiLogger = (req, res, next) => {
  const startTime = Date.now()

  // Override res.json so we capture the log at RESPONSE time
  // (after auth middleware has set req.user)
  const originalJson = res.json.bind(res)
  res.json = (body) => {
    const responseTime = Date.now() - startTime
    const statusCode   = res.statusCode
    const fullUrl      = req.originalUrl       // e.g. /api/admin/users?page=1
    const baseRoute    = stripQuery(fullUrl)    // e.g. /api/admin/users

    // Do not log noisy background polling endpoints (GET only)
    const ignoredRoutes = [
      '/api/notifications',
      '/api/auth/me',
      '/api/logs',
      '/api/admin/audit-logs'
    ]

    if (req.method === 'GET' && ignoredRoutes.includes(baseRoute)) {
      return originalJson(body)
    }

    // Save log asynchronously — never blocks the response
    ApiLog.create({
      method:       req.method,
      url:          fullUrl,
      baseRoute,
      query:        Object.keys(req.query).length ? req.query : undefined,
      body:         req.method !== 'GET' ? sanitizeBody(req.body) : undefined,
      userId:       req.user?._id || null,
      userName:     req.user?.name || 'Anonymous',
      userRole:     req.user?.role?.slug || req.user?.role?.name || null,
      employeeId:   req.user?.employeeId || null,
      ipAddress:    req.ip || req.connection?.remoteAddress,
      userAgent:    req.headers['user-agent'],
      statusCode,
      responseTime,
      success:      statusCode < 400,
      module:       getModule(fullUrl),
      requestedAt:  new Date(),
    }).catch(err => {
      console.error('ApiLog save failed:', err.message)
    })

    return originalJson(body)
  }

  next()
}
