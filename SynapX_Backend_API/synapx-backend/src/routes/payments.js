const router = require('express').Router()
const { prisma } = require('../config/prisma')
const { protect, adminUp } = require('../middleware/auth')

// Scope payments to the caller's gym via the member's branch tenant.
const tenantScope = (req) => ({ member: { branch: { tenantId: req.user.tenantId } } })

// Helper
const genInvoice = () => {
  const year = new Date().getFullYear()
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `INV-${year}-${rand}`
}

// GET all payments
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where = { ...tenantScope(req), ...(status && status !== 'All' && { status }) }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { member: { select: { fullName: true, memberCode: true } } },
      }),
      prisma.payment.count({ where }),
    ])

    return res.json({
      success: true,
      data: payments,
      pagination: {
        total,
        page:       Number(page),
        limit:      Number(limit),
        totalPages: Math.ceil(total / limit),
        hasNext:    Number(page) * Number(limit) < total,
        hasPrev:    Number(page) > 1,
      },
    })
  } catch (err) {
    console.error('Payments error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// GET revenue summary
router.get('/summary/revenue', protect, async (req, res) => {
  try {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const scope = tenantScope(req)

    const [totalPaid, totalPending, totalOverdue] = await Promise.all([
      prisma.payment.aggregate({
        where: { ...scope, status: 'PAID', paidAt: { gte: monthStart } },
        _sum:  { amount: true },
      }),
      prisma.payment.aggregate({
        where: { ...scope, status: 'PENDING' },
        _sum:  { amount: true },
      }),
      prisma.payment.aggregate({
        where: { ...scope, status: 'OVERDUE' },
        _sum:  { amount: true },
      }),
    ])

    return res.json({
      success: true,
      data: {
        collected: Number(totalPaid._sum.amount    || 0),
        pending:   Number(totalPending._sum.amount || 0),
        overdue:   Number(totalOverdue._sum.amount || 0),
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// GET single payment
router.get('/:id', protect, async (req, res) => {
  try {
    const payment = await prisma.payment.findFirst({
      where:   { id: req.params.id, ...tenantScope(req) },
      include: { member: true },
    })
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found.' })
    }
    return res.json({ success: true, data: payment })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// POST create payment — SUPER_ADMIN only
router.post('/', protect, adminUp, async (req, res) => {
  try {
    const { memberId, amount, currency = 'USD', method = 'CASH', notes, dueDate } = req.body

    if (!memberId || !amount) {
      return res.status(400).json({ success: false, message: 'memberId and amount required.' })
    }

    const member = await prisma.member.findFirst({
      where: { id: memberId, branch: { tenantId: req.user.tenantId } },
    })
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' })
    }

    const payment = await prisma.payment.create({
      data: {
        memberId,
        invoiceNo: genInvoice(),
        amount,
        currency,
        method,
        notes,
        status: method === 'CASH' ? 'PAID' : 'PENDING',
        paidAt: method === 'CASH' ? new Date() : null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: { member: { select: { fullName: true } } },
    })

    return res.status(201).json({
      success: true,
      message: 'Payment recorded.',
      data: payment,
    })
  } catch (err) {
    console.error('Create payment error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// PATCH mark as paid — SUPER_ADMIN only
router.patch('/:id/paid', protect, adminUp, async (req, res) => {
  try {
    // Confirm the payment belongs to the caller's gym before mutating it.
    const owned = await prisma.payment.findFirst({ where: { id: req.params.id, ...tenantScope(req) }, select: { id: true } })
    if (!owned) return res.status(404).json({ success: false, message: 'Payment not found.' })

    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data:  { status: 'PAID', paidAt: new Date() },
    })
    return res.json({ success: true, message: 'Payment marked as paid.', data: payment })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router