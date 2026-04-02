const { Pool } = require('pg');
const config = require('./index');

const pgConfig = config.db.url.includes('railway') || config.app.nodeEnv === 'production'
  ? { connectionString: config.db.url, ssl: { rejectUnauthorized: false }, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 }
  : { connectionString: config.db.url, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 };

const pool = new Pool(pgConfig);

pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err);
});

module.exports = {
    pool,
    query: async (text, params) => {
        try {
            return await pool.query(text, params);
        } catch (error) {
            console.error('[DB Query Error]', error.message);
            console.error('Query:', text, '\nParams:', params);
            throw error;
        }
    }
};
