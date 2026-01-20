# ============================================
# Flutter Installation Script for Windows
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Flutter Installation Wizard" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$flutterPath = "C:\src\flutter"
$flutterBin = "$flutterPath\bin"

# Check if Flutter already exists
if (Test-Path $flutterPath) {
    Write-Host "✓ Flutter already installed at $flutterPath" -ForegroundColor Green
    Write-Host "Updating Flutter..." -ForegroundColor Yellow
    & "$flutterBin\flutter" upgrade
} else {
    Write-Host "Downloading Flutter SDK..." -ForegroundColor Yellow
    
    # Create directory
    New-Item -ItemType Directory -Path "C:\src" -Force | Out-Null
    
    # Download Flutter
    $flutterZip = "C:\src\flutter_windows.zip"
    $url = "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.24.5-stable.zip"
    
    Write-Host "Downloading from: $url" -ForegroundColor Yellow
    Invoke-WebRequest -Uri $url -OutFile $flutterZip -UseBasicParsing
    
    Write-Host "Extracting Flutter..." -ForegroundColor Yellow
    Expand-Archive -Path $flutterZip -DestinationPath "C:\src" -Force
    
    Remove-Item $flutterZip
    
    Write-Host "✓ Flutter extracted to $flutterPath" -ForegroundColor Green
}

# Add to PATH
Write-Host "`nConfiguring PATH..." -ForegroundColor Yellow
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$flutterBin*") {
    [Environment]::SetEnvironmentVariable(
        "Path",
        "$currentPath;$flutterBin",
        "User"
    )
    Write-Host "✓ Flutter added to PATH" -ForegroundColor Green
    Write-Host "⚠ You need to restart PowerShell for PATH changes to take effect" -ForegroundColor Yellow
} else {
    Write-Host "✓ Flutter already in PATH" -ForegroundColor Green
}

# Refresh PATH for current session
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Run flutter doctor
Write-Host "`nRunning Flutter Doctor..." -ForegroundColor Yellow
& "$flutterBin\flutter" doctor -v

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Close and reopen PowerShell" -ForegroundColor White
Write-Host "2. Run: flutter doctor" -ForegroundColor White
Write-Host "3. Run: flutter doctor --android-licenses (if using Android)" -ForegroundColor White
Write-Host "4. Continue with Verlyx Hub setup`n" -ForegroundColor White
