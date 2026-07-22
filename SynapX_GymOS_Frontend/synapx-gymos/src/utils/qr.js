// src/utils/qr.js
// QR generation backed by the proven `qrcode` library (browser build — uses
// TextEncoder/Uint8Array, no Node Buffer, so it works in Vite/Windows browsers).
// We keep a small SYNCHRONOUS API + our own renderers so callers (QRBlock,
// downloadQR, bill.js) stay unchanged.
import QRCode from 'qrcode'

// text -> boolean[][] (true = dark module). Error-correction level M.
export function qrMatrix(text) {
  const { modules } = QRCode.create(String(text), { errorCorrectionLevel: 'M' })
  const size = modules.size
  const data = modules.data
  const m = []
  for (let r = 0; r < size; r++) {
    const row = new Array(size)
    for (let c = 0; c < size; c++) row[c] = !!data[r * size + c]
    m.push(row)
  }
  return m
}

// text -> PNG data URL (for saving/downloading or embedding in a printed bill).
export function qrPngDataUrl(text, { scale = 10, quiet = 4 } = {}) {
  const m = qrMatrix(text)
  const n = m.length
  const dim = (n + quiet * 2) * scale
  const canvas = document.createElement('canvas')
  canvas.width = dim
  canvas.height = dim
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, dim, dim)
  ctx.fillStyle = '#17181C'
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (m[r][c]) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale)
  return canvas.toDataURL('image/png')
}
