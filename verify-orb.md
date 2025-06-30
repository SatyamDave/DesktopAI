# Orb Verification Guide

## ✅ Current Status
- Vite development server: RUNNING on http://localhost:3000
- Electron main process: RUNNING
- Orb window: SHOULD BE VISIBLE

## 🧪 How to Test the Orb

### 1. Visual Verification
- Look for a floating orb in the bottom-right corner of your screen
- The orb should be a circular, glowing button with a purple/blue gradient
- It should have a subtle animation and glow effect

### 2. Interaction Testing
- **Click the orb**: Should open a chat interface
- **Drag the orb**: Should move the window around the screen
- **Hover over the orb**: Should show a scale-up animation

### 3. Keyboard Shortcuts
- **Ctrl+Shift+.** (or Cmd+Shift+. on Mac): Open command input
- **Escape**: Hide the floating window
- **Ctrl+Shift+W**: Toggle whisper mode

### 4. Mode Indicators
- **Ultra-lightweight mode**: Orb should have a green color and ⚡ indicator
- **Emergency mode**: Orb should have a red color and 🚨 indicator

## 🔧 Troubleshooting

### If the orb is not visible:
1. Check if both processes are running:
   ```bash
   netstat -an | findstr :3000
   tasklist | findstr electron
   ```

2. Restart the application:
   ```bash
   .\start-minimal.bat
   ```

3. Check for errors in the console output

### If the orb is not responding:
1. Try clicking in different areas of the orb
2. Check if the window is behind other applications
3. Restart the application

### If you see GPU errors:
- These are normal and don't affect functionality
- The application disables hardware acceleration to prevent issues

## 🎯 Expected Behavior

The orb should:
- ✅ Be visible in the bottom-right corner
- ✅ Stay on top of other windows
- ✅ Be draggable
- ✅ Respond to clicks
- ✅ Show hover animations
- ✅ Work with keyboard shortcuts

## 📝 Notes
- The orb runs in ultra-lightweight mode by default
- All heavy services are disabled to prevent lag
- The window is frameless and transparent
- Hardware acceleration is disabled to prevent GPU errors 