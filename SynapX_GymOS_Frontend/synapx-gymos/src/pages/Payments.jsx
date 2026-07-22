// src/pages/Payments.jsx — Real API data
import { useState } from 'react'
import { paymentService } from '../api/services'
import { usePaginated, useMutation } from '../hooks/useApi'
import { KpiCard, Card, Btn } from '../components/ui/index.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import { useCurrency } from '../context/CurrencyContext.jsx'
import { useGymProfile } from '../context/GymProfileContext.jsx'
import { printInvoice } from '../utils/bill'
import { printTableReport } from '../utils/exporters'

function PayBadge({ status, t }) {
  const map = {
    PAID:      { bg: t.greenSoft,  c: t.green  },
    PENDING:   { bg: t.orangeSoft, c: t.orange },
    OVERDUE:   { bg: t.redSoft,    c: t.red    },
    REFUNDED:  { bg: t.accentSoft, c: t.accent },
    CANCELLED: { bg: t.toggleBg,   c: t.textSub},
  }
  const x = map[status] || map.CANCELLED
  return <span style={{ padding: '3px 9px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 1, background: x.bg, color: x.c, textTransform: 'uppercase' }}>{status}</span>
}

export default function PaymentsPage({ t, user }) {
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
  const { items, pagination, loading, error, refetch, filter, setFilter, page, setPage } = usePaginated(
    (params) => paymentService.list(params)
  )
  const { mutate: markPaid, loading: paying } = useMutation((id) => paymentService.markPaid(id, { method: 'CASH' }))
  const { add: notify, refreshAlerts } = useNotifications()
  const { fmt } = useCurrency()
  const { gymName, logo } = useGymProfile()

  const totalPaid    = items.filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0)
  const totalPending = items.filter(p => p.status === 'PENDING').reduce((s, p) => s + Number(p.amount), 0)
  const totalOverdue = items.filter(p => p.status === 'OVERDUE').reduce((s, p) => s + Number(p.amount), 0)

  const openInvoice = (p) => {
    printInvoice({ payment: p, gymName, logo })
  }

  const handleExportPdf = () => printTableReport({
    title:    'Payments & Billing',
    subtitle: 'Transactions',
    headers:  ['Invoice', 'Member', 'Amount', 'Date', 'Method', 'Status'],
    rows: items.map(p => [
      p.invoiceNo,
      p.member?.fullName || '—',
      fmt(p.amount, 2),
      new Date(p.createdAt).toLocaleDateString(),
      p.method,
      p.status,
    ]),
    gymName, logo,
  })

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: t.text }}>Payments & Billing</h2>
          <p style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>Invoice and transaction management</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn v="ghost" t={t} sm onClick={handleExportPdf}>Export PDF</Btn>
          {isAdmin && <Btn t={t} sm>+ Invoice</Btn>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard label="Collected" value={fmt(totalPaid)}    sub="Paid invoices"   icon="◇" color={t.green}  t={t} />
        <KpiCard label="Pending"   value={fmt(totalPending)} sub="Awaiting payment" icon="⬟" color={t.orange} t={t} />
        <KpiCard label="Overdue"   value={fmt(totalOverdue)} sub="Past due date"    icon="⬡" color={t.red}    t={t} />
        <KpiCard label="Total"     value={pagination.total ?? '—'}             sub="Total invoices"   icon="◆" color={t.accent} t={t} />
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['All', 'PAID', 'PENDING', 'OVERDUE'].map(f => (
          <button key={f} onClick={() => { setFilter(f === 'All' ? {} : { status: f }); setPage(1) }}
            style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${(filter.status === f || (f === 'All' && !filter.status)) ? t.accent : t.border}`, background: (filter.status === f || (f === 'All' && !filter.status)) ? t.accentSoft : 'transparent', color: (filter.status === f || (f === 'All' && !filter.status)) ? t.accent : t.textSub, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: t.redSoft, border: `1px solid ${t.red}30`, borderRadius: 8, color: t.red, fontSize: 13, marginBottom: 16 }}>
          ⚠ {error} — <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={refetch}>retry</span>
        </div>
      )}

      <Card t={t} noPad>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: t.bg }}>
              {['Invoice', 'Member', 'Amount', 'Date', 'Method', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.textSub, letterSpacing: 1.5, textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array(6).fill(0).map((_, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? t.tableRow : t.card }}>
                {Array(7).fill(0).map((_, j) => (
                  <td key={j} style={{ padding: '12px 14px' }}>
                    <div style={{ height: 14, background: t.border, borderRadius: 4, width: '70%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  </td>
                ))}
              </tr>
            )) : items.map((p, i) => (
              <tr key={p.id} style={{ background: i % 2 === 0 ? t.tableRow : t.card }}>
                <td style={{ padding: '11px 14px', fontSize: 11, color: t.accent, fontFamily: 'monospace' }}>{p.invoiceNo}</td>
                <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: t.text }}>{p.member?.fullName || '—'}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 800, color: t.text }}>{fmt(p.amount, 2)}</td>
                <td style={{ padding: '11px 14px', fontSize: 11, color: t.textSub }}>
                  {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td style={{ padding: '11px 14px', fontSize: 11, color: t.textSub }}>{p.method}</td>
                <td style={{ padding: '11px 14px' }}><PayBadge status={p.status} t={t} /></td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <Btn v="ghost" t={t} sm onClick={() => openInvoice(p)}>Invoice</Btn>
                    {isAdmin && p.status !== 'PAID' && (
                      <Btn v="outline" t={t} sm onClick={async () => {
                        await markPaid(p.id)
                        notify({ type: 'payment_paid', title: 'Payment received', message: `Invoice ${p.invoiceNo} (${p.member?.fullName || 'member'}) marked as paid — ${fmt(p.amount, 2)}.` })
                        refetch()
                        refreshAlerts()
                      }}>
                        {paying ? '...' : 'Mark Paid'}
                      </Btn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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
    </div>
  )
}
