const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('🧪 Testing window creation...');

let mainWindow;

function createWindow() {
  console.log('🪟 Creating test window...');
  
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    x: 200,
    y: 200,
    frame: true,
    transparent: false,
    alwaysOnTop: false,
    skipTaskbar: false,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const url = 'http://localhost:3000';
  console.log(`🚀 Loading URL: ${url}`);
  
  mainWindow.loadURL(url);

  mainWindow.on('ready-to-show', () => {
    console.log('✅ Test window ready to show');
    mainWindow.focus();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Test page finished loading');
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`❌ Failed to load ${validatedURL}: ${errorDescription}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('✅ Test window created successfully');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 