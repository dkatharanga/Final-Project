// src/pages/index.jsx  — All 8 page components
import { useState, useRef } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Badge, Avatar, KpiCard, Btn, SectionHeader,
  Toggle, Input, Card, Table, Td,
} from '../components/ui/index.jsx'
import {
  revenueData, attendanceData, planDistribution,
  members, recentCheckins, classes, payments,
  staff, monthlyStats, avatarColors,
} from '../data/mockData.js'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext.jsx'
import { useGymProfile } from '../context/GymProfileContext.jsx'

// ─── DASHBOARD ───────────────────────────────────────────────────
export function DashboardPage({ t }) {
  return (
    <div className="fade-in">
      <SectionHeader
        title="Dashboard Overview"
        sub="Monday, March 09, 2026 — Live data"
        t={t}
        action={[
          <Btn key="exp" variant="ghost" t={t} small>Export</Btn>,
          <Btn key="add" t={t} small>+ Add Member</Btn>,
        ]}
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Active Members" value="847"   sub="↑ 12 this week"       icon="◉" color={t.accent}  t={t} />
        <KpiCard label="Today Check-ins" value="134"  sub="Peak: 7–9 AM"          icon="◈" color={t.green}   t={t} />
        <KpiCard label="Monthly Revenue" value="$13.8K" sub="↑ 14% vs last month" icon="◇" color={t.purple}  t={t} />
        <KpiCard label="Expiring Soon"   value="23"   sub="In next 7 days"        icon="⬟" color={t.orange}  t={t} />
        <KpiCard label="Classes Today"   value="9"    sub="3 fully booked"        icon="◆" color={t.accent}  t={t} />
        <KpiCard label="New Members"     value="18"   sub="This month"            icon="◳" color={t.green}   t={t} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card t={t}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 2 }}>Revenue vs Target</div>
          <div style={{ fontSize: 12, color: t.textSub, marginBottom: 20 }}>Last 7 months performance</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={t.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={t.accent} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.textSub }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: t.textSub }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
              <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 12 }} />
              <Area    type="monotone" dataKey="revenue" stroke={t.accent}  strokeWidth={2} fill="url(#revGrad)" name="Revenue" />
              <Line    type="monotone" dataKey="target"  stroke={t.orange}  strokeWidth={2} strokeDasharray="5 5" dot={false}   name="Target"  />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card t={t}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 2 }}>Plan Distribution</div>
          <div style={{ fontSize: 12, color: t.textSub, marginBottom: 10 }}>Members by plan type</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={3} dataKey="value">
                {planDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {planDistribution.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: t.textSub }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                {d.name} {d.value}%
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card t={t}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 16 }}>Weekly Attendance</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={attendanceData} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: t.textSub }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: t.textSub }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 12 }} />
              <Bar dataKey="checkins" fill={t.accent} radius={[4, 4, 0, 0]} name="Check-ins" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card t={t}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 16 }}>Live Check-ins Today</div>
          {recentCheckins.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < recentCheckins.length - 1 ? `1px solid ${t.border}` : 'none' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Avatar initials={c.name === 'Unknown' ? '?' : c.name.split(' ').map(n => n[0]).join('')} color={c.status === 'denied' ? t.red : t.accent} size={30} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: t.textSub }}>{c.method} · {c.time}</div>
                </div>
              </div>
              <Badge status={c.status} t={t} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ─── MEMBERS ─────────────────────────────────────────────────────
export function MembersPage({ t }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = members.filter(m =>
    (filter === 'All' || m.status === filter) &&
    (m.name.toLowerCase().includes(search.toLowerCase()) || m.id.includes(search))
  )

  return (
    <div className="fade-in">
      <SectionHeader title="Member Management" sub={`${members.length} total members`} t={t}
        action={<Btn t={t} small>+ New Member</Btn>}
      />
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or ID..."
            style={{ padding: '9px 16px 9px 34px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, color: t.text, fontSize: 13, fontFamily: 'inherit', width: 240, outline: 'none' }} />
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: t.textMuted }}>⌕</span>
        </div>
        {['All', 'Active', 'Frozen', 'Expired'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '8px 16px', borderRadius: 7, border: `1px solid ${filter === f ? t.accent : t.border}`, background: filter === f ? t.accentSoft : 'transparent', color: filter === f ? t.accent : t.textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {f}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: t.textSub }}>{filtered.length} results</span>
      </div>
      <Card t={t} noPad>
        <Table headers={['Member', 'ID', 'Plan', 'Status', 'Joined', 'Expiry', 'Check-ins', 'Actions']} t={t}>
          {filtered.map((m, i) => (
            <tr key={m.id} style={{ background: i % 2 === 0 ? t.tableRow : t.card }}>
              <Td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={m.avatar} color={avatarColors[i % avatarColors.length]} size={34} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: t.textSub }}>{m.email}</div>
                  </div>
                </div>
              </Td>
              <Td style={{ fontSize: 12, color: t.textSub, fontFamily: 'monospace' }}>{m.id}</Td>
              <Td style={{ fontSize: 13, color: t.text }}>{m.plan}</Td>
              <Td><Badge status={m.status} t={t} /></Td>
              <Td style={{ fontSize: 12, color: t.textSub }}>{m.joined}</Td>
              <Td style={{ fontSize: 12, color: t.textSub }}>{m.expiry}</Td>
              <Td style={{ fontSize: 13, color: t.text, fontWeight: 700 }}>{m.checkins}</Td>
              <Td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn variant="ghost" t={t} small>View</Btn>
                  <Btn variant="outline" t={t} small>Edit</Btn>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}

// ─── ATTENDANCE ──────────────────────────────────────────────────
export function AttendancePage({ t }) {
  const days  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hours = Array.from({ length: 12 }, (_, i) => `${6 + i}h`)
  const heatData = days.map(() =>
    Array.from({ length: 12 }, (_, h) => Math.floor(Math.random() * 30) + (h < 3 ? 25 : h > 9 ? 18 : 5))
  )

  return (
    <div className="fade-in">
      <SectionHeader title="Attendance & Check-in" sub="Live biometric activity monitor" t={t}
        action={<Btn variant="ghost" t={t} small>Export CSV</Btn>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Today"      value="134"    sub="Check-ins so far"        icon="◈" color={t.accent} t={t} />
        <KpiCard label="This Week"  value="762"    sub="Avg 109/day"              icon="◆" color={t.green}  t={t} />
        <KpiCard label="Peak Hour"  value="7–8 AM" sub="Avg 48 check-ins"        icon="⬡" color={t.orange} t={t} />
        <KpiCard label="Denied"     value="3"      sub="Low confidence today"     icon="⬟" color={t.red}   t={t} />
      </div>

      {/* Heatmap */}
      <Card t={t} style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 16 }}>Attendance Heatmap — This Week</div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `52px repeat(12, 1fr)`, gap: 4, minWidth: 560 }}>
            <div />
            {hours.map(h => <div key={h} style={{ fontSize: 10, color: t.textSub, textAlign: 'center', paddingBottom: 4 }}>{h}</div>)}
            {days.map((day, di) => (
              <>
                <div key={`d-${di}`} style={{ fontSize: 12, color: t.textSub, display: 'flex', alignItems: 'center' }}>{day}</div>
                {heatData[di].map((val, hi) => (
                  <div key={hi} title={`${val} check-ins`} style={{
                    height: 26, borderRadius: 4,
                    background: val > 25 ? t.accent : val > 15 ? t.accent + '80' : val > 8 ? t.accent + '35' : t.border,
                  }} />
                ))}
              </>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: t.textSub }}>Low</span>
          {[t.border, t.accent + '35', t.accent + '80', t.accent].map((c, i) => (
            <div key={i} style={{ width: 16, height: 16, borderRadius: 3, background: c }} />
          ))}
          <span style={{ fontSize: 11, color: t.textSub }}>High</span>
        </div>
      </Card>

      {/* Log */}
      <Card t={t}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 16 }}>Today's Log — March 9, 2026</div>
        {[...recentCheckins, ...recentCheckins].slice(0, 8).map((c, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.status === 'granted' ? t.green : t.red, boxShadow: `0 0 6px ${c.status === 'granted' ? t.green : t.red}`, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{c.name}</span>
              <span style={{ fontSize: 11, color: t.textSub }}>{c.method}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: t.textSub }}>{c.time}</span>
              <Badge status={c.status} t={t} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── CLASSES ─────────────────────────────────────────────────────
export function ClassesPage({ t }) {
  return (
    <div className="fade-in">
      <SectionHeader title="Class Scheduling" sub={`${classes.length} active classes`} t={t}
        action={<Btn t={t} small>+ New Class</Btn>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
        {classes.map(c => (
          <Card key={c.id} t={t} noPad>
            <div style={{ height: 4, background: c.color }} />
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: t.text }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>{c.trainer}</div>
                </div>
                <Badge status={c.booked >= c.capacity ? 'FULL' : 'OPEN'} t={t} />
              </div>
              <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: t.textSub }}>🕐 {c.time}</span>
                <span style={{ fontSize: 12, color: t.textSub }}>⏱ {c.duration}min</span>
                <span style={{ fontSize: 12, color: t.textSub }}>📅 {c.day}</span>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: t.textSub }}>Capacity</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.text }}>{c.booked}/{c.capacity}</span>
                </div>
                <div style={{ height: 5, background: t.border, borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(c.booked / c.capacity) * 100}%`, background: c.booked >= c.capacity ? t.orange : c.color, borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="ghost" t={t} small>Bookings</Btn>
                <Btn variant="outline" t={t} small>Edit</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── PAYMENTS ────────────────────────────────────────────────────
export function PaymentsPage({ t }) {
  const totalPaid = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0)
  return (
    <div className="fade-in">
      <SectionHeader title="Payments & Billing" sub="Invoice and transaction management" t={t}
        action={[
          <Btn key="exp" variant="ghost" t={t} small>Export PDF</Btn>,
          <Btn key="inv" t={t} small>+ Invoice</Btn>,
        ]}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Collected (Mar)" value={`$${totalPaid}`} sub="Invoices paid"        icon="◇" color={t.green}  t={t} />
        <KpiCard label="Pending"         value="$165"            sub="1 invoice"            icon="⬟" color={t.orange} t={t} />
        <KpiCard label="Overdue"         value="$65"             sub="4 days overdue"       icon="⬡" color={t.red}    t={t} />
        <KpiCard label="Mar Target"      value="$15K"            sub="92% collected"        icon="◆" color={t.accent} t={t} />
      </div>
      <Card t={t} noPad>
        <Table headers={['Invoice ID', 'Member', 'Plan', 'Amount', 'Date', 'Method', 'Status', 'Actions']} t={t}>
          {payments.map((p, i) => (
            <tr key={p.id} style={{ background: i % 2 === 0 ? t.tableRow : t.card }}>
              <Td style={{ fontSize: 12, color: t.accent, fontFamily: 'monospace' }}>{p.id}</Td>
              <Td style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{p.member}</Td>
              <Td style={{ fontSize: 12, color: t.textSub }}>{p.plan}</Td>
              <Td style={{ fontSize: 13, fontWeight: 800, color: t.text }}>${p.amount}</Td>
              <Td style={{ fontSize: 12, color: t.textSub }}>{p.date}</Td>
              <Td style={{ fontSize: 12, color: t.textSub }}>{p.method}</Td>
              <Td><Badge status={p.status} t={t} /></Td>
              <Td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn variant="ghost" t={t} small>PDF</Btn>
                  {p.status !== 'Paid' && <Btn variant="outline" t={t} small>Remind</Btn>}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}

// ─── REPORTS ─────────────────────────────────────────────────────
export function ReportsPage({ t }) {
  return (
    <div className="fade-in">
      <SectionHeader title="Reports & Analytics" sub="Business intelligence overview" t={t}
        action={[
          <Btn key="xlsx" variant="ghost" t={t} small>Export Excel</Btn>,
          <Btn key="pdf"  variant="ghost" t={t} small>Export PDF</Btn>,
        ]}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card t={t}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 2 }}>Member Growth</div>
          <div style={{ fontSize: 12, color: t.textSub, marginBottom: 16 }}>Total active members over time</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis dataKey="m"       tick={{ fontSize: 11, fill: t.textSub }} axisLine={false} tickLine={false} />
              <YAxis domain={[680, 870]} tick={{ fontSize: 11, fill: t.textSub }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 12 }} />
              <Line type="monotone" dataKey="members" stroke={t.green} strokeWidth={3} dot={{ fill: t.green, r: 4 }} name="Members" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card t={t}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 2 }}>Revenue Trend</div>
          <div style={{ fontSize: 12, color: t.textSub, marginBottom: 16 }}>Monthly revenue (USD)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyStats} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
              <XAxis dataKey="m"       tick={{ fontSize: 11, fill: t.textSub }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: t.textSub }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
              <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 12 }} formatter={v => `$${v.toLocaleString()}`} />
              <Bar dataKey="revenue" fill={t.accent} radius={[4, 4, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card t={t} noPad>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Monthly Summary Table</div>
        </div>
        <Table headers={['Month', 'Active Members', 'New Joins', 'Churned', 'Revenue', 'Classes Run']} t={t}>
          {monthlyStats.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? t.tableRow : t.card }}>
              <Td style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{row.m} 2025</Td>
              <Td style={{ fontSize: 13, color: t.text }}>{row.members}</Td>
              <Td style={{ fontSize: 13, color: t.green, fontWeight: 700 }}>+{row.newJoins}</Td>
              <Td style={{ fontSize: 13, color: t.red }}>-{row.churned}</Td>
              <Td style={{ fontSize: 13, fontWeight: 800, color: t.text }}>${row.revenue.toLocaleString()}</Td>
              <Td style={{ fontSize: 13, color: t.text }}>{row.classes}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}

// ─── STAFF ───────────────────────────────────────────────────────
export function StaffPage({ t }) {
  return (
    <div className="fade-in">
      <SectionHeader title="Staff Management" sub={`${staff.length} staff members`} t={t}
        action={<Btn t={t} small>+ Add Staff</Btn>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
        {staff.map((s, i) => (
          <Card key={i} t={t}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
              <Avatar initials={s.avatar} color={avatarColors[i % avatarColors.length]} size={46} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: t.text }}>{s.name}</div>
                <div style={{ fontSize: 12, color: t.accent, fontWeight: 600 }}>{s.role}</div>
                <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>{s.specs}</div>
              </div>
              <Badge status={s.status} t={t} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Rating',   val: s.rating > 0 ? `★ ${s.rating}` : '—' },
                { label: 'Sessions', val: s.sessions > 0 ? s.sessions : '—'    },
                { label: 'Shift',    val: s.shift                              },
              ].map(m => (
                <div key={m.label} style={{ background: t.bg, borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1 }}>{m.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginTop: 2 }}>{m.val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" t={t} small>Profile</Btn>
              <Btn variant="outline" t={t} small>Schedule</Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── SETTINGS ────────────────────────────────────────────────────
export function SettingsPage({ t }) {
  const { currency, setCurrency } = useCurrency()
  const { gymName, setGymName, branchName, setBranchName, logo, setLogo } = useGymProfile()
  const [timezone, setTimezone] = useState('Asia/Colombo')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef(null)

  // Read the chosen image, downscale to ≤256px, store as a data URL.
  const onLogoFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 256
        const scale = Math.min(max / img.width, max / img.height, 1)
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        setLogo(canvas.toDataURL('image/png'))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  const biometricToggles = [
    { label: 'Face Recognition',     def: true  },
    { label: 'Fingerprint Scanner',  def: true  },
    { label: 'Liveness Detection',   def: true  },
    { label: 'Offline Mode',         def: true  },
    { label: 'Auto Attendance Log',  def: true  },
    { label: 'Entry Denial Alerts',  def: false },
  ]
  const notifToggles = [
    { label: 'Membership Expiry Reminders', def: true  },
    { label: 'Overdue Payment Alerts',      def: true  },
    { label: 'New Member Welcome SMS',      def: true  },
    { label: 'Class Reminder Notifications',def: false },
    { label: 'Daily Summary Email',         def: true  },
    { label: 'WhatsApp Notifications',      def: false },
  ]

  const ToggleRow = ({ label, defaultVal }) => {
    const [on, setOn] = useState(defaultVal)
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
        <span style={{ fontSize: 13, color: t.text }}>{label}</span>
        <Toggle value={on} onChange={setOn} t={t} />
      </div>
    )
  }

  return (
    <div className="fade-in">
      <SectionHeader title="Settings & Configuration" sub="Manage your gym preferences" t={t} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* General */}
        <Card t={t}>
          <div style={{ fontSize: 15, fontWeight: 800, color: t.text, marginBottom: 20 }}>General Settings</div>
          {(() => {
            const fieldStyle = { width: '100%', padding: '9px 14px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }
            const labelStyle = { fontSize: 12, fontWeight: 600, color: t.textSub, marginBottom: 6 }
            return (
              <>
                {/* Logo + name — the logo shows top-left and on invoices */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                  <div
                    onClick={() => fileRef.current?.click()}
                    title="Upload logo"
                    style={{
                      width: 72, height: 72, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                      background: logo ? '#fff' : t.accentSoft, border: `2px dashed ${t.accent}66`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative',
                    }}
                  >
                    {logo
                      ? <img src={logo} alt="Gym logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 10, fontWeight: 700, color: t.accent, textAlign: 'center', lineHeight: 1.3 }}>Upload<br/>logo</span>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onLogoFile} style={{ display: 'none' }} />
                  <div style={{ flex: 1 }}>
                    <div style={labelStyle}>Gym Name</div>
                    <input value={gymName} onChange={e => setGymName(e.target.value)} placeholder="Your gym name" style={fieldStyle} />
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      <span onClick={() => fileRef.current?.click()} style={{ fontSize: 11.5, color: t.accent, fontWeight: 600, cursor: 'pointer' }}>
                        {logo ? 'Change logo' : 'Upload logo'}
                      </span>
                      {logo && <span onClick={() => setLogo('')} style={{ fontSize: 11.5, color: t.textSub, cursor: 'pointer' }}>Remove</span>}
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>Branch Name</div>
                  <input value={branchName} onChange={e => setBranchName(e.target.value)} placeholder="e.g. FitNation Colombo" style={fieldStyle} />
                  <div style={{ fontSize: 11, color: t.textSub, marginTop: 6 }}>Shown in the sidebar branch pill.</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>Currency</div>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} style={fieldStyle}>
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} — {c.symbol}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: t.textSub, marginTop: 6 }}>
                    Applies everywhere money is shown — dashboard, payments, bills and reports.
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>Timezone</div>
                  <input value={timezone} onChange={e => setTimezone(e.target.value)} style={fieldStyle} />
                </div>
              </>
            )
          })()}
          <Btn t={t} small onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1500) }}>
            {saved ? '✓ Saved' : 'Save Changes'}
          </Btn>
          <div style={{ fontSize: 11, color: t.textSub, marginTop: 8 }}>Changes apply instantly across the app.</div>
        </Card>

        {/* Appearance */}
        <Card t={t}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 18 }}>Appearance</div>
          <div style={{ fontSize: 13, color: t.textSub, marginBottom: 14, lineHeight: 1.6 }}>
            SynapX GymOS uses a clean, professional light theme for maximum readability at the front desk and on the floor.
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text, marginBottom: 10 }}>Brand color</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {['#E11D2E', '#C4142B', '#8E1420'].map(c => (
              <div key={c} title={c} style={{ width: 30, height: 30, borderRadius: 8, background: c, cursor: 'pointer', border: c === t.accent ? `3px solid ${t.text}` : '3px solid transparent' }} />
            ))}
            <span style={{ fontSize: 12.5, color: t.textSub, marginLeft: 6 }}>Signature red</span>
          </div>
        </Card>

        {/* Biometric */}
        <Card t={t}>
          <div style={{ fontSize: 15, fontWeight: 800, color: t.text, marginBottom: 20 }}>Biometric Configuration</div>
          {biometricToggles.map(({ label, def }) => <ToggleRow key={label} label={label} defaultVal={def} />)}
        </Card>

        {/* Notifications */}
        <Card t={t}>
          <div style={{ fontSize: 15, fontWeight: 800, color: t.text, marginBottom: 20 }}>Notification Settings</div>
          {notifToggles.map(({ label, def }) => <ToggleRow key={label} label={label} defaultVal={def} />)}
        </Card>

      </div>
    </div>
  )
}
