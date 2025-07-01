@echo off
echo 🚀 Setting up Doppel - AI Desktop Assistant
echo ==============================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Visit: https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2,3 delims=." %%a in ('node --version') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:~1%
if %NODE_VERSION% LSS 18 (
    echo ❌ Node.js version 18+ is required. Current version: 
    node --version
    echo    Please update Node.js to version 18 or higher.
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node --version

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies. Please check your internet connection and try again.
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully!

REM Create necessary directories
echo 📁 Creating necessary directories...
if not exist "dist" mkdir dist
if not exist "assets" mkdir assets

echo ✅ Directories created!

REM Build the project
echo 🔨 Building the project...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed. Please check the error messages above.
    pause
    exit /b 1
)

echo ✅ Build completed successfully!

echo.
echo 🎉 Setup completed! You can now run:
echo    npm run dev    # Start development mode
echo    npm run dist   # Build for distribution
echo.
echo 📖 For more information, check the README.md file
echo 🔗 Visit: https://github.com/yourusername/doppel
pause 