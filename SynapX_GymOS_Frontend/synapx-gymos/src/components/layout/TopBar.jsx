// src/components/layout/TopBar.jsx
import { useState } from 'react'
import { Icon } from '../ui/index.jsx'
import { fonts } from '../../theme.js'
import { useNotifications, timeAgo } from '../../context/NotificationContext.jsx'

const titles = {
  dashboard:  { label: 'Dashboard',  sub: 'Overview of your gym at a glance' },
  members:    { label: 'Members',     sub: 'Manage member profiles and plans' },
  attendance: { label: 'Attendance',  sub: 'Live check-in activity' },
  classes:    { label: 'Classes',     sub: 'Schedules and bookings' },
  payments:   { label: 'Payments',    sub: 'Invoices and billing' },
  reports:    { label: 'Reports',     sub: 'Business insights and analytics' },
  staff:      { label: 'Staff',       sub: 'Team and trainers' },
  settings:   { label: 'Settings',    sub: 'Configure your workspace' },
}

const typeMeta = (t) => ({
  member:         { icon: 'userPlus',  color: t.green  },
  member_updated: { icon: 'edit',      color: t.purple },
  expiring:       { icon: 'clock',     color: t.orange },
  expired:        { icon: 'alert',     color: t.accent },
  payment:        { icon: 'card',      color: t.accent },
  payment_paid:   { icon: 'check',     color: t.green  },
  frozen:         { icon: 'snowflake', color: t.orange },
  unfrozen:       { icon: 'check',     color: t.green  },
})

function NotificationBell({ t }) {
  const { items, unread, markAllRead, clearAll } = useNotifications()
  const [open, setOpen] = useState(false)
  const meta = typeMeta(t)

  const toggle = () => setOpen(o => {
    const next = !o
    if (next && unread > 0) markAllRead()
    return next
  })

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={toggle} style={{
        width: 40, height: 40, borderRadius: 10,
        background: open ? t.tableRowHover : t.toggleBg,
        border: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'background 0.12s',
      }}>
        <Icon name="bell" size={18} color={t.textSub} />
      </div>
      {unread > 0 && (
        <span style={{
          position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18,
          padding: '0 5px', borderRadius: 999, background: t.accent, color: '#fff',
          fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center',
          justifyContent: 'center', border: `2px solid ${t.surface}`, fontFamily: fonts.body,
        }}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div style={{
            position: 'absolute', top: 50, right: 0, width: 360, maxHeight: 460,
            background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
            boxShadow: t.shadowLg, zIndex: 61, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: t.text, fontFamily: fonts.display }}>Notifications</div>
              {items.length > 0 && (
                <button onClick={clearAll} style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 12.5, cursor: 'pointer', fontFamily: fonts.body }}>
                  Clear all
                </button>
              )}
            </div>

            <div style={{ overflowY: 'auto' }}>
              {items.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: t.toggleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Icon name="bell" size={20} color={t.textMuted} />
                  </div>
                  <div style={{ fontSize: 13.5, color: t.textSub }}>You're all caught up.</div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 3 }}>New activity will show up here.</div>
                </div>
              ) : (
                items.map(n => {
                  const m = meta[n.type] || { icon: 'bell', color: t.textSub }
                  return (
                    <div key={n.id} style={{
                      display: 'flex', gap: 12, padding: '12px 16px',
                      borderBottom: `1px solid ${t.border}`,
                      background: n.read ? 'transparent' : t.accentSoft,
                    }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: m.color + '16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={m.icon} size={16} color={m.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{n.title}</div>
                        <div style={{ fontSize: 12.5, color: t.textSub, marginTop: 2, lineHeight: 1.45 }}>{n.message}</div>
                        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{timeAgo(n.time)}</div>
                      </div>
                      {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent, flexShrink: 0, marginTop: 4 }} />}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function TopBar({ page, t, onKiosk }) {
  const [search, setSearch] = useState('')
  const current = titles[page] || titles.dashboard

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: t.surface,
      borderBottom: `1px solid ${t.border}`,
      padding: '14px 28px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: 16,
    }}>
      {/* Page title */}
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color: t.text, fontFamily: fonts.display, letterSpacing: -0.3 }}>
          {current.label}
        </div>
        <div style={{ fontSize: 12.5, color: t.textMuted, fontFamily: fonts.body, marginTop: 1 }}>
          {current.sub}
        </div>
      </div>

      {/* Right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>
            <Icon name="search" size={16} color={t.textMuted} />
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              padding: '9px 14px 9px 36px',
              background: t.inputBg,
              border: `1px solid ${t.inputBorder}`,
              borderRadius: 10, color: t.text,
              fontSize: 13.5, fontFamily: fonts.body,
              width: 230, outline: 'none',
            }}
          />
        </div>

        {/* Kiosk */}
        <button onClick={onKiosk} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '9px 15px',
          background: t.accentSoft,
          border: `1px solid ${t.accent}33`,
          borderRadius: 10,
          color: t.accent,
          fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: fonts.body, whiteSpace: 'nowrap',
        }}>
          <Icon name="monitor" size={16} color={t.accent} />
          Kiosk Mode
        </button>

        {/* Notifications */}
        <NotificationBell t={t} />
      </div>
    </div>
  )
}
