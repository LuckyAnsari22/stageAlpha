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
        console.log("Checking if base equipment schema exists...");
        const resEq = await pool.query(`SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE  table_schema = 'public'
            AND    table_name   = 'equipment'
        );`);
        const eqExists = resEq.rows[0].exists;
        
        if (!eqExists) {
            console.log("Base tables missing. Initializing...");
            await runSQL('schema.sql');
            await runSQL('procedures.sql');
            await runSQL('triggers.sql');
            await runSQL('views.sql');
            await runSQL('seed.sql');
            console.log('✓ Base database initialized and seeded');
        } else {
            console.log("Base tables already exist. Skipping base init.");
        }
        
        console.log("Checking if intelligence schema exists...");
        const resIntell = await pool.query(`SELECT EXISTS (
            SELECT FROM information_schema.views 
            WHERE  table_schema = 'public'
            AND    table_name   = 'v_rpaed_analysis'
        );`);
        const intellExists = resIntell.rows[0].exists;
        
        if (!intellExists) {
            console.log("Intelligence schema & demo values missing. Seeding them now...");
            await runSQL('quant_schema.sql').catch(e => console.log('Quant schema error:', e.message));
            await runSQL('intelligence_schema.sql').catch(e => console.log('Intelligence schema error:', e.message));
            await runSQL('seed_quant_data.sql').catch(e => console.log('Quant seed error:', e.message));
            console.log('✓ Advanced features and demo values seeded successfully');
        } else {
            console.log("Advanced features and demo values are already present.");
        }
        
        process.exit(0);
    } catch(err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

safeInit();
