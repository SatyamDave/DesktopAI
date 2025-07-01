# Orb Visibility Troubleshooting Guide

## Issue Description
The floating orb is not visible when running `npm run dev`.

## Potential Causes and Solutions

### 1. Window Positioning Issue
**Problem**: The floating window might be positioned outside the visible screen area.

**Solution**: 
- The window is positioned at bottom-right corner with 30px margin
- Window size is 120x120 pixels
- Check if your screen resolution is large enough

### 2. Window Transparency Issue
**Problem**: The window might be too transparent to see.

**Solution**: 
- Added green background (`rgba(0, 255, 0, 0.2)`) for debugging
- Added yellow border to the orb for visibility
- Added brightness filter to make orb more prominent

### 3. Z-Index Issues
**Problem**: Other windows might be covering the orb.

**Solution**:
- Orb has `z-index: 1000`
- Window has `alwaysOnTop: true`
- Check if other applications are covering the orb

### 4. Development Server Issues
**Problem**: The Vite dev server might not be serving the orb correctly.

**Solution**:
- Check if Vite is running on port 3004
- Verify the URL `http://localhost:3004?orb=true` loads correctly
- Check browser console for errors

## Debugging Steps

### Step 1: Check if Electron is Running
```bash
tasklist | findstr electron
```
You should see at least 2 electron processes running.

### Step 2: Check Vite Dev Server
Open `http://localhost:3004?orb=true` in your browser to see if the orb renders.

### Step 3: Check Console Logs
Look for these log messages in the terminal:
- `🪟 Creating floating orb window...`
- `✅ Orb window ready to show`
- `🪟 OrbApp component mounted`
- `🪟 FloatingOrb mounted with position:`

### Step 4: Test with Simple HTML
Open `test-orb.html` in your browser to verify orb rendering works.

### Step 5: Check Window Position
The orb should appear in the bottom-right corner of your screen with a green background.

## Quick Fixes

### Fix 1: Restart the Application
```bash
# Stop the current process
Ctrl+C

# Restart
npm run dev
```

### Fix 2: Check Screen Resolution
Make sure your screen resolution is at least 1366x768.

### Fix 3: Disable Other Overlays
Close any screen recording software, overlays, or other floating applications.

### Fix 4: Use Keyboard Shortcuts
- Press `Ctrl+H` to toggle orb visibility
- Press `Ctrl+Shift+.` to open command input

## Expected Behavior

1. **Main Window**: Full DELO Assistant interface should appear
2. **Floating Orb**: Small circular orb should appear in bottom-right corner
3. **Orb Appearance**: Purple gradient with yellow border and green background
4. **Orb Interaction**: Click to open command interface

## Current Debug Settings

- **Window Size**: 120x120 pixels
- **Position**: Bottom-right corner with 30px margin
- **Background**: Green semi-transparent for visibility
- **Orb Border**: Yellow for debugging
- **Z-Index**: 1000
- **Always on Top**: Enabled

## If Still Not Visible

1. Check if you have multiple monitors
2. Try moving the window position in `src/main/main.ts`
3. Increase window size temporarily
4. Check Windows display settings
5. Try running as administrator

## Contact Support

If the issue persists, please provide:
- Screen resolution
- Windows version
- Console logs
- Screenshot of the issue 