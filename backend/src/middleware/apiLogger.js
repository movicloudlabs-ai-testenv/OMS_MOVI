import ApiLog from '../models/ApiLog.js'

// Helper to extract module from URL
const getModule = (url) => {
  if (url.startsWith('/api/admin'))    return 'Admin'
  if (url.startsWith('/api/hr'))       return 'HR'
  if (url.startsWith('/api/pmo'))      return 'PMO'
  if (url.startsWith('/api/employee')) return 'Employee'
  if (url.startsWith('/api/intern'))   return 'Intern'
  if (url.startsWith('/api/auth'))     return 'Auth'
  if (url.startsWith('/api/me'))       return 'Me'
  if (url.startsWith('/api/notifications')) return 'Notifications'
  if (url.startsWith('/api/logs'))     return 'Logs'
  return 'System'
}

// Helper to sanitize request body
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

export const apiLogger = (req, res, next) => {
  const startTime = Date.now()

  // Intercept res.json to capture status code + response time
  const originalJson = res.json.bind(res)
  res.json = (body) => {
    const responseTime = Date.now() - startTime
    const statusCode = res.statusCode

    // Save log asynchronously — do NOT await
    // This must never slow down the actual API response
    ApiLog.create({
      method:       req.method,
      url:          req.originalUrl,
      baseRoute:    req.path,
      query:        req.query,
      body:         sanitizeBody(req.body),
      userId:       req.user?._id || null,
      userName:     req.user?.name || 'Anonymous',
      userRole:     req.user?.role?.slug || null,
      employeeId:   req.user?.employeeId || null,
      ipAddress:    req.ip || req.connection?.remoteAddress,
      userAgent:    req.headers['user-agent'],
      statusCode,
      responseTime,
      success:      statusCode < 400,
      module:       getModule(req.path),
      requestedAt:  new Date(),
    }).catch(err => {
      // Log to console but never crash the API
      console.error('ApiLog save failed:', err.message)
    })

    return originalJson(body)
  }

  next()
}
