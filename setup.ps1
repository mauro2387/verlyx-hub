# ============================================
# Verlyx Hub - Setup Script for Windows
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Verlyx Hub - Setup Wizard" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install from: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✓ npm installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found" -ForegroundColor Red
    exit 1
}

# Check Flutter
Write-Host "`nChecking Flutter..." -ForegroundColor Yellow
try {
    $flutterVersion = flutter --version 2>&1 | Select-String "Flutter" | Select-Object -First 1
    Write-Host "✓ Flutter installed: $flutterVersion" -ForegroundColor Green
    $flutterInstalled = $true
} catch {
    Write-Host "✗ Flutter not found. Install from: https://flutter.dev" -ForegroundColor Red
    Write-Host "  You can still run the backend without Flutter" -ForegroundColor Yellow
    $flutterInstalled = $false
}

# Check .env file
Write-Host "`nChecking configuration..." -ForegroundColor Yellow
$envPath = "verlyx_hub_backend\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match "tu-proyecto.supabase.co") {
        Write-Host "⚠ .env file exists but needs configuration" -ForegroundColor Yellow
        Write-Host "  Please configure Supabase credentials in: $envPath" -ForegroundColor Yellow
        $envConfigured = $false
    } else {
        Write-Host "✓ .env file configured" -ForegroundColor Green
        $envConfigured = $true
    }
} else {
    Write-Host "✗ .env file not found" -ForegroundColor Red
    Write-Host "  Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item "verlyx_hub_backend\.env.example" $envPath
    Write-Host "✓ .env file created. Please configure it!" -ForegroundColor Yellow
    $envConfigured = $false
}

# Install backend dependencies
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Installing Backend Dependencies" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Push-Location verlyx_hub_backend
try {
    if (Test-Path "node_modules") {
        Write-Host "Backend dependencies already installed" -ForegroundColor Green
    } else {
        Write-Host "Running npm install..." -ForegroundColor Yellow
        npm install
        Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Failed to install backend dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Install Flutter dependencies if Flutter is installed
if ($flutterInstalled) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Installing Flutter Dependencies" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    Push-Location verlyx_hub_flutter
    try {
        Write-Host "Running flutter pub get..." -ForegroundColor Yellow
        flutter pub get
        Write-Host "✓ Flutter dependencies installed" -ForegroundColor Green
        
        Write-Host "`nGenerating code with build_runner..." -ForegroundColor Yellow
        flutter pub run build_runner build --delete-conflicting-outputs
        Write-Host "✓ Code generation complete" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Warning: Some Flutter setup steps failed" -ForegroundColor Yellow
    }
    Pop-Location
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setup Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Node.js:          " -NoNewline
Write-Host "✓ Ready" -ForegroundColor Green

Write-Host "Backend:          " -NoNewline
Write-Host "✓ Dependencies Installed" -ForegroundColor Green

Write-Host "Flutter:          " -NoNewline
if ($flutterInstalled) {
    Write-Host "✓ Ready" -ForegroundColor Green
} else {
    Write-Host "✗ Not Installed" -ForegroundColor Red
}

Write-Host "Configuration:    " -NoNewline
if ($envConfigured) {
    Write-Host "✓ Configured" -ForegroundColor Green
} else {
    Write-Host "⚠ Needs Setup" -ForegroundColor Yellow
}

# Next steps
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if (-not $envConfigured) {
    Write-Host "1. Configure Supabase:" -ForegroundColor Yellow
    Write-Host "   - Create account at https://supabase.com" -ForegroundColor White
    Write-Host "   - Create new project" -ForegroundColor White
    Write-Host "   - Run SQL from docs/database-schema.md" -ForegroundColor White
    Write-Host "   - Update .env with your credentials`n" -ForegroundColor White
}

Write-Host "2. Start the backend:" -ForegroundColor Yellow
Write-Host "   cd verlyx_hub_backend" -ForegroundColor White
Write-Host "   npm run start:dev`n" -ForegroundColor White

Write-Host "3. Access Swagger UI:" -ForegroundColor Yellow
Write-Host "   http://localhost:3000/api/docs`n" -ForegroundColor White

if ($flutterInstalled) {
    Write-Host "4. Start the frontend:" -ForegroundColor Yellow
    Write-Host "   cd verlyx_hub_flutter" -ForegroundColor White
    Write-Host "   flutter run -d chrome`n" -ForegroundColor White
}

Write-Host "5. Login credentials:" -ForegroundColor Yellow
Write-Host "   Email: owner@verlyx.com" -ForegroundColor White
Write-Host "   Password: Verlyx2024!`n" -ForegroundColor White

Write-Host "📚 Read SETUP-INSTRUCTIONS.md for detailed guide`n" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
