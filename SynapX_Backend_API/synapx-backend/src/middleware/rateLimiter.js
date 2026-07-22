// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit')

const rateLimiter = (options = {}) => rateLimit({
  windowMs: options.windowMs || 15 * 60 * 1000,
  max:      options.max      || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (req, res) => res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
  }),
})

module.exports = { rateLimiter }
