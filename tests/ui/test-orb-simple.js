const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

// Simple test script to just show the orb
function createSimpleOrbWindow() {
  console.log('🧪 Creating simple orb window...');
  
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  console.log('📱 Screen dimensions:', { screenWidth, screenHeight });
  
  const orbSize = 120;
  const margin = 30;
  const x = screenWidth - orbSize - margin;
  const y = screenHeight - orbSize - margin;
  
  console.log('📍 Orb position:', { x, y, width: orbSize, height: orbSize });
  
  const testWindow = new BrowserWindow({
    width: orbSize,
    height: orbSize,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  // Use a simple HTML file instead of the complex React app
  const url = `file://${path.join(__dirname, 'test-orb.html')}`;
  console.log('🌐 Loading URL:', url);
  
  testWindow.loadURL(url);

  testWindow.on('ready-to-show', () => {
    console.log('✅ Simple orb window ready to show');
    testWindow.show();
    testWindow.focus();
  });

  testWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Simple orb page finished loading');
    setTimeout(() => {
      testWindow.show();
      testWindow.focus();
      console.log('🎯 Simple orb window should now be visible');
    }, 1000);
  });

  testWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`❌ Failed to load ${validatedURL}: ${errorDescription}`);
  });

  return testWindow;
}

// Run the test if this script is executed directly
if (require.main === module) {
  app.whenReady().then(() => {
    createSimpleOrbWindow();
  });
}

module.exports = { createSimpleOrbWindow }; 