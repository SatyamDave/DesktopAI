# Ultra-Lightweight Mode Guide

## Overview

The ultra-lightweight mode is designed specifically for laptops and low-performance systems to prevent lag and freezing. It disables all heavy services by default and only initializes them when explicitly requested.

## Quick Start

### Windows
```bash
# Run the ultra-lightweight startup script
start-ultra-lightweight.bat
```

### macOS/Linux
```bash
# Make the script executable
chmod +x start-ultra-lightweight.sh

# Run the ultra-lightweight startup script
./start-ultra-lightweight.sh
```

### Manual Start
```bash
# Set environment variables manually
set NODE_ENV=production
set PERFORMANCE_MODE=true
set ULTRA_LIGHTWEIGHT=true
set DISABLE_CLIPBOARD_TRACKING=true
set DISABLE_BEHAVIOR_TRACKING=true
set DISABLE_WHISPER_MODE=true
set DISABLE_AI_PROCESSING=true
set PERFORMANCE_MONITORING_INTERVAL=120000
set DATABASE_AUTO_SAVE=false
set ANIMATION_COMPLEXITY=minimal

npm run dev
```

## What's Disabled in Ultra-Lightweight Mode

### Services Disabled by Default
- **Clipboard Manager**: No clipboard tracking or history
- **Behavior Tracker**: No app usage monitoring
- **Whisper Mode**: No voice recognition
- **AI Processor**: No AI processing capabilities
- **Database Manager**: No database initialization until needed
- **Performance Monitoring**: Reduced frequency (120 seconds)

### UI Changes
- Minimal animations
- Reduced performance monitoring
- Visual indicators for ultra-lightweight mode
- Emergency mode indicators

## Enabling Features On-Demand

### Clipboard History
```javascript
// Will initialize clipboard manager when first accessed
const history = await window.electronAPI.getClipboardHistory();
```

### AI Processing
```javascript
// Will initialize AI processor when first accessed
const result = await window.electronAPI.processAIInput("Hello");
```

### Behavior Tracking
```javascript
// Will initialize behavior tracker when first accessed
const context = await window.electronAPI.getUserContext();
```

### Whisper Mode
```javascript
// Will initialize whisper mode when first accessed
await window.electronAPI.toggleWhisperMode(true);
```

## Performance Monitoring

### Check Service Status
```javascript
const status = await window.electronAPI.getAppStatus();
console.log('Service Status:', status);
```

### Performance Metrics
```javascript
const metrics = await window.electronAPI.getPerformanceMetrics();
console.log('Performance:', metrics);
```

## Troubleshooting

### Still Experiencing Lag?

1. **Check if ultra-lightweight mode is active**
   - Look for "⚡ Ultra-Lightweight Mode" indicator in top-right corner

2. **Verify environment variables**
   ```bash
   echo %ULTRA_LIGHTWEIGHT%
   echo %DISABLE_CLIPBOARD_TRACKING%
   ```

3. **Check service initialization**
   - Open DevTools (Ctrl+Shift+I)
   - Look for initialization logs in console

4. **Monitor resource usage**
   - Use Task Manager to check CPU/Memory usage
   - Should be minimal in ultra-lightweight mode

### Common Issues

**Issue**: App still shows "Loading..." indefinitely
**Solution**: Check console for initialization errors, ensure database permissions

**Issue**: Performance monitoring still running
**Solution**: Verify `PERFORMANCE_MONITORING_INTERVAL=120000` is set

**Issue**: Services still initializing at startup
**Solution**: Ensure all `DISABLE_*` environment variables are set to `true`

## Testing Ultra-Lightweight Mode

Run the test script to verify performance:
```bash
node test-ultra-lightweight.js
```

Expected results:
- Startup time < 10 seconds
- Memory usage < 200MB
- CPU usage < 5%
- No database initialization at startup

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `ULTRA_LIGHTWEIGHT` | `false` | Enable ultra-lightweight mode |
| `DISABLE_CLIPBOARD_TRACKING` | `false` | Disable clipboard manager |
| `DISABLE_BEHAVIOR_TRACKING` | `false` | Disable behavior tracker |
| `DISABLE_WHISPER_MODE` | `false` | Disable whisper mode |
| `DISABLE_AI_PROCESSING` | `false` | Disable AI processor |
| `PERFORMANCE_MONITORING_INTERVAL` | `60000` | Performance check interval (ms) |
| `DATABASE_AUTO_SAVE` | `true` | Enable database auto-save |
| `ANIMATION_COMPLEXITY` | `normal` | UI animation complexity |

## Emergency Mode

If the system detects high resource usage, it will automatically enter emergency mode:
- All heavy services are stopped
- Performance monitoring is reduced
- UI animations are simplified
- Visual indicator shows "🚨 Emergency Mode"

Emergency mode will automatically exit when resource usage normalizes.

## Migration from Normal Mode

If you're switching from normal mode to ultra-lightweight:

1. **Backup your data** (if needed)
2. **Stop the app completely**
3. **Use ultra-lightweight startup script**
4. **Features will initialize on first use**

## Support

If you continue to experience issues with ultra-lightweight mode:

1. Check the console logs for errors
2. Verify all environment variables are set correctly
3. Try running with even more conservative settings
4. Report issues with system specifications and logs 