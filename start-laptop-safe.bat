@echo off
echo Starting Doppel Desktop Assistant with Laptop-Safe Performance Settings...
echo.

REM Set environment variables for laptop-safe performance
set DEBUG_MODE=true
set LOG_LEVEL=info
set PERFORMANCE_MODE=true

REM Create conservative config if it doesn't exist
if not exist "%USERPROFILE%\.doppel\config.json" (
    echo Creating laptop-safe configuration...
    mkdir "%USERPROFILE%\.doppel" 2>nul
    echo { > "%USERPROFILE%\.doppel\config.json"
    echo   "app": { >> "%USERPROFILE%\.doppel\config.json"
    echo     "performanceMode": true, >> "%USERPROFILE%\.doppel\config.json"
    echo     "clipboardTrackingEnabled": false, >> "%USERPROFILE%\.doppel\config.json"
    echo     "behaviorTrackingEnabled": false, >> "%USERPROFILE%\.doppel\config.json"
    echo     "autoSaveInterval": 60000, >> "%USERPROFILE%\.doppel\config.json"
    echo     "maxClipboardHistory": 25, >> "%USERPROFILE%\.doppel\config.json"
    echo     "maxCommandHistory": 10 >> "%USERPROFILE%\.doppel\config.json"
    echo   } >> "%USERPROFILE%\.doppel\config.json"
    echo } >> "%USERPROFILE%\.doppel\config.json"
    echo Configuration created successfully.
)

echo.
echo Performance Settings:
echo - Performance Mode: ENABLED
echo - Clipboard Tracking: DISABLED
echo - Behavior Tracking: DISABLED
echo - Auto-save Interval: 60 seconds
echo - Emergency Mode: ENABLED (auto-activates if needed)
echo.
echo Starting app...
echo.

REM Start the app with Windows-compatible environment variables
call npm run dev

pause 