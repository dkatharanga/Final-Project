// src/services/webauthnService.js
// Fingerprint enrollment via the DEVICE'S OWN platform authenticator (Windows
// Hello / an ASUS laptop's built-in fingerprint sensor, Touch ID, etc.) using
// WebAuthn — not the ZKTeco desk-reader bridge in biometricService.js.
//
// The OS/browser never hands over raw fingerprint data (by design), so this
// isn't "capture a template and match it later" like the ZKTeco path. It's a
// registered public-key credential: the sensor unlocks a private key that
// stays on this device, and the server only ever sees the public key. That's
// the only thing a built-in sensor can offer to a web app.
const crypto = require('crypto')
const { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } = require('@simplewebauthn/server')
const { prisma } = require('../config/prisma')

const RP_NAME = 'SynapX GymOS'
const RP_ID   = process.env.WEBAUTHN_RP_ID || 'localhost'
const ORIGIN  = process.env.FRONTEND_URL || 'http://localhost:3000'

// Registration is a two-step challenge/response ceremony. The challenge only
// needs to survive the few seconds between "show options" and "verify" — an
// in-memory map is fine for a single-process dev/desk deployment like this.
const CHALLENGE_TTL_MS = 5 * 60 * 1000
const pending     = new Map() // memberId -> { challenge, expiresAt }     (registration)
const pendingAuth = new Map() // requestId -> { challenge, expiresAt }   (kiosk check-in)

function putChallenge(memberId, challenge) {
  pending.set(memberId, { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS })
}
function takeChallenge(memberId) {
  const entry = pending.get(memberId)
  pending.delete(memberId)
  if (!entry || entry.expiresAt < Date.now()) return null
  return entry.challenge
}

async function registrationOptions(member, existingCredentialId) {
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: member.memberCode,
    userDisplayName: member.fullName,
    userID: new TextEncoder().encode(member.id),
    attestationType: 'none',
    excludeCredentials: existingCredentialId ? [{ id: existingCredentialId }] : [],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',  // must be the device's built-in sensor, not a USB key
      residentKey: 'preferred',
      userVerification: 'required',          // forces the actual fingerprint/PIN gesture
    },
  })
  putChallenge(member.id, options.challenge)
  return options
}

async function verifyRegistration(memberId, attestationResponse) {
  const expectedChallenge = takeChallenge(memberId)
  if (!expectedChallenge) return { ok: false, reason: 'CHALLENGE_EXPIRED' }

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    })
  } catch (err) {
    return { ok: false, reason: 'VERIFICATION_FAILED', error: err.message }
  }
  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, reason: 'VERIFICATION_FAILED' }
  }

  const { credential } = verification.registrationInfo
  return {
    ok: true,
    fpCredentialId: credential.id,
    fpPublicKey: Buffer.from(credential.publicKey),
    fpCounter: credential.counter,
  }
}

// ─── KIOSK CHECK-IN (authentication ceremony — "who touched the sensor?") ────
// No allowCredentials: this lets Windows Hello show a picker of every resident
// (discoverable) credential registered for this RP on this device, so the
// kiosk can ask "who is this?" without already knowing the member.
async function authenticationOptions() {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
  })
  const requestId = crypto.randomUUID()
  pendingAuth.set(requestId, { challenge: options.challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS })
  return { requestId, options }
}

async function verifyAuthentication(requestId, assertionResponse) {
  const entry = pendingAuth.get(requestId)
  pendingAuth.delete(requestId)
  if (!entry || entry.expiresAt < Date.now()) return { ok: false, reason: 'FP_CHALLENGE_EXPIRED' }

  const credentialId = assertionResponse?.id
  if (!credentialId) return { ok: false, reason: 'FP_NOT_RECOGNISED' }

  const profile = await prisma.biometricProfile.findFirst({ where: { fpCredentialId: credentialId } })
  if (!profile) return { ok: false, reason: 'FP_NOT_RECOGNISED' }

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge: entry.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: { id: profile.fpCredentialId, publicKey: profile.fpPublicKey, counter: profile.fpCounter },
    })
  } catch (err) {
    return { ok: false, reason: 'FP_VERIFICATION_FAILED', error: err.message }
  }
  if (!verification.verified) return { ok: false, reason: 'FP_NOT_RECOGNISED' }

  // Replay protection — the authenticator's signature counter must only ever increase.
  await prisma.biometricProfile.update({
    where: { memberId: profile.memberId },
    data:  { fpCounter: verification.authenticationInfo.newCounter },
  })

  return { ok: true, memberId: profile.memberId }
}

module.exports = { registrationOptions, verifyRegistration, authenticationOptions, verifyAuthentication }
