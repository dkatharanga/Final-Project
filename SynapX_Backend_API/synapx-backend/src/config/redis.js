// src/config/redis.js
const { createClient } = require('redis')
const logger = require('../utils/logger')

const redis = createClient({ url: process.env.REDIS_URL })

redis.on('error',  (err) => logger.error('Redis error:', err))
redis.on('connect',()    => logger.info('Redis client connected'))

async function connectRedis() {
  await redis.connect()
}

// ─── HELPERS ─────────────────────────────────────────────────────
async function getCache(key) {
  const val = await redis.get(key)
  return val ? JSON.parse(val) : null
}

async function setCache(key, value, ttlSeconds = 300) {
  await redis.setEx(key, ttlSeconds, JSON.stringify(value))
}

async function delCache(key) {
  await redis.del(key)
}

async function delCachePattern(pattern) {
  const keys = await redis.keys(pattern)
  if (keys.length) await redis.del(keys)
}

module.exports = { redis, connectRedis, getCache, setCache, delCache, delCachePattern }
