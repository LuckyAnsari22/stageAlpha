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

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      const ms = Date.now() - start
      const color = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m'
      console.log(`${color}${req.method}\x1b[0m ${req.path} → ${res.statusCode} (${ms}ms)`)
    }
  })
  next()
})

// URL normalization middleware (uses built-in url module — required for course)
app.use((req, res, next) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    req.normalizedPath = parsedUrl.pathname.toLowerCase()
  } catch {
    req.normalizedPath = req.path.toLowerCase()
  }
  next()
})

// Static files (uses built-in path module — required for course)
app.use(express.static(path.join(__dirname, 'public')))

// Routes
app.use('/api', require('./middleware/rateLimit').general) // Apply rate limiting ONLY to APIs, not static files!
app.use('/api/v1/auth',       require('./routes/auth'))
app.use('/api/v1/equipment',  require('./routes/equipment'))
app.use('/api/v1/categories', require('./routes/categories'))
app.use('/api/v1/venues',     require('./routes/venues'))
app.use('/api/v1/bookings',   require('./routes/bookings'))
app.use('/api/v1/customers',  require('./routes/customers'))
app.use('/api/v1/payments',   require('./routes/payments'))
app.use('/api/v1/analytics',  require('./routes/analytics'))
app.use('/api/v1/pricing',       require('./routes/pricing'))
app.use('/api/v1/backtest',      require('./routes/backtest'))
app.use('/api/v1/packages',      require('./routes/packages'))
app.use('/api/v1/quotes',        require('./routes/quotes'))
app.use('/api/v1/notifications', require('./routes/notifications'))
app.use('/api/v1/staff',         require('./routes/staff'))
app.use('/api/v1/intelligence',  require('./routes/intelligence'))

// TEMPORARY DB INIT ENDPOINT to force Render to populate
app.get('/api/v1/force-init', async (req, res) => {
  try {
    const { exec } = require('child_process');
    exec('node db/safe-migrate.js', (err, stdout, stderr) => {
      res.send(`
        <html><body>
        <h2>Database Initialization Result</h2>
        <pre style="background:#eee;padding:10px;">${stdout}</pre>
        <pre style="color:red;">${stderr}</pre>
        ${err ? '<h3 style="color:red">ERROR: ' + err.message + '</h3>' : '<h3 style="color:green">SUCCESS! Now return to your app.</h3>'}
        </body></html>
      `);
    });
  } catch (e) {
    res.status(500).send(e.toString());
  }
});
// Health check with DB verification
app.get('/api/v1/health', async (req, res) => {
  try {
    const { pool } = require('./config/db')
    const dbResult = await pool.query('SELECT NOW() AS server_time')
    res.json({
      success: true,
      data: {
        status: 'healthy',
        uptime: Math.round(process.uptime()),
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        db: 'connected',
        db_time: dbResult.rows[0].server_time,
        node_version: process.version
      }
    })
  } catch (err) {
    res.status(503).json({
      success: false,
      data: { status: 'degraded', uptime: Math.round(process.uptime()), db: 'disconnected', error: err.message }
    })
  }
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
    await pool.query('CALL batch_update_prices()')
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
