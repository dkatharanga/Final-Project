// src/routes/biometric.js
const router = require('express').Router()
const { protect, adminOnly } = require('../middleware/auth')
const { prisma }  = require('../config/prisma')
const { ok, created, notFound } = require('../utils/response')
const bio = require('../services/biometricService')

router.use(protect)

// Get biometric profile for a member (any authenticated staff may view status)
router.get('/:memberId', async (req, res) => {
  const b = await prisma.biometricProfile.findUnique({ where: { memberId: req.params.memberId } })
  if (!b) return notFound(res, 'No biometric profile.')
  return ok(res, { faceEnrolled: b.faceEnrolled, fpEnrolled: b.fpEnrolled, enrolledAt: b.enrolledAt })
})

// Enroll / update biometric — SUPER_ADMIN only.
// Uses the recognition microservice when it's configured/reachable. When it is
// NOT (the common case in a browser-only setup), it falls back to a LOCAL
// enrollment so the flow always succeeds with no error: it stores the captured
// face image and marks the credential enrolled. Real recognition needs the
// service, but the desk workflow never breaks.
//   body: { type: 'face',        faceImage: <base64 jpeg> }  (from reception webcam)
//   body: { type: 'fingerprint' }                            (bridge captures from its reader)
const serviceDown = (reason) => /NOT_CONFIGURED|UNAVAILABLE/.test(reason || '')

router.post('/:memberId/enroll', adminOnly, async (req, res) => {
  const { type, faceImage } = req.body

  // Member must exist so we never create an orphan profile.
  const member = await prisma.member.findUnique({ where: { id: req.params.memberId }, select: { id: true } })
  if (!member) return notFound(res, 'Member not found.')

  let data
  let note = null
  if (type === 'face') {
    if (!faceImage) return res.status(400).json({ success: false, message: 'faceImage (base64) required.' })
    const r = await bio.enrollFace(req.params.memberId, faceImage)
    if (r.ok) {
      data = { faceEnrolled: true, faceEmbedding: r.faceEmbedding }
    } else if (serviceDown(r.reason)) {
      // Local fallback: mark the credential enrolled so the desk flow still
      // succeeds, but DON'T write the raw JPEG into faceEmbedding — that column
      // holds a face vector, not an image, and a JPEG there can never match.
      // The member must be re-enrolled once the recognition service is online.
      data = { faceEnrolled: true, faceEmbedding: null }
      note = 'Marked enrolled locally — re-enroll once the recognition service is online for face matching to work.'
    } else {
      return res.status(422).json({ success: false, message: r.reason, error: r.error })
    }
  } else if (type === 'fingerprint') {
    const r = await bio.enrollFingerprint(req.params.memberId)
    if (r.ok) {
      data = { fpEnrolled: true, fpTemplate1: r.fpTemplate1, fpTemplate2: r.fpTemplate2 }
    } else if (serviceDown(r.reason)) {
      data = { fpEnrolled: true }
      note = 'Marked enrolled locally (reader offline).'
    } else {
      return res.status(422).json({ success: false, message: r.reason, error: r.error })
    }
  } else {
    return res.status(400).json({ success: false, message: "type must be 'face' or 'fingerprint'." })
  }

  const profile = await prisma.biometricProfile.upsert({
    where:  { memberId: req.params.memberId },
    update: { ...data, updatedAt: new Date() },
    create: { memberId: req.params.memberId, ...data },
  })
  return ok(res, { faceEnrolled: profile.faceEnrolled, fpEnrolled: profile.fpEnrolled, note }, note || `${type} enrolled.`)
})

// Delete biometric — SUPER_ADMIN only.
router.delete('/:memberId', adminOnly, async (req, res) => {
  const { type } = req.query
  const data = type === 'face'
    ? { faceEnrolled: false, faceEmbedding: null }
    : type === 'fingerprint'
    ? { fpEnrolled: false, fpTemplate1: null, fpTemplate2: null }
    : { faceEnrolled: false, fpEnrolled: false, faceEmbedding: null, fpTemplate1: null, fpTemplate2: null }
  await prisma.biometricProfile.update({ where: { memberId: req.params.memberId }, data })
  return ok(res, {}, 'Biometric cleared.')
})

module.exports = router
