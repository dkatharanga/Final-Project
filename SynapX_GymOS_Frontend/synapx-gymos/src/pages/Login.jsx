// src/pages/Login.jsx — Red & White professional sign-in
import { useState } from 'react'
import { Icon } from '../components/ui/index.jsx'
import { fonts } from '../theme.js'

export default function LoginPage({ t, onLogin }) {
  const [email,    setEmail]    = useState('admin@synapx.io')
  const [password, setPassword] = useState('Admin@1234')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showPw,   setShowPw]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin(email, password)
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const label = {
    display: 'block', fontSize: 12.5, fontWeight: 600,
    color: t.text, marginBottom: 7, fontFamily: fonts.body,
  }
  const input = {
    width: '100%', padding: '12px 14px',
    background: t.inputBg, border: `1px solid ${t.inputBorder}`,
    borderRadius: 10, color: t.text, fontSize: 14,
    fontFamily: fonts.body, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
      background: t.bg, fontFamily: fonts.body,
    }}>
      {/* ── LEFT — brand panel ── */}
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '48px 52px',
        background: `linear-gradient(150deg, ${t.accent} 0%, ${t.accentHover} 55%, #8E1420 100%)`,
        color: '#fff', overflow: 'hidden',
      }}>
        {/* soft glow */}
        <div style={{ position: 'absolute', top: -120, right: -120, width: 360, height: 360, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
        <div style={{ position: 'absolute', bottom: -140, left: -100, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.25)',
          }}>
            <Icon name="logo" size={23} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>SynapX GymOS</div>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.8, maxWidth: 420 }}>
            The operating system for modern gyms.
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.6, marginTop: 18, opacity: 0.92, maxWidth: 400 }}>
            Members, attendance, classes, payments and biometric check-in — managed from one clean console.
          </p>
          <div style={{ display: 'flex', gap: 26, marginTop: 34 }}>
            {[['850+', 'Members'], ['2', 'Branches'], ['99.9%', 'Uptime']].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>{n}</div>
                <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12.5, opacity: 0.8, position: 'relative' }}>
          © 2026 SynapX · FitNation Colombo
        </div>
      </div>

      {/* ── RIGHT — form ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: t.text, letterSpacing: -0.4, fontFamily: fonts.display }}>
            Welcome back
          </div>
          <div style={{ fontSize: 14, color: t.textSub, marginTop: 6, marginBottom: 28 }}>
            Sign in to your admin console.
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '11px 14px', background: t.accentSoft,
              border: `1px solid ${t.accent}33`, borderRadius: 10,
              color: t.accent, fontSize: 13, marginBottom: 20,
            }}>
              <Icon name="alert" size={16} color={t.accent} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={label}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@gym.com" style={input} />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••" style={{ ...input, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    width: 32, height: 32, background: 'transparent', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8,
                  }}>
                  <Icon name="eye" size={17} color={showPw ? t.accent : t.textMuted} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: 13,
              background: loading ? t.accentHover : t.accent,
              border: 'none', borderRadius: 10,
              color: '#fff', fontSize: 14.5, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: fonts.body,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 6px 16px rgba(225,29,46,0.28)',
            }}>
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <Icon name="chevronRight" size={18} color="#fff" />}
            </button>
          </form>

          <div style={{
            marginTop: 22, padding: '12px 14px',
            background: t.tableRow, borderRadius: 10, border: `1px solid ${t.border}`,
          }}>
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Demo credentials
            </div>
            <div style={{ fontSize: 13, color: t.textSub }}>
              admin@synapx.io &nbsp;·&nbsp; Admin@1234
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: t.textMuted }}>
            SynapX GymOS v2.0
          </div>
        </div>
      </div>
    </div>
  )
}