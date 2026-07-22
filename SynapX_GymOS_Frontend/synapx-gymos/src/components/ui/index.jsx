// src/components/ui/index.jsx
// SynapX GymOS — professional UI primitives (Red & White system).
import { useState } from 'react'
import { fonts } from '../../theme.js'
import { Icon } from './icons.jsx'

export { Icon } from './icons.jsx'

// ── DIVIDER ───────────────────────────────────────────────────────
// (kept as `PulseLine` for backwards-compat; now a quiet accent rule)
export const PulseLine = ({ color = '#E11D2E', width = 240, height = 3 }) => (
  <div style={{
    width: '100%', height: Math.max(2, height / 4),
    borderRadius: 2,
    background: `linear-gradient(90deg, ${color}, ${color}00)`,
  }} />
)

// ── BADGE ──────────────────────────────────────────────────────────
export const Badge = ({ status, t }) => {
  const positive = { bg: t.greenSoft,  text: t.text,   dot: t.green  } // Active / Paid / Granted
  const danger   = { bg: t.redSoft,    text: t.red,    dot: t.red    } // Expired / Overdue / Denied
  const caution  = { bg: t.orangeSoft, text: t.orange, dot: t.orange } // Pending / Full
  const neutral  = { bg: t.toggleBg,   text: t.textSub,dot: t.textMuted }

  const map = {
    Active: positive, ACTIVE: positive, Paid: positive, 'On Duty': positive,
    granted: positive, GRANTED: positive, OPEN: positive,
    Frozen: danger, FROZEN: danger, Expired: danger, EXPIRED: danger,
    Overdue: danger, OVERDUE: danger, denied: danger, DENIED: danger,
    SUSPENDED: caution, Pending: caution, PENDING: caution, FULL: caution,
    'Off Duty': neutral, CANCELLED: neutral,
  }
  const c = map[status] || neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px 3px 8px', borderRadius: 999, fontSize: 11,
      fontWeight: 600, background: c.bg, color: c.text,
      whiteSpace: 'nowrap', fontFamily: fonts.body, letterSpacing: 0.1,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />
      {status}
    </span>
  )
}

// ── AVATAR ────────────────────────────────────────────────────────
export const Avatar = ({ initials, color = '#E11D2E', size = 36 }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.32,
    background: color + '14', color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
    fontFamily: fonts.body, letterSpacing: 0.2,
    border: `1px solid ${color}22`,
  }}>
    {initials}
  </div>
)

// ── KPI CARD ──────────────────────────────────────────────────────
export const KpiCard = ({ label, value, sub, icon, color, t }) => (
  <div style={{
    background: t.card, border: `1px solid ${t.border}`,
    borderRadius: 14, padding: '18px 20px', boxShadow: t.shadow,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, color: t.textSub, fontFamily: fonts.body, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{
        width: 34, height: 34, borderRadius: 9, background: (color || t.accent) + '14',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {typeof icon === 'string'
          ? <span style={{ fontSize: 15, color: color || t.accent }}>{icon}</span>
          : icon || <span style={{ fontSize: 15, color: color || t.accent }}>◆</span>}
      </div>
    </div>
    <div style={{
      fontSize: 28, fontWeight: 700, color: t.text,
      letterSpacing: -0.6, lineHeight: 1.05,
      fontFamily: fonts.display, fontVariantNumeric: 'tabular-nums',
    }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 12, color: t.textSub, marginTop: 6, fontFamily: fonts.body }}>{sub}</div>}
  </div>
)

// ── BUTTON ────────────────────────────────────────────────────────
export const Btn = ({
  children, v, variant, t, onClick, sm, small,
  type = 'button', disabled, style: extra,
}) => {
  const [hovered, setHovered] = useState(false)
  const kind    = v || variant || 'primary'
  const compact = sm || small
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: compact ? '7px 13px' : '9px 18px',
    borderRadius: 9, fontSize: compact ? 12.5 : 13.5,
    fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: fonts.body, letterSpacing: 0.1,
    transition: 'all 0.15s ease', opacity: disabled ? 0.55 : 1,
    whiteSpace: 'nowrap',
    ...extra,
  }
  const variants = {
    primary: { background: hovered && !disabled ? t.accentHover : t.accent, color: t.accentText, border: '1px solid transparent', boxShadow: t.shadow },
    outline: { background: hovered ? t.tableRowHover : t.surface, color: t.text, border: `1px solid ${t.border}` },
    ghost:   { background: hovered ? t.toggleBg : 'transparent', color: t.textSub, border: '1px solid transparent' },
    danger:  { background: hovered ? t.accentHover : t.accent, color: '#fff', border: '1px solid transparent' },
    soft:    { background: hovered ? '#FBDDE1' : t.accentSoft, color: t.accent, border: '1px solid transparent' },
    neutral: { background: hovered ? t.tableRowHover : t.toggleBg, color: t.text, border: `1px solid ${t.border}` },
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...base, ...(variants[kind] || variants.primary) }}
    >
      {children}
    </button>
  )
}

// ── SECTION HEADER ────────────────────────────────────────────────
export const SectionHeader = ({ title, sub, action, t }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 24,
  }}>
    <div>
      <h1 style={{
        fontSize: 23, fontWeight: 700, color: t.text,
        letterSpacing: -0.5, fontFamily: fonts.display,
      }}>
        {title}
      </h1>
      {sub && <p style={{ fontSize: 13.5, color: t.textSub, marginTop: 5, fontFamily: fonts.body }}>{sub}</p>}
    </div>
    {action && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{action}</div>}
  </div>
)

// ── TOGGLE SWITCH ─────────────────────────────────────────────────
export const Toggle = ({ value, onChange, t }) => (
  <div
    onClick={() => onChange(!value)}
    style={{
      width: 40, height: 22, borderRadius: 999,
      background: value ? t.accent : t.toggleBg,
      cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
      flexShrink: 0, border: `1px solid ${value ? t.accent : t.border}`,
    }}
  >
    <div style={{
      position: 'absolute', top: 2,
      left: value ? 20 : 2, width: 16, height: 16,
      borderRadius: '50%', background: '#fff',
      transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
    }} />
  </div>
)

// ── INPUT ─────────────────────────────────────────────────────────
export const Input = ({ value, onChange, placeholder, t, style: extra, type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      padding: '10px 14px',
      background: t.inputBg,
      border: `1px solid ${t.inputBorder}`,
      borderRadius: 9, color: t.text,
      fontSize: 13.5, fontFamily: fonts.body,
      outline: 'none', width: '100%',
      ...extra,
    }}
  />
)

// ── CARD ──────────────────────────────────────────────────────────
export const Card = ({ children, t, style: extra, noPad }) => (
  <div style={{
    background: t.card,
    border: `1px solid ${t.border}`,
    borderRadius: 14,
    padding: noPad ? 0 : '20px 22px',
    overflow: noPad ? 'hidden' : undefined,
    boxShadow: t.shadow,
    ...extra,
  }}>
    {children}
  </div>
)

// ── TABLE ─────────────────────────────────────────────────────────
export const Table = ({ headers, children, t }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.body }}>
    <thead>
      <tr style={{ background: t.tableRow }}>
        {headers.map(h => (
          <th key={h} style={{
            padding: '12px 16px', textAlign: 'left',
            fontSize: 11.5, fontWeight: 600, color: t.textSub,
            borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap',
          }}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>{children}</tbody>
  </table>
)

export const Td = ({ children, style: extra }) => (
  <td style={{ padding: '12px 16px', fontSize: 13.5, ...extra }}>{children}</td>
)

// ── LIVE INDICATOR ────────────────────────────────────────────────
export const LiveIndicator = ({ label = 'Live', color, t }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
    <div className="pulse-dot" style={{
      width: 7, height: 7, borderRadius: '50%',
      background: color || t.accent,
    }} />
    <span style={{ fontSize: 11.5, color: t?.textSub || '#616570', fontWeight: 600, fontFamily: fonts.body }}>
      {label}
    </span>
  </div>
)
