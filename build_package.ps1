# Build and package NDK Tracker (PWA + Backend)
# Usage: Run from repo root in existing PowerShell session
# Notes:
# - Reuses existing terminal/venv. Does NOT spawn new consoles
# - Assumes backend .venv exists at .\.venv or backend\.venv
# - Produces: backend\dist\*.exe and dist\pwa\ (copied PWA build)

$ErrorActionPreference = 'Stop'

Write-Host "[1/6] Ensuring paths" -ForegroundColor Cyan
$repoRoot = Get-Location
$frontendDir = Join-Path $repoRoot 'frontend'
$backendDir = Join-Path $repoRoot 'backend'
$backendVenv = Join-Path $backendDir '.venv'

if (-not (Test-Path $frontendDir)) { throw "Missing frontend directory: $frontendDir" }
if (-not (Test-Path $backendDir)) { throw "Missing backend directory: $backendDir" }

Write-Host "[2/6] Building frontend (npm install + npm run build)" -ForegroundColor Cyan
Push-Location $frontendDir
npm install
npm run build
Pop-Location

Write-Host "[3/6] Copying PWA build into backend/frontend/build" -ForegroundColor Cyan
$backendPwaDir = Join-Path $backendDir 'frontend/build'
if (-not (Test-Path (Split-Path $backendPwaDir))) {
  New-Item -ItemType Directory -Path (Split-Path $backendPwaDir) | Out-Null
}
if (-not (Test-Path $backendPwaDir)) {
  New-Item -ItemType Directory -Path $backendPwaDir | Out-Null
}
robocopy (Join-Path $frontendDir 'build') $backendPwaDir /MIR | Out-Null

Write-Host "[4/6] Ensuring backend venv and Python deps" -ForegroundColor Cyan
Push-Location $backendDir
$activateScript = Join-Path $backendVenv 'Scripts/Activate.ps1'
if (-not (Test-Path $activateScript)) {
  Write-Host "No backend venv found at $backendVenv. Creating..." -ForegroundColor Yellow
  python -m venv .venv
}
& $activateScript
pip install -r requirements.txt
Pop-Location

Write-Host "[5/6] Building Windows .exe with PyInstaller" -ForegroundColor Cyan
Push-Location $backendDir
& $activateScript
# Use the existing spec to bundle templates and frontend/build
pyinstaller --noconfirm NDK_tracker_setup.spec
Pop-Location

Write-Host "[6/6] Creating distribution folder with exe and PWA" -ForegroundColor Cyan
$distDir = Join-Path $repoRoot 'dist'
if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }
# Copy exe(s)
robocopy (Join-Path $backendDir 'dist') $distDir *.exe /S | Out-Null
# Copy PWA for standalone hosting option
robocopy (Join-Path $frontendDir 'build') (Join-Path $distDir 'pwa') /MIR | Out-Null

Write-Host "✅ Build complete!" -ForegroundColor Green
Write-Host "- EXE(s): $distDir" -ForegroundColor Green
Write-Host "- PWA:    $distDir\pwa" -ForegroundColor Green
