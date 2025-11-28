# LOMA Project Setup Script for Windows
# This script sets up the development environment

Write-Host "=== LOMA Project Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if .env file exists
Write-Host "[1/4] Checking .env file..." -ForegroundColor Yellow
if (!(Test-Path .env)) {
    Write-Host "  Creating .env file from env.development..." -ForegroundColor Gray
    Copy-Item env.development .env
    Write-Host "  ✓ .env file created" -ForegroundColor Green
    Write-Host "  ⚠️  IMPORTANT: Edit .env file and update the following:" -ForegroundColor Red
    Write-Host "     - DATABASE_URL (your PostgreSQL connection string)" -ForegroundColor Gray
    Write-Host "     - PHI_ENCRYPTION_KEY (32 character hex key)" -ForegroundColor Gray
    Write-Host "     - SESSION_SECRET (random secret string)" -ForegroundColor Gray
    Write-Host "     - STRIPE_SECRET_KEY (your Stripe test key)" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "  ✓ .env file already exists" -ForegroundColor Green
}

# Step 2: Check Node.js version
Write-Host "[2/4] Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "  Node.js version: $nodeVersion" -ForegroundColor Gray
if ($nodeVersion -match "^v(\d+)") {
    $majorVersion = [int]$matches[1]
    if ($majorVersion -lt 20) {
        Write-Host "  ⚠️  Warning: Node.js 20.x or higher recommended" -ForegroundColor Red
    } else {
        Write-Host "  ✓ Node.js version is compatible" -ForegroundColor Green
    }
}

# Step 3: Install dependencies
Write-Host "[3/4] Checking dependencies..." -ForegroundColor Yellow
if (!(Test-Path node_modules)) {
    Write-Host "  Installing npm packages (this may take a few minutes)..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  ✓ Dependencies already installed" -ForegroundColor Green
}

# Step 4: Database setup reminder
Write-Host "[4/4] Database setup reminder..." -ForegroundColor Yellow
Write-Host "  To setup database schema, run:" -ForegroundColor Gray
Write-Host "    npm run db:hipaa:push" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env file and configure your environment variables" -ForegroundColor White
Write-Host "2. Run: npm run db:hipaa:push  (to setup database)" -ForegroundColor White
Write-Host "3. Run: npm run dev  (to start development server)" -ForegroundColor White
Write-Host ""
Write-Host "The app will be available at: http://localhost:5000" -ForegroundColor Green
Write-Host ""


