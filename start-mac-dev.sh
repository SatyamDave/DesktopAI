#!/bin/bash

echo "🚀 Starting Doppel Desktop Assistant for Mac Development..."
echo "=========================================================="
echo

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is designed for macOS only!"
    exit 1
fi

# Set environment variables for Mac development
export NODE_ENV=development
export DEBUG_MODE=true
export LOG_LEVEL=info
export PERFORMANCE_MODE=true

# Mac-specific optimizations
export ELECTRON_ENABLE_LOGGING=true
export ELECTRON_ENABLE_STACK_DUMPING=true

# Create Mac-optimized config if it doesn't exist
if [ ! -f "$HOME/.doppel/config.json" ]; then
    echo "📁 Creating Mac-optimized configuration..."
    mkdir -p "$HOME/.doppel"
    cat > "$HOME/.doppel/config.json" << EOF
{
  "app": {
    "performanceMode": true,
    "clipboardTrackingEnabled": true,
    "behaviorTrackingEnabled": true,
    "autoSaveInterval": 30000,
    "maxClipboardHistory": 50,
    "maxCommandHistory": 20,
    "platform": "macos"
  },
  "mac": {
    "enableGlobalShortcuts": true,
    "enableTrayIcon": true,
    "enableFloatingWindow": true,
    "useNativeNotifications": true
  }
}
EOF
    echo "✅ Configuration created successfully."
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
    echo "⚠️  No .env file found. Creating template..."
    cat > ".env" << EOF
# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: OpenAI Configuration (if you want to use OpenAI instead)
# OPENAI_API_KEY=your_openai_api_key_here

# Development Settings
NODE_ENV=development
DEBUG_MODE=true
LOG_LEVEL=info

# Performance Settings
PERFORMANCE_MODE=true
ULTRA_LIGHTWEIGHT=false
DISABLE_CLIPBOARD_TRACKING=false
DISABLE_BEHAVIOR_TRACKING=false
DISABLE_WHISPER_MODE=false
DISABLE_AI_PROCESSING=false
DISABLE_PERFORMANCE_MONITORING=false
DISABLE_DATABASE=false

# Performance Monitoring
PERFORMANCE_MONITORING_INTERVAL=30000
EOF
    echo "✅ .env template created. Please add your API keys!"
fi

echo
echo "🎯 Mac Development Settings:"
echo "- Performance Mode: ENABLED"
echo "- Clipboard Tracking: ENABLED"
echo "- Behavior Tracking: ENABLED"
echo "- Global Shortcuts: ENABLED"
echo "- Native Notifications: ENABLED"
echo "- Debug Mode: ENABLED"
echo "- Auto-save Interval: 30 seconds"
echo
echo "🔧 Build and start the app..."
echo

# Build the main process first
echo "🔨 Building main process..."
npm run build:main

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi

echo "✅ Build successful!"

# Start the development server
echo "🚀 Starting development server..."
echo "📱 Use Cmd+Space to toggle the floating window"
echo "🎤 Use Cmd+Shift+W to toggle Whisper mode"
echo "⚙️  Use Cmd+, to open settings"
echo "🛑 Use Cmd+Q to quit"
echo

npm run dev 