// src/controllers/attendanceController.js
// Kiosk check-in pipeline (QR / Face / Fingerprint / Manual). Attendance logs
// are stored in PostgreSQL (Prisma) so the feature works without MongoDB.
const { prisma }      = require('../config/prisma')
const { ok, created } = require('../utils/response')
const { getPagination, buildMeta } = require('../utils/pagination')
const bio      = require('../services/biometricService')
const webauthn = require('../services/webauthnService')
const dayjs = require('dayjs')

const MEMBER_INCLUDE = {
  memberships: {
    where:   { status: { in: ['ACTIVE', 'FROZEN', 'EXPIRED'] } },
    orderBy: { endDate: 'desc' },
    take:    1,
    include: { plan: true },
  },
}

async function resolveMember({ memberId, memberCode }) {
  if (memberId)   return prisma.member.findUnique({ where: { id: memberId }, include: MEMBER_INCLUDE })
  if (memberCode) return prisma.member.findFirst({ where: { memberCode: memberCode.trim() }, include: MEMBER_INCLUDE })
  return null
}

// Branch filter helper — scope to the caller's branch when we know it.
const branchWhere = (req) => {
  const bId = req.query?.branchId || req.user?.branchId
  return bId ? { branchId: bId } : {}
}

// ─── FINGERPRINT CHECK-IN OPTIONS (kiosk asks "who's touching the sensor?") ──
exports.fingerprintOptions = async (req, res) => {
  const { requestId, options } = await webauthn.authenticationOptions()
  return ok(res, { requestId, options })
}

// ─── CHECK-IN (kiosk posts here — one pipeline for QR / Face / Fingerprint) ──
exports.checkIn = async (req, res) => {
  const {
    memberId, memberCode, method = 'QR',
    confidence, deviceId, note, faceImage, fpTemplate,
    requestId, assertionResponse,
  } = req.body

  // 1) IDENTIFY — differs per method, converges on a single `member`
  let member    = await resolveMember({ memberId, memberCode })
  let matchInfo = null

  if (!member && method === 'FACE' && faceImage) {
    matchInfo = await bio.matchFace(faceImage)
    if (matchInfo.matched) {
      member = await prisma.member.findUnique({ where: { id: matchInfo.memberId }, include: MEMBER_INCLUDE })
    }
  }
  // Fingerprint via this device's own sensor (WebAuthn) — the normal path now.
  if (!member && method === 'FINGERPRINT' && requestId && assertionResponse) {
    const r = await webauthn.verifyAuthentication(requestId, assertionResponse)
    matchInfo = r.ok ? { matched: true, memberId: r.memberId } : { matched: false, reason: r.reason }
    if (matchInfo.matched) {
      member = await prisma.member.findUnique({ where: { id: matchInfo.memberId }, include: MEMBER_INCLUDE })
    }
  // Legacy path: external ZKTeco desk reader bridge, if one is ever connected.
  } else if (!member && method === 'FINGERPRINT' && fpTemplate) {
    matchInfo = await bio.matchFingerprint(fpTemplate)
    if (matchInfo.matched) {
      member = await prisma.member.findUnique({ where: { id: matchInfo.memberId }, include: MEMBER_INCLUDE })
    }
  }

  // 2) DECIDE — shared access rules
  let result = 'GRANTED'
  let reason
  if (!member) {
    result = 'DENIED'
    reason = matchInfo?.reason || 'MEMBER_NOT_FOUND'
  } else if (member.status === 'FROZEN') {
    result = 'FROZEN'
  } else if (member.status === 'EXPIRED' || member.status === 'CANCELLED') {
    result = 'EXPIRED'
  } else {
    const active = member.memberships?.[0]
    if (active?.endDate && new Date(active.endDate) < new Date()) result = 'EXPIRED'
  }

  // 3) LOG — always persisted to Postgres so the attendance table updates.
  const branchId =
    req.body.branchId || req.user?.branchId || member?.branchId ||
    (await prisma.branch.findFirst({ select: { id: true } }))?.id || 'demo'

  let logId
  try {
    const log = await prisma.attendanceLog.create({
      data: {
        branchId,
        tenantId:   req.user?.tenantId || null,
        memberId:   member?.id || null,
        memberName: member?.fullName || null,
        memberCode: member?.memberCode || null,
        method,
        result,
        confidence: confidence ?? matchInfo?.confidence ?? null,
        deviceId:   deviceId || null,
        ipAddress:  req.ip,
        note:       note || reason || null,
      },
    })
    logId = log.id
  } catch (_) { /* logging is best-effort */ }

  return created(res, {
    result,
    reason,
    member: member ? {
      id:         member.id,
      fullName:   member.fullName,
      memberCode: member.memberCode,
      status:     member.status,
      plan:       member.memberships?.[0]?.plan?.name,
    } : null,
    logId,
  }, `Check-in ${result}`)
}

// ─── LIST LOGS ────────────────────────────────────────────────────
exports.list = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query)
  const { memberId, result, method, from, to } = req.query

  const where = {
    ...branchWhere(req),
    ...(memberId && { memberId }),
    ...(result   && { result }),
    ...(method   && { method }),
    ...((from || to) && {
      checkedAt: {
        ...(from && { gte: new Date(from) }),
        ...(to   && { lte: new Date(to)   }),
      },
    }),
  }

  const [logs, total] = await Promise.all([
    prisma.attendanceLog.findMany({ where, orderBy: { checkedAt: 'desc' }, skip, take: limit }),
    prisma.attendanceLog.count({ where }),
  ])
  return res.json({ success: true, data: logs, pagination: buildMeta(total, page, limit) })
}

// ─── TODAY STATS ─────────────────────────────────────────────────
exports.todayStats = async (req, res) => {
  const todayStart = dayjs().startOf('day').toDate()
  const base = { ...branchWhere(req), checkedAt: { gte: todayStart } }

  const [total, granted, denied, byMethodRaw] = await Promise.all([
    prisma.attendanceLog.count({ where: base }),
    prisma.attendanceLog.count({ where: { ...base, result: 'GRANTED' } }),
    prisma.attendanceLog.count({ where: { ...base, result: 'DENIED'  } }),
    prisma.attendanceLog.groupBy({ by: ['method'], where: base, _count: { method: true } }),
  ])
  const byMethod = byMethodRaw.map(m => ({ _id: m.method, count: m._count.method }))
  return ok(res, { total, granted, denied, byMethod })
}

// ─── HEATMAP (hourly for week) ────────────────────────────────────
exports.heatmap = async (req, res) => {
  const weekStart = dayjs().startOf('week').toDate()
  const logs = await prisma.attendanceLog.findMany({
    where:  { ...branchWhere(req), result: 'GRANTED', checkedAt: { gte: weekStart } },
    select: { checkedAt: true },
  })

  const map = {}
  for (const l of logs) {
    const d    = new Date(l.checkedAt)
    const day  = d.getDay() + 1   // 1=Sun … 7=Sat (matches the prior Mongo convention)
    const hour = d.getHours()
    const key  = `${day}-${hour}`
    map[key] = (map[key] || 0) + 1
  }
  const data = Object.entries(map).map(([k, count]) => {
    const [day, hour] = k.split('-').map(Number)
    return { _id: { day, hour }, count }
  })
  return ok(res, data)
}

// ─── RECENT LIVE FEED ─────────────────────────────────────────────
exports.liveFeed = async (req, res) => {
  const logs = await prisma.attendanceLog.findMany({
    where:   branchWhere(req),
    orderBy: { checkedAt: 'desc' },
    take:    20,
  })
  return ok(res, logs)
}
