const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

// Test script to run GlassChat
function createGlassChatWindow() {
  console.log('🧪 Creating GlassChat window...');
  
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  console.log('📱 Screen dimensions:', { screenWidth, screenHeight });
  
  const testWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    x: 0,
    y: 0,
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

  const url = 'http://localhost:3006?glasschat=true';
  console.log('🌐 Loading URL:', url);
  
  testWindow.loadURL(url);

  testWindow.on('ready-to-show', () => {
    console.log('✅ GlassChat window ready to show');
    testWindow.show();
    testWindow.focus();
  });

  testWindow.webContents.on('did-finish-load', () => {
    console.log('✅ GlassChat page finished loading');
    setTimeout(() => {
      testWindow.show();
      testWindow.focus();
      console.log('🎯 GlassChat window should now be visible');
    }, 1000);
  });

  testWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`❌ Failed to load ${validatedURL}: ${errorDescription}`);
  });

  return testWindow;
}

// Initialize the app
app.whenReady().then(() => {
  createGlassChatWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createGlassChatWindow();
  }
}); 