#!/usr/bin/env node

/**
 * Start server and capture ALL errors for diagnostics
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════╗');
console.log('║  StageAlpha - Starting Server             ║');
console.log('╚════════════════════════════════════════════╝\n');

// Step 1: Load .env
console.log('Step 1: Loading .env...');
if (!fs.existsSync('.env')) {
  console.error('❌ .env file not found');
  console.error('\nCreate .env with:');
  console.error('DATABASE_URL=postgresql://postgres:Llucky@123@localhost:5432/stagealpha');
  console.error('JWT_SECRET=a7f9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0');
  console.error('JWT_REFRESH_SECRET=f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0');
  console.error('PORT=3000');
  console.error('NODE_ENV=development\n');
  process.exit(1);
}
require('dotenv').config();
console.log('✓ .env loaded\n');

// Step 2: Check environment
console.log('Step 2: Checking environment...');
const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
for (const v of required) {
  if (!process.env[v]) {
    console.error(`❌ Missing: ${v}`);
    process.exit(1);
  }
  console.log(`✓ ${v}: configured`);
}
console.log('');

// Step 3: Check dependencies
console.log('Step 3: Checking dependencies...');
try {
  require('express');
  require('pg');
  require('socket.io');
  require('jsonwebtoken');
  console.log('✓ All dependencies available\n');
} catch (e) {
  console.error('❌ Missing dependency:', e.message);
  console.error('Run: npm install\n');
  process.exit(1);
}

// Step 4: Try to start server with error capture
console.log('Step 4: Starting server...\n');
console.log('─'.repeat(44));

try {
  const serverModule = require('./server');
  console.log('─'.repeat(44));
  console.log('\n✅ Server started successfully!');
  console.log('\nOpen in browser: http://localhost:3000\n');
} catch (error) {
  console.log('─'.repeat(44));
  console.error('\n❌ Server startup failed!\n');
  
  console.error('ERROR MESSAGE:');
  console.error(error.message);
  
  if (error.stack) {
    console.error('\nFull error:');
    console.error(error.stack);
  }
  
  // Provide solutions based on error
  console.error('\n' + '='.repeat(44));
  console.error('TROUBLESHOOTING:\n');
  
  if (error.message.includes('ECONNREFUSED')) {
    console.error('Database connection refused.');
    console.error('Solutions:');
    console.error('1. Start PostgreSQL service');
    console.error('2. Verify DATABASE_URL in .env');
    console.error('3. Check credentials (password)');
    console.error('4. Run: npm run db:reset (to init database)\n');
  } else if (error.message.includes('EADDRINUSE')) {
    console.error('Port 3000 already in use.');
    console.error('Solutions:');
    console.error('1. Change PORT in .env to 3001');
    console.error('2. Or kill process using port 3000:');
    console.error('   Windows: netstat -ano | findstr :3000');
    console.error('   Then: taskkill /PID <PID> /F\n');
  } else if (error.message.includes('Cannot find module')) {
    console.error('Missing dependencies.');
    console.error('Run: npm install\n');
  } else if (error.message.includes('FATAL')) {
    console.error('Database error.');
    console.error('Solutions:');
    console.error('1. Check PostgreSQL is running');
    console.error('2. Initialize database: npm run db:reset');
    console.error('3. Check .env DATABASE_URL\n');
  }
  
  process.exit(1);
}
