@echo off
echo Starting AgentMarket in ULTRA-LIGHTWEIGHT mode...
echo This mode disables all heavy features to prevent laptop lag.

set NODE_ENV=production
set PERFORMANCE_MODE=true
set ULTRA_LIGHTWEIGHT=true
set DISABLE_CLIPBOARD_TRACKING=true
set DISABLE_BEHAVIOR_TRACKING=true
set DISABLE_WHISPER_MODE=true
set DISABLE_AI_PROCESSING=true
set PERFORMANCE_MONITORING_INTERVAL=120000
set DATABASE_AUTO_SAVE=false
set ANIMATION_COMPLEXITY=minimal

echo Environment variables set for ultra-lightweight mode:
echo - PERFORMANCE_MODE=true
echo - ULTRA_LIGHTWEIGHT=true
echo - All heavy services disabled
echo - Performance monitoring: 120 seconds
echo - Database auto-save: disabled
echo - Animation complexity: minimal

npm run dev

pause 