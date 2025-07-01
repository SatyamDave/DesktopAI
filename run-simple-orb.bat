@echo off
echo Running Simple Orb App...
echo.

echo 1. Compiling TypeScript...
npx tsc src/main/main-simple.ts --outDir dist/main --target ES2020 --module commonjs --esModuleInterop --skipLibCheck

echo.
echo 2. Starting Electron with simple orb...
set NODE_OPTIONS=--max-old-space-size=1024
electron dist/main/main-simple.js

pause 