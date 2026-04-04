#!/usr/bin/env node

/**
 * StageAlpha Diagnostic & Startup Script
 * Identifies and fixes common startup issues
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔═══════════════════════════════════════════╗');
console.log('║   StageAlpha Diagnostics & Startup       ║');
console.log('╚═══════════════════════════════════════════╝\n');

// Step 1: Check .env file
console.log('📋 Step 1: Checking .env file...');
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.error('   Please create .env file with DATABASE_URL');
  process.exit(1);
}
require('dotenv').config();
console.log('✅ .env file loaded\n');

// Step 2: Check required env variables
console.log('🔐 Step 2: Checking environment variables...');
const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('❌ Missing env variables:', missing.join(', '));
  console.error('   Add these to .env file');
  process.exit(1);
}
console.log('✅ All required env variables present\n');

// Step 3: Check database connection
console.log('🗄️  Step 3: Testing database connection...');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('❌ Database connection failed!');
    console.error('   Error:', err.message);
    console.error('\n   Troubleshooting:');
    console.error('   1. Is PostgreSQL running?');
    console.error('   2. Is DATABASE_URL correct in .env?');
    console.error('   3. Do credentials match your PostgreSQL setup?');
    console.error('\n   Your DATABASE_URL:', process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@'));
    await pool.end();
    process.exit(1);
  }

  console.log('✅ Database connection successful');
  console.log('   Connected at:', res.rows[0].now, '\n');

  // Step 4: Check if schema exists
  console.log('📊 Step 4: Checking database schema...');
  pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LIMIT 1
  `, async (err, res) => {
    if (err || res.rows.length === 0) {
      console.warn('⚠️  Database schema not initialized!');
      console.log('\n   Run this command to initialize:');
      console.log('   npm run db:reset\n');
      await pool.end();
      process.exit(1);
    }

    console.log('✅ Database schema exists\n');

    // Step 5: Check admin account
    console.log('👤 Step 5: Checking admin account...');
    pool.query(
      'SELECT id, email, role FROM customers WHERE email = $1',
      ['admin@stagealpha.com'],
      async (err, res) => {
        if (err) {
          console.error('❌ Error checking admin:', err.message);
          await pool.end();
          process.exit(1);
        }

        if (res.rows.length === 0) {
          console.warn('⚠️  Admin account not found!');
          console.log('   The schema exists but is empty.');
          console.log('   Run: npm run db:reset\n');
          await pool.end();
          process.exit(1);
        }

        console.log('✅ Admin account found');
        console.log('   Email:', res.rows[0].email);
        console.log('   Role:', res.rows[0].role, '\n');

        // All checks passed - start server
        console.log('╔═══════════════════════════════════════════╗');
        console.log('║   ✅ ALL CHECKS PASSED                   ║');
        console.log('║   Starting StageAlpha...                 ║');
        console.log('╚═══════════════════════════════════════════╝\n');

        await pool.end();
        
        // Start the actual server
        require('./server');
      }
    );
  });
});

// Timeout after 10 seconds to prevent hanging
setTimeout(() => {
  console.error('\n❌ Connection timeout - PostgreSQL may not be running');
  process.exit(1);
}, 10000);
