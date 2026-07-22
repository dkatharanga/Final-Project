'use strict'
require('dotenv').config()
require('express-async-errors')

const express = require('express')
const cors    = require('cors')
const helmet  = require('helmet')
const morgan  = require('morgan')
const path    = require('path')

const { connectPrisma } = require('./config/prisma')
const { rateLimiter }   = require('./middleware/rateLimiter')

const app  = express()
const PORT = process.env.PORT || 5000

// ── FAIL FAST ON MISSING SECRETS ──────────────────────────────────
// Signing/verifying JWTs with an undefined secret silently produces broken
// tokens, so refuse to boot without them instead of failing later at runtime.
const REQUIRED_ENV = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL']
const missing = REQUIRED_ENV.filter((k) => !process.env[k])
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`)
  console.error('   Set them in SynapX_Backend_API/synapx-backend/.env before starting.')
  process.exit(1)
}

// ── SECURITY & PARSING ────────────────────────────────────────────
app.use(helmet())

// Allow the admin frontend and the entry kiosk (which may run on another port).
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  process.env.KIOSK_URL    || 'http://localhost:3001',
]
app.use(cors({
  origin: (origin, cb) => {
    // Non-browser clients (curl, kiosk device) send no Origin — allow them.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    return cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Face enrolment posts base64 webcam JPEGs, which exceed the 100kb default.
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(morgan('dev'))

// Static uploads (member photos)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// ── RATE LIMITING ─────────────────────────────────────────────────
// Tight on auth (brute-force defence); generous elsewhere so kiosk polling
// and normal dashboard use are never throttled.
app.use('/api/v1/auth', rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }))
app.use('/api/v1',      rateLimiter({ windowMs: 15 * 60 * 1000, max: 2000 }))

// ── HEALTH CHECK ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'SynapX GymOS API', version: '2.0.0' })
})

// ── ROUTES ────────────────────────────────────────────────────────
app.use('/api/v1/auth',       require('./routes/auth'))
app.use('/api/v1/members',    require('./routes/members'))
app.use('/api/v1/attendance', require('./routes/attendance'))
app.use('/api/v1/payments',   require('./routes/payments'))
app.use('/api/v1/dashboard',  require('./routes/dashboard'))
app.use('/api/v1/classes',    require('./routes/classes'))
app.use('/api/v1/staff',      require('./routes/staff'))
app.use('/api/v1/reports',    require('./routes/reports'))
app.use('/api/v1/biometric',  require('./routes/biometric'))

// ── 404 ───────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// ── ERROR HANDLER ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.message)
  const status = err.status || (err.message === 'Not allowed by CORS' ? 403 : 500)
  res.status(status).json({ success: false, message: err.message })
})

// ── START ─────────────────────────────────────────────────────────
async function start() {
  try {
    await connectPrisma()
    app.listen(PORT, () => {
      console.log(`🚀 SynapX GymOS API running on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('❌ Failed to start:', err.message)
    process.exit(1)
  }
}

start()
module.exports = app
