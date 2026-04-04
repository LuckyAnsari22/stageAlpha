# StageAlpha Windows PowerShell Startup Script

Write-Host "`n╔════════════════════════════════════════════╗"
Write-Host "║  StageAlpha - Event Equipment Rental      ║"
Write-Host "║  Windows PowerShell Startup               ║"
Write-Host "╚════════════════════════════════════════════╝`n"

# Check if running as admin (optional, but helpful for port binding)
$isAdmin = [bool]([System.Security.Principal.WindowsIdentity]::GetCurrent().Groups -match "S-1-5-32-544")
if (-not $isAdmin) {
    Write-Host "⚠️  Not running as Administrator - some features may not work"
    Write-Host "   Right-click PowerShell and select 'Run as administrator'`n"
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..."
    npm install
    Write-Host "`n"
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ ERROR: .env file not found!"
    Write-Host "`nPlease create .env file with:"
    Write-Host "  DATABASE_URL=postgresql://..."
    Write-Host "  JWT_SECRET=..."
    Write-Host "  JWT_REFRESH_SECRET=...`n"
    Read-Host "Press Enter to exit"
    exit 1
}

# Show startup info
Write-Host "🔐 Environment: $((Get-Content .env | Select-String 'NODE_ENV' -Raw) -replace 'NODE_ENV=', '')"
Write-Host "📊 Database: $((Get-Content .env | Select-String 'DATABASE_URL' -Raw) -replace '=.*@', '=****@')"
Write-Host "🔌 Port: $((Get-Content .env | Select-String 'PORT' -Raw) -replace 'PORT=', '')`n"

Write-Host "🚀 Starting server...`n"

# Start the server
& node server.js
