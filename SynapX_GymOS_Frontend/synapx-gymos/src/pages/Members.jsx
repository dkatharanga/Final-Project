// src/pages/Members.jsx — Complete Fixed Version
import { useState, useEffect, useRef, useMemo } from 'react'
import { memberService, biometricService } from '../api/services'
import { qrMatrix, qrPngDataUrl } from '../utils/qr'
import { printBill } from '../utils/bill'
import { useCurrency } from '../context/CurrencyContext.jsx'
import { useGymProfile } from '../context/GymProfileContext.jsx'
import { usePaginated } from '../hooks/useApi'
import { Card, Btn, Avatar, Icon } from '../components/ui/index.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'

const AV_COLORS = ['#E11D2E','#3F4350','#9B1C2E','#6B7280','#C4142B']

// ── STATUS BADGE ─────────────────────────────────────────────────
function StatusBadge({ status, t }) {
  const map = {
    ACTIVE:    { bg: t.greenSoft,  c: t.green  },
    FROZEN:    { bg: t.accentSoft, c: t.accent },
    EXPIRED:   { bg: t.redSoft,    c: t.red    },
    SUSPENDED: { bg: t.orangeSoft, c: t.orange },
    CANCELLED: { bg: t.toggleBg,   c: t.textSub},
  }
  const x = map[status] || map.CANCELLED
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 4,
      fontSize: 10, fontWeight: 700,
      letterSpacing: 1, background: x.bg,
      color: x.c, textTransform: 'uppercase',
    }}>
      {status}
    </span>
  )
}

// ── QR CODE BLOCK ────────────────────────────────────────────────
// Renders the member code as a scannable QR (the kiosk reads this same code).
// Self-contained SVG — no external dependency.
function QRBlock({ value }) {
  const svg = useMemo(() => {
    let m
    try { m = qrMatrix(value) } catch { return null }
    const n = m.length, quiet = 4, dim = n + quiet * 2
    let rects = ''
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (m[r][c]) rects += `<rect x="${c + quiet}" y="${r + quiet}" width="1" height="1"/>`
    return { dim, rects }
  }, [value])

  if (!svg) {
    return (
      <div style={{ width: 148, height: 148, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ECECEF', borderRadius: 10, fontFamily: 'monospace', fontWeight: 800, color: '#17181C' }}>
        {value}
      </div>
    )
  }
  return (
    <div style={{ padding: 10, background: '#FFFFFF', borderRadius: 10, display: 'inline-flex', border: '1px solid #ECECEF' }}>
      <svg width={148} height={148} viewBox={`0 0 ${svg.dim} ${svg.dim}`} shapeRendering="crispEdges" role="img" aria-label={`QR code ${value}`}>
        <rect width={svg.dim} height={svg.dim} fill="#FFFFFF" />
        <g fill="#17181C" dangerouslySetInnerHTML={{ __html: svg.rects }} />
      </svg>
    </div>
  )
}

// ── ENROLLMENT STEP ──────────────────────────────────────────────
// Shown after a member is created. Face is captured from the reception webcam;
// fingerprint is captured by the bridge's own reader (browser just triggers it);
// QR is the member code, ready immediately.
function EnrollStep({ member, payment, t, onFinish }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [camOn,   setCamOn]   = useState(false)
  const [camError, setCamError] = useState('')
  const [busy,    setBusy]    = useState('')                 // 'face' | 'fp'
  const [done,    setDone]    = useState({ face: false, fp: false })
  const [msg,     setMsg]     = useState(null)               // { ok: bool, text }
  const notify = useNotifications()
  const { gymName, logo } = useGymProfile()

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(tr => tr.stop()); streamRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
    setCamOn(false)
  }
  const startCamera = async () => {
    setCamError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } }, audio: false })
      streamRef.current = s
      setCamOn(true)   // mounts <video>; the effect below binds the stream once it exists
    } catch (err) {
      setCamError(err?.name === 'NotAllowedError' ? 'Camera permission denied — allow it in the browser.' : 'Camera unavailable on this device.')
    }
  }

  // Bind the stream to the <video> only after it has mounted (camOn === true).
  useEffect(() => {
    if (camOn && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [camOn])

  useEffect(() => () => stopCamera(), [])

  const friendly = (err) => {
    if (err.status === 403) return 'Only a super admin can enroll biometrics.'
    const m = err.message || ''
    if (m.includes('NOT_CONFIGURED') || m.includes('UNAVAILABLE')) return 'Biometric service not connected — enroll later from the member page.'
    if (m.includes('FACE_ENROLL_FAILED')) return 'No face detected — move into frame and retake.'
    if (m.includes('FP_ENROLL_FAILED'))   return 'Fingerprint scan failed — try again.'
    return m || 'Enrollment failed.'
  }

  const captureFrame = () => {
    const v = videoRef.current, c = canvasRef.current
    if (!v || !c || !v.videoWidth) return null
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.7)
  }

  const doFace = async () => {
    const img = captureFrame()
    if (!img) {
      setMsg({ ok: false, text: camOn ? 'Camera still starting — try again in a moment.' : 'Start the camera first.' })
      return
    }
    setBusy('face'); setMsg(null)
    try {
      const r = await biometricService.enrollFace(member.id, img)
      setDone(d => ({ ...d, face: true }))
      setMsg({ ok: true, text: r?.data?.note || 'Face ID enrolled.' })
      notify.add({ type: 'member', title: 'Face ID enrolled', message: `Face saved for ${member.fullName}.` })
      stopCamera()
    } catch (err) { setMsg({ ok: false, text: friendly(err) }) }
    finally { setBusy('') }
  }

  const doFinger = async () => {
    setBusy('fp'); setMsg(null)
    try {
      const r = await biometricService.enrollFinger(member.id)
      setDone(d => ({ ...d, fp: true }))
      setMsg({ ok: true, text: r?.data?.note || 'Fingerprint enrolled.' })
      notify.add({ type: 'member', title: 'Fingerprint enrolled', message: `Fingerprint saved for ${member.fullName}.` })
    } catch (err) { setMsg({ ok: false, text: friendly(err) }) }
    finally { setBusy('') }
  }

  const downloadQR = () => {
    const url = qrPngDataUrl(member.memberCode, { scale: 14 })
    const a = document.createElement('a')
    a.href = url
    a.download = `${member.memberCode}-qr.png`
    document.body.appendChild(a); a.click(); a.remove()
  }

  const cardStyle = { border: `1px solid ${t.border}`, borderRadius: 12, padding: 16, background: t.inputBg }
  const miniBtn = {
    padding: '7px 12px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.toggleBg,
    color: t.text, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }
  const capBtn = (disabled) => ({
    padding: '9px 16px', borderRadius: 8, border: 'none', fontFamily: 'inherit',
    fontSize: 12.5, fontWeight: 700, color: '#fff',
    background: disabled ? t.accentHover : t.accent, cursor: disabled ? 'not-allowed' : 'pointer',
  })
  const Tick = ({ label }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: t.green, background: t.greenSoft, padding: '4px 9px', borderRadius: 6 }}>
      <Icon name="check" size={13} color={t.green} /> {label}
    </span>
  )

  return (
    <div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Member created banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: t.greenSoft, border: `1px solid ${t.border}`, borderRadius: 10, marginBottom: 18 }}>
        <Icon name="check" size={16} color={t.green} />
        <span style={{ fontSize: 12.5, color: t.text, fontWeight: 600 }}>
          {member.fullName} created · <span style={{ fontFamily: 'monospace' }}>{member.memberCode}</span>. Enroll credentials below.
        </span>
      </div>

      {msg && (
        <div style={{ padding: '9px 13px', borderRadius: 8, fontSize: 12, marginBottom: 16, fontWeight: 600,
          background: msg.ok ? t.greenSoft : t.redSoft, color: msg.ok ? t.green : t.red, border: `1px solid ${(msg.ok ? t.green : t.red)}25` }}>
          {msg.ok ? '✓ ' : '⚠ '}{msg.text}
        </div>
      )}

      {/* QR */}
      <div style={{ ...cardStyle, display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14 }}>
        <QRBlock value={member.memberCode} t={t} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>QR Code</div>
            <Tick label="Ready" />
          </div>
          <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.5, marginBottom: 12 }}>
            Auto-generated from the member code. Save it or print the bill to hand to the member.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={downloadQR} style={miniBtn}>⤓ Download QR</button>
            {payment && (
              <button type="button" onClick={() => printBill({ member, payment, gym: gymName, logo })} style={miniBtn}>🖶 Print bill</button>
            )}
          </div>
        </div>
      </div>

      {/* Face */}
      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>Face ID</div>
            {done.face && <Tick label="Enrolled" />}
          </div>
          {!done.face && (
            <button type="button" onClick={camOn ? stopCamera : startCamera}
              style={{ padding: '7px 13px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.toggleBg, color: t.textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {camOn ? 'Stop camera' : 'Start camera'}
            </button>
          )}
        </div>
        {!done.face && (
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 132, height: 100, borderRadius: 10, overflow: 'hidden', background: '#000', border: `1px solid ${t.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {camOn
                ? <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                : <Icon name="scan" size={34} color={t.textMuted} />}
            </div>
            <div>
              <button type="button" onClick={doFace} disabled={!camOn || busy === 'face'} style={capBtn(!camOn || busy === 'face')}>
                {busy === 'face' ? 'Enrolling…' : 'Capture face'}
              </button>
              {camError && <div style={{ fontSize: 11, color: t.red, marginTop: 8 }}>{camError}</div>}
              {!camError && <div style={{ fontSize: 11, color: t.textSub, marginTop: 8, maxWidth: 200 }}>Look at the camera, then capture a clear front-facing photo.</div>}
            </div>
          </div>
        )}
      </div>

      {/* Fingerprint */}
      <div style={{ ...cardStyle, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="fingerprint" size={28} color={done.fp ? t.green : t.accent} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>Fingerprint</div>
              {done.fp && <Tick label="Enrolled" />}
            </div>
            <div style={{ fontSize: 11.5, color: t.textSub, marginTop: 2 }}>Captured on the connected reader at the desk.</div>
          </div>
        </div>
        {!done.fp && (
          <button type="button" onClick={doFinger} disabled={busy === 'fp'} style={capBtn(busy === 'fp')}>
            {busy === 'fp' ? 'Scanning…' : 'Scan fingerprint'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn v="primary" t={t} onClick={() => { stopCamera(); onFinish() }}>
          {done.face || done.fp ? 'Done' : 'Skip & finish'}
        </Btn>
      </div>
    </div>
  )
}

// ── ADD MEMBER MODAL (2-step wizard) ─────────────────────────────
function AddMemberModal({ t, onClose, onSave }) {
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    gender: '', address: '',
    plan: 'Monthly', customDays: '', customPrice: '',
    admissionFee: '', paymentMethod: 'CASH',
  })
  const [step,    setStep]    = useState('details')   // 'details' | 'enroll'
  const [created, setCreated] = useState(null)        // member returned from create
  const [payment, setPayment] = useState(null)        // admission-fee payment, if any
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const notify = useNotifications()
  const { currency, fmt } = useCurrency()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Client-side validation (backend validates too).
    if (!form.fullName.trim()) { setError('Full name is required.'); return }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Enter a valid email address.'); return }
    if (form.phone && !/^[+\d][\d\s()-]{5,19}$/.test(form.phone.trim())) { setError('Enter a valid phone number.'); return }
    if (form.admissionFee && Number(form.admissionFee) < 0) { setError('Admission fee must be a positive number.'); return }
    if (form.plan === 'Custom' && form.customDays && Number(form.customDays) < 1) { setError('Plan duration must be at least 1 day.'); return }
    setLoading(true)
    setError('')
    try {
      const res    = await memberService.create({ ...form, currency })
      const member = res?.data ?? res
      notify.add({ type: 'member', title: 'New member added', message: `${form.fullName} was added to your members.` })
      if (res?.payment) {
        notify.add({ type: 'payment', title: 'Admission fee recorded', message: `${fmt(res.payment.amount, 2)} — invoice ${res.payment.invoiceNo}.` })
      }
      if (onSave) await onSave()          // refresh the list behind the modal
      setCreated(member)
      setPayment(res?.payment ?? null)
      setStep('enroll')                   // advance to biometric + QR enrollment
    } catch (err) {
      console.error('Create error:', err)
      setError(err.message || 'Failed to create member.')
    } finally {
      setLoading(false)
    }
  }

  const finish = () => { onSave?.(); onClose() }

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    background: t.inputBg,
    border: `1px solid ${t.inputBorder}`,
    borderRadius: 8, color: t.text,
    fontSize: 13, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block', fontSize: 11,
    fontWeight: 700, color: t.textSub,
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 7,
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={step === 'details' ? onClose : finish}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 300,
        }}
      />

      {/* Scroll container */}
      <div style={{
        position: 'fixed', inset: 0,
        zIndex: 301,
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 16px 60px',
      }}>
        {/* Modal card */}
        <div style={{
          width: '100%', maxWidth: 500,
          background: t.surface,
          borderRadius: 16,
          border: `1px solid ${t.border}`,
          padding: 32,
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
          position: 'relative',
        }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: t.text }}>
                Add New Member
              </div>
              <div style={{ fontSize: 12, color: t.textSub, marginTop: 3 }}>
                {step === 'details' ? 'Step 1 of 2 · Member details' : 'Step 2 of 2 · Face, fingerprint & QR'}
              </div>
            </div>
            <button onClick={step === 'details' ? onClose : finish} style={{
              width: 32, height: 32,
              background: t.toggleBg,
              border: `1px solid ${t.border}`,
              borderRadius: 8, color: t.textSub,
              cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}>✕</button>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
            {['details', 'enroll'].map((s, i) => (
              <div key={s} style={{ flex: 1, height: 4, borderRadius: 2,
                background: (step === 'enroll' || i === 0) ? t.accent : t.border }} />
            ))}
          </div>

          {step === 'enroll' && created ? (
            <EnrollStep member={created} payment={payment} t={t} onFinish={finish} />
          ) : (
          <>
          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', background: t.redSoft,
              border: `1px solid ${t.red}30`,
              borderRadius: 8, color: t.red,
              fontSize: 12, marginBottom: 20,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>

            {/* Full Name */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Full Name *</label>
              <input
                name="fullName" value={form.fullName}
                onChange={handleChange}
                placeholder="e.g. Ashan Perera"
                required style={inputStyle}
              />
            </div>

            {/* Email + Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  name="email" type="email"
                  value={form.email} onChange={handleChange}
                  placeholder="email@example.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input
                  name="phone" value={form.phone}
                  onChange={handleChange}
                  placeholder="+94 77 123 4567"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Gender */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Gender</label>
              <select
                name="gender" value={form.gender}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Address */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Address</label>
              <textarea
                name="address" value={form.address}
                onChange={handleChange}
                placeholder="123 Galle Road, Colombo 03"
                rows={3}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>

            {/* Membership plan → creates an active membership (shows in the table) */}
            <div style={{ marginBottom: form.plan === 'Custom' ? 14 : 18 }}>
              <label style={labelStyle}>Membership Plan</label>
              <select name="plan" value={form.plan} onChange={handleChange} style={inputStyle}>
                <option value="Monthly">Monthly (30 days)</option>
                <option value="Quarterly">Quarterly (90 days)</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            {form.plan === 'Custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={labelStyle}>Duration (days)</label>
                  <input
                    name="customDays" type="number" min="1" step="1"
                    value={form.customDays} onChange={handleChange}
                    placeholder="e.g. 45" style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Plan Price</label>
                  <input
                    name="customPrice" type="number" min="0" step="0.01"
                    value={form.customPrice} onChange={handleChange}
                    placeholder="e.g. 90.00" style={inputStyle}
                  />
                </div>
              </div>
            )}

            {/* Admission fee + method → recorded as a payment */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
              <div>
                <label style={labelStyle}>Admission Fee</label>
                <input
                  name="admissionFee" type="number" min="0" step="0.01"
                  value={form.admissionFee} onChange={handleChange}
                  placeholder="e.g. 25.00"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Payment Method</label>
                <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} style={inputStyle}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="ONLINE">Online</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1', fontSize: 11, color: t.textSub, marginTop: -6 }}>
                Leave the fee blank to skip. Any amount is added to Payments & Billing, and you can print a bill on the next step.
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={{
                padding: '11px 22px',
                background: t.toggleBg,
                border: `1px solid ${t.border}`,
                borderRadius: 8, color: t.textSub,
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Cancel
              </button>
              <button type="submit" disabled={loading} style={{
                padding: '11px 28px',
                background: loading ? t.accentHover : t.accent,
                border: 'none', borderRadius: 8,
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}>
                {loading ? 'Saving...' : 'Continue → Enrollment'}
              </button>
            </div>
          </form>
          </>
          )}
        </div>
      </div>
    </>
  )
}

// ── EDIT MEMBER MODAL ────────────────────────────────────────────
function EditMemberModal({ t, member, onClose, onSaved }) {
  const [form, setForm] = useState({
    fullName: member.fullName || '',
    email:    member.email    || '',
    phone:    member.phone    || '',
    gender:   member.gender   || '',
    address:  member.address  || '',
    status:   member.status   || 'ACTIVE',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const notify = useNotifications()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim()) { setError('Full name is required.'); return }
    setLoading(true)
    setError('')
    try {
      await memberService.update(member.id, form)
      setSuccess(true)
      notify.add({ type: 'member_updated', title: 'Member updated', message: `${form.fullName}'s details were updated.` })
      if (onSaved) await onSaved()
      setTimeout(() => { setSuccess(false); onClose() }, 1100)
    } catch (err) {
      setError(err.message || 'Failed to update member.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', background: t.inputBg,
    border: `1px solid ${t.inputBorder}`, borderRadius: 10, color: t.text,
    fontSize: 13.5, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { display: 'block', fontSize: 12.5, fontWeight: 600, color: t.text, marginBottom: 7 }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(23,24,28,0.45)', zIndex: 300, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 301, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 16px' }}>
        <div style={{ width: '100%', maxWidth: 500, background: t.surface, borderRadius: 16, border: `1px solid ${t.border}`, padding: 30, boxShadow: t.shadowLg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: -0.3 }}>Edit member</div>
              <div style={{ fontSize: 13, color: t.textSub, marginTop: 3 }}>{member.memberCode}</div>
            </div>
            <button onClick={onClose} style={{ width: 34, height: 34, background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={17} color={t.textSub} />
            </button>
          </div>

          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: t.greenSoft, border: `1px solid ${t.border}`, borderRadius: 10, color: t.text, fontSize: 13, marginBottom: 18, fontWeight: 600 }}>
              <Icon name="check" size={16} color={t.green} /> Changes saved.
            </div>
          )}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: t.redSoft, border: `1px solid ${t.red}30`, borderRadius: 10, color: t.red, fontSize: 13, marginBottom: 18 }}>
              <Icon name="alert" size={16} color={t.red} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Full name *</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} required style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="+94 77 123 4567" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Gender</label>
                <select name="gender" value={form.gender} onChange={handleChange} style={inputStyle}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
                  <option value="ACTIVE">Active</option>
                  <option value="FROZEN">Frozen</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Address</label>
              <textarea name="address" value={form.address} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn v="outline" t={t} onClick={onClose}>Cancel</Btn>
              <Btn v="primary" t={t} type="submit" disabled={loading || success}>
                {success ? 'Saved' : loading ? 'Saving…' : 'Save changes'}
              </Btn>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// ── MEMBER DETAIL DRAWER ─────────────────────────────────────────
function MemberDrawer({ member, t, onClose, onDelete }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
      <div onClick={onClose} style={{ flex: 1, background: '#00000060' }} />
      <div style={{
        width: 380, background: t.surface,
        borderLeft: `1px solid ${t.border}`,
        overflowY: 'auto', padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: t.text }}>Member Details</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textSub, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 24 }}>
          <Avatar
            initials={member.fullName.split(' ').map(n => n[0]).join('').slice(0,2)}
            color={t.accent} size={54}
          />
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: t.text }}>{member.fullName}</div>
            <div style={{ fontSize: 11, color: t.textSub, marginTop: 2, fontFamily: 'monospace' }}>{member.memberCode}</div>
            <div style={{ marginTop: 6 }}><StatusBadge status={member.status} t={t} /></div>
          </div>
        </div>

        <div style={{ height: 1, background: t.border, marginBottom: 20 }} />

        {[
          { label: 'Email',   value: member.email   || '—', icon: '✉' },
          { label: 'Phone',   value: member.phone   || '—', icon: '📞' },
          { label: 'Gender',  value: member.gender  || '—', icon: '👤' },
          { label: 'Address', value: member.address || '—', icon: '📍' },
          { label: 'Joined',  value: new Date(member.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), icon: '📅' },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: t.toggleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: 10, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, color: t.text }}>{value}</div>
            </div>
          </div>
        ))}

        {member.memberships?.[0] ? (
          <div style={{ background: t.accentSoft, border: `1px solid ${t.accent}30`, borderRadius: 10, padding: '14px 16px', marginTop: 8 }}>
            <div style={{ fontSize: 10, color: t.accent, fontWeight: 700, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>✓ Active Membership</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: t.text }}>{member.memberships[0].plan?.name || '—'}</div>
            <div style={{ fontSize: 11, color: t.textSub, marginTop: 4 }}>
              Expires: {new Date(member.memberships[0].endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        ) : (
          <div style={{ background: t.orangeSoft, border: `1px solid ${t.orange}30`, borderRadius: 10, padding: '14px 16px', marginTop: 8 }}>
            <div style={{ fontSize: 12, color: t.orange, fontWeight: 600 }}>⚠ No active membership assigned</div>
          </div>
        )}

        {onDelete && (
          <>
            <div style={{ height: 1, background: t.border, margin: '22px 0 16px' }} />
            <button onClick={onDelete}
              style={{ width: '100%', padding: '11px', background: t.redSoft, border: `1px solid ${t.red}44`, borderRadius: 10, color: t.red, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="trash" size={15} color={t.red} /> Delete member
            </button>
            <div style={{ fontSize: 11, color: t.textMuted, textAlign: 'center', marginTop: 8 }}>Super admin only · removes all records</div>
          </>
        )}
      </div>
    </div>
  )
}

// ── RENEW MODAL ──────────────────────────────────────────────────
// For expired/cancelled members: records a renewal payment, starts a fresh
// active membership and reactivates the member.
function RenewModal({ t, member, onClose, onDone }) {
  const { currency, fmt } = useCurrency()
  const [plan,       setPlan]       = useState('Monthly')
  const [method,     setMethod]     = useState('CASH')
  const [customDays, setCustomDays] = useState('')
  const [fee,        setFee]        = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const notify = useNotifications()

  // Suggest the plan's usual price when the plan changes, but staff enter/adjust
  // the actual renewal fee.
  const SUGGESTED = { Monthly: 65, Quarterly: 165 }
  useEffect(() => { setFee(SUGGESTED[plan] != null ? String(SUGGESTED[plan]) : '') }, [plan])

  const inputStyle = {
    width: '100%', padding: '11px 14px', background: t.inputBg,
    border: `1px solid ${t.inputBorder}`, borderRadius: 8, color: t.text,
    fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: t.textSub, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 }

  const submit = async (e) => {
    e.preventDefault()
    const feeNum = Number(fee)
    if (!Number.isFinite(feeNum) || feeNum < 0) { setError('Enter a valid renewal fee.'); return }
    setLoading(true); setError('')
    try {
      const res = await memberService.renew(member.id, { plan, method, currency, customDays, customPrice: fee, amount: fee })
      notify.add({ type: 'payment', title: 'Membership renewed', message: `${member.fullName} renewed on the ${plan} plan — ${fmt(res?.payment?.amount ?? feeNum, 2)} (${res?.payment?.invoiceNo || ''}).` })
      if (onDone) await onDone()
      onClose()
    } catch (err) {
      setError(err.message || 'Renewal failed.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 301, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 440, background: t.surface, borderRadius: 16, border: `1px solid ${t.border}`, padding: 28, boxShadow: '0 25px 80px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: t.text }}>Renew membership</div>
              <div style={{ fontSize: 12.5, color: t.textSub, marginTop: 3 }}>{member.fullName} · <span style={{ fontFamily: 'monospace' }}>{member.memberCode}</span></div>
            </div>
            <button type="button" onClick={onClose} style={{ width: 32, height: 32, background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textSub, cursor: 'pointer' }}>
              <Icon name="x" size={16} color={t.textSub} />
            </button>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: t.redSoft, border: `1px solid ${t.red}30`, borderRadius: 8, color: t.red, fontSize: 12, marginBottom: 16 }}>⚠ {error}</div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Plan</label>
            <select value={plan} onChange={e => setPlan(e.target.value)} style={inputStyle}>
              <option value="Monthly">Monthly (30 days)</option>
              <option value="Quarterly">Quarterly (90 days)</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          {plan === 'Custom' && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Duration (days)</label>
              <input type="number" min="1" value={customDays} onChange={e => setCustomDays(e.target.value)} placeholder="e.g. 45" style={inputStyle} />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Renewal fee ({currency})</label>
            <input
              type="number" min="0" step="0.01" required
              value={fee} onChange={e => setFee(e.target.value)}
              placeholder="Enter renewal fee"
              style={{ ...inputStyle, fontSize: 16, fontWeight: 700 }}
            />
            <div style={{ fontSize: 11, color: t.textSub, marginTop: 6 }}>
              Suggested from the plan — adjust as needed. This amount is charged and recorded in Payments.
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Payment method</label>
            <select value={method} onChange={e => setMethod(e.target.value)} style={inputStyle}>
              <option value="CASH">Cash (paid now)</option>
              <option value="CARD">Card</option>
              <option value="ONLINE">Online</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn v="outline" t={t} onClick={onClose} type="button">Cancel</Btn>
            <Btn v="primary" t={t} type="submit" disabled={loading}>{loading ? 'Renewing…' : 'Renew & record payment'}</Btn>
          </div>
        </form>
      </div>
    </>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────
export default function MembersPage({ t, user }) {
  const [selected, setSelected] = useState(null)
  const [showAdd,  setShowAdd]  = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [deleting, setDeleting] = useState(null)   // member pending delete confirm
  const [delBusy,  setDelBusy]  = useState(false)
  const [renewing, setRenewing] = useState(null)   // member pending renewal
  const notify = useNotifications()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  const {
    items, pagination, loading, error, refetch,
    search, setSearch, filter, setFilter,
    page,   setPage,
  } = usePaginated((params) => memberService.list(params))

  const handleFreeze = async (member) => {
    const until = prompt('Freeze until (YYYY-MM-DD):')
    if (!until) return
    try {
      await memberService.freeze(member.id, { frozenUntil: until })
      notify.add({ type: 'frozen', title: 'Membership frozen', message: `${member.fullName}'s membership was frozen until ${until}.` })
      refetch()
    } catch (err) { alert(err.message) }
  }

  const handleUnfreeze = async (member) => {
    try {
      await memberService.unfreeze(member.id)
      notify.add({ type: 'unfrozen', title: 'Membership reactivated', message: `${member.fullName}'s membership was unfrozen.` })
      refetch()
    } catch (err) { alert(err.message) }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDelBusy(true)
    try {
      await memberService.remove(deleting.id)
      notify.add({ type: 'member', title: 'Member deleted', message: `${deleting.fullName} and their records were removed.` })
      setDeleting(null)
      setSelected(null)
      refetch()
    } catch (err) {
      alert(err.status === 403 ? 'Only a super admin can delete members.' : (err.message || 'Delete failed.'))
    } finally { setDelBusy(false) }
  }

  return (
    <div className="fade-in">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: t.text }}>Member Management</h2>
          <p style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>{pagination.total ?? 0} total members</p>
        </div>
        {isAdmin && <Btn t={t} sm onClick={() => setShowAdd(true)}>+ New Member</Btn>}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name, email, ID..."
            style={{ padding: '8px 14px 8px 32px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, color: t.text, fontSize: 12, fontFamily: 'inherit', width: 240, outline: 'none' }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: t.textMuted }}>⌕</span>
        </div>

        {['All', 'ACTIVE', 'FROZEN', 'EXPIRED'].map(f => (
          <button key={f}
            onClick={() => { setFilter(f === 'All' ? {} : { status: f }); setPage(1) }}
            style={{
              padding: '7px 14px', borderRadius: 7, fontFamily: 'inherit',
              border: `1px solid ${(filter.status === f || (f === 'All' && !filter.status)) ? t.accent : t.border}`,
              background: (filter.status === f || (f === 'All' && !filter.status)) ? t.accentSoft : 'transparent',
              color: (filter.status === f || (f === 'All' && !filter.status)) ? t.accent : t.textSub,
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >{f}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: t.textSub }}>{pagination.total ?? 0} results</span>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', background: t.redSoft, border: `1px solid ${t.red}30`, borderRadius: 8, color: t.red, fontSize: 13, marginBottom: 16 }}>
          ⚠ {error} — <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={refetch}>retry</span>
        </div>
      )}

      {/* Table */}
      <Card t={t} noPad>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: t.bg }}>
              {['Member', 'ID', 'Plan', 'Status', 'Joined', 'Expiry', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.textSub, letterSpacing: 1.5, textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? t.tableRow : t.card }}>
                  {Array(7).fill(0).map((_, j) => (
                    <td key={j} style={{ padding: '12px 14px' }}>
                      <div style={{ height: 14, background: t.border, borderRadius: 4, width: '70%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '50px 14px', textAlign: 'center', color: t.textSub, fontSize: 13 }}>
                  No members found.{isAdmin && ' '}
                  {isAdmin && (
                    <span style={{ color: t.accent, cursor: 'pointer', fontWeight: 600 }} onClick={() => setShowAdd(true)}>
                      Add your first member →
                    </span>
                  )}
                </td>
              </tr>
            ) : (
              items.map((m, i) => {
                const plan    = m.memberships?.[0]?.plan?.name || '—'
                const expiry  = m.memberships?.[0]?.endDate
                const initials = m.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <tr key={m.id} style={{ background: i % 2 === 0 ? t.tableRow : t.card }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Avatar initials={initials} color={AV_COLORS[i % AV_COLORS.length]} size={34} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{m.fullName}</div>
                          <div style={{ fontSize: 10, color: t.textSub }}>{m.email || m.phone || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 11, color: t.textSub, fontFamily: 'monospace' }}>{m.memberCode}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: t.text }}>{plan}</td>
                    <td style={{ padding: '11px 14px' }}><StatusBadge status={m.status} t={t} /></td>
                    <td style={{ padding: '11px 14px', fontSize: 11, color: t.textSub }}>
                      {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 11, color: t.textSub }}>
                      {expiry ? new Date(expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <Btn v="ghost" t={t} sm onClick={() => setSelected(m)}>View</Btn>
                        {isAdmin && <Btn v="outline" t={t} sm onClick={() => setEditing(m)}>Edit</Btn>}
                        {isAdmin && m.status === 'ACTIVE' && <Btn v="outline" t={t} sm onClick={() => handleFreeze(m)}>Freeze</Btn>}
                        {isAdmin && m.status === 'FROZEN' && <Btn v="outline" t={t} sm onClick={() => handleUnfreeze(m)}>Unfreeze</Btn>}
                        {isAdmin && (m.status === 'EXPIRED' || m.status === 'CANCELLED') && <Btn v="primary" t={t} sm onClick={() => setRenewing(m)}>Renew</Btn>}
                        {isAdmin && (
                          <button onClick={() => setDeleting(m)} title="Delete member"
                            style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${t.red}55`, background: t.redSoft, color: t.red, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '14px 0', borderTop: `1px solid ${t.border}` }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev}
              style={{ padding: '5px 14px', background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 6, color: t.textSub, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Prev
            </button>
            <span style={{ fontSize: 12, color: t.textSub }}>Page {pagination.page} of {pagination.totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext}
              style={{ padding: '5px 14px', background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 6, color: t.textSub, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Next →
            </button>
          </div>
        )}
      </Card>

      {/* Member Detail Drawer */}
      {selected && <MemberDrawer member={selected} t={t} onClose={() => setSelected(null)} onDelete={isAdmin ? () => setDeleting(selected) : null} />}

      {/* Edit Member Modal */}
      {editing && (
        <EditMemberModal
          t={t}
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { await refetch() }}
        />
      )}

      {/* Add Member Modal */}
      {showAdd && (
        <AddMemberModal
          t={t}
          onClose={() => {
            setShowAdd(false)
            refetch()
          }}
          onSave={async () => {
            await refetch()
          }}
        />
      )}

      {/* Renew membership */}
      {renewing && (
        <RenewModal t={t} member={renewing} onClose={() => setRenewing(null)} onDone={refetch} />
      )}

      {/* Delete confirmation (super admin only) */}
      {deleting && (
        <>
          <div onClick={() => !delBusy && setDeleting(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400 }} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 401, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ width: '100%', maxWidth: 420, background: t.surface, borderRadius: 16, border: `1px solid ${t.border}`, padding: 28, boxShadow: '0 25px 80px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: t.redSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="alert" size={20} color={t.red} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>Delete member?</div>
              </div>
              <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6, marginBottom: 22 }}>
                This permanently removes <b style={{ color: t.text }}>{deleting.fullName}</b> ({deleting.memberCode}) along with their payments, bookings, memberships and biometric enrollment. This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setDeleting(null)} disabled={delBusy} style={{ padding: '10px 20px', background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={handleDelete} disabled={delBusy} style={{ padding: '10px 22px', background: t.red, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: delBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {delBusy ? 'Deleting…' : 'Delete member'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}