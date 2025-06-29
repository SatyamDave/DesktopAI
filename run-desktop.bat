@echo off
echo 🚀 Starting AgentMarket Desktop Application...
echo ==============================================

REM Check if dist directory exists
if not exist "dist" (
    echo 📦 Building application first...
    call npm run build
)

REM Run the desktop application
echo 🖥️  Launching desktop app...
npx electron .

pause 