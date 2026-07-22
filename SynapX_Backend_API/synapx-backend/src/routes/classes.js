const router = require('express').Router()
const { prisma } = require('../config/prisma')
const { protect, adminUp } = require('../middleware/auth')

// Scope classes to the caller's gym via their branch tenant.
const tenantScope = (req) => ({ branch: { tenantId: req.user.tenantId } })

// GET all classes
router.get('/', protect, async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where:   { isActive: true, ...tenantScope(req) },
      orderBy: { name: 'asc' },
      include: {
        trainer: {
          include: { staff: { select: { fullName: true } } },
        },
        _count: { select: { bookings: true } },
      },
    })
    return res.json({ success: true, data: classes })
  } catch (err) {
    console.error('Classes error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// GET single class
router.get('/:id', protect, async (req, res) => {
  try {
    const cls = await prisma.class.findFirst({
      where:   { id: req.params.id, ...tenantScope(req) },
      include: { trainer: true },
    })
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' })
    return res.json({ success: true, data: cls })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// POST create class — super admin + admin
router.post('/', protect, adminUp, async (req, res) => {
  try {
    const { name, type, capacity, durationMin, startTime, recurrence, color, trainerId } = req.body

    const errors = []
    if (!name || !String(name).trim()) errors.push('Class name is required.')
    if (!startTime) errors.push('Start time is required.')
    if (capacity == null || isNaN(Number(capacity)) || Number(capacity) < 1) errors.push('Capacity must be at least 1.')
    if (durationMin == null || isNaN(Number(durationMin)) || Number(durationMin) < 1) errors.push('Duration must be at least 1 minute.')
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' '), errors })

    const branchId = req.user.branchId ||
      (await prisma.branch.findFirst({ where: { tenantId: req.user.tenantId }, select: { id: true } }))?.id
    if (!branchId) return res.status(400).json({ success: false, message: 'No branch found. Run seed first.' })

    const cls = await prisma.class.create({
      data: {
        branchId,
        name:        String(name).trim(),
        type:        type ? String(type).trim() : 'General',
        capacity:    Number(capacity),
        durationMin: Number(durationMin),
        startTime:   String(startTime),
        recurrence:  recurrence ? String(recurrence).trim() : null,
        color:       color || '#E11D2E',
        trainerId:   trainerId || null,
      },
      include: {
        trainer: { include: { staff: { select: { fullName: true } } } },
        _count:  { select: { bookings: true } },
      },
    })
    return res.status(201).json({ success: true, data: cls })
  } catch (err) {
    console.error('Create class error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// PUT update class — SUPER_ADMIN only
router.put('/:id', protect, adminUp, async (req, res) => {
  try {
    // Verify the class belongs to the caller's gym.
    const owned = await prisma.class.findFirst({ where: { id: req.params.id, ...tenantScope(req) }, select: { id: true } })
    if (!owned) return res.status(404).json({ success: false, message: 'Class not found.' })

    // Whitelist editable fields — never let the request set branchId or other
    // columns by dumping req.body straight into the update.
    const b = req.body
    const data = {
      ...(b.name        !== undefined && { name: String(b.name).trim() }),
      ...(b.type        !== undefined && { type: b.type ? String(b.type).trim() : 'General' }),
      ...(b.capacity    !== undefined && { capacity: Number(b.capacity) }),
      ...(b.durationMin !== undefined && { durationMin: Number(b.durationMin) }),
      ...(b.startTime   !== undefined && { startTime: String(b.startTime) }),
      ...(b.recurrence  !== undefined && { recurrence: b.recurrence ? String(b.recurrence).trim() : null }),
      ...(b.color       !== undefined && { color: b.color || '#E11D2E' }),
      ...(b.trainerId   !== undefined && { trainerId: b.trainerId || null }),
      ...(b.isActive    !== undefined && { isActive: Boolean(b.isActive) }),
    }

    const cls = await prisma.class.update({ where: { id: req.params.id }, data })
    return res.json({ success: true, data: cls })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE deactivate class — SUPER_ADMIN only
router.delete('/:id', protect, adminUp, async (req, res) => {
  try {
    const owned = await prisma.class.findFirst({ where: { id: req.params.id, ...tenantScope(req) }, select: { id: true } })
    if (!owned) return res.status(404).json({ success: false, message: 'Class not found.' })

    await prisma.class.update({
      where: { id: req.params.id },
      data:  { isActive: false },
    })
    return res.json({ success: true, message: 'Class deactivated.' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router