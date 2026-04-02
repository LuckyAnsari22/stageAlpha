require('dotenv').config();
const { Client } = require('pg');

async function test() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || '',
        database: 'stagealpha'
    });
    
    await client.connect();
    
    console.log("\n=== calculate_optimal_price(1, '2025-12-25') ===");
    const optimalPrice = await client.query(`SELECT * FROM calculate_optimal_price(1, '2025-12-25')`);
    console.log(JSON.stringify(optimalPrice.rows, null, 2));

    console.log("\n=== run_backtest('2025-01-01', '2025-06-30') ===");
    const backtest = await client.query(`SELECT * FROM run_backtest('2025-01-01', '2025-06-30')`);
    console.log(JSON.stringify(backtest.rows, null, 2));

    await client.end();
}
test().catch(console.error);
