// src/pages/Reports.jsx — Real API with Excel export
import { reportService, dashboardService } from '../api/services'
import { useApi } from '../hooks/useApi'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, Btn } from '../components/ui/index.jsx'
import { useCurrency } from '../context/CurrencyContext.jsx'
import { useGymProfile } from '../context/GymProfileContext.jsx'
import { downloadCsv, printTableReport } from '../utils/exporters'

const tt = (t) => ({ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 12 })

export default function ReportsPage({ t }) {
  const { currency, symbol } = useCurrency()
  const { gymName, logo } = useGymProfile()
  const { data: growth,  loading: l1 } = useApi(() => dashboardService.memberGrowth({ months: 6 }))
  const { data: revenue, loading: l2 } = useApi(() => dashboardService.revenueChart({ months: 6 }))
  const { data: members, loading: l3 } = useApi(() => reportService.members({ limit: 20 }))

  const memberList = Array.isArray(members) ? members : (members?.data || [])
  const MEMBER_HEADERS = ['Member', 'Code', 'Status', 'Plan', 'Expiry', 'Joined']
  const memberRows = memberList.map(m => [
    m.fullName,
    m.memberCode,
    m.status,
    m.memberships?.[0]?.plan?.name || '—',
    m.memberships?.[0]?.endDate ? new Date(m.memberships[0].endDate).toLocaleDateString() : '—',
    m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—',
  ])

  const handleExportExcel = () => downloadCsv('member-summary.csv', MEMBER_HEADERS, memberRows)
  const handleExportPdf   = () => printTableReport({ title: 'Member Summary', subtitle: 'Reports & Analytics', headers: MEMBER_HEADERS, rows: memberRows, gymName, logo })

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: t.text }}>Reports & Analytics</h2>
          <p style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>Business intelligence overview</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn v="ghost" t={t} sm onClick={handleExportExcel}>⬇ Export Excel</Btn>
          <Btn v="ghost" t={t} sm onClick={handleExportPdf}>⬇ Export PDF</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Card t={t}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 2 }}>Member Growth</div>
          <div style={{ fontSize: 11, color: t.textSub, marginBottom: 14 }}>New members per month</div>
          {l1 ? <div style={{ height: 170, background: t.border, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} /> : (
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={growth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: t.textSub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: t.textSub }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tt(t)} />
                <Line type="monotone" dataKey="newMembers" stroke={t.green} strokeWidth={3} dot={{ fill: t.green, r: 3 }} name="New Members" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card t={t}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 2 }}>Revenue Trend</div>
          <div style={{ fontSize: 11, color: t.textSub, marginBottom: 14 }}>Monthly revenue ({currency})</div>
          {l2 ? <div style={{ height: 170, background: t.border, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} /> : (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={revenue || []} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: t.textSub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: t.textSub }} axisLine={false} tickLine={false} tickFormatter={v => `${symbol}${v / 1000}k`} />
                <Tooltip contentStyle={tt(t)} formatter={v => `${symbol}${Number(v).toLocaleString()}`} />
                <Bar dataKey="revenue" fill={t.accent} radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card t={t} noPad>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Member Summary</div>
          <Btn v="ghost" t={t} sm onClick={handleExportExcel}>⬇ Excel</Btn>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: t.bg }}>
              {['Member', 'Code', 'Status', 'Plan', 'Expiry', 'Joined'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.textSub, letterSpacing: 1.5, textTransform: 'uppercase', borderBottom: `1px solid ${t.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {l3 ? Array(6).fill(0).map((_, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? t.tableRow : t.card }}>
                {Array(6).fill(0).map((_, j) => (
                  <td key={j} style={{ padding: '10px 14px' }}>
                    <div style={{ height: 12, background: t.border, borderRadius: 4, width: '70%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  </td>
                ))}
              </tr>
            )) : (members?.data || members || []).slice(0, 15).map((m, i) => (
              <tr key={m.id} style={{ background: i % 2 === 0 ? t.tableRow : t.card }}>
                <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: t.text }}>{m.fullName}</td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: t.textSub, fontFamily: 'monospace' }}>{m.memberCode}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: m.status === 'ACTIVE' ? t.green : t.red }}>{m.status}</span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: t.textSub }}>{m.memberships?.[0]?.plan?.name || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: t.textSub }}>
                  {m.memberships?.[0]?.endDate ? new Date(m.memberships[0].endDate).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: t.textSub }}>
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
