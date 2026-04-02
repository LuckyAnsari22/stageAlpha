const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

// Use direct fallback config if DATABASE_URL isn't fully loaded due to path issues
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/stagealpha'
const pool = new Pool({ connectionString })

async function runSQL(filename) {
  const sql = fs.readFileSync(path.join(__dirname, filename), 'utf8')
  console.log(`Running ${filename}...`)
  await pool.query(sql)
  console.log(`✓ ${filename} complete`)
}

const commands = {
  async init() {
    await runSQL('schema.sql')
    await runSQL('procedures.sql')
    await runSQL('triggers.sql')
    await runSQL('views.sql')
    console.log('✓ Database initialized')
  },
  async seed() {
    await runSQL('seed.sql')
    console.log('✓ Seed data inserted')
  },
  async reset() {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
    console.log('✓ Schema dropped')
    await commands.init()
    await commands.seed()
  }
}

const cmd = process.argv[2]
if (!commands[cmd]) {
  console.error('Usage: node db/migrate.js [init|seed|reset]')
  process.exit(1)
}

commands[cmd]()
  .then(() => { pool.end(); process.exit(0) })
  .catch(err => { console.error('Migration failed:', err); pool.end(); process.exit(1) })
