# StageAlpha Final Launch Checklist

To bring the StageAlpha Quantitative Pricing Node fully online, you must execute the following sequence precisely. This process ensures the database structure, triggers, historical seed data, and Node.js security configurations are perfectly aligned.

### Phase 1: Environment Configuration
Before starting the server, ensure your local configuration file exists.

1. **Create/Verify your `.env` file** in the root of `d:\sem4\wp_dbms\stageAlpha\` with these exact keys:
```env
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stagealpha
DB_USER=postgres
DB_PASS=your_actual_postgres_password

# Redis & Authentication
REDIS_URL=redis://localhost:6379
JWT_SECRET=super_secret_jwt_key_here
PRODUCTION_URL=https://stagealpha.railway.app
```

### Phase 2: Database Build Sequence (Core Architecture)
You must execute the physical SQL files in this exact hierarchical order via your terminal or pgAdmin.

1. **Open your terminal** and launch the PostgreSQL CLI connected to your database:
```bash
psql -U postgres -d stagealpha
```

2. **Execute the Structural and Quantitative Migrations:**
```sql
-- 1. Base 3NF Academic Schema
\i db/schema.sql

-- 2. Advanced Algorithmic Tables & REGR_SLOPE Mathematical Functions
\i db/quant_schema.sql

-- 3. WebSockets Real-Time Sync Triggers (LISTEN/NOTIFY)
\i db/notify_triggers.sql

-- 4. Mathematical Seed Simulation (Fixes the NaN OLS Elasticity Error)
\i db/seed_quant_data.sql
```

### Phase 3: Middleware & Daemon Ignition

1. **Verify your local services are running:**
- Open Windows **Services** app and ensure **PostgreSQL** is running.
- Ensure **Redis Server** is running (or relying on the `ioredis` graceful bypass fallback if testing gracefully failing architectures).

2. **Install Final Node.js Architectures:**
```bash
npm install 
```

3. **Ignite the Server Pipeline:**
```bash
npm start
```
*You should see Winston logger physically print:*
`[info] 🟩 Active Redis Storage Pipeline Initialized.`
`[info] 🎧 Native PostgreSQL LISTEN channel active for async pushes.`

### Phase 4: Academic GUI & Performance Verification

1. **Open your browser** to the localized node:
👉 `http://localhost:3000/`

2. **Test Quantitative Execution:**
- Navigate to the **Hardware Catalog**.
- Click the **"Request Quantitative Pricing"** endpoint on any dynamic node.
- Watch the API natively route the DB Log-Log elasticity checks, calculate the Lerner constraints natively, and return the optimized margin.

3. **Test WebSocket Syncretism (The 2021 Retail Replication):**
- Keep the catalog open in Chrome. 
- Open *TablePlus* or `psql` and manually execute: 
  `UPDATE equipment SET stock = stock - 1 WHERE id = 1;`
- Watch the AngularJS frontend organically sync the new inventory count instantly without touching the refresh button natively via the `/admin` Socket.io proxy. 

4. **Test Stress Limits (The Apache Bench Check):**
- Open a new terminal tab and fire the concurrency load test against the Redis interceptor:
```bash
ab -n 1000 -c 100 http://localhost:3000/api/equipment
```
