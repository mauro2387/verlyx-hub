# ============================================
# Verlyx Hub - Run Script
# Ejecuta la app en Windows, Android o iOS
# ============================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('windows', 'android', 'ios', 'linux', 'macos')]
    [string]$Platform = 'windows',
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('debug', 'profile', 'release')]
    [string]$Mode = 'debug'
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Verlyx Hub - Launcher" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Flutter
Write-Host "Verificando Flutter..." -ForegroundColor Yellow
if (!(Get-Command flutter -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Flutter no está instalado!" -ForegroundColor Red
    Write-Host "`nOpciones de instalación:" -ForegroundColor Yellow
    Write-Host "1. Ejecuta: .\install-flutter.bat" -ForegroundColor White
    Write-Host "2. O sigue: FLUTTER-SETUP.md`n" -ForegroundColor White
    exit 1
}

$flutterVersion = flutter --version | Select-String "Flutter" | Out-String
Write-Host "✓ $flutterVersion" -ForegroundColor Green

# Navigate to Flutter project
$projectPath = "C:\Users\mauro\OneDrive\Desktop\Verlyx Hub\verlyx_hub_flutter"
if (!(Test-Path $projectPath)) {
    Write-Host "❌ Proyecto no encontrado en: $projectPath" -ForegroundColor Red
    exit 1
}

Set-Location $projectPath
Write-Host "✓ Proyecto encontrado" -ForegroundColor Green

# Check .env file
if (!(Test-Path ".env")) {
    Write-Host "⚠️  Archivo .env no encontrado, creando..." -ForegroundColor Yellow
    @"
SUPABASE_URL=https://frivuiymvmnpzojcmibo.supabase.co
SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui
API_BASE_URL=http://localhost:3000/api
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✓ Archivo .env creado. IMPORTANTE: Actualiza las credenciales!" -ForegroundColor Yellow
}

# Get dependencies
Write-Host "`nInstalando dependencias..." -ForegroundColor Yellow
flutter pub get
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error instalando dependencias" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencias instaladas" -ForegroundColor Green

# Generate code
Write-Host "`nGenerando código con build_runner..." -ForegroundColor Yellow
flutter pub run build_runner build --delete-conflicting-outputs
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Advertencia: build_runner tuvo problemas (puede ser normal)" -ForegroundColor Yellow
}

# Check backend
Write-Host "`nVerificando backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/me" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
    Write-Host "✓ Backend activo en http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend no disponible. Para iniciar:" -ForegroundColor Yellow
    Write-Host "   cd verlyx_hub_backend" -ForegroundColor White
    Write-Host "   npm run start:dev`n" -ForegroundColor White
}

# List available devices
Write-Host "`nDispositivos disponibles:" -ForegroundColor Yellow
flutter devices

# Run app
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Ejecutando Verlyx Hub" -ForegroundColor Cyan
Write-Host "  Plataforma: $Platform" -ForegroundColor Cyan
Write-Host "  Modo: $Mode" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

switch ($Platform) {
    'windows' {
        Write-Host "Iniciando en Windows..." -ForegroundColor Green
        if ($Mode -eq 'release') {
            flutter run -d windows --release
        } elseif ($Mode -eq 'profile') {
            flutter run -d windows --profile
        } else {
            flutter run -d windows
        }
    }
    'android' {
        Write-Host "Iniciando en Android..." -ForegroundColor Green
        if ($Mode -eq 'release') {
            flutter run -d android --release
        } elseif ($Mode -eq 'profile') {
            flutter run -d android --profile
        } else {
            flutter run -d android
        }
    }
    'ios' {
        Write-Host "Iniciando en iOS..." -ForegroundColor Green
        if ($Mode -eq 'release') {
            flutter run -d ios --release
        } elseif ($Mode -eq 'profile') {
            flutter run -d ios --profile
        } else {
            flutter run -d ios
        }
    }
    'linux' {
        Write-Host "Iniciando en Linux..." -ForegroundColor Green
        flutter run -d linux
    }
    'macos' {
        Write-Host "Iniciando en macOS..." -ForegroundColor Green
        flutter run -d macos
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  App iniciada correctamente" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
