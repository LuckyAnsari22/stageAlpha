/**
 * SOCKET.IO SERVICE
 * 
 * Manages real-time bidirectional communication with clients.
 * 
 * Events emitted (server → client):
 *   'inventory:updated' — stock count changed (booking/cancellation)
 *   'price:updated'     — equipment price changed (algorithm/manual)
 *   'backtest:progress'  — current backtest progress update
 *   'backtest:complete'  — backtest finished with results
 *   'booking:created'    — new booking was placed
 *   'booking:cancelled'  — booking was cancelled
 * 
 * Namespaces:
 *   / (default)  — public events (inventory, general notifications)
 *   /admin       — admin-only events (backtest, batch pricing, audit)
 * 
 * Teaching: Socket.IO provides long-polling fallback when WebSocket fails.
 * In production behind load balancers, sticky sessions or Redis adapter
 * would be needed for multi-server deployments.
 */

/**
 * Configure Socket.IO event handlers and namespaces.
 * Called once during server startup.
 * 
 * @param {SocketServer} io - Socket.IO server instance
 */
function setupSocketIO(io) {
  // ==========================================================================
  // DEFAULT NAMESPACE — Public events (inventory updates, general)
  // ==========================================================================
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Client can subscribe to specific equipment updates
    // Usage: socket.emit('subscribe:equipment', { equipmentId: 5 })
    socket.on('subscribe:equipment', (data) => {
      if (data && data.equipmentId) {
        const room = `equipment:${data.equipmentId}`;
        socket.join(room);
        console.log(`   Client ${socket.id} subscribed to ${room}`);
      }
    });

    // Client can unsubscribe
    socket.on('unsubscribe:equipment', (data) => {
      if (data && data.equipmentId) {
        const room = `equipment:${data.equipmentId}`;
        socket.leave(room);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    });
  });

  // ==========================================================================
  // ADMIN NAMESPACE — Restricted events (backtest, pricing, audit)
  // ==========================================================================
  const adminNamespace = io.of('/admin');

  adminNamespace.on('connection', (socket) => {
    console.log(`🔑 Admin connected: ${socket.id}`);

    // Admin can manually trigger events for testing
    socket.on('admin:ping', () => {
      socket.emit('admin:pong', { 
        timestamp: new Date().toISOString(),
        message: 'Admin Socket.IO connection verified' 
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔑 Admin disconnected: ${socket.id} (${reason})`);
    });
  });

  // Store io reference for use in routes
  return io;
}

/**
 * Emit inventory update to all connected clients.
 * Called when stock_qty changes (booking, cancellation, manual update).
 * 
 * @param {SocketServer} io - Socket.IO instance
 * @param {Object} data - { equipment_id, equipment_name, old_qty, new_qty }
 */
function emitInventoryUpdate(io, data) {
  if (!io) return;
  
  // Broadcast to all connected clients
  io.emit('inventory:updated', {
    ...data,
    timestamp: new Date().toISOString()
  });

  // Also emit to equipment-specific room
  io.to(`equipment:${data.equipment_id}`).emit('inventory:updated', {
    ...data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Emit price change event.
 * Called when equipment current_price is modified.
 * 
 * @param {SocketServer} io - Socket.IO instance
 * @param {Object} data - { equipment_id, equipment_name, old_price, new_price, change_pct }
 */
function emitPriceUpdate(io, data) {
  if (!io) return;

  io.emit('price:updated', {
    ...data,
    timestamp: new Date().toISOString()
  });

  // Admin namespace also receives price updates
  io.of('/admin').emit('price:updated', {
    ...data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Emit booking event.
 * Called when a new booking is created or cancelled.
 * 
 * @param {SocketServer} io - Socket.IO instance
 * @param {string} event - 'booking:created' or 'booking:cancelled'
 * @param {Object} data - Booking details
 */
function emitBookingEvent(io, event, data) {
  if (!io) return;

  io.emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Emit backtest progress to admin namespace.
 * 
 * @param {SocketServer} io - Socket.IO instance
 * @param {Object} data - { backtest_id, stage, message, progress }
 */
function emitBacktestProgress(io, data) {
  if (!io) return;

  io.of('/admin').emit('backtest:progress', {
    ...data,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  setupSocketIO,
  emitInventoryUpdate,
  emitPriceUpdate,
  emitBookingEvent,
  emitBacktestProgress
};
