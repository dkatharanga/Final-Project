const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const { prisma } = require('../config/prisma')

// ── HELPERS ──────────────────────────────────────────────────────
// Short-lived access token + long-lived refresh token. The frontend silently
// refreshes the access token on a 401, so a short access lifetime doesn't log
// anyone out mid-session.
const signAccess  = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' })
const signRefresh = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' })

// ── LOGIN ─────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required.' })

    const staff = await prisma.staff.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { branch: { select: { id: true, name: true } } },
    })

    if (!staff || !staff.isActive)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' })

    const match = await bcrypt.compare(password, staff.hashedPassword)
    if (!match)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' })

    await prisma.staff.update({
      where: { id: staff.id },
      data:  { lastLogin: new Date() },
    })

    const accessToken  = signAccess(staff.id)
    const refreshToken = signRefresh(staff.id)

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        staff: {
          id:       staff.id,
          fullName: staff.fullName,
          email:    staff.email,
          role:     staff.role,
          tenantId: staff.tenantId,
          branch:   staff.branch,
        },
      },
    })
  } catch (err) {
    console.error('Login error:', err.message)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
})

// ── GET ME ────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'No token.' })

    const token   = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const staff = await prisma.staff.findUnique({
      where:  { id: decoded.id },
      select: {
        id: true, fullName: true, email: true,
        role: true, tenantId: true, branchId: true,
        lastLogin: true, createdAt: true,
      },
    })

    if (!staff)
      return res.status(404).json({ success: false, message: 'User not found.' })

    return res.json({ success: true, data: staff })
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token.' })
  }
})

// ── LOGOUT ────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully' })
})

// ── REFRESH ───────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken)
      return res.status(400).json({ success: false, message: 'Refresh token required.' })

    const decoded    = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    const newAccess  = signAccess(decoded.id)
    const newRefresh = signRefresh(decoded.id)

    return res.json({
      success: true,
      data: { accessToken: newAccess, refreshToken: newRefresh },
    })
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token.' })
  }
})

module.exports = router