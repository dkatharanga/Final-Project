// src/middleware/auth.js
const jwt        = require('jsonwebtoken')
const { prisma } = require('../config/prisma')

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided.' })
    }
    const token   = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const staff   = await prisma.staff.findUnique({
      where:  { id: decoded.id },
      select: { id: true, email: true, role: true, isActive: true, tenantId: true, branchId: true, fullName: true },
    })
    if (!staff || !staff.isActive) {
      return res.status(401).json({ success: false, message: 'Account inactive or not found.' })
    }
    req.user = staff
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token.' })
  }
}

const allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' })
  }
  next()
}

const adminOnly   = allow('SUPER_ADMIN')                 // super admin only
const adminUp     = allow('SUPER_ADMIN', 'ADMIN')        // super admin + admin
const managerUp   = allow('SUPER_ADMIN', 'ADMIN', 'MANAGER')
const trainerUp   = allow('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TRAINER')
const receptionUp = allow('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TRAINER', 'RECEPTIONIST')

module.exports = { protect, allow, adminOnly, adminUp, managerUp, trainerUp, receptionUp }