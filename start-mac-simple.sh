#!/bin/bash

echo "🍎 Starting Doppel Desktop Assistant - Simple Mac Mode"
echo "====================================================="
echo

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is designed for macOS only!"
    exit 1
fi

# Set environment variables for simple mode
export NODE_ENV=development
export DEBUG_MODE=true
export LOG_LEVEL=info
export PERFORMANCE_MODE=true

# Disable heavy features for simple testing
export DISABLE_CLIPBOARD_TRACKING=true
export DISABLE_BEHAVIOR_TRACKING=true
export DISABLE_WHISPER_MODE=true
export DISABLE_PERFORMANCE_MONITORING=true
export DISABLE_DATABASE=true

# Keep AI processing enabled for email functionality
export DISABLE_AI_PROCESSING=false

# Mac-specific optimizations
export ELECTRON_ENABLE_LOGGING=true
export ELECTRON_ENABLE_STACK_DUMPING=true

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
# AI Configuration (Required for email functionality)
GEMINI_API_KEY=your_gemini_api_key_here

# Simple Mode Settings
NODE_ENV=development
DEBUG_MODE=true
LOG_LEVEL=info
PERFORMANCE_MODE=true

# Disabled Features (for simple testing)
DISABLE_CLIPBOARD_TRACKING=true
DISABLE_BEHAVIOR_TRACKING=true
DISABLE_WHISPER_MODE=true
DISABLE_PERFORMANCE_MONITORING=true
DISABLE_DATABASE=true

# Enabled Features
DISABLE_AI_PROCESSING=false
EOF
    echo "✅ .env template created. Please add your Gemini API key!"
fi

echo
echo "🎯 Simple Mac Settings:"
echo "- Performance Mode: ENABLED"
echo "- Clipboard Tracking: DISABLED"
echo "- Behavior Tracking: DISABLED"
echo "- Whisper Mode: DISABLED"
echo "- Performance Monitoring: DISABLED"
echo "- Database: DISABLED"
echo "- AI Processing: ENABLED (for email)"
echo "- Debug Mode: ENABLED"
echo
echo "🔧 Starting development server (skipping TypeScript build)..."
echo

# Start the development server directly
echo "🚀 Starting development server..."
echo "📱 Use Cmd+Space to toggle the floating window"
echo "📧 Email functionality is available"
echo "🛑 Use Cmd+Q to quit"
echo

# Try to start without building first
npm run dev:renderer &
sleep 2
npm run dev:main 