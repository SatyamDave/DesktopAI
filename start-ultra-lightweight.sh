#!/bin/bash
echo "Starting AgentMarket in ULTRA-LIGHTWEIGHT mode..."
echo "This mode disables all heavy features to prevent laptop lag."

export NODE_ENV=production
export PERFORMANCE_MODE=true
export ULTRA_LIGHTWEIGHT=true
export DISABLE_CLIPBOARD_TRACKING=true
export DISABLE_BEHAVIOR_TRACKING=true
export DISABLE_WHISPER_MODE=true
export DISABLE_AI_PROCESSING=true
export PERFORMANCE_MONITORING_INTERVAL=120000
export DATABASE_AUTO_SAVE=false
export ANIMATION_COMPLEXITY=minimal

echo "Environment variables set for ultra-lightweight mode:"
echo "- PERFORMANCE_MODE=true"
echo "- ULTRA_LIGHTWEIGHT=true"
echo "- All heavy services disabled"
echo "- Performance monitoring: 120 seconds"
echo "- Database auto-save: disabled"
echo "- Animation complexity: minimal"

npm run dev 