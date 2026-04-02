const rateLimit = require('express-rate-limit')

const general = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { success: false, message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
})

const login = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: 'Too many login attempts. Wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const register = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, message: 'Too many registration attempts. Wait an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
})

module.exports = { general, login, register }
