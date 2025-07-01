@echo off
echo Testing Orb Visibility...
echo.

echo 1. Checking if Electron processes are running...
tasklist | findstr electron
if %errorlevel% equ 0 (
    echo ✓ Electron processes found
) else (
    echo ✗ No Electron processes found
)
echo.

echo 2. Checking if Vite dev server is running on port 3004...
curl -s http://localhost:3004 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Vite dev server is running
) else (
    echo ✗ Vite dev server not responding
)
echo.

echo 3. Opening test orb in browser...
start http://localhost:3004?orb=true
echo ✓ Test orb page opened in browser
echo.

echo 4. Opening simple test HTML...
start test-orb.html
echo ✓ Simple test HTML opened
echo.

echo 5. Instructions:
echo    - Look for a small green window in the bottom-right corner
echo    - The orb should have a yellow border and purple gradient
echo    - Try pressing Ctrl+H to toggle orb visibility
echo    - Try pressing Ctrl+Shift+. to open command input
echo.

echo 6. If the orb is still not visible:
echo    - Check the troubleshooting guide: ORB_VISIBILITY_TROUBLESHOOTING.md
echo    - Restart the application with: npm run dev
echo    - Check console logs for error messages
echo.

pause 