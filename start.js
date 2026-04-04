#!/usr/bin/env node

/**
 * StageAlpha Startup Script
 * Runs all pre-flight checks before starting the server
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('╔════════════════════════════════════════════╗');
console.log('║     🚀 STAGEALPHA STARTUP SEQUENCE        ║');
console.log('╚════════════════════════════════════════════╝\n');

// Check 1: Verify .env file
console.log('📋 Step 1: Checking .env configuration...');
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ FATAL: .env file not found');
  process.exit(1);
}
console.log('✅ .env file exists\n');

// Check 2: Verify package.json dependencies
console.log('📦 Step 2: Verifying dependencies...');
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('⚠️  node_modules not found, installing...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
  } catch (err) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed\n');
}

// Check 3: Test database connection
console.log('🗄️  Step 3: Testing database connection...');
try {
  const config = require('./config');
  const { pool } = require('./config/db');
  
  (async () => {
    try {
      const result = await pool.query('SELECT NOW()');
      console.log('✅ Database connection successful');
      console.log(`   Connected to: ${config.db.url.replace(/:[^:]*@/, ':****@')}\n`);
      
      // Check 4: Verify admin user exists
      console.log('👤 Step 4: Checking admin account...');
      const adminCheck = await pool.query('SELECT id, email, role FROM customers WHERE email = $1', ['admin@stagealpha.com']);
      if (adminCheck.rows.length > 0) {
        console.log('✅ Admin account found');
        console.log(`   Email: ${adminCheck.rows[0].email}`);
        console.log(`   Role: ${adminCheck.rows[0].role}\n`);
      } else {
        console.warn('⚠️  Admin account not found - create one to use admin features\n');
      }
      
      // Check 5: Verify database schema
      console.log('📊 Step 5: Verifying database schema...');
      const tablesCheck = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      console.log(`✅ Database has ${tablesCheck.rows.length} tables\n`);
      
      // Final check: Node environment
      console.log('🔧 Step 6: Verifying runtime environment...');
      console.log(`   Node.js version: ${process.version}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Port: ${process.env.PORT || 3000}\n`);
      
      console.log('╔════════════════════════════════════════════╗');
      console.log('║    ✅ ALL PRE-FLIGHT CHECKS PASSED        ║');
      console.log('╚════════════════════════════════════════════╝\n');
      
      console.log('🟢 Starting StageAlpha server...\n');
      
      // Close pool connection before starting server
      await pool.end();
      
      // Start the actual server
      require('./server');
      
    } catch (err) {
      console.error('❌ Database error:', err.message);
      console.error('\nTroubleshooting tips:');
      console.error('1. Verify PostgreSQL is running');
      console.error('2. Check .env DATABASE_URL is correct');
      console.error('3. Verify database user permissions');
      console.error('4. Run database migrations: node db/migrate.js');
      process.exit(1);
    }
  })();
  
} catch (err) {
  console.error('❌ Configuration error:', err.message);
  process.exit(1);
}
