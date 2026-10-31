# SENTINEL — Start the isolated local mock decision service
# Run this in its own terminal. The service binds only to IPv4 loopback.

Set-Location "$PSScriptRoot\backend"
$mockState = Join-Path $PSScriptRoot "backend\var-mock-target"
New-Item -ItemType Directory -Force -Path $mockState | Out-Null
$env:SENTINEL_VAR_DIR = $mockState
$env:SENTINEL_DATABASE_URL = "sqlite:///$($mockState.Replace('\', '/'))/sentinel.db"

$venvPython = Join-Path $PSScriptRoot "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
  Write-Host "Backend virtual environment missing. Run 'uv sync' in backend first." -ForegroundColor Red
  exit 1
}

Write-Host "SENTINEL mock decision API - http://127.0.0.1:8010" -ForegroundColor Cyan
Write-Host "Health: http://127.0.0.1:8010/health" -ForegroundColor Cyan
& $venvPython -m uvicorn sentinel.mock_target:app --host 127.0.0.1 --port 8010
