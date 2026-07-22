const router = require('express').Router()
const { prisma } = require('../config/prisma')
const { protect } = require('../middleware/auth')

// Report scopes — keep every gym's figures to its own tenant.
const memberScope  = (req) => ({ branch: { tenantId: req.user.tenantId } })
const paymentScope = (req) => ({ member: { branch: { tenantId: req.user.tenantId } } })

// GET member report
router.get('/members', protect, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query
    const where = { ...memberScope(req), ...(status && { status }) }

    const members = await prisma.member.findMany({
      where,
      take:    Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        memberships: {
          where:   { status: 'ACTIVE' },
          include: { plan: true },
          take:    1,
        },
      },
    })
    return res.json({ success: true, data: members })
  } catch (err) {
    console.error('Reports members error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// GET revenue report
router.get('/revenue', protect, async (req, res) => {
  try {
    const from = req.query.from
      ? new Date(req.query.from)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const to = req.query.to ? new Date(req.query.to) : new Date()

    const payments = await prisma.payment.findMany({
      where: { ...paymentScope(req), status: 'PAID', paidAt: { gte: from, lte: to } },
      include: { member: { select: { fullName: true, memberCode: true } } },
      orderBy: { paidAt: 'desc' },
    })

    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0)
    return res.json({ success: true, data: { payments, total } })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// GET churn report
router.get('/churn', protect, async (req, res) => {
  try {
    const months = parseInt(req.query.months || 6)
    const from   = new Date()
    from.setMonth(from.getMonth() - months)

    const expired = await prisma.member.findMany({
      where:   { ...memberScope(req), status: { in: ['EXPIRED', 'CANCELLED'] }, updatedAt: { gte: from } },
      select:  { id: true, fullName: true, email: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })

    return res.json({ success: true, data: { total: expired.length, members: expired } })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// GET monthly summary
router.get('/monthly-summary', protect, async (req, res) => {
  try {
    const months = parseInt(req.query.months || 6)
    const result = []

    for (let i = months - 1; i >= 0; i--) {
      const date  = new Date()
      date.setMonth(date.getMonth() - i)
      const start = new Date(date.getFullYear(), date.getMonth(), 1)
      const end   = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const [newMembers, revenue, classes] = await Promise.all([
        prisma.member.count({ where: { ...memberScope(req), createdAt: { gte: start, lte: end } } }),
        prisma.payment.aggregate({
          where: { ...paymentScope(req), status: 'PAID', paidAt: { gte: start, lte: end } },
          _sum:  { amount: true },
        }),
        prisma.class.count({ where: { isActive: true, branch: { tenantId: req.user.tenantId } } }),
      ])

      result.push({
        month:      date.toLocaleString('default', { month: 'short' }),
        year:       date.getFullYear(),
        newMembers,
        revenue:    Number(revenue._sum.amount || 0),
        classes,
      })
    }

    return res.json({ success: true, data: result })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router