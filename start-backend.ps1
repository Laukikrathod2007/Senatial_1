# SENTINEL — Start backend API server
# Run this first, then start-frontend.ps1
# API docs will be at: http://127.0.0.1:8000/docs

Set-Location "$PSScriptRoot\backend"

# This launcher is explicitly for the local synthetic hackathon demo. Keep its
# database separate from any configured deployment or prior project database.
$demoState = Join-Path $PSScriptRoot "backend\var-demo"
New-Item -ItemType Directory -Force -Path $demoState | Out-Null
$env:SENTINEL_VAR_DIR = $demoState
$env:SENTINEL_DATABASE_URL = "sqlite:///$($demoState.Replace('\', '/'))/sentinel.db"
$env:SENTINEL_ENABLE_DEMO_AUTH = "true"
$env:SENTINEL_ENABLE_DEMO_CONTROLS = "true"
$env:SENTINEL_ENABLE_HTTP_DEMO_TARGET = "true"
if (-not $env:SENTINEL_JWT_SECRET) {
  $env:SENTINEL_JWT_SECRET = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  SENTINEL Backend API - http://127.0.0.1:8000"    -ForegroundColor Cyan
Write-Host "  Swagger docs - http://127.0.0.1:8000/docs"       -ForegroundColor Cyan
Write-Host "  Local demo roles and ledger tampering are enabled." -ForegroundColor Yellow
Write-Host "  HTTP target audit expects the separate local service on port 8010." -ForegroundColor Yellow
Write-Host "  Demo database: $demoState" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$venvPython = Join-Path $PSScriptRoot "backend\.venv\Scripts\python.exe"
if (Test-Path $venvPython) {
  & $venvPython -m uvicorn sentinel.api.app:app --host 127.0.0.1 --port 8000
} else {
  Write-Host "Backend virtual environment missing. Run 'uv sync' in backend first." -ForegroundColor Red
  exit 1
}
