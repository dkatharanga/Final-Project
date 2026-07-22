const router = require('express').Router()
const { prisma } = require('../config/prisma')
const { protect } = require('../middleware/auth')

// Every dashboard endpoint requires a valid staff token and is scoped to the
// caller's gym. Attendance logs carry a branchId (not a tenant relation), so we
// resolve the tenant's branch ids once and filter check-ins by those.
async function tenantBranchIds(req) {
  const branches = await prisma.branch.findMany({
    where:  { tenantId: req.user.tenantId },
    select: { id: true },
  })
  return branches.map(b => b.id)
}

const memberScope = (req) => ({ branch: { tenantId: req.user.tenantId } })

// GET KPIs
router.get('/kpis', protect, async (req, res) => {
  try {
    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const in7Days    = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const branchIds  = await tenantBranchIds(req)

    const [activeMembers, newThisMonth, expiringIn7, activeClasses, monthlyRevenue, todayCheckins] = await Promise.all([
      prisma.member.count({ where: { ...memberScope(req), status: 'ACTIVE' } }),
      prisma.member.count({ where: { ...memberScope(req), createdAt: { gte: monthStart } } }),
      prisma.membership.count({
        where: { status: 'ACTIVE', endDate: { lte: in7Days, gte: now }, member: memberScope(req) },
      }),
      prisma.class.count({ where: { isActive: true, ...memberScope(req) } }),
      prisma.payment.aggregate({
        where: { status: 'PAID', paidAt: { gte: monthStart }, member: memberScope(req) },
        _sum:  { amount: true },
      }),
      // Real check-ins today (was hardcoded to 0).
      prisma.attendanceLog.count({
        where: { branchId: { in: branchIds }, result: 'GRANTED', checkedAt: { gte: todayStart } },
      }),
    ])

    return res.json({
      success: true,
      data: {
        activeMembers,
        todayCheckins,
        monthlyRevenue: Number(monthlyRevenue._sum.amount || 0),
        expiringIn7,
        classesToday:   activeClasses,
        newThisMonth,
      },
    })
  } catch (err) {
    console.error('KPI error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// GET revenue chart
router.get('/revenue-chart', protect, async (req, res) => {
  try {
    const months = 7
    const result = []

    for (let i = months - 1; i >= 0; i--) {
      const date  = new Date()
      date.setMonth(date.getMonth() - i)
      const start = new Date(date.getFullYear(), date.getMonth(), 1)
      const end   = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const revenue = await prisma.payment.aggregate({
        where: { status: 'PAID', paidAt: { gte: start, lte: end }, member: memberScope(req) },
        _sum:  { amount: true },
      })

      result.push({
        month:   date.toLocaleString('default', { month: 'short' }),
        revenue: Number(revenue._sum.amount || 0),
        target:  10000,
      })
    }

    return res.json({ success: true, data: result })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// GET member growth
router.get('/member-growth', protect, async (req, res) => {
  try {
    const months = 6
    const result = []

    for (let i = months - 1; i >= 0; i--) {
      const date  = new Date()
      date.setMonth(date.getMonth() - i)
      const start = new Date(date.getFullYear(), date.getMonth(), 1)
      const end   = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const newMembers = await prisma.member.count({
        where: { ...memberScope(req), createdAt: { gte: start, lte: end } },
      })

      result.push({
        month:      date.toLocaleString('default', { month: 'short' }),
        newMembers,
      })
    }

    return res.json({ success: true, data: result })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// GET plan distribution
router.get('/plan-distribution', protect, async (req, res) => {
  try {
    const plans = await prisma.membershipPlan.findMany({
      where:   { tenantId: req.user.tenantId },
      include: { _count: { select: { memberships: true } } },
    })

    const data = plans.map(p => ({
      name:  p.name,
      value: p._count.memberships,
    }))

    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// GET weekly attendance — real GRANTED check-ins for the current week, bucketed
// by day of week (was hardcoded to all zeros).
router.get('/weekly-attendance', protect, async (req, res) => {
  try {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const now  = new Date()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const branchIds = await tenantBranchIds(req)

    const logs = await prisma.attendanceLog.findMany({
      where:  { branchId: { in: branchIds }, result: 'GRANTED', checkedAt: { gte: weekStart } },
      select: { checkedAt: true },
    })

    const counts = [0, 0, 0, 0, 0, 0, 0]
    for (const l of logs) counts[new Date(l.checkedAt).getDay()]++

    const data = days.map((day, i) => ({ day, checkins: counts[i] }))
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
