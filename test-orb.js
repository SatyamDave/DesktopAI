const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

console.log('🧪 Testing Orb Window...');

let testWindow = null;

function createTestWindow() {
  console.log('🪟 Creating test orb window...');
  
  // Get screen dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Position in bottom-right
  const orbSize = 100;
  const margin = 20;
  const x = screenWidth - orbSize - margin;
  const y = screenHeight - orbSize - margin;
  
  testWindow = new BrowserWindow({
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
    titleBarOverlay: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: false
    }
  });

  // Disable hardware acceleration
  testWindow.webContents.setVisualZoomLevelLimits(1, 1);

  const url = 'http://localhost:3000';
  console.log(`🚀 Loading URL: ${url}`);
  
  testWindow.loadURL(url);

  testWindow.on('ready-to-show', () => {
    console.log('✅ Test window ready to show');
    testWindow?.show();
    testWindow?.focus();
  });

  testWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Test page finished loading');
    setTimeout(() => {
      testWindow?.show();
      testWindow?.focus();
      console.log('🎉 Test orb window is now visible!');
    }, 100);
  });

  testWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`❌ Failed to load ${validatedURL}: ${errorDescription}`);
    console.error(`Error code: ${errorCode}`);
  });

  testWindow.on('close', (event) => {
    event.preventDefault();
    testWindow?.hide();
  });

  console.log('✅ Test orb window created successfully');
}

app.whenReady().then(() => {
  console.log('✅ Electron app is ready');
  createTestWindow();
});

app.on('window-all-closed', () => {
  console.log('🔄 All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('🔄 App activated');
  if (BrowserWindow.getAllWindows().length === 0) {
    createTestWindow();
  }
});

console.log('🧪 Orb test script loaded'); 