#!/bin/bash

echo "⚡ Starting Doppel Desktop Assistant - Ultra Lightweight Mac Mode"
echo "================================================================"
echo

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is designed for macOS only!"
    exit 1
fi

# Set environment variables for ultra-lightweight mode
export NODE_ENV=development
export DEBUG_MODE=false
export LOG_LEVEL=error
export PERFORMANCE_MODE=true
export ULTRA_LIGHTWEIGHT=true

# Disable heavy features for ultra-lightweight mode
export DISABLE_CLIPBOARD_TRACKING=true
export DISABLE_BEHAVIOR_TRACKING=true
export DISABLE_WHISPER_MODE=true
export DISABLE_PERFORMANCE_MONITORING=true
export DISABLE_DATABASE=true

# Keep AI processing enabled for email functionality
export DISABLE_AI_PROCESSING=false

# Mac-specific optimizations
export ELECTRON_ENABLE_LOGGING=false
export ELECTRON_ENABLE_STACK_DUMPING=false

# Create ultra-lightweight config
if [ ! -f "$HOME/.doppel/config.json" ]; then
    echo "📁 Creating ultra-lightweight configuration..."
    mkdir -p "$HOME/.doppel"
    cat > "$HOME/.doppel/config.json" << EOF
{
  "app": {
    "performanceMode": true,
    "clipboardTrackingEnabled": false,
    "behaviorTrackingEnabled": false,
    "autoSaveInterval": 120000,
    "maxClipboardHistory": 10,
    "maxCommandHistory": 5,
    "platform": "macos",
    "ultraLightweight": true
  },
  "mac": {
    "enableGlobalShortcuts": true,
    "enableTrayIcon": false,
    "enableFloatingWindow": true,
    "useNativeNotifications": false
  }
}
EOF
    echo "✅ Ultra-lightweight configuration created."
fi

# Check for required dependencies
echo "🔍 Checking dependencies..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating ultra-lightweight template..."
    cat > ".env" << EOF
# AI Configuration (Required for email functionality)
GEMINI_API_KEY=your_gemini_api_key_here

# Ultra Lightweight Mode Settings
NODE_ENV=development
DEBUG_MODE=false
LOG_LEVEL=error
PERFORMANCE_MODE=true
ULTRA_LIGHTWEIGHT=true

# Disabled Features (for performance)
DISABLE_CLIPBOARD_TRACKING=true
DISABLE_BEHAVIOR_TRACKING=true
DISABLE_WHISPER_MODE=true
DISABLE_PERFORMANCE_MONITORING=true
DISABLE_DATABASE=true

# Enabled Features
DISABLE_AI_PROCESSING=false
EOF
    echo "✅ Ultra-lightweight .env template created. Please add your Gemini API key!"
fi

echo
echo "⚡ Ultra Lightweight Settings:"
echo "- Performance Mode: ENABLED"
echo "- Clipboard Tracking: DISABLED"
echo "- Behavior Tracking: DISABLED"
echo "- Whisper Mode: DISABLED"
echo "- Performance Monitoring: DISABLED"
echo "- Database: DISABLED"
echo "- AI Processing: ENABLED (for email)"
echo "- Tray Icon: DISABLED"
echo "- Native Notifications: DISABLED"
echo "- Debug Mode: DISABLED"
echo
echo "🔧 Building and starting ultra-lightweight app..."
echo

# Build the main process
echo "🔨 Building main process..."
npm run build:main

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi

echo "✅ Build successful!"

# Start the development server
echo "🚀 Starting ultra-lightweight development server..."
echo "📱 Use Cmd+Space to toggle the floating window"
echo "📧 Email functionality is available"
echo "🛑 Use Cmd+Q to quit"
echo

npm run dev 