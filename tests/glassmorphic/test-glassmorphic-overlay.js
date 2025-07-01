const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src/main/preload.js')
    },
    titleBarStyle: 'hidden',
    frame: false,
    transparent: true,
    resizable: true,
    show: false
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✨ Glassmorphic Overlay Test App Started');
    console.log('🎯 Features to test:');
    console.log('  - Click the floating orb to open glassmorphic overlay');
    console.log('  - Use Ctrl/Cmd + Space to toggle overlay');
    console.log('  - Use Ctrl/Cmd + L to toggle listening');
    console.log('  - Press Escape to close overlay');
    console.log('  - Try the different mode buttons in the header');
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers for the glassmorphic overlay
ipcMain.handle('executeCommand', async (event, command) => {
  console.log('🪟 Executing command:', command);
  
  // Simulate command processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    result: `Successfully executed: "${command}"`,
    latency: Math.random() * 100 + 50
  };
});

ipcMain.handle('getCommandHistory', async (event, limit = 10) => {
  return {
    success: true,
    history: [
      { command: 'Open Chrome', success: true, timestamp: Date.now() - 1000 },
      { command: 'Take screenshot', success: true, timestamp: Date.now() - 2000 },
      { command: 'Search web', success: true, timestamp: Date.now() - 3000 }
    ].slice(0, limit)
  };
});

ipcMain.handle('getCommandSuggestions', async (event, input) => {
  const suggestions = [
    'Open Chrome',
    'Take screenshot', 
    'Search web',
    'Write email',
    'Open settings',
    'Check weather',
    'Set reminder'
  ].filter(s => s.toLowerCase().includes(input.toLowerCase()));
  
  return {
    success: true,
    suggestions: suggestions.slice(0, 5)
  };
});

// App event handlers
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

console.log('🚀 Starting Glassmorphic Overlay Test...'); 