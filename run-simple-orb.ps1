Write-Host "Running Simple Orb App..." -ForegroundColor Green
Write-Host ""

Write-Host "1. Compiling TypeScript..." -ForegroundColor Yellow
npx tsc src/main/main-simple.ts --outDir dist/main --target ES2020 --module commonjs --esModuleInterop --skipLibCheck

Write-Host ""
Write-Host "2. Starting Electron with simple orb..." -ForegroundColor Yellow
$env:NODE_OPTIONS = "--max-old-space-size=1024"
electron dist/main/main-simple.js

Read-Host "Press Enter to continue" 