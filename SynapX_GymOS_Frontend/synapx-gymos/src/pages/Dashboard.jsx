// src/pages/Dashboard.jsx
import { useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { dashboardService } from '../api/services'
import { useApi } from '../hooks/useApi'
import { KpiCard, Card, Icon } from '../components/ui/index.jsx'
import { useCurrency } from '../context/CurrencyContext.jsx'
import { fonts } from '../theme.js'

// Monochrome red palette for the plan pie
const PLAN_COLORS = ['#E11D2E', '#F0616D', '#F8A9B0', '#8E1420']

const tt = (t) => ({ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, color: t.text, fontSize: 12.5, boxShadow: t.shadowMd })
const Skeleton = ({ w = '100%', h = 24, t }) => (
  <div style={{ width: w, height: h, background: t.tableRowHover, borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
)

// ── MAIN DASHBOARD ───────────────────────────────────────────────
export default function DashboardPage({ t, setPage }) {
  const { fmt, symbol } = useCurrency()
  const { data: kpis,    loading: l1, refetch: r1 } = useApi(() => dashboardService.kpis())
  const { data: revenue, loading: l2 }               = useApi(() => dashboardService.revenueChart())
  const { data: plans,   loading: l3 }               = useApi(() => dashboardService.planDistribution())
  const { data: weekly,  loading: l4 }               = useApi(() => dashboardService.weeklyAttendance())

  useEffect(() => {
    const id = setInterval(r1, 30000)
    return () => clearInterval(id)
  }, [r1])

  const planData = (plans || []).map((p, i) => ({ ...p, color: PLAN_COLORS[i % PLAN_COLORS.length] }))

  const kpiCards = [
    { label: 'Active members',  value: kpis?.activeMembers ?? 0, sub: 'Total enrolled',   icon: 'users',    color: t.accent },
    { label: 'Today check-ins', value: kpis?.todayCheckins ?? 0, sub: 'Granted entry',    icon: 'doorOpen', color: t.green  },
    { label: 'Monthly revenue', value: fmt(kpis?.monthlyRevenue || 0), sub: 'This month', icon: 'dollar', color: t.purple },
    { label: 'Expiring soon',   value: kpis?.expiringIn7 ?? 0,   sub: 'Next 7 days',      icon: 'clock',    color: t.orange },
    { label: 'Classes today',   value: kpis?.classesToday ?? 0,  sub: 'Active classes',   icon: 'calendar', color: t.green  },
    { label: 'New members',     value: kpis?.newThisMonth ?? 0,  sub: 'This month',       icon: 'userPlus', color: t.accent },
  ]

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 23, fontWeight: 700, color: t.text, letterSpacing: -0.5, fontFamily: fonts.display }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13.5, color: t.textSub, marginTop: 4 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        {l1
          ? Array(6).fill(0).map((_, i) => (
              <div key={i} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '18px 20px', boxShadow: t.shadow }}>
                <Skeleton h={12} w="60%" t={t} /><div style={{ height: 14 }} /><Skeleton h={26} w="70%" t={t} />
              </div>
            ))
          : kpiCards.map((c) => (
              <KpiCard key={c.label} {...c} icon={<Icon name={c.icon} size={17} color={c.color} />} t={t} />
            ))}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <Card t={t}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: t.text, marginBottom: 2, fontFamily: fonts.display }}>Revenue</div>
          <div style={{ fontSize: 12.5, color: t.textSub, marginBottom: 18 }}>Last 7 months</div>
          {l2 ? <Skeleton h={190} t={t} /> : (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={revenue || []}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={t.accent} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={t.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.textSub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: t.textSub }} axisLine={false} tickLine={false} tickFormatter={v => `${symbol}${v / 1000}k`} />
                <Tooltip contentStyle={tt(t)} />
                <Area type="monotone" dataKey="revenue" stroke={t.accent} strokeWidth={2.5} fill="url(#rg)" name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card t={t}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: t.text, marginBottom: 2, fontFamily: fonts.display }}>Plan distribution</div>
          <div style={{ fontSize: 12.5, color: t.textSub, marginBottom: 8 }}>Members by plan</div>
          {l3 ? <Skeleton h={150} t={t} /> : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={planData} cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={3} dataKey="value">
                    {planData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tt(t)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {planData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: t.textSub }}>
                    <div style={{ width: 8, height: 8, borderRadius: 3, background: d.color }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card t={t}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: t.text, marginBottom: 16, fontFamily: fonts.display }}>Weekly attendance</div>
          {l4 ? <Skeleton h={130} t={t} /> : (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={weekly || []} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: t.textSub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: t.textSub }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tt(t)} cursor={{ fill: t.tableRowHover }} />
                <Bar dataKey="checkins" fill={t.accent} radius={[5, 5, 0, 0]} name="Check-ins" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card t={t}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: t.text, marginBottom: 14, fontFamily: fonts.display }}>Quick stats</div>
          {[
            { label: 'Active members',  value: kpis?.activeMembers  ?? '—', page: 'members'  },
            { label: 'New this month',  value: kpis?.newThisMonth   ?? '—', page: 'members'  },
            { label: 'Expiring in 7d',  value: kpis?.expiringIn7    ?? '—', page: 'members'  },
            { label: 'Active classes',  value: kpis?.classesToday   ?? '—', page: 'classes'  },
            { label: 'Monthly revenue', value: kpis?.monthlyRevenue ? fmt(kpis.monthlyRevenue) : '—', page: 'payments' },
          ].map((s, i) => (
            <div key={i} onClick={() => setPage && setPage(s.page)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < 4 ? `1px solid ${t.border}` : 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 13, color: t.textSub }}>{s.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: fonts.display }}>{s.value}</span>
                <Icon name="chevronRight" size={15} color={t.textMuted} />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
