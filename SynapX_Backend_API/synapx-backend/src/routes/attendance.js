// src/routes/attendance.js
const router = require('express').Router()
const ctrl   = require('../controllers/attendanceController')
const { protect } = require('../middleware/auth')

// Public endpoint for kiosk (uses device key in production)
router.post('/checkin', ctrl.checkIn)

router.use(protect)
router.get('/',          ctrl.list)
router.get('/today',     ctrl.todayStats)
router.get('/heatmap',   ctrl.heatmap)
router.get('/live',      ctrl.liveFeed)

module.exports = router
