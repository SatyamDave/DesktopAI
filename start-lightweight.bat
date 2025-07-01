@echo off
echo Starting Doppel in ULTRA-LIGHTWEIGHT mode...
echo.

set ULTRA_LIGHTWEIGHT=true
set DISABLE_CLIPBOARD_TRACKING=true
set DISABLE_BEHAVIOR_TRACKING=true
set DISABLE_WHISPER_MODE=true
set DISABLE_AI_PROCESSING=true
set DISABLE_PERFORMANCE_MONITORING=true
set DISABLE_DATABASE=true
set NODE_OPTIONS=--max-old-space-size=2048

echo Environment variables set:
echo - ULTRA_LIGHTWEIGHT=true
echo - NODE_OPTIONS=--max-old-space-size=2048
echo - All heavy services disabled
echo.

echo Starting application...
npm run dev

pause 