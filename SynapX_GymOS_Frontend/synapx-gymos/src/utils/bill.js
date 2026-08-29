// src/utils/bill.js
// Opens a clean, printable admission-fee receipt in a new window and triggers
// the browser print dialog. Self-contained — no backend PDF needed.
import { qrPngDataUrl } from './qr'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
))

// Company footer shown on every printed invoice.
const SYNAPX_TEC = {
  name:  'SynapX Tec (Pvt) Ltd',
  line:  '42 Innovation Drive, Colombo 05, Sri Lanka',
  phone: '+94 11 555 0100',
  email: 'hello@synapxtec.com',
  web:   'www.synapxtec.com',
}

const openPrintWindow = (html) => {
  const w = window.open('', '_blank', 'width=520,height=760')
  if (!w) return false
  w.document.open(); w.document.write(html); w.document.close()
  return true
}

// ── PAYMENT INVOICE ──────────────────────────────────────────────
// Printable invoice for a single payment: gym logo + name on top, transaction
// details, then SynapX Tec company details at the bottom.
export function printInvoice({ payment, gymName = 'SynapX GymOS', logo = '', currency }) {
  const amount = Number(payment?.amount || 0).toFixed(2)
  // Prefer the live Settings → General currency (matches every other screen);
  // fall back to what was recorded on the payment if the caller doesn't pass one.
  const cur    = currency || payment?.currency || 'USD'
  const status = payment?.status || 'PAID'
  const when   = new Date(payment?.createdAt || Date.now()).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  const member = payment?.member || {}
  const paidColor = status === 'PAID' ? '#15803D' : status === 'OVERDUE' ? '#E11D2E' : '#B45309'

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(payment?.invoiceNo || 'Invoice')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', system-ui, Arial, sans-serif; color: #17181C; margin: 0; padding: 32px; }
  .sheet { max-width: 460px; margin: 0 auto; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #E11D2E; padding-bottom: 16px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { width: 46px; height: 46px; border-radius: 10px; object-fit: cover; }
  .brand .badge { width: 46px; height: 46px; border-radius: 10px; background: #E11D2E; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; }
  .gym { font-size: 18px; font-weight: 800; }
  .muted { color: #6B7280; font-size: 12px; }
  h1 { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #6B7280; margin: 22px 0 10px; }
  .row { display: flex; justify-content: space-between; font-size: 13px; padding: 5px 0; }
  .total { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid #E5E7EB; }
  .total .amt { font-size: 22px; font-weight: 800; }
  .paid { display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 1px; padding: 4px 10px; border-radius: 5px; }
  .footer { margin-top: 30px; padding-top: 14px; border-top: 1px dashed #D1D5DB; text-align: center; color: #6B7280; font-size: 11px; line-height: 1.7; }
  .footer .co { font-weight: 700; color: #17181C; font-size: 12px; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <div class="sheet">
    <div class="top">
      <div class="brand">
        ${logo ? `<img src="${logo}" alt="">` : `<div class="badge">${esc((gymName || 'S').trim().charAt(0).toUpperCase())}</div>`}
        <div>
          <div class="gym">${esc(gymName)}</div>
          <div class="muted">Payment Invoice</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;font-size:13px">${esc(payment?.invoiceNo || '')}</div>
        <div class="muted">${esc(when)}</div>
      </div>
    </div>

    <h1>Billed to</h1>
    <div class="row"><span>Member</span><b>${esc(member.fullName || '—')}</b></div>
    ${member.memberCode ? `<div class="row"><span>Member ID</span><b>${esc(member.memberCode)}</b></div>` : ''}

    <h1>Payment</h1>
    <div class="row"><span>${esc(payment?.notes || 'Membership payment')}</span><b>${esc(cur)} ${amount}</b></div>
    <div class="row"><span>Method</span><b>${esc(payment?.method || 'CASH')}</b></div>
    <div class="row"><span>Status</span><span class="paid" style="color:${paidColor};background:${paidColor}1A">${esc(status)}</span></div>

    <div class="total">
      <div class="muted">Total ${esc(cur)}</div>
      <div class="amt">${esc(cur)} ${amount}</div>
    </div>

    <div class="footer">
      <div class="co">${esc(SYNAPX_TEC.name)}</div>
      <div>${esc(SYNAPX_TEC.line)}</div>
      <div>${esc(SYNAPX_TEC.phone)} · ${esc(SYNAPX_TEC.email)} · ${esc(SYNAPX_TEC.web)}</div>
      <div style="margin-top:6px">Powered by SynapX GymOS</div>
    </div>
  </div>
  <script>window.onload = function(){ window.print(); };</script>
</body></html>`

  return openPrintWindow(html)
}

export function printBill({ member, payment, gym = 'SynapX GymOS', logo = '', currency }) {
  const code   = member?.memberCode || ''
  const amount = Number(payment?.amount || 0).toFixed(2)
  const cur    = currency || payment?.currency || 'USD'
  const when   = new Date(payment?.createdAt || Date.now()).toLocaleString('en-US', {
    dateStyle: 'medium', timeStyle: 'short',
  })
  let qr = ''
  try { qr = code ? qrPngDataUrl(code, { scale: 6 }) : '' } catch { qr = '' }

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(payment?.invoiceNo || 'Receipt')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', system-ui, Arial, sans-serif; color: #17181C; margin: 0; padding: 32px; }
  .sheet { max-width: 420px; margin: 0 auto; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #E11D2E; padding-bottom: 14px; }
  .brand { font-size: 20px; font-weight: 800; color: #E11D2E; }
  .muted { color: #6B7280; font-size: 12px; }
  h1 { font-size: 15px; letter-spacing: 2px; text-transform: uppercase; color: #6B7280; margin: 22px 0 10px; }
  .row { display: flex; justify-content: space-between; font-size: 13px; padding: 5px 0; }
  .row b { font-weight: 700; }
  .total { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid #E5E7EB; }
  .total .amt { font-size: 22px; font-weight: 800; }
  .paid { display: inline-block; margin-top: 6px; font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #15803D; background: #DCFCE7; padding: 4px 10px; border-radius: 5px; }
  .qr { text-align: center; margin-top: 22px; }
  .qr img { width: 130px; height: 130px; }
  .foot { text-align: center; color: #9CA3AF; font-size: 11px; margin-top: 24px; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <div class="sheet">
    <div class="top">
      <div style="display:flex;align-items:center;gap:10px">
        ${logo ? `<img src="${logo}" alt="" style="width:42px;height:42px;border-radius:9px;object-fit:cover">` : ''}
        <div>
          <div class="brand">${esc(gym)}</div>
          <div class="muted">Admission Receipt</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;font-size:13px">${esc(payment?.invoiceNo || '')}</div>
        <div class="muted">${esc(when)}</div>
      </div>
    </div>

    <h1>Billed to</h1>
    <div class="row"><span>Member</span><b>${esc(member?.fullName || '')}</b></div>
    <div class="row"><span>Member ID</span><b>${esc(code)}</b></div>
    ${member?.phone ? `<div class="row"><span>Phone</span><b>${esc(member.phone)}</b></div>` : ''}

    <h1>Details</h1>
    <div class="row"><span>Membership admission fee</span><b>${esc(cur)} ${amount}</b></div>
    <div class="row"><span>Method</span><b>${esc(payment?.method || 'CASH')}</b></div>

    <div class="total">
      <div>
        <div class="muted">Total</div>
        <div class="paid">${esc(payment?.status || 'PAID')}</div>
      </div>
      <div class="amt">${esc(cur)} ${amount}</div>
    </div>

    ${qr ? `<div class="qr"><img src="${qr}" alt="Member QR"><div class="muted">Scan at the entry kiosk</div></div>` : ''}

    <div class="foot">
      Thank you for joining ${esc(gym)}.<br>
      <b style="color:#17181C">${esc(SYNAPX_TEC.name)}</b> · ${esc(SYNAPX_TEC.line)}<br>
      ${esc(SYNAPX_TEC.phone)} · ${esc(SYNAPX_TEC.email)} · ${esc(SYNAPX_TEC.web)}
    </div>
  </div>
  <script>window.onload = function(){ window.print(); };</script>
</body></html>`

  return openPrintWindow(html)
}
