// src/services/biometricService.js
// Integration seam for face & fingerprint recognition.
//
// Real matching runs in a separate microservice (Python + InsightFace/FAISS for
// face; a ZKTeco bridge for fingerprint) because both need native/ML libraries.
// Point BIOMETRIC_SERVICE_URL at that service and these functions forward to it.
// When it is not configured/reachable, they return a clear "unavailable" result
// so the kiosk can show a helpful message instead of crashing.
//
// Expected microservice contract:
//   POST /match/face         { image: <base64 jpeg> }         -> { memberId, confidence }
//   POST /match/fingerprint  { template: <base64> }           -> { memberId, confidence }
//   (memberId null/absent => no match)
//
//   POST /enroll/face        { image: <base64 jpeg> }   -> { embedding: <base64> }
//   POST /enroll/fingerprint { memberId }                -> { template1: <base64>, template2: <base64> }
//     (face image comes from the reception webcam; fingerprint is captured by the
//      bridge's own attached reader, so the browser just triggers it.)
//   (These extract, but do NOT persist — the backend stores the bytes it returns.)

const BASE = process.env.BIOMETRIC_SERVICE_URL || ''
const TIMEOUT_MS = Number(process.env.BIOMETRIC_TIMEOUT_MS || 6000)

async function call(path, body) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`Biometric service responded ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

async function matchFace(imageBase64) {
  if (!BASE) return { matched: false, reason: 'FACE_SERVICE_NOT_CONFIGURED' }
  try {
    const r = await call('/match/face', { image: imageBase64 })
    return r?.memberId
      ? { matched: true, memberId: r.memberId, confidence: r.confidence }
      : { matched: false, reason: 'FACE_NOT_RECOGNISED', confidence: r?.confidence }
  } catch (err) {
    return { matched: false, reason: 'FACE_SERVICE_UNAVAILABLE', error: err.message }
  }
}

async function matchFingerprint(template) {
  if (!BASE) return { matched: false, reason: 'FP_SERVICE_NOT_CONFIGURED' }
  try {
    const r = await call('/match/fingerprint', { template })
    return r?.memberId
      ? { matched: true, memberId: r.memberId, confidence: r.confidence }
      : { matched: false, reason: 'FP_NOT_RECOGNISED', confidence: r?.confidence }
  } catch (err) {
    return { matched: false, reason: 'FP_SERVICE_UNAVAILABLE', error: err.message }
  }
}

// ─── ENROLLMENT (super-admin only, called from routes/biometric.js) ──────────
// These forward a raw capture to the microservice, which returns the extracted
// embedding/template as base64. We hand back Node Buffers ready for Prisma Bytes.

const b64ToBuffer = (s) => (s ? Buffer.from(s, 'base64') : null)

async function enrollFace(memberId, imageBase64) {
  if (!BASE) return { ok: false, reason: 'FACE_SERVICE_NOT_CONFIGURED' }
  try {
    const r = await call('/enroll/face', { memberId, image: imageBase64 })
    if (!r?.embedding) return { ok: false, reason: 'FACE_ENROLL_FAILED' }
    return { ok: true, faceEmbedding: b64ToBuffer(r.embedding) }
  } catch (err) {
    return { ok: false, reason: 'FACE_SERVICE_UNAVAILABLE', error: err.message }
  }
}

async function enrollFingerprint(memberId) {
  if (!BASE) return { ok: false, reason: 'FP_SERVICE_NOT_CONFIGURED' }
  try {
    const r = await call('/enroll/fingerprint', { memberId })
    if (!r?.template1) return { ok: false, reason: 'FP_ENROLL_FAILED' }
    return {
      ok: true,
      fpTemplate1: b64ToBuffer(r.template1),
      fpTemplate2: b64ToBuffer(r.template2),
    }
  } catch (err) {
    return { ok: false, reason: 'FP_SERVICE_UNAVAILABLE', error: err.message }
  }
}

module.exports = { matchFace, matchFingerprint, enrollFace, enrollFingerprint, configured: !!BASE }
