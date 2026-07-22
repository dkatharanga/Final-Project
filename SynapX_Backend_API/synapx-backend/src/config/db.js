// src/config/db.js
// PostgreSQL connection pool

const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'synapx_gymos',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,                  // max pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌  PostgreSQL connection failed:', err.message)
    console.error('   Check your .env DB_* values and make sure PostgreSQL is running.')
    return
  }
  release()
  console.log('✅  PostgreSQL connected →', process.env.DB_NAME)
})

// Helper: run a query
const query = (text, params) => pool.query(text, params)

// Helper: get a client for transactions
const getClient = () => pool.connect()

module.exports = { query, getClient, pool }
