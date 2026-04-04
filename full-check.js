#!/usr/bin/env node

/**
 * COMPLETE SYSTEM CHECK - Run this first
 * Checks everything before attempting to start server
 */

const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');

console.log('\n╔════════════════════════════════════════════╗');
console.log('║   COMPLETE SYSTEM DIAGNOSTICS            ║');
console.log('╚════════════════════════════════════════════╝\n');

let checks = 0;
let passed = 0;

function check(name, fn) {
  checks++;
  try {
    const result = fn();
    if (result === false) throw new Error('Check returned false');
    console.log(`✅ [${checks}] ${name}`);
    passed++;
    return true;
  } catch (err) {
    console.log(`❌ [${checks}] ${name}`);
    console.log(`   Error: ${err.message}`);
    return false;
  }
}

// Check 1: Node.js
check('Node.js installed', () => {
  const v = process.version;
  console.log(`       Version: ${v}`);
  if (parseInt(v.split('.')[0].slice(1)) < 12) throw new Error('Node 12+ required');
});

// Check 2: npm
check('npm installed', () => {
  const v = execSync('npm -v', { encoding: 'utf-8' }).trim();
  console.log(`       Version: ${v}`);
});

// Check 3: .env exists
check('.env file exists', () => {
  if (!fs.existsSync('.env')) throw new Error('File not found');
  console.log(`       Location: ${path.resolve('.env')}`);
});

// Check 4: .env has required variables
check('.env has DATABASE_URL', () => {
  const env = fs.readFileSync('.env', 'utf-8');
  if (!env.includes('DATABASE_URL')) throw new Error('DATABASE_URL missing');
  const match = env.match(/DATABASE_URL=(.+)/);
  if (match) console.log(`       Value: ${match[1].replace(/:[^:]*@/, ':****@')}`);
});

check('.env has JWT_SECRET', () => {
  const env = fs.readFileSync('.env', 'utf-8');
  if (!env.includes('JWT_SECRET')) throw new Error('JWT_SECRET missing');
  const match = env.match(/JWT_SECRET=(.+)/);
  if (match) console.log(`       Length: ${match[1].length} chars`);
});

check('.env has JWT_REFRESH_SECRET', () => {
  const env = fs.readFileSync('.env', 'utf-8');
  if (!env.includes('JWT_REFRESH_SECRET')) throw new Error('JWT_REFRESH_SECRET missing');
  const match = env.match(/JWT_REFRESH_SECRET=(.+)/);
  if (match) console.log(`       Length: ${match[1].length} chars`);
});

// Check 5: Environment loads
require('dotenv').config();
check('Environment variables loaded', () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not loaded');
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not loaded');
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET not loaded');
  console.log(`       PORT: ${process.env.PORT || 3000}`);
  console.log(`       NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});

// Check 6: node_modules exists
check('node_modules exists', () => {
  if (!fs.existsSync('node_modules')) throw new Error('Not found - run: npm install');
  console.log(`       Packages: ${fs.readdirSync('node_modules').length}`);
});

// Check 7: Critical packages
check('Critical packages installed', () => {
  const critical = ['pg', 'express', 'jsonwebtoken', 'socket.io'];
  for (const pkg of critical) {
    if (!fs.existsSync(`node_modules/${pkg}`)) throw new Error(`Missing: ${pkg}`);
  }
  console.log(`       ✓ pg, express, jsonwebtoken, socket.io`);
});

// Check 8: Can require packages
check('Can load packages', () => {
  require('express');
  require('pg');
  require('socket.io');
  require('jsonwebtoken');
  console.log(`       ✓ All packages loadable`);
});

// Check 9: PostgreSQL accessible
check('PostgreSQL is accessible', (callback) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    });
    
    let connected = false;
    let dbError = null;
    
    pool.query('SELECT NOW()', (err, res) => {
      pool.end();
      if (err) {
        dbError = err;
      } else {
        connected = true;
      }
    });
    
    // Wait for result
    const start = Date.now();
    while (!connected && !dbError && Date.now() - start < 6000) {
      // Busy wait
    }
    
    if (dbError) {
      if (dbError.message.includes('ECONNREFUSED')) {
        throw new Error('PostgreSQL not running or not accessible at ' + process.env.DATABASE_URL);
      }
      throw new Error(dbError.message);
    }
    if (!connected) throw new Error('Connection timeout');
    
    console.log(`       ✓ Connected successfully`);
  } catch (err) {
    throw err;
  }
});

// Check 10: Database schema exists
check('Database schema initialized', () => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    });
    
    let tableCount = 0;
    let dbError = null;
    
    pool.query(`
      SELECT COUNT(*) as cnt FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `, (err, res) => {
      pool.end();
      if (err) {
        dbError = err;
      } else {
        tableCount = parseInt(res.rows[0].cnt);
      }
    });
    
    const start = Date.now();
    while (tableCount === 0 && !dbError && Date.now() - start < 6000) {
      // Busy wait
    }
    
    if (dbError) throw new Error(dbError.message);
    if (tableCount === 0) throw new Error('No tables found - run: npm run db:reset');
    
    console.log(`       ✓ ${tableCount} tables found`);
  } catch (err) {
    throw err;
  }
});

// Summary
console.log('\n' + '═'.repeat(44));
console.log(`\nResults: ${passed}/${checks} checks passed\n`);

if (passed === checks) {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║    ✅ ALL CHECKS PASSED!                 ║');
  console.log('║    Ready to start server                 ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  console.log('Starting server...\n');
  require('./server');
} else {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║    ❌ SOME CHECKS FAILED                 ║');
  console.log('║    Fix the errors above                  ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  const failed = checks - passed;
  console.log(`${failed} issue(s) to fix:\n`);
  
  console.log('Common fixes:');
  console.log('1. Missing .env? Create with required variables');
  console.log('2. npm packages missing? Run: npm install');
  console.log('3. PostgreSQL not running? Start the PostgreSQL service');
  console.log('4. Database not initialized? Run: npm run db:reset');
  console.log('5. Wrong password? Update DATABASE_URL in .env\n');
  
  process.exit(1);
}
