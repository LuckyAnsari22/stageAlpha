const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stagealpha',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : 'stagealpha123',
  max: 20, // Keep 20 connections open max
  idleTimeoutMillis: 30000,
});

pool.on('connect', () => {
  logger.debug('PostgreSQL Pool Connection Acquired');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  // Query executed on a generic available pool client
  query: (text, params) => pool.query(text, params),
  
  // Expose the raw pool to reserve dedicated listeners if needed
  getPool: () => pool,
  
  // Dedicated client lease for transactions/listeners
  getClient: () => pool.connect()
};
