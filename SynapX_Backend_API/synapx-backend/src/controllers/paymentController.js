// DEPRECATED — the live payment logic is implemented inline in src/routes/payments.js.
// This controller was an unused second implementation (Stripe checkout + PDFKit
// invoice) that diverged from what actually runs. Invoices are printed client-side
// in the frontend (src/utils/bill.js). Kept as an empty module so nothing breaks
// if it is still required.
module.exports = {}
