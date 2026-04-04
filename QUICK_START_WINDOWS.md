# 🎯 StageAlpha Project Status & Quick Start

## 🟢 Current Status: READY TO RUN

The project is fully built and configured. All systems are in place to start immediately.

---

## ⚡ Quick Start (Choose Your Method)

### **Method 1: Windows Batch File (Easiest)**
```bash
start.bat
```
Double-click or run in Command Prompt. Handles everything automatically.

### **Method 2: Windows PowerShell**
```powershell
.\start.ps1
```
Run in PowerShell. Shows nice formatted startup info.

### **Method 3: Node Direct (Fastest)**
```bash
npm start
```
Simplest command. Starts immediately.

### **Method 4: Troubleshooting Mode**
```bash
npm run troubleshoot
```
Diagnoses any issues before starting. Run this if you get errors.

### **Method 5: Quick Start**
```bash
npm run quick
```
Minimal startup checks, starts immediately.

---

## 🔧 Prerequisites (Check These First)

- ✅ PostgreSQL running (must be accessible)
- ✅ Node.js installed (v12+)
- ✅ npm installed
- ✅ .env file created with DATABASE_URL

**Check PostgreSQL is running:**
```bash
psql --version  # Should show version
psql $DATABASE_URL  # Should connect
```

**Check Node.js is installed:**
```bash
node --version  # Should be v12+
npm --version
```

**Check .env exists:**
```bash
cat .env  # Should show DATABASE_URL and JWT secrets
```

---

## 📋 Setup Checklist (First Time Only)

If this is your first time running the project:

- [ ] PostgreSQL installed and running
- [ ] .env file created in project root (see below)
- [ ] Run: `npm install` (install dependencies)
- [ ] Run: `npm run db:reset` (initialize database)
- [ ] Run: `npm start` (start server)

### Create .env File

Create a file named `.env` in the project root with:

```
DATABASE_URL=postgresql://postgres:Llucky@123@localhost:5432/stagealpha
JWT_SECRET=a7f9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
JWT_REFRESH_SECRET=f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**⚠️ IMPORTANT:** Change `Llucky@123` to your PostgreSQL password if different.

---

## 🚀 Expected Output When Starting

When you start the server, you should see:

```
╔════════════════════════════════════════════╗
║  🚀 STAGEALPHA STARTUP SEQUENCE           ║
╚════════════════════════════════════════════╝

📋 Step 1: Checking .env configuration...
✅ .env file exists

📦 Step 2: Verifying dependencies...
✅ Dependencies already installed

🔐 Step 3: Verifying environment variables...
✅ All required environment variables present

🔧 Step 4: Runtime Environment
   Node.js version: v18.18.0
   Environment: development
   Port: 3000

╔════════════════════════════════════════════╗
║  ✅ STARTUP CHECKS COMPLETE               ║
╚════════════════════════════════════════════╝

🟢 Starting StageAlpha server...

StageAlpha running on port 3000 [development]
```

Then open your browser and go to: **http://localhost:3000**

---

## 🐛 Troubleshooting

### If You See Errors:

**1. First, run the troubleshooter:**
```bash
npm run troubleshoot
```

This will tell you exactly what's wrong and how to fix it.

**2. Common errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module 'pg'` | Dependencies not installed | `npm install` |
| `ECONNREFUSED` | PostgreSQL not running | Start PostgreSQL service |
| `password authentication failed` | Wrong password in .env | Update .env with correct password |
| `database 'stagealpha' does not exist` | Database not created | `npm run db:reset` |
| `EADDRINUSE` | Port 3000 in use | `PORT=3001 npm start` or kill process on port 3000 |

**3. Still stuck?**
```bash
# Reset everything
npm install
npm run db:reset
npm start
```

---

## 🎓 Login & Demo

Once the server is running:

1. Open: http://localhost:3000
2. Login with these credentials:
   - **Email:** admin@stagealpha.com
   - **Password:** password123

3. Check out the admin dashboard:
   - Go to: http://localhost:3000/admin
   - Watch real-time updates
   - Open in two tabs to see live connection count

---

## 📁 Project Structure

```
stageAlpha/
├── server.js           # Main Express server
├── start.js            # Startup script with checks
├── quick-start.js      # Fast startup (no checks)
├── troubleshoot.js     # Diagnostic tool
├── start.bat           # Windows batch file
├── start.ps1           # Windows PowerShell script
├── .env                # Configuration (CREATE THIS!)
│
├── config/             # Configuration
│   ├── index.js        # Config loader
│   └── db.js           # Database pool
│
├── routes/             # API endpoints
│   ├── auth.js         # Authentication
│   ├── bookings.js     # Booking management
│   └── ... (11 more)
│
├── services/           # Business logic
│   ├── socket.js       # WebSocket handler
│   └── pricing.js      # Dynamic pricing
│
├── middleware/         # Express middleware
│   ├── errorHandler.js # Error handling
│   └── rateLimit.js    # Rate limiting
│
├── public/             # Frontend files
│   ├── index.html      # Main page
│   ├── js/             # JavaScript controllers & services
│   ├── views/          # HTML templates
│   └── css/            # Stylesheets
│
├── db/                 # Database
│   ├── schema.sql      # Table definitions
│   ├── procedures.sql  # Stored procedures
│   ├── triggers.sql    # Database triggers
│   ├── views.sql       # Database views
│   ├── seed.sql        # Sample data
│   └── migrate.js      # Migration tool
│
└── package.json        # Dependencies
```

---

## 🎯 What's Built (WOW Factors)

✅ **Real-Time Admin Dashboard**
- Live KPI cards with pulsing animations
- Real-time booking feed
- Live inventory grid
- Connection status indicator
- Active admin counter

✅ **Production Security**
- JWT authentication with refresh tokens
- Role-based access control (admin/customer)
- Password hashing with bcrypt
- CORS protection
- Rate limiting

✅ **Advanced Features**
- Dynamic pricing algorithm
- Demand forecasting
- Inventory management
- Booking system
- Payment tracking
- Analytics dashboard

✅ **Beautiful UI**
- Cyberpunk design theme
- Responsive layouts
- Smooth animations
- Professional error handling
- Mobile-friendly

---

## 🔗 Useful Links

- **Main App:** http://localhost:3000
- **API Docs:** http://localhost:3000/api/v1/health
- **Admin Dashboard:** http://localhost:3000/admin
- **Database:** See .env for DATABASE_URL
- **Documentation:** See *.md files in project root

---

## 💾 Database Commands

```bash
# Initialize schema (first time)
npm run db:init

# Load seed data
npm run db:seed

# Reset everything (careful!)
npm run db:reset

# Connect to database directly
psql $DATABASE_URL
```

---

## 📞 Need Help?

1. **Check STARTUP.md** - Detailed troubleshooting guide
2. **Run troubleshooter** - `npm run troubleshoot`
3. **Check server logs** - Error messages are printed to console
4. **Database errors** - Usually show the SQL query that failed

---

**Project is ready to impress! 🎉**

Start with:
```bash
npm run troubleshoot
```

Or just:
```bash
npm start
```
