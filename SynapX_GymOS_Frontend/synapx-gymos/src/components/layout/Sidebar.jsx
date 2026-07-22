// src/components/layout/Sidebar.jsx
import { useState } from 'react'
import { Avatar, Icon } from '../ui/index.jsx'
import { fonts } from '../../theme.js'
import { useGymProfile } from '../../context/GymProfileContext.jsx'

const navItems = [
  { id: 'dashboard',  label: 'Dashboard',  icon: 'dashboard' },
  { id: 'members',    label: 'Members',     icon: 'users'     },
  { id: 'attendance', label: 'Attendance',  icon: 'scan', badge: 'live' },
  { id: 'classes',    label: 'Classes',     icon: 'calendar'  },
  { id: 'payments',   label: 'Payments',    icon: 'card'      },
  { id: 'reports',    label: 'Reports',     icon: 'chart'     },
  { id: 'staff',      label: 'Staff',       icon: 'staff'     },
  { id: 'settings',   label: 'Settings',    icon: 'settings'  },
]

function NavRow({ item, active, onClick, t }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '10px 12px', borderRadius: 10, marginBottom: 3,
        background: active ? t.accentSoft : hover ? t.tableRowHover : 'transparent',
        cursor: 'pointer', position: 'relative', transition: 'background 0.12s',
      }}
    >
      {active && (
        <div style={{
          position: 'absolute', left: -10, top: 8, bottom: 8, width: 3,
          borderRadius: 3, background: t.accent,
        }} />
      )}
      <Icon name={item.icon} size={18} color={active ? t.accent : t.textSub} strokeWidth={active ? 2.1 : 1.9} />
      <span style={{
        fontSize: 13.5, fontWeight: active ? 600 : 500,
        color: active ? t.accent : t.text, flex: 1, fontFamily: fonts.body,
      }}>
        {item.label}
      </span>
      {item.badge === 'live' && (
        <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: t.accent }} />
      )}
      {item.badge && item.badge !== 'live' && (
        <span style={{
          minWidth: 18, height: 18, borderRadius: 999,
          background: t.accent, color: '#fff', fontSize: 10.5, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 5px', fontFamily: fonts.body,
        }}>
          {item.badge}
        </span>
      )}
    </div>
  )
}

export default function Sidebar({ page, setPage, t, user, onLogout }) {
  const [logoutHover, setLogoutHover] = useState(false)
  const { gymName, branchName, logo } = useGymProfile()
  return (
    <aside style={{
      width: 240, background: t.sidebar,
      borderRight: `1px solid ${t.sidebarBorder}`,
      display: 'flex', flexDirection: 'column',
      flexShrink: 0, height: '100vh',
    }}>
      {/* Brand — uploaded logo + gym name */}
      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 38, height: 38, flexShrink: 0, borderRadius: 11, overflow: 'hidden',
            background: logo ? '#fff' : t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(225,29,46,0.30)',
          }}>
            {logo
              ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Icon name="logo" size={21} color="#fff" strokeWidth={2} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text, lineHeight: 1.15, fontFamily: fonts.display, letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {gymName || 'SynapX'}
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, fontFamily: fonts.body, marginTop: 1 }}>
              GymOS Console
            </div>
          </div>
        </div>
      </div>

      {/* Branch pill */}
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '9px 12px', background: t.tableRow, borderRadius: 10,
          border: `1px solid ${t.border}`,
        }}>
          <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: t.green, flexShrink: 0 }} />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {branchName || 'Branch'}
            </div>
            <div style={{ fontSize: 10.5, color: t.textMuted }}>Branch · Online</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 16px', overflowY: 'auto' }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: t.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', padding: '4px 12px 8px' }}>
          Menu
        </div>
        {navItems.map(item => (
          <NavRow
            key={item.id}
            item={item}
            active={page === item.id}
            onClick={() => setPage(item.id)}
            t={t}
          />
        ))}
      </nav>

      {/* Bottom: user + logout */}
      <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${t.sidebarBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 12px' }}>
          <Avatar
            initials={user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'AD'}
            color={t.accent} size={36}
          />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.fullName || 'Admin'}
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email || (user?.role?.replace('_', ' ') || 'Administrator')}
            </div>
          </div>
        </div>

        <div
          onClick={onLogout}
          onMouseEnter={() => setLogoutHover(true)}
          onMouseLeave={() => setLogoutHover(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
            background: logoutHover ? t.accentSoft : 'transparent',
            border: `1px solid ${logoutHover ? t.accent + '33' : t.border}`,
            transition: 'all 0.12s',
          }}
        >
          <Icon name="logout" size={17} color={t.accent} />
          <span style={{ fontSize: 13, color: t.accent, fontWeight: 600, fontFamily: fonts.body }}>
            Sign out
          </span>
        </div>
      </div>
    </aside>
  )
}
