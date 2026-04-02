let io = null

function init(ioInstance) {
  io = ioInstance
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id))
  })
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

module.exports = { init, emitInventoryUpdate, emitPriceUpdate, emitBacktestComplete }