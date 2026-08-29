// src/pages/Kiosk.jsx
// SynapX GymOS — Entry Kiosk / Check-in Terminal (Red & White)
// Real check-in: Face (webcam capture), Fingerprint (scanner bridge),
// QR (jsQR), and Manual code entry — all POST /attendance/checkin.
import { useState, useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'
import { startAuthentication, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser'
import { Icon } from '../components/ui/index.jsx'
import { attendanceService } from '../api/services'
import { useGymProfile } from '../context/GymProfileContext.jsx'

const DEVICE_ID = 'KIOSK-01'
const RESULT_MS = 4000

const C = {
  bg: '#F7F7F9', panel: '#FFFFFF', border: '#ECECEF', borderQ: '#F1F1F3',
  text: '#17181C', sub: '#616570', muted: '#9A9DA6', faint: '#C4C4CB',
  brand: '#E11D2E', granted: '#15803D', denied: '#E11D2E', frozen: '#6B7280',
}

const fmtTime = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
const today   = () => new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

const REASON_TEXT = {
  MEMBER_NOT_FOUND:          'Member not found. Please see reception.',
  FACE_SERVICE_NOT_CONFIGURED: 'Face recognition service is not connected.',
  FACE_SERVICE_UNAVAILABLE:  'Face recognition service is offline.',
  FACE_NOT_RECOGNISED:       'Face not recognised. Try again or use QR.',
  FP_SERVICE_NOT_CONFIGURED: 'Fingerprint scanner is not connected.',
  FP_SERVICE_UNAVAILABLE:    'Fingerprint scanner is offline.',
  FP_NOT_RECOGNISED:         'Fingerprint not recognised. Not enrolled on this device, or try again.',
  FP_CHALLENGE_EXPIRED:      'That took too long — try again.',
  FP_VERIFICATION_FAILED:    'Fingerprint verification failed. Try again.',
  NO_PLATFORM_AUTHENTICATOR: 'No fingerprint sensor / Windows Hello found on this device.',
  FP_CANCELLED:              'Cancelled.',
  NETWORK_ERROR:             'Cannot reach the server. Check the connection.',
}

const METHODS = [
  { id: 'face',        label: 'Face ID',     icon: 'scan',        api: 'FACE'        },
  { id: 'fingerprint', label: 'Fingerprint', icon: 'fingerprint', api: 'FINGERPRINT' },
  { id: 'qr',          label: 'QR Code',     icon: 'qr',          api: 'QR'          },
  { id: 'manual',      label: 'Manual',      icon: 'edit',        api: 'MANUAL'      },
]

// ── Fingerprint ring visual ──────────────────────────────────────
function Fingerprint({ active, color }) {
  return (
    <div style={{ position: 'relative', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="fingerprint" size={54} color={active ? color : color + '55'} strokeWidth={1.6} />
    </div>
  )
}

export default function Kiosk({ onExit }) {
  const { gymName, logo } = useGymProfile()
  const [method, setMethod] = useState('face')
  const [status, setStatus] = useState('idle')      // idle | scanning | result
  const [result, setResult] = useState(null)         // { result, member, reason }
  const [log, setLog]       = useState([])
  const [stats, setStats]   = useState({ total: 0, denied: 0 })
  const [clock, setClock]   = useState(fmtTime())
  const [camError, setCamError] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [fpAvailable, setFpAvailable] = useState(false)

  useEffect(() => { platformAuthenticatorIsAvailable().then(setFpAvailable).catch(() => setFpAvailable(false)) }, [])

  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const busyRef   = useRef(false)
  const timerRef  = useRef(null)
  const methodRef = useRef(method)
  const statusRef = useRef(status)
  const lastScanRef = useRef({ code: '', at: 0 })

  useEffect(() => { methodRef.current = method }, [method])
  useEffect(() => { statusRef.current = status }, [status])

  // Clock
  useEffect(() => {
    const id = setInterval(() => setClock(fmtTime()), 1000)
    return () => clearInterval(id)
  }, [])

  // Seed recent activity + today's stats
  const refreshStats = useCallback(async () => {
    try {
      const s = await attendanceService.todayStats()
      const d = s?.data ?? s
      setStats({ total: d?.total ?? 0, denied: d?.denied ?? 0 })
    } catch {}
  }, [])

  useEffect(() => {
    refreshStats()
    attendanceService.liveFeed().then(r => {
      const arr = r?.data ?? r
      if (Array.isArray(arr)) setLog(arr.slice(0, 6).map(x => ({
        name: x.memberName || 'Unknown', method: x.method,
        time: new Date(x.checkedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        ok: x.result === 'GRANTED',
      })))
    }).catch(() => {})
  }, [refreshStats])

  // ── Camera lifecycle (face + qr) ──────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCamera = useCallback(async () => {
    stopCamera()
    setCamError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
    } catch {
      setCamError('Camera unavailable — use Manual or QR code entry.')
    }
  }, [stopCamera])

  useEffect(() => {
    if (method === 'face' || method === 'qr') startCamera()
    else stopCamera()
    return () => {}
  }, [method, startCamera, stopCamera])

  useEffect(() => () => { stopCamera(); clearTimeout(timerRef.current) }, [stopCamera])

  // ── QR scanning loop (jsQR) ───────────────────────────────────
  // Decodes frames in JS so it works in every browser — including Chrome on
  // Windows, which has no native BarcodeDetector.
  useEffect(() => {
    const id = setInterval(() => {
      if (methodRef.current !== 'qr' || statusRef.current !== 'idle') return
      const v = videoRef.current, c = canvasRef.current
      if (!v || !v.videoWidth || !c) return
      c.width = v.videoWidth; c.height = v.videoHeight
      const ctx = c.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(v, 0, 0, c.width, c.height)
      const img = ctx.getImageData(0, 0, c.width, c.height)
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
      if (code?.data) handleCode(code.data.trim())
    }, 350)
    return () => clearInterval(id)
  }, []) // eslint-disable-line

  // ── Check-in ──────────────────────────────────────────────────
  const addLog = useCallback((data, apiMethod) => {
    setLog(prev => [{
      name: data.member?.fullName || 'Unknown',
      method: apiMethod,
      time: fmtTime(),
      ok: data.result === 'GRANTED',
    }, ...prev].slice(0, 6))
  }, [])

  const doCheckin = useCallback(async (payload) => {
    if (busyRef.current) return
    busyRef.current = true
    setStatus('scanning')
    let data
    try {
      const res = await attendanceService.checkIn({ deviceId: DEVICE_ID, ...payload })
      data = res?.data ?? {}
    } catch {
      data = { result: 'DENIED', reason: 'NETWORK_ERROR', member: null }
    }
    setResult(data)
    setStatus('result')
    addLog(data, payload.method)
    refreshStats()
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setStatus('idle'); setResult(null); busyRef.current = false
    }, RESULT_MS)
  }, [addLog, refreshStats])

  const handleCode = useCallback((code) => {
    const now = Date.now()
    if (lastScanRef.current.code === code && now - lastScanRef.current.at < 4500) return
    lastScanRef.current = { code, at: now }
    doCheckin({ method: 'QR', memberCode: code })
  }, [doCheckin])

  const captureFrame = () => {
    const v = videoRef.current, c = canvasRef.current
    if (!v || !c || !v.videoWidth) return null
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.7)
  }

  const scanFace = () => {
    const img = captureFrame()
    if (!img) { setCamError('Camera not ready.'); return }
    doCheckin({ method: 'FACE', faceImage: img })
  }
  // Shows a DENIED result without a round trip — for failures that happen
  // before we ever have something to send the server (cancelled prompt, no
  // sensor on this device, etc.). Mirrors doCheckin's own result/log/timer handling.
  const denyLocally = useCallback((reason, methodLabel) => {
    const data = { result: 'DENIED', reason, member: null }
    setResult(data)
    setStatus('result')
    addLog(data, methodLabel)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setStatus('idle'); setResult(null); busyRef.current = false
    }, RESULT_MS)
  }, [addLog])

  // Fingerprint via THIS device's own sensor (WebAuthn platform authenticator —
  // Windows Hello / a laptop's built-in reader). No allowCredentials is sent,
  // so the OS shows a picker of every enrolled member on this device and the
  // touch itself both identifies and verifies them.
  const scanFinger = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setStatus('scanning')
    try {
      const available = await platformAuthenticatorIsAvailable()
      if (!available) throw new Error('NO_PLATFORM_AUTHENTICATOR')

      const optsRes = await attendanceService.fingerprintOptions()
      const { requestId, options } = optsRes?.data ?? optsRes

      let assertionResponse
      try {
        assertionResponse = await startAuthentication({ optionsJSON: options })
      } catch (err) {
        throw new Error(err?.name === 'NotAllowedError' ? 'FP_CANCELLED' : 'FP_VERIFICATION_FAILED')
      }

      busyRef.current = false   // hand off to doCheckin, which owns busy/scanning from here
      doCheckin({ method: 'FINGERPRINT', requestId, assertionResponse })
    } catch (err) {
      denyLocally(err.message || 'FP_VERIFICATION_FAILED', 'FINGERPRINT')
    }
  }, [doCheckin, denyLocally])
  const submitManual = (e) => {
    e.preventDefault()
    if (!manualInput.trim()) return
    doCheckin({ method: 'MANUAL', memberCode: manualInput.trim() })
    setManualInput('')
  }

  // ── Result presentation ───────────────────────────────────────
  const res = result?.result
  const color = status !== 'result' ? C.brand
    : res === 'GRANTED' ? C.granted
    : res === 'FROZEN'  ? C.frozen : C.denied
  const label = status === 'idle' ? 'Ready to check in'
    : status === 'scanning' ? 'Checking…'
    : { GRANTED: 'Access granted', DENIED: 'Access denied', FROZEN: 'Membership frozen', EXPIRED: 'Membership expired' }[res] || 'Access denied'
  const sub = status === 'idle'
    ? { face: 'Look at the camera and tap Scan', fingerprint: 'Place finger on the scanner', qr: 'Hold your QR card up to the camera', manual: 'Enter your member code' }[method]
    : status === 'scanning' ? 'Please wait…'
    : res === 'GRANTED' ? `Welcome back, ${result?.member?.fullName?.split(' ')[0] || ''}!`
    : (REASON_TEXT[result?.reason] || 'Please see reception.')

  const showResultBadge = status === 'result'
  const camActive = method === 'face' || method === 'qr'

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", userSelect: 'none' }}>
      <style>{`
        @keyframes kpulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes scanY { 0%{top:6%;opacity:0} 15%{opacity:1} 85%{opacity:1} 100%{top:92%;opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: `1px solid ${C.border}`, background: C.panel }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, overflow: 'hidden', background: logo ? '#fff' : C.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(225,29,46,0.30)' }}>
            {logo
              ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Icon name="logo" size={21} color="#fff" strokeWidth={2} />}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: -0.3, lineHeight: 1.1 }}>{gymName || 'SynapX'}</div>
            <div style={{ fontSize: 11, color: C.muted }}>Entry Terminal · {DEVICE_ID}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: C.text, letterSpacing: -1, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{clock}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{today()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{gymName || 'FitNation Colombo'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.granted, animation: 'kpulse 1.8s ease-in-out infinite' }} />
            <span style={{ fontSize: 11.5, color: C.sub, fontWeight: 600 }}>Online</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Method selector */}
        <div style={{ width: 112, background: C.panel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '20px 0' }}>
          {METHODS.map(m => {
            const active = method === m.id
            return (
              <div key={m.id} onClick={() => { if (busyRef.current) return; setMethod(m.id); setCamError('') }}
                style={{ width: 82, padding: '13px 8px', borderRadius: 12, background: active ? C.brand + '12' : 'transparent', border: `1px solid ${active ? C.brand + '44' : C.border}`, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                  <Icon name={m.icon} size={22} color={active ? C.brand : C.faint} />
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: active ? C.brand : C.muted }}>{m.label}</div>
              </div>
            )
          })}
        </div>

        {/* Scanner */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 40px' }}>
          {/* Visual */}
          <div style={{ position: 'relative', width: 280, height: 280, borderRadius: 20, overflow: 'hidden', border: `2px solid ${color}55`, background: C.panel, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {camActive ? (
              <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', background: '#000' }} />
            ) : method === 'fingerprint' ? (
              <Fingerprint active={status === 'scanning'} color={color} />
            ) : (
              <Icon name="edit" size={64} color={color} strokeWidth={1.3} />
            )}

            {/* corner brackets */}
            {[{ top: 10, left: 10, bt: 1, bl: 1 }, { top: 10, right: 10, bt: 1, br: 1 }, { bottom: 10, left: 10, bb: 1, bl: 1 }, { bottom: 10, right: 10, bb: 1, br: 1 }].map((s, i) => (
              <div key={i} style={{ position: 'absolute', width: 26, height: 26, top: s.top, left: s.left, right: s.right, bottom: s.bottom,
                borderTop: s.bt ? `3px solid ${color}` : 'none', borderBottom: s.bb ? `3px solid ${color}` : 'none',
                borderLeft: s.bl ? `3px solid ${color}` : 'none', borderRight: s.br ? `3px solid ${color}` : 'none', borderRadius: 4 }} />
            ))}

            {/* scan line */}
            {status === 'scanning' && (
              <div style={{ position: 'absolute', left: '8%', right: '8%', height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, animation: 'scanY 1.4s linear infinite' }} />
            )}
            {/* QR reticle */}
            {method === 'qr' && status === 'idle' && (
              <div style={{ position: 'absolute', width: 150, height: 150, border: `2px dashed ${color}88`, borderRadius: 14 }} />
            )}

            {/* result overlay */}
            {showResultBadge && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${C.panel}D9`, animation: 'fadeUp 0.3s ease both' }}>
                <div style={{ width: 96, height: 96, borderRadius: '50%', background: color + '18', border: `3px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={res === 'GRANTED' ? 'check' : 'x'} size={46} color={color} strokeWidth={2.4} />
                </div>
              </div>
            )}
          </div>

          {/* Status text */}
          <div style={{ textAlign: 'center', maxWidth: 440 }} key={status + (res || '')}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 14.5, color: C.sub, lineHeight: 1.5 }}>{sub}</div>
            {camError && <div style={{ fontSize: 13, color: C.brand, marginTop: 8 }}>{camError}</div>}

            {/* member card on result */}
            {showResultBadge && result?.member && (
              <div style={{ marginTop: 18, padding: '13px 22px', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: '0 8px 24px rgba(17,18,20,0.08)', display: 'inline-flex', gap: 14, alignItems: 'center', animation: 'fadeUp 0.35s ease both' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: color + '16', border: `2px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color }}>
                  {(result.member.fullName || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{result.member.fullName}</div>
                  <div style={{ fontSize: 12.5, color: C.sub, marginTop: 2 }}>{result.member.memberCode}{result.member.plan ? ` · ${result.member.plan}` : ''}</div>
                </div>
              </div>
            )}

            {/* Action */}
            {status === 'idle' && method === 'face' && (
              <div style={{ marginTop: 22 }}>
                <button onClick={scanFace} style={primaryBtn}>Scan face</button>
              </div>
            )}
            {status === 'idle' && method === 'fingerprint' && (
              <div style={{ marginTop: 22 }}>
                <button onClick={scanFinger} style={primaryBtn}>Scan fingerprint</button>
              </div>
            )}
            {status === 'idle' && method === 'manual' && (
              <form onSubmit={submitManual} style={{ marginTop: 22, display: 'flex', gap: 8, justifyContent: 'center' }}>
                <input value={manualInput} onChange={e => setManualInput(e.target.value)} autoFocus placeholder="Member code e.g. MBR-001"
                  style={{ padding: '11px 14px', width: 240, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: C.text }} />
                <button type="submit" style={primaryBtn}>Check in</button>
              </form>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{ width: 264, background: C.panel, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, letterSpacing: 0.5, color: C.muted, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Recent activity</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.brand, animation: 'kpulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>Live feed</span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {log.length === 0 ? (
              <div style={{ padding: '30px 18px', textAlign: 'center', fontSize: 12.5, color: C.muted }}>No check-ins yet today.</div>
            ) : log.map((e, i) => (
              <div key={i} style={{ padding: '11px 18px', borderBottom: `1px solid ${C.borderQ}`, animation: i === 0 ? 'fadeUp 0.3s ease both' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1, paddingRight: 6 }}>{e.name}</div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 3, background: e.ok ? C.granted : C.denied }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 11.5, color: C.muted }}>{e.method}</div>
                  <div style={{ fontSize: 11.5, color: C.muted }}>{e.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.border}`, background: C.bg }}>
            {[{ l: "Today's check-ins", v: stats.total, c: C.text }, { l: 'Denied', v: stats.denied, c: C.denied }].map(s => (
              <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: C.sub }}>{s.l}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: s.c }}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer status */}
      <div style={{ padding: '10px 32px', borderTop: `1px solid ${C.border}`, background: C.panel, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { l: 'Camera',      ok: camActive && !camError },
            { l: 'QR scanner',  ok: true },
            { l: 'Fingerprint', ok: fpAvailable },
            { l: 'Network',     ok: true },
          ].map(s => (
            <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.ok ? C.granted : C.faint }} />
              <span style={{ fontSize: 11.5, color: C.sub }}>{s.l}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: C.muted }}>SynapX GymOS · Terminal {DEVICE_ID} · v2.0</span>
          {onExit && (
            <button onClick={onExit} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px',
              background: C.brand, border: 'none', borderRadius: 8, color: '#fff',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Icon name="x" size={14} color="#fff" /> Exit Kiosk
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const primaryBtn = {
  padding: '12px 30px', background: '#E11D2E', color: '#fff', border: 'none',
  borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit', boxShadow: '0 6px 16px rgba(225,29,46,0.28)',
}
