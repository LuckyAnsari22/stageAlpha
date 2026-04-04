#!/usr/bin/env node

/**
 * StageAlpha Troubleshooting Tool
 * Diagnoses common startup issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n╔════════════════════════════════════════════╗');
console.log('║  StageAlpha Troubleshooting Tool           ║');
console.log('╚════════════════════════════════════════════╝\n');

function checkStep(name, fn) {
  try {
    console.log(`\n[${name}]`);
    fn();
    console.log('✅ OK\n');
    return true;
  } catch (err) {
    console.error(`❌ FAILED: ${err.message}\n`);
    return false;
  }
}

let allOk = true;

// 1. Node.js version
allOk &= checkStep('Node.js Version', () => {
  console.log(`Version: ${process.version}`);
  const major = parseInt(process.version.split('.')[0].slice(1));
  if (major < 12) throw new Error('Node.js 12+ required');
});

// 2. npm version
allOk &= checkStep('npm Version', () => {
  const v = execSync('npm -v', { encoding: 'utf-8' }).trim();
  console.log(`Version: ${v}`);
});

// 3. .env file
allOk &= checkStep('.env File', () => {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) throw new Error('.env not found - create it!');
  console.log(`Location: ${envPath}`);
  
  // Read and validate
  const env = fs.readFileSync(envPath, 'utf-8');
  const lines = env.split('\n').filter(l => l && !l.startsWith('#'));
  console.log(`Variables: ${lines.length}`);
  
  if (!env.includes('DATABASE_URL')) throw new Error('DATABASE_URL missing');
  if (!env.includes('JWT_SECRET')) throw new Error('JWT_SECRET missing');
  if (!env.includes('JWT_REFRESH_SECRET')) throw new Error('JWT_REFRESH_SECRET missing');
  console.log('✓ All required keys present');
});

// 4. .env values
allOk &= checkStep('.env Values', () => {
  require('dotenv').config();
  
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not loaded');
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not loaded');
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET not loaded');
  
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);
  console.log(`JWT_SECRET: ${process.env.JWT_SECRET.slice(0, 8)}... (${process.env.JWT_SECRET.length} chars)`);
  console.log(`JWT_REFRESH_SECRET: ${process.env.JWT_REFRESH_SECRET.slice(0, 8)}... (${process.env.JWT_REFRESH_SECRET.length} chars)`);
  console.log(`PORT: ${process.env.PORT || 3000}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});

// 5. Dependencies
allOk &= checkStep('Dependencies', () => {
  const pkgPath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(pkgPath)) throw new Error('package.json not found');
  
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const deps = Object.keys(pkg.dependencies || {});
  console.log(`${deps.length} dependencies in package.json`);
  
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    throw new Error('node_modules not installed - run "npm install"');
  }
  
  console.log('✓ node_modules exists');
  
  // Check critical dependencies
  const critical = ['pg', 'express', 'jsonwebtoken', 'socket.io'];
  for (const dep of critical) {
    const depPath = path.join(nodeModulesPath, dep);
    if (!fs.existsSync(depPath)) throw new Error(`Missing dependency: ${dep}`);
    console.log(`✓ ${dep}`);
  }
});

// 6. Database connection
allOk &= checkStep('Database Connection', () => {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });

  let connected = false;
  let dbErr = null;

  // Try to connect synchronously-ish
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      dbErr = err;
      console.error(`Connection failed: ${err.message}`);
      console.log('\nTroubleshooting:');
      console.log('1. Is PostgreSQL running?');
      console.log('2. Is DATABASE_URL correct?');
      console.log('   Current:', process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@'));
      console.log('3. Try: psql $DATABASE_URL');
      
      // Parse the connection string for hints
      try {
        const url = new URL(process.env.DATABASE_URL);
        console.log('\nParsed connection:');
        console.log(`  Host: ${url.hostname}`);
        console.log(`  Port: ${url.port || 5432}`);
        console.log(`  Database: ${url.pathname.slice(1)}`);
        console.log(`  User: ${url.username}`);
      } catch (e) {
        console.log('Could not parse DATABASE_URL');
      }
    } else {
      connected = true;
      console.log(`Connected to database at ${res.rows[0].now}`);
    }
    pool.end();
  });

  // Wait a bit for connection attempt
  const start = Date.now();
  while (!connected && !dbErr && Date.now() - start < 6000) {
    // Busy wait
  }

  if (dbErr) throw dbErr;
  if (!connected) throw new Error('Connection timeout');
});

// 7. Server startup
if (allOk) {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  ✅ ALL CHECKS PASSED - Starting server  ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  console.log('Starting StageAlpha server...\n');
  require('./server');
} else {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  ❌ SOME CHECKS FAILED                   ║');
  console.log('║  Fix issues above and try again           ║');
  console.log('╚════════════════════════════════════════════╝\n');
  process.exit(1);
}
