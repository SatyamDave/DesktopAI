#!/bin/bash

echo "Starting Doppel Desktop Assistant with Laptop-Safe Performance Settings..."
echo

# Set environment variables for laptop-safe performance
export DEBUG_MODE=true
export LOG_LEVEL=info
export PERFORMANCE_MODE=true

# Create conservative config if it doesn't exist
if [ ! -f "$HOME/.doppel/config.json" ]; then
    echo "Creating laptop-safe configuration..."
    mkdir -p "$HOME/.doppel"
    cat > "$HOME/.doppel/config.json" << EOF
{
  "app": {
    "performanceMode": true,
    "clipboardTrackingEnabled": false,
    "behaviorTrackingEnabled": false,
    "autoSaveInterval": 60000,
    "maxClipboardHistory": 25,
    "maxCommandHistory": 10
  }
}
EOF
    echo "Configuration created successfully."
fi

echo
echo "Performance Settings:"
echo "- Performance Mode: ENABLED"
echo "- Clipboard Tracking: DISABLED"
echo "- Behavior Tracking: DISABLED"
echo "- Auto-save Interval: 60 seconds"
echo "- Emergency Mode: ENABLED (auto-activates if needed)"
echo
echo "Starting app..."
echo

# Start the app
npm run dev:debug 