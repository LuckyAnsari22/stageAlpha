let io = null

function init(ioInstance) {
  io = ioInstance
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)
    socket.on('auth:join', (userId) => {
      socket.join('user:' + userId)
    })
    socket.on('telemetry:subscribe', (eventId) => {
      socket.join('telemetry:' + eventId)
      console.log('User joined telemetry for event:', eventId)
    })
    socket.on('telemetry:unsubscribe', (eventId) => {
      socket.leave('telemetry:' + eventId)
    })
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id))
  })

  // Start Background Telemetry Simulator
  setInterval(() => {
    if (!io) return;
    
    // Simulate data for "Event 1" (Mocked Active Booking)
    const mockTelemetry = {
      timestamp: new Date().toISOString(),
      decibels: Math.floor(Math.random() * 25) + 85, // 85 - 110 dB
      temperature: Math.random() * 15 + 45, // 45 - 60 C
      voltage: Math.random() * 0.5 + 239.5, // 239.5 - 240.0 V
      power_draw_watts: Math.floor(Math.random() * 2000) + 4000, // 4000 - 6000 W
      alerts: []
    }

    if (mockTelemetry.temperature > 58) {
      mockTelemetry.alerts.push({ level: 'CRITICAL', msg: 'Subwoofer 02 Core Temp Limit Reached' });
    }
    if (mockTelemetry.decibels > 105) {
      mockTelemetry.alerts.push({ level: 'WARNING', msg: 'Acoustic Saturation above OSHA guidelines' });
    }

    io.to('telemetry:1').emit('telemetry:stream', mockTelemetry);
  }, 1500) // Emit every 1.5s
}

async function createNotification(customerId, type, title, message, link) {
  const { pool } = require('../config/db')
  const { rows } = await pool.query(
    `INSERT INTO notifications (customer_id, type, title, message, link)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [customerId, type, title, message, link]
  )
  if (io) {
    io.to('user:' + customerId).emit('notification:new', rows[0])
  }
  return rows[0]
}

async function emitInventoryUpdate(equipmentIds) {
  if (!io || !equipmentIds || equipmentIds.length === 0) return
  const { pool } = require('../config/db')
  for (const id of equipmentIds) {
    const { rows } = await pool.query(
      'SELECT id, name, stock_qty FROM equipment WHERE id = $1', [id]
    )
    if (rows[0]) io.emit('inventory:updated', rows[0])
  }
}

function emitPriceUpdate(data) {
  if (!io) return
  io.emit('price:updated', data)
}

function emitBacktestComplete(result) {
  if (!io) return
  io.emit('backtest:complete', result)
}

function emitNewBooking(data) {
  if (!io) return
  io.emit('booking:new', data)
}

module.exports = { init, emitInventoryUpdate, emitPriceUpdate, emitBacktestComplete, emitNewBooking, createNotification }