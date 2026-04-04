# 🔴 Server Won't Start? - Complete Diagnostic Guide

## 🎯 Your Situation
The project "is not running" - but we need specific error messages to fix it.

## ⚡ Quick Diagnostic (Run This First)

```bash
npm run troubleshoot
```

This will:
1. Check Node.js version
2. Check npm version
3. Verify .env file
4. Check environment variables
5. Test database connection
6. Verify dependencies
7. Try to start server (if all checks pass)

**👉 Run this and share the output with any errors**

---

## 🔍 If troubleshoot.js Isn't Available Yet

Try these commands in order:

### Step 1: Check Node.js and npm
```bash
node --version  # Should be v12+
npm --version
```

### Step 2: Check if dependencies are installed
```bash
npm install
```

### Step 3: Check if .env file exists
```bash
# Windows PowerShell
Test-Path .env

# Windows CMD
if exist .env echo YES

# Mac/Linux
ls -la .env
```

If .env doesn't exist, create it with:
```
DATABASE_URL=postgresql://postgres:Llucky@123@localhost:5432/stagealpha
JWT_SECRET=a7f9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
JWT_REFRESH_SECRET=f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Step 4: Try to start the server
```bash
npm start
```

---

## 📝 What to Look For (Common Errors)

### **Error: "Cannot find module 'pg'"**
```
Error: Cannot find module 'pg'
at Module._load (internal/modules/commonjs/loader.js:396:13)
```
**Fix:** `npm install`

### **Error: "ECONNREFUSED 127.0.0.1:5432"**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Fix:** PostgreSQL is not running
- Windows: Start PostgreSQL service or run `pg_ctl -D "C:\Program Files\PostgreSQL\data" start`
- Mac: `brew services start postgresql`
- Linux: `sudo service postgresql start`

### **Error: "password authentication failed"**
```
Error: password authentication failed for user "postgres"
```
**Fix:** Wrong password in .env
- Update DATABASE_URL with correct PostgreSQL password
- Or reset PostgreSQL password and update .env

### **Error: "FATAL: database 'stagealpha' does not exist"**
```
FATAL: database "stagealpha" does not exist
```
**Fix:** Run database initialization:
```bash
npm run db:reset
```

### **Error: "EADDRINUSE :::3000"**
```
Error: listen EADDRINUSE :::3000
```
**Fix:** Port 3000 already in use
- Option 1: Change PORT in .env to 3001
- Option 2: Kill process using port 3000:
  - Windows CMD: `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`
  - PowerShell: `Get-NetTCPConnection -LocalPort 3000 | Stop-Process`
  - Mac/Linux: `lsof -i :3000` then `kill -9 <PID>`

### **Error: "FATAL: remaining connection slots are reserved"**
```
FATAL: remaining connection slots are reserved for non-replication superuser connections
```
**Fix:** Database connection pool is maxed out
- Option 1: Restart PostgreSQL service
- Option 2: Reduce max connections in config/db.js (max: 5)

### **Error: ".env file not found"**
```
FATAL: .env file not found
```
**Fix:** Create .env file in project root (see above)

### **Error: "Missing environment variable: DATABASE_URL"**
```
FATAL: Missing required environment variable: DATABASE_URL
```
**Fix:** Add DATABASE_URL to .env file

---

## 🔧 Multi-Step Troubleshooting

If you're still stuck, try this systematic approach:

### Step 1: Verify PostgreSQL
```bash
# Test connection
psql -U postgres -h localhost -d postgres

# List databases (inside psql)
\l

# Exit
\q

# Or using connection string
psql postgresql://postgres:Llucky@123@localhost:5432/postgres
```

### Step 2: Create Database
If stagealpha database doesn't exist:
```bash
# In Windows CMD or PowerShell (requires PostgreSQL in PATH)
createdb -U postgres stagealpha

# Or using psql
psql -U postgres
CREATE DATABASE stagealpha;
\q
```

### Step 3: Initialize Schema
```bash
npm run db:init
npm run db:seed
```

### Step 4: Start Server
```bash
npm start
```

### Step 5: Verify It Works
```bash
# In another terminal/PowerShell
curl http://localhost:3000/api/v1/health
```

---

## 🐛 Windows-Specific Issues

### PostgreSQL path issues
If `createdb` or `psql` not found, you need to add PostgreSQL to PATH:

1. Find PostgreSQL bin directory:
   ```
   C:\Program Files\PostgreSQL\15\bin
   ```

2. In PowerShell, set PATH:
   ```powershell
   $env:Path += ";C:\Program Files\PostgreSQL\15\bin"
   ```

3. Or use full path:
   ```bash
   "C:\Program Files\PostgreSQL\15\bin\psql" -U postgres -h localhost
   ```

### Service management
```powershell
# Start PostgreSQL service
Start-Service postgresql-x64-15

# Stop PostgreSQL service
Stop-Service postgresql-x64-15

# Check status
Get-Service postgresql-x64-15
```

### Port conflicts on Windows
```powershell
# Find what's using port 3000
netstat -ano | Select-String ":3000"

# Kill process by PID
taskkill /PID <PID> /F
```

---

## 🆘 Nuclear Options (Last Resort)

```bash
# Clean install everything
rm -r node_modules  # or delete folder manually
rm package-lock.json
npm install
npm run db:reset
npm start
```

Or with Windows PowerShell:
```powershell
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json
npm install
npm run db:reset
npm start
```

---

## 📋 Checklist Before Starting

- [ ] Node.js v12+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] PostgreSQL running and accessible (`psql --version`)
- [ ] .env file exists in project root
- [ ] DATABASE_URL in .env points to running PostgreSQL
- [ ] PORT in .env (usually 3000)
- [ ] Password in DATABASE_URL matches PostgreSQL password
- [ ] Port 3000 not already in use
- [ ] Run `npm install` (dependencies installed)
- [ ] Run `npm run db:reset` (database initialized)

---

## 🎯 The Definitive Startup Sequence

If none of the above works, follow this exact sequence:

```bash
# 1. Install dependencies
npm install

# 2. Reset database (assuming PostgreSQL is running)
npm run db:reset

# 3. Start server (one of these)
npm start                # Direct start
npm run quick            # Quick start
npm run troubleshoot     # With diagnostics

# 4. Verify in browser
# Open: http://localhost:3000
```

If you get an error at ANY step, please share the exact error message and which step it failed on.

---

## 🆔 Database Connection Syntax

Make sure your DATABASE_URL is correct:

```
postgresql://username:password@host:port/database
postgresql://postgres:Llucky@123@localhost:5432/stagealpha
```

Components:
- **username**: `postgres` (default)
- **password**: Your PostgreSQL password (in this example: `Llucky@123`)
- **host**: `localhost` (local machine)
- **port**: `5432` (PostgreSQL default)
- **database**: `stagealpha` (our database name)

---

## 📞 What Errors to Share

When asking for help, please provide:

1. **The exact error message** (copy-paste everything)
2. **What command you ran** (e.g., `npm start`)
3. **Your .env file** (with password hidden like `pass:****`)
4. **Output of:**
   ```bash
   node --version
   npm --version
   npm run troubleshoot 2>&1 | head -50
   ```

---

## ✅ Success Signs

When everything works, you should see:

```
🚀 Starting StageAlpha server...

StageAlpha running on port 3000 [development]
```

Then open http://localhost:3000 and see the application.

---

**Ready to start? Run:**
```bash
npm run troubleshoot
```

**Or start directly:**
```bash
npm start
```
