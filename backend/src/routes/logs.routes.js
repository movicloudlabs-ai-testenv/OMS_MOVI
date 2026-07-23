import express from 'express'
import { protect } from '../middleware/auth.js'
import { getLogs, getLogStats } from '../controllers/logs.controller.js'

const router = express.Router()

// Only Admin/Super Admin can view logs
router.get('/', protect, getLogs)
router.get('/stats', protect, getLogStats)

export default router
