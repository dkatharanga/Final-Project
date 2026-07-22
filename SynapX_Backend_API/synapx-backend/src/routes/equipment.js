// src/routes/equipment.js
const router = require('express').Router()
const { protect, managerUp } = require('../middleware/auth')
const { prisma } = require('../config/prisma')
const { ok, created, notFound } = require('../utils/response')
const { getPagination, buildMeta } = require('../utils/pagination')

router.use(protect)

router.get('/', async (req, res) => {
  const { page, limit, skip } = getPagination(req.query)
  const branchId = req.query.branchId || req.user.branchId
  const where = { branchId, ...(req.query.status && { status: req.query.status }) }
  const [items, total] = await Promise.all([
    prisma.equipment.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.equipment.count({ where }),
  ])
  return res.json({ success: true, data: items, pagination: buildMeta(total, page, limit) })
})

router.post('/', managerUp, async (req, res) => {
  const eq = await prisma.equipment.create({
    data: { ...req.body, branchId: req.body.branchId || req.user.branchId },
  })
  return created(res, eq)
})

router.put('/:id', managerUp, async (req, res) => {
  const eq = await prisma.equipment.update({ where: { id: req.params.id }, data: req.body })
  return ok(res, eq, 'Equipment updated.')
})

router.patch('/:id/maintenance', managerUp, async (req, res) => {
  const eq = await prisma.equipment.update({
    where: { id: req.params.id },
    data:  { status: 'MAINTENANCE', lastMaintenance: new Date(), nextMaintenance: req.body.nextMaintenance ? new Date(req.body.nextMaintenance) : undefined },
  })
  return ok(res, eq, 'Maintenance logged.')
})

module.exports = router
