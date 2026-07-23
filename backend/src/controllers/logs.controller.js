import ApiLog from '../models/ApiLog.js'
import { sendSuccess, sendError } from '../utils/apiResponse.js'
import { getPagination } from '../utils/paginate.js'

export const getLogs = async (req, res, next) => {
  try {
    // Only admin and super-admin can view logs
    const role = req.user?.role?.slug
    if (!['admin','super-admin'].includes(role)) {
      return sendError(res, 'Admin access required', 403)
    }

    const {
      page = 1, limit = 50,
      method, module, statusCode,
      success, userId, search,
      dateFrom, dateTo
    } = req.query

    const { skip } = getPagination(req.query)

    // Build filter
    const filter = {}
    if (method)     filter.method = method.toUpperCase()
    if (module)     filter.module = module
    if (statusCode) filter.statusCode = parseInt(statusCode)
    if (success !== undefined)
      filter.success = success === 'true'
    if (userId)     filter.userId = userId
    if (search) {
      filter.$or = [
        { url:      { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userRole: { $regex: search, $options: 'i' } },
      ]
    }
    if (dateFrom || dateTo) {
      filter.requestedAt = {}
      if (dateFrom)
        filter.requestedAt.$gte = new Date(dateFrom)
      if (dateTo)
        filter.requestedAt.$lte = new Date(dateTo)
    }

    const [logs, total] = await Promise.all([
      ApiLog.find(filter)
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ApiLog.countDocuments(filter)
    ])

    sendSuccess(res, {
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      }
    }, 'API logs fetched')

  } catch (err) { next(err) }
}

export const getLogStats = async (req, res, next) => {
  try {
    const role = req.user?.role?.slug
    if (!['admin','super-admin'].includes(role)) {
      return sendError(res, 'Admin access required', 403)
    }

    // Stats for last 24 hours
    const since24h = new Date(Date.now() - 24*60*60*1000)
    const since1h  = new Date(Date.now() - 60*60*1000)

    const [
      total24h, errors24h, avgResponseTime,
      byModule, byMethod, topErrors, totalAll
    ] = await Promise.all([
      // Total requests last 24h
      ApiLog.countDocuments({
        requestedAt: { $gte: since24h }
      }),
      // Error count last 24h
      ApiLog.countDocuments({
        requestedAt: { $gte: since24h },
        success: false
      }),
      // Average response time last 1h
      ApiLog.aggregate([
        { $match: { requestedAt: { $gte: since1h } } },
        { $group: {
          _id: null,
          avg: { $avg: '$responseTime' }
        }}
      ]),
      // Requests by module last 24h
      ApiLog.aggregate([
        { $match: { requestedAt: { $gte: since24h } } },
        { $group: {
          _id: '$module',
          count: { $sum: 1 },
          errors: {
            $sum: { $cond: ['$success', 0, 1] }
          }
        }},
        { $sort: { count: -1 } }
      ]),
      // Requests by method last 24h
      ApiLog.aggregate([
        { $match: { requestedAt: { $gte: since24h } } },
        { $group: {
          _id: '$method',
          count: { $sum: 1 }
        }},
        { $sort: { count: -1 } }
      ]),
      // Top 5 failing endpoints
      ApiLog.aggregate([
        { $match: {
          success: false,
          requestedAt: { $gte: since24h }
        }},
        { $group: {
          _id: { url: '$baseRoute', status: '$statusCode' },
          count: { $sum: 1 }
        }},
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      // Total all time
      ApiLog.countDocuments({})
    ])

    sendSuccess(res, {
      summary: {
        totalAllTime:     totalAll,
        total24h,
        errors24h,
        errorRate24h:     total24h > 0
          ? ((errors24h / total24h) * 100).toFixed(1) + '%'
          : '0%',
        avgResponseTimeMs: avgResponseTime[0]?.avg
          ? Math.round(avgResponseTime[0].avg) : 0,
      },
      byModule,
      byMethod,
      topErrors,
    }, 'Log stats fetched')

  } catch (err) { next(err) }
}
