/**
 * StageAlpha Migration Runner
 * Drops and recreates the database, then applies all SQL files in order.
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_NAME = 'stagealpha';

const baseConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
};

const SQL_FILES = [
    'db/schema.sql',
    'db/seed.sql',
    'db/procedures.sql',
    'db/triggers.sql',
    'db/views.sql'
];

async function run() {
    // Step 1: Connect to 'postgres' default DB and recreate stagealpha
    const pgClient = new Client({ ...baseConfig, database: 'postgres' });
    await pgClient.connect();
    console.log('✅ Connected to postgres (admin)');

    await pgClient.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    console.log(`🗑️  Dropped database: ${DB_NAME}`);

    await pgClient.query(`CREATE DATABASE ${DB_NAME} ENCODING 'UTF8'`);
    console.log(`✅ Created database: ${DB_NAME}`);
    await pgClient.end();

    // Step 2: Connect to the new DB and run all migration files
    const appClient = new Client({ ...baseConfig, database: DB_NAME });
    await appClient.connect();
    console.log(`✅ Connected to ${DB_NAME}`);

    for (const file of SQL_FILES) {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️  Skipping (not found): ${file}`);
            continue;
        }
        const sql = fs.readFileSync(filePath, 'utf8');
        try {
            await appClient.query(sql);
            console.log(`✅ Executed: ${file}`);
        } catch (err) {
            console.error(`❌ Failed: ${file}\n   ${err.message}`);
            await appClient.end();
            process.exit(1);
        }
    }

    await appClient.end();
    console.log('\n🚀 All migrations complete. Database is ready.');
}

run().catch(err => {
    console.error('Migration runner crashed:', err.message);
    process.exit(1);
});
