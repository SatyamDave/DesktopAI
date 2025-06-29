#!/bin/bash

echo "🚀 Setting up Doppel - AI Desktop Assistant"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    echo "   Please update Node.js to version 18 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies. Please check your internet connection and try again."
    exit 1
fi

echo "✅ Dependencies installed successfully!"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p dist
mkdir -p assets

echo "✅ Directories created!"

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi

echo "✅ Build completed successfully!"

echo ""
echo "🎉 Setup completed! You can now run:"
echo "   npm run dev    # Start development mode"
echo "   npm run dist   # Build for distribution"
echo ""
echo "📖 For more information, check the README.md file"
echo "🔗 Visit: https://github.com/yourusername/doppel" 