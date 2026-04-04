#!/usr/bin/env node

/**
 * Force create/update admin account
 * This will delete existing admin and create fresh one
 */

const { Pool } = require('pg');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setup() {
  const client = await pool.connect();
  try {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   Force Creating Admin Account             ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Hash the password
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash('password123', 12);
    console.log('✅ Password hashed\n');

    // Check if admin exists
    console.log('Checking for existing admin...');
    const check = await client.query(
      'SELECT id FROM customers WHERE email = $1',
      ['admin@stagealpha.com']
    );

    if (check.rows.length > 0) {
      console.log('Found existing admin. Updating...\n');
      await client.query(
        `UPDATE customers 
         SET name = $1, password_hash = $2, role = $3, is_active = true, updated_at = NOW()
         WHERE email = $4`,
        ['Lucky Admin', passwordHash, 'admin', 'admin@stagealpha.com']
      );
    } else {
      console.log('Admin not found. Creating new...\n');
      await client.query(
        `INSERT INTO customers (name, email, password_hash, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
        ['Lucky Admin', 'admin@stagealpha.com', passwordHash, 'admin']
      );
    }

    console.log('✅ Admin account ready!\n');
    console.log('═══════════════════════════════════════════\n');
    console.log('🔐 LOGIN CREDENTIALS:\n');
    console.log('   Email: admin@stagealpha.com');
    console.log('   Password: password123\n');
    console.log('═══════════════════════════════════════════\n');
    console.log('Next steps:');
    console.log('1. Refresh browser (Ctrl+F5)');
    console.log('2. Go to http://localhost:3000');
    console.log('3. Click "Sign In"');
    console.log('4. Enter the credentials above');
    console.log('5. Click Sign In\n');

  } catch (err) {
    console.error('❌ Error:', err.message, '\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
