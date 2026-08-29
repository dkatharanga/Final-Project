// src/routes/biometric.js
const router = require('express').Router()
const { protect, adminOnly } = require('../middleware/auth')
const { prisma }  = require('../config/prisma')
const { ok, created, notFound } = require('../utils/response')
const bio = require('../services/biometricService')
const webauthn = require('../services/webauthnService')

router.use(protect)

// Get biometric profile for a member (any authenticated staff may view status)
router.get('/:memberId', async (req, res) => {
  const b = await prisma.biometricProfile.findUnique({ where: { memberId: req.params.memberId } })
  if (!b) return notFound(res, 'No biometric profile.')
  return ok(res, { faceEnrolled: b.faceEnrolled, fpEnrolled: b.fpEnrolled, enrolledAt: b.enrolledAt })
})

// ─── FINGERPRINT VIA THE DEVICE'S OWN SENSOR (WebAuthn) ──────────────────────
// For gyms without a dedicated ZKTeco desk reader: use whatever platform
// authenticator this computer already has (an ASUS laptop's built-in
// fingerprint sensor, Windows Hello, Touch ID, ...). SUPER_ADMIN only, same as
// the rest of biometric enrollment.
router.get('/:memberId/fingerprint/options', adminOnly, async (req, res) => {
  const member = await prisma.member.findUnique({ where: { id: req.params.memberId } })
  if (!member) return notFound(res, 'Member not found.')
  const profile = await prisma.biometricProfile.findUnique({ where: { memberId: req.params.memberId } })
  const options = await webauthn.registrationOptions(member, profile?.fpCredentialId)
  return ok(res, options)
})

router.post('/:memberId/fingerprint/verify', adminOnly, async (req, res) => {
  const member = await prisma.member.findUnique({ where: { id: req.params.memberId }, select: { id: true } })
  if (!member) return notFound(res, 'Member not found.')

  const r = await webauthn.verifyRegistration(req.params.memberId, req.body.attestationResponse)
  if (!r.ok) return res.status(422).json({ success: false, message: r.reason, error: r.error })

  const profile = await prisma.biometricProfile.upsert({
    where:  { memberId: req.params.memberId },
    update: { fpEnrolled: true, fpCredentialId: r.fpCredentialId, fpPublicKey: r.fpPublicKey, fpCounter: r.fpCounter, updatedAt: new Date() },
    create: { memberId: req.params.memberId, fpEnrolled: true, fpCredentialId: r.fpCredentialId, fpPublicKey: r.fpPublicKey, fpCounter: r.fpCounter },
  })
  return ok(res, { fpEnrolled: profile.fpEnrolled }, 'Fingerprint enrolled via this device’s sensor.')
})

// Enroll / update biometric — SUPER_ADMIN only.
// Uses the recognition microservice when it's configured/reachable. When it is
// NOT, enrollment fails honestly (503) instead of silently marking the member
// enrolled — a fake "enrolled" credential with no real embedding/template is
// worse than a clear failure, since staff would trust it for kiosk access.
//   body: { type: 'face',        faceImage: <base64 jpeg> }  (from reception webcam)
//   body: { type: 'fingerprint' }                            (bridge captures from its reader)
const serviceDown = (reason) => /NOT_CONFIGURED|UNAVAILABLE/.test(reason || '')

router.post('/:memberId/enroll', adminOnly, async (req, res) => {
  const { type, faceImage } = req.body

  // Member must exist so we never create an orphan profile.
  const member = await prisma.member.findUnique({ where: { id: req.params.memberId }, select: { id: true } })
  if (!member) return notFound(res, 'Member not found.')

  let data
  if (type === 'face') {
    if (!faceImage) return res.status(400).json({ success: false, message: 'faceImage (base64) required.' })
    const r = await bio.enrollFace(req.params.memberId, faceImage)
    if (!r.ok) {
      return res.status(serviceDown(r.reason) ? 503 : 422).json({ success: false, message: r.reason, error: r.error })
    }
    data = { faceEnrolled: true, faceEmbedding: r.faceEmbedding }
  } else if (type === 'fingerprint') {
    const r = await bio.enrollFingerprint(req.params.memberId)
    if (!r.ok) {
      return res.status(serviceDown(r.reason) ? 503 : 422).json({ success: false, message: r.reason, error: r.error })
    }
    data = { fpEnrolled: true, fpTemplate1: r.fpTemplate1, fpTemplate2: r.fpTemplate2 }
  } else {
    return res.status(400).json({ success: false, message: "type must be 'face' or 'fingerprint'." })
  }

  const profile = await prisma.biometricProfile.upsert({
    where:  { memberId: req.params.memberId },
    update: { ...data, updatedAt: new Date() },
    create: { memberId: req.params.memberId, ...data },
  })
  return ok(res, { faceEnrolled: profile.faceEnrolled, fpEnrolled: profile.fpEnrolled }, `${type} enrolled.`)
})

// Delete biometric — SUPER_ADMIN only.
router.delete('/:memberId', adminOnly, async (req, res) => {
  const { type } = req.query
  const data = type === 'face'
    ? { faceEnrolled: false, faceEmbedding: null }
    : type === 'fingerprint'
    ? { fpEnrolled: false, fpTemplate1: null, fpTemplate2: null, fpCredentialId: null, fpPublicKey: null, fpCounter: 0 }
    : { faceEnrolled: false, fpEnrolled: false, faceEmbedding: null, fpTemplate1: null, fpTemplate2: null, fpCredentialId: null, fpPublicKey: null, fpCounter: 0 }
  await prisma.biometricProfile.update({ where: { memberId: req.params.memberId }, data })
  return ok(res, {}, 'Biometric cleared.')
})

module.exports = router
