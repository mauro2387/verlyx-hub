# ============================================
# Verlyx Hub - Build Script
# Genera builds de produccion para todas las plataformas
# ============================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('all', 'windows', 'android-apk', 'android-aab', 'ios', 'linux', 'macos')]
    [string]$Target = 'all'
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Verlyx Hub - Build Production" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Navigate to project
$projectPath = "C:\Users\mauro\OneDrive\Desktop\Verlyx Hub\verlyx_hub_flutter"
Set-Location $projectPath

Write-Host "Limpiando proyecto..." -ForegroundColor Yellow
flutter clean
flutter pub get
Write-Host "[OK] Proyecto limpio`n" -ForegroundColor Green

# Build functions
function Build-Windows {
    Write-Host "`n=== Building Windows ===" -ForegroundColor Cyan
    flutter build windows --release
    if ($LASTEXITCODE -eq 0) {
        $exePath = "build\windows\x64\runner\Release\verlyx_hub.exe"
        Write-Host "[OK] Windows build completo" -ForegroundColor Green
        Write-Host "  Ejecutable: $exePath`n" -ForegroundColor White
        
        # Create installer
        Write-Host "Creando instalador Windows..." -ForegroundColor Yellow
        if (Test-Path "C:\Program Files (x86)\Inno Setup 6\ISCC.exe") {
            Write-Host "[INFO] Inno Setup detectado pero script no configurado" -ForegroundColor Yellow
        } else {
            Write-Host "[INFO] Inno Setup no instalado (opcional para crear instalador)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[ERROR] Error en Windows build" -ForegroundColor Red
    }
}

function Build-AndroidAPK {
    Write-Host "`n=== Building Android APK ===" -ForegroundColor Cyan
    flutter build apk --release --split-per-abi
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Android APK completo" -ForegroundColor Green
        Write-Host "  APKs en: build\app\outputs\flutter-apk\" -ForegroundColor White
        Get-ChildItem "build\app\outputs\flutter-apk\*.apk" | ForEach-Object {
            $size = [math]::Round($_.Length / 1MB, 2)
            Write-Host "  - $($_.Name) - ${size} MB" -ForegroundColor White
        }
        Write-Host ""
    } else {
        Write-Host "[ERROR] Error en Android APK build" -ForegroundColor Red
    }
}

function Build-AndroidAAB {
    Write-Host "`n=== Building Android App Bundle ===" -ForegroundColor Cyan
    flutter build appbundle --release
    if ($LASTEXITCODE -eq 0) {
        $aabPath = "build\app\outputs\bundle\release\app-release.aab"
        $size = [math]::Round((Get-Item $aabPath).Length / 1MB, 2)
        Write-Host "[OK] Android App Bundle completo" -ForegroundColor Green
        Write-Host "  AAB: $aabPath - ${size} MB" -ForegroundColor White
        Write-Host "  Listo para Google Play Store`n" -ForegroundColor White
    } else {
        Write-Host "[ERROR] Error en Android AAB build" -ForegroundColor Red
    }
}

function Build-iOS {
    Write-Host "`n=== Building iOS ===" -ForegroundColor Cyan
    Write-Host "[INFO] iOS build solo disponible en macOS" -ForegroundColor Yellow
    Write-Host "Comando: flutter build ios --release`n" -ForegroundColor White
}

function Build-Linux {
    Write-Host "`n=== Building Linux ===" -ForegroundColor Cyan
    flutter build linux --release
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Linux build completo" -ForegroundColor Green
        Write-Host "  Binario en: build\linux\x64\release\bundle\verlyx_hub`n" -ForegroundColor White
    } else {
        Write-Host "[ERROR] Error en Linux build" -ForegroundColor Red
    }
}

function Build-macOS {
    Write-Host "`n=== Building macOS ===" -ForegroundColor Cyan
    Write-Host "[INFO] macOS build solo disponible en macOS" -ForegroundColor Yellow
    Write-Host "Comando: flutter build macos --release`n" -ForegroundColor White
}

# Execute builds based on target
switch ($Target) {
    'all' {
        Build-Windows
        Build-AndroidAPK
        Build-AndroidAAB
        Build-Linux
    }
    'windows' { Build-Windows }
    'android-apk' { Build-AndroidAPK }
    'android-aab' { Build-AndroidAAB }
    'ios' { Build-iOS }
    'linux' { Build-Linux }
    'macos' { Build-macOS }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Build Process Completo" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Summary
Write-Host "Resumen de archivos generados:" -ForegroundColor Yellow
Write-Host ""
if (Test-Path "build\windows\x64\runner\Release\verlyx_hub.exe") {
    Write-Host "[OK] Windows: build\windows\x64\runner\Release\verlyx_hub.exe" -ForegroundColor Green
}
if (Test-Path "build\app\outputs\flutter-apk\") {
    Write-Host "[OK] Android APKs: build\app\outputs\flutter-apk\" -ForegroundColor Green
}
if (Test-Path "build\app\outputs\bundle\release\app-release.aab") {
    Write-Host "[OK] Android AAB: build\app\outputs\bundle\release\app-release.aab" -ForegroundColor Green
}
if (Test-Path "build\linux\x64\release\bundle\") {
    Write-Host "[OK] Linux: build\linux\x64\release\bundle\" -ForegroundColor Green
}
Write-Host ""
