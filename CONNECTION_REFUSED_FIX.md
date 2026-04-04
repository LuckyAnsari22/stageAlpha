# 🔴 GETTING CONNECTION_REFUSED - HERE'S HOW TO FIX IT

## What This Error Means

`ERR_CONNECTION_REFUSED` = Server is NOT running on localhost:3000

## Why This Happens

Usually one of these:
1. ❌ Node server never started
2. ❌ Node server crashed on startup
3. ❌ Database connection failed
4. ❌ Port 3000 in use by another process

## 🚨 DO THIS RIGHT NOW

### Step 1: Open Command Prompt or PowerShell
```
Go to: d:\sem4\wp_dbms\stageAlpha
```

### Step 2: Install dependencies (if not done)
```bash
npm install
```
Wait for this to complete. You should see "added X packages"

### Step 3: Try to start the server
```bash
npm start
```

**IMPORTANT:** Watch what it prints. Tell me EXACTLY what error you see (if any).

---

## What You Should See

If it works, you'll see:
```
StageAlpha running on port 3000 [development]
```

Then open: http://localhost:3000

---

## If You See An Error

Share the EXACT error message with me. Common ones:

### Error: "Cannot find module 'pg'"
**Fix:** `npm install`

### Error: "ECONNREFUSED" or "connect ECONNREFUSED"
**Fix:** 
```bash
# 1. Start PostgreSQL service (Windows)
# Go to Services and find "postgresql"
# Right-click → Start

# 2. Then try again
npm start
```

### Error: "database 'stagealpha' does not exist"
**Fix:**
```bash
npm run db:reset
npm start
```

### Error: "EADDRINUSE :::3000" (Port already in use)
**Fix:** Change port in .env
```
PORT=3001
```
Then: `npm start`

### Error: "password authentication failed"
**Fix:** Wrong password in .env
```
# Check your .env file - update password to match PostgreSQL password
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/stagealpha
```

---

## Systematic Troubleshooting

Run these commands in order and share the output:

```bash
# 1. Check Node.js
node --version

# 2. Install dependencies
npm install

# 3. Run the full diagnostic
node full-check.js
```

The `full-check.js` will tell you EXACTLY what's wrong.

---

## PostgreSQL Check

Is PostgreSQL actually running? Try this:

```bash
# Windows PowerShell
Get-Service | Select-String "Postgres"

# Windows CMD
sc query | find "postgres"

# Or try to connect
psql -U postgres -h localhost
```

If PostgreSQL isn't in the list or won't connect, you need to:
1. Open Services.msc
2. Find "PostgreSQL"
3. Right-click → Start

---

## Quick Reference

| What to do | Command |
|-----------|---------|
| Install packages | `npm install` |
| Check setup | `node full-check.js` |
| Initialize database | `npm run db:reset` |
| Start server | `npm start` |
| Change port | Edit .env, change PORT to 3001 |
| Reset everything | Delete node_modules, run npm install, npm run db:reset |

---

## MOST LIKELY FIX

99% of the time it's one of these:

1. **PostgreSQL not running**
   - Start PostgreSQL service

2. **Dependencies not installed**
   - Run: `npm install`

3. **Database not initialized**
   - Run: `npm run db:reset`

Try those three first.

---

## Next Steps

1. Run: `npm install`
2. Start PostgreSQL service (if not running)
3. Run: `npm start`
4. If error, run: `node full-check.js`
5. Share the output with me

**Then it will work!** 🚀
