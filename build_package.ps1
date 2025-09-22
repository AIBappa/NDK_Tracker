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

# Clean previous build artifacts to avoid stale names (e.g., autism_tracker_setup)
Write-Host "[1.1/6] Cleaning old build artifacts" -ForegroundColor DarkCyan
if (Test-Path (Join-Path $backendDir 'build')) { Remove-Item -Recurse -Force (Join-Path $backendDir 'build') }
if (Test-Path (Join-Path $backendDir 'dist')) { Remove-Item -Recurse -Force (Join-Path $backendDir 'dist') }
if (Test-Path (Join-Path $repoRoot 'dist'))     { Remove-Item -Recurse -Force (Join-Path $repoRoot 'dist') }

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
$venvPython = Join-Path $backendVenv 'Scripts/python.exe'

# Create venv if missing
if (-not (Test-Path $venvPython)) {
  Write-Host "No backend venv found at $backendVenv. Creating..." -ForegroundColor Yellow
  python -m venv .venv
}

# Guard: If this venv was created in a different repo path (e.g., Autism_Tracker), recreate it
$pyvenvCfg = Join-Path $backendVenv 'pyvenv.cfg'
if (Test-Path $pyvenvCfg) {
  $cfg = Get-Content $pyvenvCfg -Raw
  if ($cfg -match 'Autism_Tracker') {
    Write-Host "Detected stale venv referencing Autism_Tracker. Recreating backend/.venv..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $backendVenv
    python -m venv .venv
  }
}

# Diagnostics
Write-Host "Using venv python: $venvPython" -ForegroundColor DarkCyan
& $venvPython --version
& $venvPython -c "import sys; print('sys.executable =', sys.executable)"

# Install/upgrade pip itself first to avoid stale launchers
& $venvPython -m pip install --upgrade pip
# Install requirements via python -m pip to avoid launcher path issues
& $venvPython -m pip install -r requirements.txt
Pop-Location

Write-Host "[5/6] Building Windows .exe with PyInstaller" -ForegroundColor Cyan
Push-Location $backendDir
# Use python -m to invoke PyInstaller to avoid launcher issues
& $venvPython -m PyInstaller --noconfirm --log-level DEBUG NDK_tracker_setup.spec
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
