@echo off
echo Starting AgentMarket in MINIMAL mode...
echo This mode disables EVERYTHING to prevent any lag.

set NODE_ENV=production
set PERFORMANCE_MODE=true
set ULTRA_LIGHTWEIGHT=true
set DISABLE_CLIPBOARD_TRACKING=true
set DISABLE_BEHAVIOR_TRACKING=true
set DISABLE_WHISPER_MODE=true
set DISABLE_AI_PROCESSING=true
set DISABLE_PERFORMANCE_MONITORING=true
set DISABLE_DATABASE=true
set DISABLE_ANIMATIONS=true
set PERFORMANCE_MONITORING_INTERVAL=0
set DATABASE_AUTO_SAVE=false
set ANIMATION_COMPLEXITY=none

echo Environment variables set for minimal mode:
echo - ALL services disabled
echo - Performance monitoring: DISABLED
echo - Database: DISABLED
echo - Animations: DISABLED

npm run dev

pause 