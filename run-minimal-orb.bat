@echo off
echo Running Minimal Orb App...
echo.

echo 1. Compiling TypeScript...
npx tsc src/main/main-minimal.ts --outDir dist/main --target ES2020 --module commonjs --esModuleInterop --skipLibCheck

echo.
echo 2. Starting Electron with minimal orb...
set NODE_OPTIONS=--max-old-space-size=1024
electron dist/main/main-minimal.js

pause 