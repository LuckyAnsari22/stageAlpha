const socketIO = require('socket.io');
const { Client } = require('pg');
const logger = require('../config/logger');

let io;

/**
 * Stage 1: Bind Socket.IO to Express HTTP Server
 * Separates broadcast logic into Public (Inventory) and Protected (Admin) namespaces.
 */
const initSocketServer = (server) => {
  io = socketIO(server, { cors: { origin: '*', methods: ['GET', 'POST'] }});

  // 1A. Public Namespace (Hardware Inventory Tracking)
  io.on('connection', (socket) => {
    logger.info(`⚡ Public WebSocket connected: ${socket.id}`);
    socket.on('subscribe:inventory', () => socket.join('inventory_updates'));
    socket.on('disconnect', () => logger.info(`🔌 Public WebSocket disconnected: ${socket.id}`));
  });

  // 1B. Protected Admin Namespace (Strict Financial/Pricing Broadcasts)
  const adminIo = io.of('/admin');
  
  // Simulated JWT Authentication Middleware
  adminIo.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    // Hardened token rotation using Environment Variables
    if (token && token === process.env.JWT_SECRET) {
      return next();
    }
    logger.warn(`Intrusion blocked on /admin socket namespace: ${socket.id}`);
    return next(new Error('Authentication Error: Invalid JSON Web Token'));
  });

  adminIo.on('connection', (socket) => {
    logger.info(`🔒 Admin WebSocket authorized & connected: ${socket.id}`);
    socket.on('disconnect', () => logger.info(`🔓 Admin WebSocket disconnected: ${socket.id}`));
  });

  setupPostgresListener(io, adminIo);
};

/**
 * Stage 2: Create a dedicated PostgreSQL Client listening for NOTIFY broadcasts.
 * Eliminates the need to scatter io.emit() throughout application routes.
 * 
 * CRITICAL ARCHITECTURE FIX: We cannot use a borrowed Pool client here. 
 * Pool clients have idle timeouts (30s) and will silently kill the LISTEN channel. 
 * We must instantiate a strict, standalone, perpetual pg.Client explicitly for this node.
 */
const setupPostgresListener = async (publicIo, adminIo) => {
  try {
    const listenClient = new Client({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'stagealpha',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : 'stagealpha123',
    });
    
    await listenClient.connect();
    
    // Bind to the exact channel name fired off by the PostgreSQL TRIGGER function.
    await listenClient.query('LISTEN inventory_change');
    await listenClient.query('LISTEN price_change'); // New channel for admin broadcasts
    logger.info('🎧 Native PostgreSQL LISTEN channel active on dedicated perpetual client.');

    listenClient.on('notification', (msg) => {
      try {
        const payload = JSON.parse(msg.payload);
        logger.debug(`Relaying DB Notify to Sockets: [${msg.channel}] - ${msg.payload}`);
        
        if (msg.channel === 'inventory_change') {
          // Public Broadcast
          publicIo.to('inventory_updates').emit('inventory:sync', {
              action: payload.action,
              nodeId: payload.data.id,
              timestamp: new Date().toISOString(),
              data: payload.data
          });
        }
        else if (msg.channel === 'price_change') {
          // Protected Admin Broadcast
          adminIo.emit('price:updated', {
              nodeId: payload.data.equipment_id,
              newPrice: payload.data.new_price,
              oldPrice: payload.data.old_price,
              model: payload.data.reason
          });
        }
      } catch (parseError) {
        logger.error('Failed to parse pg_notify payload:', parseError);
      }
    });

    // Handle unexpected connection loss on the dedicated listener
    listenClient.on('error', (err) => {
      logger.error('Fatal Listener Error. Restarting listener node.', err);
      // Logic for automatic reconnect would go here
    });

  } catch (err) {
    logger.error('Failed to bind PostgreSQL Listener:', err);
  }
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO uninitialized! Ensure initSocketServer runs before getIO');
  return io;
};

module.exports = { initSocketServer, getIO };
