# PowerShell Script to Setup .env File
# This script creates .env file from env.development and generates secure secrets

Write-Host "🚀 LOMA Project Environment Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env already exists
if (Test-Path .env) {
    Write-Host "⚠️  .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "❌ Setup cancelled. Existing .env file preserved." -ForegroundColor Red
        exit
    }
}

# Check if env.development exists
if (-not (Test-Path env.development)) {
    Write-Host "❌ Error: env.development file not found!" -ForegroundColor Red
    Write-Host "Please ensure you're in the project root directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Copying env.development to .env..." -ForegroundColor Green
Copy-Item env.development .env

Write-Host ""
Write-Host "🔐 Generating secure secrets..." -ForegroundColor Green

# Generate SESSION_SECRET (32 bytes = 64 hex characters)
$sessionSecret = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
# Better method using Node.js if available
try {
    $sessionSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>$null
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    # Fallback: generate random hex string
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $sessionSecret = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

# Generate PHI_ENCRYPTION_KEY (32 bytes = 64 hex characters)
try {
    $phiKey = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>$null
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    # Fallback: generate random hex string
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $phiKey = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

Write-Host "✅ Generated SESSION_SECRET" -ForegroundColor Green
Write-Host "✅ Generated PHI_ENCRYPTION_KEY" -ForegroundColor Green

# Update .env file with generated secrets
Write-Host ""
Write-Host "📝 Updating .env file with generated secrets..." -ForegroundColor Green

$envContent = Get-Content .env -Raw

# Replace SESSION_SECRET
$envContent = $envContent -replace 'SESSION_SECRET=.*', "SESSION_SECRET=$sessionSecret"

# Replace PHI_ENCRYPTION_KEY
$envContent = $envContent -replace 'PHI_ENCRYPTION_KEY=.*', "PHI_ENCRYPTION_KEY=$phiKey"

Set-Content .env -Value $envContent -NoNewline

Write-Host ""
Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Review .env file and update any optional values (Stripe, Email, etc.)" -ForegroundColor White
Write-Host "   2. Run: npm install" -ForegroundColor White
Write-Host "   3. Run: npm run db:hipaa:push" -ForegroundColor White
Write-Host "   4. Run: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: Never commit .env file to git!" -ForegroundColor Yellow
Write-Host ""


