const router = require('express').Router()
const { prisma } = require('../config/prisma')
const { protect, adminUp } = require('../middleware/auth')

// Every route uses the shared `protect` middleware (verifies the token, checks
// the account is active, and loads tenantId/branchId/role onto req.user) so we
// can scope every query to the caller's gym. Scoping members by their branch's
// tenant keeps one gym's data invisible to another.
const tenantScope = (req) => ({ branch: { tenantId: req.user.tenantId } })

// Invoice number for the admission-fee receipt
const genInvoice = () => `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

// Next MBR-#### code from the HIGHEST existing number — robust to deleted
// members and gaps (member count is NOT a safe basis: it collides after any
// deletion or with seeded codes).
async function nextMemberCode() {
  const rows = await prisma.member.findMany({
    where:  { memberCode: { startsWith: 'MBR-' } },
    select: { memberCode: true },
  })
  let max = 0
  for (const r of rows) {
    const n = parseInt(String(r.memberCode).replace(/\D/g, ''), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return `MBR-${String(max + 1).padStart(3, '0')}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d][\d\s()-]{5,19}$/

// Validate the create/update member payload. Returns an array of error strings.
function validateMember({ fullName, email, phone, admissionFee, customDays, customPrice }, { requireName = true } = {}) {
  const errors = []
  const name = fullName == null ? '' : String(fullName).trim()
  if (requireName && !name) errors.push('Full name is required.')
  if (name && name.length > 100) errors.push('Full name is too long (max 100 characters).')
  if (email && !EMAIL_RE.test(String(email).trim())) errors.push('Email address is not valid.')
  if (phone && !PHONE_RE.test(String(phone).trim())) errors.push('Phone number is not valid.')
  const num = (v) => v != null && v !== '' && (isNaN(Number(v)) || Number(v) < 0)
  if (num(admissionFee)) errors.push('Admission fee must be a positive number.')
  if (num(customPrice))  errors.push('Plan price must be a positive number.')
  if (customDays != null && customDays !== '' && (isNaN(Number(customDays)) || Number(customDays) < 1))
    errors.push('Plan duration must be at least 1 day.')
  return errors
}

// Fixed plan durations/prices (Custom overrides both from the request)
const PLAN_DEFS = { Monthly: { days: 30, price: 65 }, Quarterly: { days: 90, price: 165 } }

// Resolve (or create) a MembershipPlan for a tenant + create an ACTIVE membership.
async function activateMembership({ tx, tenantId, memberId, plan, customDays, customPrice, currency }) {
  const def   = PLAN_DEFS[plan]
  const days  = def ? def.days  : (Number(customDays)  || 30)
  const price = def ? def.price : (Number(customPrice) || 0)

  let planRow = await tx.membershipPlan.findFirst({ where: { tenantId, name: plan } })
  if (!planRow) {
    planRow = await tx.membershipPlan.create({
      data: { tenantId, name: plan, durationDays: days, price, currency: currency || 'USD' },
    })
  }
  const membership = await tx.membership.create({
    data: {
      memberId,
      planId:    planRow.id,
      startDate: new Date(),
      endDate:   new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      status:    'ACTIVE',
    },
  })
  return { planRow, membership, price, days }
}

// GET all members
router.get('/', protect, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where = {
      ...tenantScope(req),
      ...(status && status !== 'All' && { status }),
      ...(search && {
        OR: [
          { fullName:   { contains: search, mode: 'insensitive' } },
          { email:      { contains: search, mode: 'insensitive' } },
          { memberCode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip:    Number(skip),
        take:    Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          memberships: {
            where:   { status: 'ACTIVE' },
            include: { plan: true },
            take:    1,
          },
        },
      }),
      prisma.member.count({ where }),
    ])

    return res.json({
      success: true,
      data: members,
      pagination: {
        total,
        page:       Number(page),
        limit:      Number(limit),
        totalPages: Math.ceil(total / limit),
        hasNext:    page * limit < total,
        hasPrev:    page > 1,
      },
    })
  } catch (err) {
    console.error('Members error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// GET single member
router.get('/:id', protect, async (req, res) => {
  try {
    // findFirst (not findUnique) so we can filter by tenant — a member from
    // another gym returns 404 rather than leaking their record.
    const member = await prisma.member.findFirst({
      where:   { id: req.params.id, ...tenantScope(req) },
      include: { memberships: { include: { plan: true } } },
    })
    if (!member)
      return res.status(404).json({ success: false, message: 'Member not found.' })
    return res.json({ success: true, data: member })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// POST create member — SUPER_ADMIN only (optionally records an admission fee)
router.post('/', protect, adminUp, async (req, res) => {
  try {
    const { fullName, email, phone, gender, address, admissionFee, paymentMethod, currency } = req.body

    // ── Validate input ──────────────────────────────────────────────
    const errors = validateMember(req.body)
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' '), errors })

    const cleanEmail = email ? String(email).trim().toLowerCase() : null
    const cleanName  = String(fullName).trim()

    // Attach the new member to the creator's branch (falling back to any branch
    // in their tenant), never to some other gym's branch.
    const branch = await prisma.branch.findFirst({
      where: {
        tenantId: req.user.tenantId,
        ...(req.user.branchId && { id: req.user.branchId }),
      },
    })
    if (!branch) {
      return res.status(400).json({ success: false, message: 'No branch found. Run seed first.' })
    }

    // Friendly duplicate-email check (email is unique in the schema)
    if (cleanEmail) {
      const dupe = await prisma.member.findUnique({ where: { email: cleanEmail } })
      if (dupe) return res.status(409).json({ success: false, message: 'A member with this email already exists.' })
    }

    // Create with a unique member code — retry if two requests race for the
    // same code (recomputes the next code each attempt).
    let member
    for (let attempt = 0; ; attempt++) {
      try {
        member = await prisma.member.create({
          data: {
            fullName:  cleanName,
            email:     cleanEmail,
            phone:     phone   ? String(phone).trim()   : null,
            gender:    gender  || null,
            address:   address ? String(address).trim() : null,
            memberCode: await nextMemberCode(),
            branchId:  branch.id,
          },
        })
        break
      } catch (e) {
        const target = String(e?.meta?.target || '')
        if (e.code === 'P2002' && target.includes('email'))
          return res.status(409).json({ success: false, message: 'A member with this email already exists.' })
        if (e.code === 'P2002' && target.includes('memberCode') && attempt < 5) continue
        throw e
      }
    }

    // Membership plan → create an ACTIVE membership so the plan shows in the table.
    if (req.body.plan) {
      await activateMembership({
        tx: prisma, tenantId: branch.tenantId, memberId: member.id,
        plan: req.body.plan, customDays: req.body.customDays, customPrice: req.body.customPrice, currency,
      })
    }

    // Admission fee → a Payment so it shows up in Payments & Billing.
    let payment = null
    const fee = Number(admissionFee)
    if (fee > 0) {
      const method = paymentMethod || 'CASH'
      payment = await prisma.payment.create({
        data: {
          memberId:  member.id,
          invoiceNo: genInvoice(),
          amount:    fee,
          currency:  currency || 'USD',
          method,
          status:    method === 'CASH' ? 'PAID' : 'PENDING',
          paidAt:    method === 'CASH' ? new Date() : null,
          notes:     'Membership admission fee',
        },
      })
    }

    return res.status(201).json({ success: true, data: member, payment, message: 'Member created.' })
  } catch (err) {
    console.error('Create member error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// PUT update member — ADMIN only. Whitelists editable fields.
router.put('/:id', protect, adminUp, async (req, res) => {
  try {
    const { fullName, email, phone, gender, address, status } = req.body
    const errors = validateMember(req.body, { requireName: fullName !== undefined })
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' '), errors })

    // Only allow editing members that belong to the caller's gym.
    const owned = await prisma.member.findFirst({ where: { id: req.params.id, ...tenantScope(req) }, select: { id: true } })
    if (!owned) return res.status(404).json({ success: false, message: 'Member not found.' })

    const data = {
      ...(fullName !== undefined && { fullName: String(fullName).trim() }),
      ...(email   !== undefined && { email: email ? String(email).trim().toLowerCase() : null }),
      ...(phone   !== undefined && { phone: phone ? String(phone).trim() : null }),
      ...(gender  !== undefined && { gender: gender || null }),
      ...(address !== undefined && { address: address ? String(address).trim() : null }),
      ...(status  !== undefined && { status }),
    }
    const member = await prisma.member.update({ where: { id: req.params.id }, data })
    return res.json({ success: true, data: member })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'That email is already used by another member.' })
    return res.status(500).json({ success: false, message: err.message })
  }
})

// RENEW a member (typically expired) — records a renewal Payment, creates a
// fresh ACTIVE membership, and reactivates the member. The payment appears in
// Payments & Billing.
router.post('/:id/renew', protect, adminUp, async (req, res) => {
  const { id } = req.params
  const { plan = 'Monthly', method = 'CASH', currency = 'USD', customDays, customPrice, amount } = req.body

  // The renewal fee is entered by staff. Require a valid amount.
  const fee = Number(amount)
  if (!Number.isFinite(fee) || fee < 0) {
    return res.status(400).json({ success: false, message: 'A valid renewal fee is required.' })
  }

  try {
    const member = await prisma.member.findFirst({ where: { id, ...tenantScope(req) }, include: { branch: true } })
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' })

    const result = await prisma.$transaction(async (tx) => {
      // Retire currently-active memberships so only the renewal is active.
      await tx.membership.updateMany({ where: { memberId: id, status: 'ACTIVE' }, data: { status: 'EXPIRED' } })

      const { membership } = await activateMembership({
        tx, tenantId: member.branch.tenantId, memberId: id, plan, customDays, customPrice, currency,
      })

      const payment = await tx.payment.create({
        data: {
          memberId:     id,
          membershipId: membership.id,
          invoiceNo:    genInvoice(),
          amount:       fee,
          currency,
          method,
          status:       method === 'CASH' ? 'PAID' : 'PENDING',
          paidAt:       method === 'CASH' ? new Date() : null,
          notes:        `Membership renewal — ${plan}`,
        },
      })

      const updated = await tx.member.update({ where: { id }, data: { status: 'ACTIVE' } })
      return { member: updated, membership, payment }
    })

    return res.status(201).json({
      success: true,
      data:    result.member,
      payment: result.payment,
      message: 'Membership renewed.',
    })
  } catch (err) {
    console.error('Renew member error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE member — SUPER_ADMIN + ADMIN (adminUp). Cascades child rows first
// since the schema has no ON DELETE CASCADE.
router.delete('/:id', protect, adminUp, async (req, res) => {
  const { id } = req.params
  try {
    const member = await prisma.member.findFirst({ where: { id, ...tenantScope(req) }, select: { id: true, fullName: true } })
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' })

    await prisma.$transaction([
      prisma.booking.deleteMany({ where: { memberId: id } }),
      prisma.biometricProfile.deleteMany({ where: { memberId: id } }),
      prisma.payment.deleteMany({ where: { memberId: id } }),
      prisma.membership.deleteMany({ where: { memberId: id } }),
      prisma.locker.updateMany({ where: { memberId: id }, data: { memberId: null, assignedFrom: null } }),
      prisma.member.delete({ where: { id } }),
    ])

    return res.json({ success: true, message: `${member.fullName} deleted.` })
  } catch (err) {
    console.error('Delete member error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// PATCH freeze a membership — ADMIN only. Freezes the member and their active
// memberships until the given date. (The frontend's memberService.freeze calls this.)
router.patch('/:id/freeze', protect, adminUp, async (req, res) => {
  const { id } = req.params
  const { frozenUntil } = req.body
  if (!frozenUntil) return res.status(400).json({ success: false, message: 'frozenUntil date required.' })
  const until = new Date(frozenUntil)
  if (isNaN(until.getTime())) return res.status(400).json({ success: false, message: 'frozenUntil is not a valid date.' })

  try {
    const owned = await prisma.member.findFirst({ where: { id, ...tenantScope(req) }, select: { id: true } })
    if (!owned) return res.status(404).json({ success: false, message: 'Member not found.' })

    await prisma.$transaction([
      prisma.member.update({ where: { id }, data: { status: 'FROZEN' } }),
      prisma.membership.updateMany({ where: { memberId: id, status: 'ACTIVE' }, data: { status: 'FROZEN', frozenUntil: until } }),
    ])
    return res.json({ success: true, message: 'Membership frozen.' })
  } catch (err) {
    console.error('Freeze member error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// PATCH unfreeze a membership — ADMIN only. Reactivates the member and any
// frozen memberships. (The frontend's memberService.unfreeze calls this.)
router.patch('/:id/unfreeze', protect, adminUp, async (req, res) => {
  const { id } = req.params
  try {
    const owned = await prisma.member.findFirst({ where: { id, ...tenantScope(req) }, select: { id: true } })
    if (!owned) return res.status(404).json({ success: false, message: 'Member not found.' })

    await prisma.$transaction([
      prisma.member.update({ where: { id }, data: { status: 'ACTIVE' } }),
      prisma.membership.updateMany({ where: { memberId: id, status: 'FROZEN' }, data: { status: 'ACTIVE', frozenUntil: null } }),
    ])
    return res.json({ success: true, message: 'Membership unfrozen.' })
  } catch (err) {
    console.error('Unfreeze member error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router