@echo off
REM StageAlpha Windows Startup Script

echo.
echo ╔════════════════════════════════════════════╗
echo ║  StageAlpha - Event Equipment Rental      ║
echo ║  Starting...                              ║
echo ╚════════════════════════════════════════════╝
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
  echo 📦 Installing dependencies...
  call npm install
  echo.
)

REM Check if .env exists
if not exist ".env" (
  echo ❌ ERROR: .env file not found!
  echo.
  echo Please create .env file with:
  echo DATABASE_URL=postgresql://...
  echo JWT_SECRET=...
  echo JWT_REFRESH_SECRET=...
  echo.
  pause
  exit /b 1
)

REM Start the server
echo 🚀 Starting server...
echo.
node server.js

pause
