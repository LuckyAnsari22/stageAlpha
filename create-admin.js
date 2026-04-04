#!/usr/bin/env node

/**
 * Create admin account if it doesn't exist
 */

const { Pool } = require('pg');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAdmin() {
  const client = await pool.connect();
  try {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   Admin Account Setup                      ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Check if admin exists
    const check = await client.query(
      'SELECT id, email, role FROM customers WHERE email = $1',
      ['admin@stagealpha.com']
    );

    if (check.rows.length > 0) {
      console.log('✅ Admin account already exists:\n');
      console.log(`   Email: ${check.rows[0].email}`);
      console.log(`   Role: ${check.rows[0].role}`);
      console.log(`   ID: ${check.rows[0].id}\n`);
      console.log('🔐 Login credentials:\n');
      console.log('   Email: admin@stagealpha.com');
      console.log('   Password: password123\n');
      return;
    }

    // Create admin
    console.log('Creating admin account...\n');
    const hash = await bcrypt.hash('password123', 12);
    
    const result = await client.query(
      `INSERT INTO customers (name, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, email, role`,
      ['Lucky Admin', 'admin@stagealpha.com', hash, 'admin']
    );

    console.log('✅ Admin account created successfully!\n');
    console.log('Account details:\n');
    console.log(`   ID: ${result.rows[0].id}`);
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Role: ${result.rows[0].role}\n`);
    console.log('🔐 Login with:\n');
    console.log('   Email: admin@stagealpha.com');
    console.log('   Password: password123\n');

  } catch (err) {
    console.error('❌ Error:', err.message, '\n');
    console.error('Make sure:');
    console.error('1. PostgreSQL is running');
    console.error('2. Database exists (run: npm run db:init)');
    console.error('3. .env file has correct DATABASE_URL\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createAdmin();
