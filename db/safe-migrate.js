const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const config = require('../config/index')

const pgConfig = config.db.url.includes('railway') || config.app.nodeEnv === 'production' || config.db.url.includes('render')
  ? { connectionString: config.db.url, ssl: { rejectUnauthorized: false } }
  : { connectionString: config.db.url };

const pool = new Pool(pgConfig);

async function runSQL(filename) {
  const sql = fs.readFileSync(path.join(__dirname, filename), 'utf8')
  console.log(`Running ${filename}...`)
  await pool.query(sql)
  console.log(`✓ ${filename} complete`)
}

async function safeInit() {
    try {
        console.log("Checking if database schema exists...");
        const res = await pool.query(`SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE  table_schema = 'public'
            AND    table_name   = 'equipment'
        );`);
        const exists = res.rows[0].exists;
        
        if (exists) {
            console.log("Tables already exist. Skipping initialization.");
            process.exit(0);
        }
        
        console.log("Tables missing. Initializing...");
        await runSQL('schema.sql')
        await runSQL('procedures.sql')
        await runSQL('triggers.sql')
        await runSQL('views.sql')
        console.log('✓ Database initialized')
        
        await runSQL('seed.sql')
        console.log('✓ Seed data inserted')
        
        process.exit(0);
    } catch(err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

safeInit();
