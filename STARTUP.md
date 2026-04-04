# 🚀 StageAlpha Startup Guide

## Quick Start (Pick One)

### 1. **Troubleshoot First (RECOMMENDED)**
```bash
npm run troubleshoot
```
This will diagnose any issues and show you exactly what's wrong.

### 2. **Direct Start**
```bash
npm start
```
Fastest startup (skips checks).

### 3. **Quick Start**
```bash
npm run quick
```
Super simple, bypasses all checks.

### 4. **Full Startup with Checks**
```bash
npm run run
```
Runs pre-flight checks before starting.

---

## Common Issues & Fixes

### ❌ Error: "Cannot find module 'pg'"
**Solution:** Install dependencies
```bash
npm install
```

### ❌ Error: "ECONNREFUSED" or "connection refused"
**Problem:** PostgreSQL is not running
**Solutions:**
- **Windows:** Start PostgreSQL from Services or run `pg_ctl -D "C:\Program Files\PostgreSQL\data" start`
- **Mac:** `brew services start postgresql`
- **Linux:** `sudo service postgresql start`

### ❌ Error: "password authentication failed"
**Problem:** Incorrect database credentials in .env
**Solution:** Check your .env file:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/stagealpha
```
Make sure `YOUR_PASSWORD` matches your PostgreSQL password.

### ❌ Error: "database 'stagealpha' does not exist"
**Problem:** Database not created yet
**Solutions:**
```bash
# Option 1: Create with migrations
npm run db:reset

# Option 2: Create manually
createdb stagealpha
npm run db:init
npm run db:seed
```

### ❌ Error: "Port 3000 is already in use"
**Problem:** Another process is using port 3000
**Solutions:**
- Change PORT in .env: `PORT=3001`
- Or kill the process using port 3000:
  - **Windows:** `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`
  - **Mac/Linux:** `lsof -i :3000` then `kill -9 <PID>`

### ❌ Error: ".env file not found"
**Problem:** .env configuration file is missing
**Solution:** Create .env in the project root with:
```
DATABASE_URL=postgresql://postgres:Llucky@123@localhost:5432/stagealpha
JWT_SECRET=a7f9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
JWT_REFRESH_SECRET=f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0
PORT=3000
NODE_ENV=development
```

---

## Verify It's Working

After starting the server, you should see:
```
StageAlpha running on port 3000 [development]
```

Then open your browser:
- **Main App:** http://localhost:3000
- **Health Check:** http://localhost:3000/api/v1/health
- **Admin Dashboard:** http://localhost:3000/admin

---

## Database Setup (First Time Only)

If you're seeing database errors, run:
```bash
# Create tables and procedures
npm run db:init

# Populate with seed data
npm run db:seed

# Or do both in one command
npm run db:reset
```

This creates:
- ✅ 18 database tables (3NF normalized)
- ✅ Stored procedures (pricing, demand forecasting)
- ✅ Triggers (audit log, auto-timestamps)
- ✅ Seed admin account: admin@stagealpha.com / password123

---

## Debugging

If something isn't working, try these in order:

1. **Check logs**
   - Look for error messages in console
   - Database errors usually show the SQL query and parameters

2. **Run troubleshoot**
   ```bash
   npm run troubleshoot
   ```
   This diagnoses all 7 critical checks

3. **Test database directly**
   ```bash
   psql $DATABASE_URL
   ```
   Then try: `SELECT * FROM customers;`

4. **Check port conflicts**
   ```bash
   netstat -ano | findstr :3000  # Windows
   lsof -i :3000                  # Mac/Linux
   ```

5. **Reset everything**
   ```bash
   npm install
   npm run db:reset
   npm start
   ```

---

## Login Credentials

Once running, use these to log in:

**Admin Account:**
- Email: `admin@stagealpha.com`
- Password: `password123`
- Features: Full admin dashboard, real-time updates, analytics

**Demo Customer Account:**
- Email: `customer@example.com`
- Password: `password123`
- Features: Browse equipment, create bookings

---

## Production Deployment

Before going to production:
```bash
NODE_ENV=production npm start
```

Set these environment variables:
```
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
JWT_SECRET=<generate-random-64-char-hex>
JWT_REFRESH_SECRET=<generate-random-64-char-hex>
```

---

## Support

Still having issues? Check:
1. PostgreSQL is running and accessible
2. .env file has correct DATABASE_URL
3. Node.js version is 12+
4. All npm dependencies are installed (`npm install`)
5. Port 3000 is not already in use
