// src/routes/memberships.js
const router = require('express').Router()
const { protect, managerUp } = require('../middleware/auth')
const { prisma } = require('../config/prisma')
const { ok, created, notFound } = require('../utils/response')
const dayjs = require('dayjs')

router.use(protect)

// List all membership plans
router.get('/plans', async (req, res) => {
  const plans = await prisma.membershipPlan.findMany({
    where: { tenantId: req.user.tenantId, isActive: true },
    orderBy: { price: 'asc' },
  })
  return ok(res, plans)
})

// Create membership plan
router.post('/plans', managerUp, async (req, res) => {
  const { name, durationDays, price, currency, description } = req.body
  const plan = await prisma.membershipPlan.create({
    data: { tenantId: req.user.tenantId, name, durationDays, price, currency: currency || 'USD', description },
  })
  return created(res, plan)
})

// Assign membership to member
router.post('/', managerUp, async (req, res) => {
  const { memberId, planId, startDate, autoRenew, notes } = req.body
  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } })
  if (!plan) return notFound(res, 'Plan not found.')

  const start = startDate ? dayjs(startDate) : dayjs()
  const end   = start.add(plan.durationDays, 'day')

  // Expire any current active membership
  await prisma.membership.updateMany({
    where: { memberId, status: 'ACTIVE' },
    data:  { status: 'EXPIRED' },
  })

  const membership = await prisma.membership.create({
    data: {
      memberId,
      planId,
      startDate: start.toDate(),
      endDate:   end.toDate(),
      autoRenew: autoRenew || false,
      notes,
    },
    include: { plan: true },
  })

  // Update member status to ACTIVE
  await prisma.member.update({ where: { id: memberId }, data: { status: 'ACTIVE' } })

  return created(res, membership, 'Membership assigned.')
})

// Get member's memberships
router.get('/member/:memberId', async (req, res) => {
  const list = await prisma.membership.findMany({
    where:   { memberId: req.params.memberId },
    include: { plan: true },
    orderBy: { startDate: 'desc' },
  })
  return ok(res, list)
})

// Renew membership
router.post('/:id/renew', managerUp, async (req, res) => {
  const current = await prisma.membership.findUnique({ where: { id: req.params.id }, include: { plan: true } })
  if (!current) return notFound(res, 'Membership not found.')

  const start = dayjs(current.endDate)
  const end   = start.add(current.plan.durationDays, 'day')

  await prisma.membership.update({ where: { id: req.params.id }, data: { status: 'EXPIRED' } })
  const renewed = await prisma.membership.create({
    data: { memberId: current.memberId, planId: current.planId, startDate: start.toDate(), endDate: end.toDate() },
    include: { plan: true },
  })
  return created(res, renewed, 'Membership renewed.')
})

module.exports = router
