const router = require('express').Router()
const { prisma } = require('../config/prisma')
const bcrypt = require('bcryptjs')
const { protect, adminUp } = require('../middleware/auth')

const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TRAINER', 'RECEPTIONIST', 'READ_ONLY']

// GET all staff
router.get('/', protect, async (req, res) => {
  try {
    const staff = await prisma.staff.findMany({
      where:   { tenantId: req.user.tenantId },
      orderBy: { fullName: 'asc' },
      select: {
        id: true, fullName: true, email: true,
        phone: true, role: true, isActive: true,
        lastLogin: true, branchId: true,
        trainerProfile: true,
      },
    })
    return res.json({ success: true, data: staff })
  } catch (err) {
    console.error('Staff error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// GET single staff
router.get('/:id', protect, async (req, res) => {
  try {
    const s = await prisma.staff.findFirst({
      where:  { id: req.params.id, tenantId: req.user.tenantId },
      select: {
        id: true, fullName: true, email: true,
        phone: true, role: true, isActive: true,
        lastLogin: true, trainerProfile: true,
      },
    })
    if (!s) return res.status(404).json({ success: false, message: 'Staff not found.' })
    return res.json({ success: true, data: s })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// POST create staff — ADMIN only (uses the role-aware middleware, which also
// gives us the creator's tenant + branch).
router.post('/', protect, adminUp, async (req, res) => {
  try {
    const { fullName, email, phone, role = 'RECEPTIONIST', password, specializations } = req.body

    const errors = []
    const name = fullName ? String(fullName).trim() : ''
    if (!name) errors.push('Full name is required.')
    if (!email || !EMAIL_RE.test(String(email).trim())) errors.push('A valid email is required.')
    if (!password || String(password).length < 6) errors.push('Password must be at least 6 characters.')
    if (!STAFF_ROLES.includes(role)) errors.push('Invalid role.')
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' '), errors })

    const cleanEmail = String(email).trim().toLowerCase()
    const dupe = await prisma.staff.findUnique({ where: { email: cleanEmail } })
    if (dupe) return res.status(409).json({ success: false, message: 'A staff member with this email already exists.' })

    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10)
    const hashedPassword = await bcrypt.hash(String(password), rounds)

    const staff = await prisma.staff.create({
      data: {
        tenantId: req.user.tenantId,
        branchId: req.user.branchId || null,
        fullName: name,
        email:    cleanEmail,
        phone:    phone ? String(phone).trim() : null,
        hashedPassword,
        role,
      },
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, isActive: true, lastLogin: true, branchId: true,
      },
    })

    // Trainers get a linked profile so specializations show on the card.
    if (role === 'TRAINER') {
      const specs = Array.isArray(specializations)
        ? specializations
        : String(specializations || '').split(',').map(s => s.trim()).filter(Boolean)
      await prisma.trainer.create({ data: { staffId: staff.id, specializations: specs, certifications: [] } })
    }

    return res.status(201).json({ success: true, data: staff, message: 'Staff member added.' })
  } catch (err) {
    console.error('Create staff error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// PUT update staff — super admin + admin. Changing the PASSWORD is restricted
// to SUPER_ADMIN only.
router.put('/:id', protect, adminUp, async (req, res) => {
  try {
    const { fullName, phone, role, isActive, password } = req.body
    if (role && !STAFF_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' })
    }

    // Only allow editing staff in the caller's gym.
    const owned = await prisma.staff.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId }, select: { id: true } })
    if (!owned) return res.status(404).json({ success: false, message: 'Staff not found.' })

    const data = { fullName, phone, role, isActive }

    // Optional password reset — SUPER_ADMIN only.
    if (password !== undefined && password !== '') {
      if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'Only a super admin can change passwords.' })
      }
      if (String(password).length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' })
      }
      const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10)
      data.hashedPassword = await bcrypt.hash(String(password), rounds)
    }

    const s = await prisma.staff.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, isActive: true, lastLogin: true, branchId: true,
      },
    })
    // Ensure a promoted trainer has a profile.
    if (role === 'TRAINER') {
      const existing = await prisma.trainer.findUnique({ where: { staffId: s.id } })
      if (!existing) await prisma.trainer.create({ data: { staffId: s.id, specializations: [], certifications: [] } })
    }
    return res.json({ success: true, data: s })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE staff — ADMIN only. Detaches trainer classes + profile first.
router.delete('/:id', protect, adminUp, async (req, res) => {
  const { id } = req.params
  try {
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: "You can't delete your own account." })
    }
    const staff = await prisma.staff.findFirst({
      where:  { id, tenantId: req.user.tenantId },
      select: { id: true, fullName: true, trainerProfile: { select: { id: true } } },
    })
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' })

    await prisma.$transaction(async (tx) => {
      if (staff.trainerProfile) {
        await tx.class.updateMany({ where: { trainerId: staff.trainerProfile.id }, data: { trainerId: null } })
        await tx.trainer.delete({ where: { id: staff.trainerProfile.id } })
      }
      await tx.staff.delete({ where: { id } })
    })

    return res.json({ success: true, message: `${staff.fullName} removed.` })
  } catch (err) {
    console.error('Delete staff error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router