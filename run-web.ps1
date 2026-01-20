# run-web.ps1 - Script para ejecutar Verlyx Hub en Web
# =====================================================

param(
    [switch]$Release,
    [switch]$Build,
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   VERLYX HUB - Flutter Web" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio del proyecto Flutter
Set-Location "$PSScriptRoot\verlyx_hub_flutter"

# Verificar que Flutter esté instalado
try {
    $flutterVersion = flutter --version 2>&1 | Select-Object -First 1
    Write-Host "[OK] Flutter detectado: $flutterVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Flutter no encontrado. Instálalo primero." -ForegroundColor Red
    exit 1
}

# Verificar que web esté habilitado
Write-Host "`n[1/4] Verificando soporte web..." -ForegroundColor Yellow
$webEnabled = flutter devices | Select-String "Chrome"
if (-not $webEnabled) {
    Write-Host "[INFO] Habilitando soporte web..." -ForegroundColor Yellow
    flutter config --enable-web
}
Write-Host "[OK] Web habilitado" -ForegroundColor Green

# Verificar archivo .env
Write-Host "`n[2/4] Verificando configuración..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "[WARN] Archivo .env no encontrado. Creando desde template..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "[OK] .env creado. Edítalo con tus credenciales." -ForegroundColor Green
    } else {
        # Crear .env básico
        @"
# Verlyx Hub - Environment Configuration
APP_NAME=Verlyx Hub
APP_ENV=development

# Backend API
API_BASE_URL=http://localhost:3000/api

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
"@ | Out-File -FilePath ".env" -Encoding UTF8
        Write-Host "[OK] .env creado. Edítalo con tus credenciales." -ForegroundColor Green
    }
}

# Obtener dependencias
Write-Host "`n[3/4] Obteniendo dependencias..." -ForegroundColor Yellow
flutter pub get
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error al obtener dependencias" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Dependencias instaladas" -ForegroundColor Green

# Ejecutar o construir
if ($Build) {
    Write-Host "`n[4/4] Construyendo para producción..." -ForegroundColor Yellow
    
    if ($Release) {
        flutter build web --release --web-renderer canvaskit
    } else {
        flutter build web --profile --web-renderer canvaskit
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host "   BUILD COMPLETADO!" -ForegroundColor Green
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Los archivos están en: build/web/" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Para servir localmente:" -ForegroundColor Yellow
        Write-Host "  cd build/web" -ForegroundColor White
        Write-Host "  python -m http.server $Port" -ForegroundColor White
        Write-Host ""
        Write-Host "O despliega la carpeta build/web/ en:" -ForegroundColor Yellow
        Write-Host "  - Vercel" -ForegroundColor White
        Write-Host "  - Netlify" -ForegroundColor White
        Write-Host "  - Firebase Hosting" -ForegroundColor White
        Write-Host "  - AWS S3 + CloudFront" -ForegroundColor White
    } else {
        Write-Host "[ERROR] Build fallido" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n[4/4] Iniciando servidor de desarrollo web..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "   VERLYX HUB WEB - MODO DESARROLLO" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "La aplicación se abrirá en Chrome automáticamente." -ForegroundColor Cyan
    Write-Host "Puerto: $Port" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Presiona 'r' para hot reload" -ForegroundColor Yellow
    Write-Host "Presiona 'R' para hot restart" -ForegroundColor Yellow
    Write-Host "Presiona 'q' para salir" -ForegroundColor Yellow
    Write-Host ""
    
    flutter run -d chrome --web-port $Port --web-renderer canvaskit
}
