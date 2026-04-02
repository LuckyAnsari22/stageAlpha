'use strict'
require('dotenv').config()
const http = require('http')
const url  = require('url')
const path = require('path')
const express    = require('express')
const helmet     = require('helmet')
const cors       = require('cors')
const cron       = require('node-cron')
const { Server } = require('socket.io')
const config     = require('./config')

const app = express()

// MIDDLEWARE ORDER MATTERS — NEVER REORDER
app.use(helmet({ contentSecurityPolicy: false }))  // 1. Security headers first
app.use(cors({                                       // 2. CORS
  origin: config.app.corsOrigin,
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
}))
app.use(express.json({ limit: '10kb' }))             // 3. Body parsing (limit prevents attacks)
app.use(express.urlencoded({ extended: false }))     // 4. Form body
app.use(require('./middleware/rateLimit').general)   // 5. Rate limiting

// URL normalization middleware (uses built-in url module — required for course)
app.use((req, res, next) => {
  const parsed = url.parse(req.url, true)
  req.normalizedPath = parsed.pathname.toLowerCase()
  next()
})

// Static files (uses built-in path module — required for course)
app.use(express.static(path.join(__dirname, 'public')))

// Routes
app.use('/api/v1/auth',       require('./routes/auth'))
app.use('/api/v1/equipment',  require('./routes/equipment'))
app.use('/api/v1/categories', require('./routes/categories'))
app.use('/api/v1/venues',     require('./routes/venues'))
app.use('/api/v1/bookings',   require('./routes/bookings'))
app.use('/api/v1/customers',  require('./routes/customers'))
app.use('/api/v1/payments',   require('./routes/payments'))
app.use('/api/v1/analytics',  require('./routes/analytics'))
app.use('/api/v1/pricing',    require('./routes/pricing'))
app.use('/api/v1/backtest',   require('./routes/backtest'))

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } })
})

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
  }
})

// Error handler MUST be last
app.use(require('./middleware/errorHandler'))

// HTTP server (uses built-in http module — required for course)
const server = http.createServer(app)

// Socket.IO
const io = new Server(server, { cors: { origin: config.app.corsOrigin, credentials: true } })
require('./services/socket').init(io)

// Cron: nightly price update at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('[CRON] Running nightly price update...')
  try {
    const { pool } = require('./config/db')
    await pool.query('SELECT run_batch_price_update()')
    console.log('[CRON] Price update complete')
  } catch (err) {
    console.error('[CRON] Price update failed:', err.message)
  }
})

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`[${signal}] Shutting down gracefully...`)
  server.close(() => {
    require('./config/db').pool.end()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))

// Start
server.listen(config.app.port, () => {
  console.log(`StageAlpha running on port ${config.app.port} [${config.app.nodeEnv}]`)
})

module.exports = { app, io }
