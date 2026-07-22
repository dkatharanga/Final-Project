// src/routes/bookings.js
const router = require('express').Router()
const { protect } = require('../middleware/auth')
const { prisma }  = require('../config/prisma')
const { ok, created, notFound, conflict, badRequest } = require('../utils/response')
const { getPagination, buildMeta } = require('../utils/pagination')

router.use(protect)

router.get('/', async (req, res) => {
  const { page, limit, skip } = getPagination(req.query)
  const { memberId, classId, status } = req.query
  const where = {
    ...(memberId && { memberId }),
    ...(classId  && { classId  }),
    ...(status   && { status   }),
    class: { branchId: req.user.branchId },
  }
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({ where, skip, take: limit, orderBy: { scheduledAt: 'desc' },
      include: { member: { select: { fullName: true } }, class: { select: { name: true } } } }),
    prisma.booking.count({ where }),
  ])
  return res.json({ success: true, data: bookings, pagination: buildMeta(total, page, limit) })
})

router.post('/', async (req, res) => {
  const { classId, memberId, scheduledAt } = req.body
  // Check capacity
  const cls     = await prisma.class.findUnique({ where: { id: classId }, include: { _count: { select: { bookings: { where: { scheduledAt: new Date(scheduledAt), status: 'CONFIRMED' } } } } } })
  if (!cls) return notFound(res, 'Class not found.')
  if (cls._count.bookings >= cls.capacity) return conflict(res, 'Class is fully booked.')
  // Check dupe
  const dupe = await prisma.booking.findUnique({ where: { classId_memberId_scheduledAt: { classId, memberId, scheduledAt: new Date(scheduledAt) } } })
  if (dupe) return conflict(res, 'Already booked for this slot.')
  const booking = await prisma.booking.create({ data: { classId, memberId, scheduledAt: new Date(scheduledAt) } })
  return created(res, booking)
})

router.patch('/:id/cancel', async (req, res) => {
  const b = await prisma.booking.update({ where: { id: req.params.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } })
  return ok(res, b, 'Booking cancelled.')
})

router.patch('/:id/attend', async (req, res) => {
  const b = await prisma.booking.update({ where: { id: req.params.id }, data: { status: 'ATTENDED', checkedInAt: new Date() } })
  return ok(res, b, 'Marked as attended.')
})

module.exports = router
