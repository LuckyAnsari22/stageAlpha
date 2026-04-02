const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stagealpha',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'stagealpha123',
});

async function runSchema() {
  try {
    const schema = fs.readFileSync('./db/schema.sql', 'utf8');
    await pool.query(schema);
    console.log('Successfully applied academic schema to the database.');
  } catch (err) {
    console.error('Error applying schema:', err);
  } finally {
    pool.end();
  }
}

runSchema();
