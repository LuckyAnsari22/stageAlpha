#!/usr/bin/env node

/**
 * Check if admin account exists and show debug info
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   Admin Account Debug Check                ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Check database connection
    console.log('Testing database connection...');
    const connTest = await client.query('SELECT NOW()');
    console.log('✅ Database connected\n');

    // Check if customers table exists
    console.log('Checking customers table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'customers'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ customers table does not exist!');
      console.error('Run: npm run db:init\n');
      process.exit(1);
    }
    console.log('✅ customers table exists\n');

    // Check total customer count
    console.log('Checking total customers...');
    const countResult = await client.query('SELECT COUNT(*) as cnt FROM customers');
    const count = parseInt(countResult.rows[0].cnt);
    console.log(`Total customers: ${count}\n`);

    // Check admin specifically
    console.log('Checking for admin@stagealpha.com...');
    const adminCheck = await client.query(
      'SELECT id, name, email, role, is_active, password_hash FROM customers WHERE email = $1',
      ['admin@stagealpha.com']
    );

    if (adminCheck.rows.length === 0) {
      console.log('❌ Admin account NOT FOUND!\n');
      console.log('All customers in database:');
      const all = await client.query('SELECT id, name, email, role FROM customers ORDER BY id');
      all.rows.forEach(u => {
        console.log(`   ${u.id}: ${u.email} (${u.role})`);
      });
      console.log('\n');
      process.exit(1);
    }

    const admin = adminCheck.rows[0];
    console.log('✅ Admin account found!\n');
    console.log('Account details:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Active: ${admin.is_active ? 'Yes' : 'No'}`);
    console.log(`   Password Hash: ${admin.password_hash.slice(0, 30)}...\n`);

    if (!admin.is_active) {
      console.log('⚠️  Account is INACTIVE!');
      console.log('Activating account...\n');
      await client.query('UPDATE customers SET is_active = true WHERE id = $1', [admin.id]);
      console.log('✅ Account activated\n');
    }

    console.log('🔐 Login credentials:\n');
    console.log('   Email: admin@stagealpha.com');
    console.log('   Password: password123\n');

  } catch (err) {
    console.error('❌ Error:', err.message, '\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

check();
