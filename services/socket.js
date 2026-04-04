let io = null
let adminConnections = new Set()

function init(ioInstance) {
  io = ioInstance
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)
    
    socket.on('auth:join', (userId) => {
      socket.join('user:' + userId)
    })
    
    socket.on('admin:join', (userId) => {
      socket.join('admin:all')
      adminConnections.add(socket.id)
      console.log('Admin connected, total admins:', adminConnections.size)
      // Notify admin dashboard about connection
      io.to('admin:all').emit('admin:connection-status', {
        activeAdmins: adminConnections.size,
        timestamp: new Date().toISOString()
      })
    })
    
    socket.on('admin:leave', () => {
      adminConnections.delete(socket.id)
      io.to('admin:all').emit('admin:connection-status', {
        activeAdmins: adminConnections.size,
        timestamp: new Date().toISOString()
      })
    })
    
    socket.on('telemetry:subscribe', (eventId) => {
      socket.join('telemetry:' + eventId)
      console.log('User joined telemetry for event:', eventId)
    })
    
    socket.on('telemetry:unsubscribe', (eventId) => {
      socket.leave('telemetry:' + eventId)
    })
    
    socket.on('disconnect', () => {
      adminConnections.delete(socket.id)
      console.log('Client disconnected:', socket.id)
      if (adminConnections.size > 0) {
        io.to('admin:all').emit('admin:connection-status', {
          activeAdmins: adminConnections.size,
          timestamp: new Date().toISOString()
        })
      }
    })
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
  
  // Background admin dashboard update emitter (every 3 seconds)
  setInterval(() => {
    if (!io || adminConnections.size === 0) return;
    emitAdminDashboardUpdate();
  }, 3000);
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
      'SELECT id, name, stock_qty, base_price, current_price FROM equipment WHERE id = $1', [id]
    )
    if (rows[0]) {
      io.to('admin:all').emit('inventory:updated', rows[0])
      // Also emit to general broadcast for dashboard
      io.emit('inventory:changed', rows[0])
    }
  }
}

function emitPriceUpdate(data) {
  if (!io) return
  io.to('admin:all').emit('price:updated', data)
}

function emitBacktestComplete(result) {
  if (!io) return
  io.to('admin:all').emit('backtest:complete', result)
}

function emitNewBooking(data) {
  if (!io) return
  io.to('admin:all').emit('booking:new', data)
}

async function emitAdminDashboardUpdate() {
  if (!io || adminConnections.size === 0) return;
  
  try {
    const { pool } = require('../config/db')
    
    // Get real-time stats
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*)::int FROM bookings WHERE DATE(created_at) = CURRENT_DATE) AS today_bookings,
        (SELECT COUNT(*)::int FROM bookings WHERE status='pending') AS pending_bookings,
        (SELECT COUNT(*)::int FROM equipment WHERE stock_qty <= 3 AND is_active = true) AS low_stock_items,
        (SELECT COUNT(DISTINCT customer_id)::int FROM bookings WHERE DATE(created_at) = CURRENT_DATE) AS active_customers_today,
        (SELECT COALESCE(SUM(total_price), 0)::float FROM bookings WHERE DATE(event_date) = CURRENT_DATE AND status IN ('confirmed','completed')) AS today_revenue,
        (SELECT json_agg(t) FROM (
          SELECT b.id, b.customer_id, c.name as customer_name, b.event_date, b.status, b.total_price, b.created_at 
          FROM bookings b 
          JOIN customers c ON b.customer_id = c.id 
          WHERE b.created_at > NOW() - INTERVAL '1 hour'
          ORDER BY b.created_at DESC LIMIT 10
        ) t) AS recent_bookings
    `)
    
    const data = statsResult.rows[0]
    data.recent_bookings = data.recent_bookings || []
    data.timestamp = new Date().toISOString()
    
    io.to('admin:all').emit('dashboard:update', data)
  } catch (err) {
    console.error('Error emitting dashboard update:', err)
  }
}

module.exports = { init, emitInventoryUpdate, emitPriceUpdate, emitBacktestComplete, emitNewBooking, createNotification, emitAdminDashboardUpdate }