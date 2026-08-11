# SENTINEL — Start backend API server
# Run this first, then start-frontend.ps1
# API docs will be at: http://127.0.0.1:8000/docs

Set-Location "$PSScriptRoot\backend"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  SENTINEL Backend API — http://127.0.0.1:8000"    -ForegroundColor Cyan
Write-Host "  Swagger docs — http://127.0.0.1:8000/docs"       -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

uv run uvicorn sentinel.api.app:app --port 8000 --reload
