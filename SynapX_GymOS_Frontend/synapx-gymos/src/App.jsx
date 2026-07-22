// src/App.jsx — SynapX GymOS Root Application (single Red & White theme)
import { useState, useEffect } from 'react'
import { theme as t } from './theme.js'
import { getToken, clearTokens, setToken, setRefresh } from './api/client.js'
import { authService } from './api/services.js'
import { Icon } from './components/ui/index.jsx'
import { useNotifications } from './context/NotificationContext.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import TopBar  from './components/layout/TopBar.jsx'
import Kiosk   from './pages/Kiosk.jsx'
import LoginPage from './pages/Login.jsx'
import DashboardPage  from './pages/Dashboard.jsx'
import MembersPage    from './pages/Members.jsx'
import AttendancePage from './pages/Attendance.jsx'
import ClassesPage    from './pages/Classes.jsx'
import PaymentsPage   from './pages/Payments.jsx'
import ReportsPage    from './pages/Reports.jsx'
import StaffPage      from './pages/Staff.jsx'
import { SettingsPage } from './pages/index.jsx'

const pages = {
  dashboard:  DashboardPage,
  members:    MembersPage,
  attendance: AttendancePage,
  classes:    ClassesPage,
  payments:   PaymentsPage,
  reports:    ReportsPage,
  staff:      StaffPage,
  settings:   SettingsPage,
}

export default function App() {
  const [page,        setPage]        = useState('dashboard')
  const [kiosk,       setKiosk]       = useState(false)
  const [user,        setUser]        = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const { refreshAlerts } = useNotifications()

  // Restore session on load
  useEffect(() => {
    const token = getToken()
    if (!token) { setAuthLoading(false); return }
    authService.getMe()
      .then(res => setUser(res.data))
      .catch(()  => clearTokens())
      .finally(() => setAuthLoading(false))
  }, [])

  // Compute system alerts (expiring / expired / overdue) once logged in, then poll
  useEffect(() => {
    if (!user) return
    refreshAlerts()
    const id = setInterval(refreshAlerts, 120000)
    return () => clearInterval(id)
  }, [user, refreshAlerts])

  const handleLogin = async (email, password) => {
    const res = await authService.login(email, password)
    setToken(res.data.accessToken)
    setRefresh(res.data.refreshToken)
    setUser(res.data.staff)
    localStorage.setItem('synapx_user', JSON.stringify(res.data.staff))
  }

  const handleLogout = async () => {
    try { await authService.logout() } catch {}
    clearTokens()
    setUser(null)
  }

  // Loading screen
  if (authLoading) {
    return (
      <div style={{
        height: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: t.bg, fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 46, height: 46, margin: '0 auto 16px', borderRadius: 12,
            background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(225,29,46,0.30)', animation: 'pulseDot 1.4s ease-in-out infinite',
          }}>
            <Icon name="logo" size={24} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 13, color: t.textSub, fontWeight: 500 }}>
            Loading your console…
          </div>
        </div>
      </div>
    )
  }

  // Login screen
  if (!user) {
    return <LoginPage t={t} onLogin={handleLogin} />
  }

  // Kiosk mode
  if (kiosk) {
    return <Kiosk onExit={() => setKiosk(false)} />
  }

  // Main app
  const PageComponent = pages[page] || DashboardPage

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: t.bg, overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <Sidebar
        page={page}
        setPage={setPage}
        t={t}
        user={user}
        onLogout={handleLogout}
      />
      <div style={{
        flex: 1, display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', minWidth: 0,
      }}>
        <TopBar
          page={page}
          t={t}
          onKiosk={() => setKiosk(true)}
          user={user}
        />
        <main style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <PageComponent
            t={t}
            user={user}
            setPage={setPage}
          />
        </main>
      </div>
    </div>
  )
}
