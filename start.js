#!/usr/bin/env node

/**
 * StageAlpha Startup Script
 * Simple startup - database checks are optional, server handles connection
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n╔════════════════════════════════════════════╗');
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

// Check 3: Verify environment variables are loaded
console.log('🔐 Step 3: Verifying environment variables...');
require('dotenv').config();
const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('❌ Missing environment variables:', missing.join(', '));
  process.exit(1);
}
console.log('✅ All required environment variables present\n');

console.log('🔧 Step 4: Runtime Environment');
console.log(`   Node.js version: ${process.version}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Port: ${process.env.PORT || 3000}\n`);

console.log('╔════════════════════════════════════════════╗');
console.log('║    ✅ STARTUP CHECKS COMPLETE             ║');
console.log('╚════════════════════════════════════════════╝\n');

console.log('🟢 Starting StageAlpha server...\n');

// Start the server (database connection will be attempted on first request)
require('./server');
