// src/pages/Attendance.jsx — Real API
import { useEffect } from 'react'
import { attendanceService } from '../api/services'
import { useApi, usePaginated } from '../hooks/useApi'
import { KpiCard, Card, Btn } from '../components/ui/index.jsx'

export default function AttendancePage({ t }) {
  const { data: stats,   loading: l1, refetch: rStats } = useApi(() => attendanceService.todayStats())
  const { data: heatmap, loading: l2, refetch: rHeat }  = useApi(() => attendanceService.heatmap())
  const { items, loading: l3, error, refetch: rList }   = usePaginated((params) => attendanceService.list(params))

  const refreshAll = () => { rStats(); rHeat(); rList() }

  // Live-refresh so kiosk check-ins (QR / Face / Fingerprint) appear in the log
  // and stats without a manual reload.
  useEffect(() => {
    const id = setInterval(refreshAll, 8000)
    return () => clearInterval(id)
  }, [rStats, rHeat, rList]) // eslint-disable-line

  const days  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hours = Array.from({ length: 12 }, (_, i) => `${6 + i}h`)

  // Build heatmap grid from API data
  const heatGrid = days.map((_, di) =>
    hours.map((_, hi) => {
      const match = (heatmap || []).find(d => d._id?.day === di + 2 && d._id?.hour === hi + 6)
      return match?.count || 0
    })
  )
  const maxVal = Math.max(...heatGrid.flat(), 1)

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: t.text }}>Attendance & Check-in</h2>
          <p style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>Live biometric activity monitor</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: t.textSub }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.green, animation: 'pulse 1.6s ease-in-out infinite' }} /> Live · auto-refresh
          </span>
          <Btn v="ghost" t={t} sm onClick={refreshAll}>↻ Refresh</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard label="Today"     value={l1 ? '...' : (stats?.total   ?? 0)} sub="Check-ins so far"  icon="◈" color={t.accent} t={t} />
        <KpiCard label="Granted"   value={l1 ? '...' : (stats?.granted ?? 0)} sub="Access granted"    icon="◆" color={t.green}  t={t} />
        <KpiCard label="Denied"    value={l1 ? '...' : (stats?.denied  ?? 0)} sub="Access denied"     icon="⬟" color={t.red}   t={t} />
        <KpiCard label="Methods"   value={l1 ? '...' : ((stats?.byMethod?.length) ?? 0)} sub="Check-in methods" icon="⬡" color={t.orange} t={t} />
      </div>

      {/* Heatmap */}
      <Card t={t} style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 14 }}>Attendance Heatmap — This Week</div>
        {l2 ? (
          <div style={{ height: 120, background: t.border, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `44px repeat(12, 1fr)`, gap: 3, minWidth: 480 }}>
              <div />
              {hours.map(h => <div key={h} style={{ fontSize: 9, color: t.textSub, textAlign: 'center', paddingBottom: 3 }}>{h}</div>)}
              {days.map((day, di) => [
                <div key={`d${di}`} style={{ fontSize: 11, color: t.textSub, display: 'flex', alignItems: 'center' }}>{day}</div>,
                ...heatGrid[di].map((val, hi) => (
                  <div key={hi} title={`${val} check-ins`} style={{ height: 22, borderRadius: 3, background: val > 0 ? `${t.accent}${Math.round((val / maxVal) * 220).toString(16).padStart(2, '0')}` : t.border }} />
                )),
              ])}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: t.textSub }}>Low</span>
          {[20, 40, 70, 100].map(op => (
            <div key={op} style={{ width: 14, height: 14, borderRadius: 3, background: `${t.accent}${Math.round(op * 2.2).toString(16).padStart(2, '0')}` }} />
          ))}
          <span style={{ fontSize: 10, color: t.textSub }}>High</span>
        </div>
      </Card>

      {/* Live log */}
      <Card t={t}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 14 }}>
          Today's Log — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        {error && <div style={{ color: t.red, fontSize: 12, marginBottom: 10 }}>⚠ {error}</div>}
        {l3 ? Array(6).fill(0).map((_, i) => (
          <div key={i} style={{ padding: '9px 0', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ height: 12, background: t.border, borderRadius: 4, width: '40%', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: 12, background: t.border, borderRadius: 4, width: '20%', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        )) : items.map((c, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.result === 'GRANTED' ? t.green : t.red, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{c.memberName || 'Unknown'}</span>
              <span style={{ fontSize: 10, color: t.textSub }}>{c.method}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: t.textSub }}>
                {new Date(c.checkedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: c.result === 'GRANTED' ? t.greenSoft : t.redSoft, color: c.result === 'GRANTED' ? t.green : t.red }}>
                {c.result}
              </span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
