const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();

class SimpleApp {
  constructor() {
    console.log('🚀 Starting SimpleApp...');
    this.initializeApp();
  }

  initializeApp() {
    console.log('🚀 Starting SimpleApp initialization...');
    
    app.whenReady().then(() => {
      console.log('✅ Electron app is ready');
      this.createFloatingWindow();
      console.log('✅ Floating window created');
      this.setupIPC();
      console.log('✅ IPC setup complete');
      console.log('🎉 App initialization complete!');
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
        this.createFloatingWindow();
      }
    });
  }

  setupIPC() {
    // Handle command execution
    ipcMain.handle('execute-command', async (event, command) => {
      try {
        console.log(`🎯 Executing command: "${command}"`);
        
        // Simple command processing
        const lowerCommand = command.toLowerCase();
        let result = 'Command executed successfully';
        
        if (lowerCommand.includes('open') && lowerCommand.includes('chrome')) {
          result = 'Opening Chrome browser...';
          // Here you would actually open Chrome
        } else if (lowerCommand.includes('summarize') && lowerCommand.includes('clipboard')) {
          result = 'Summarizing clipboard content...';
          // Here you would actually summarize clipboard
        } else if (lowerCommand.includes('screenshot')) {
          result = 'Taking screenshot...';
          // Here you would actually take screenshot
        } else if (lowerCommand.includes('hello') || lowerCommand.includes('hi')) {
          result = 'Hello! How can I help you today?';
        } else {
          result = `I understand you want to: ${command}. This feature is coming soon!`;
        }
        
        return { success: true, result };
      } catch (error) {
        console.error('❌ Command execution error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  createFloatingWindow() {
    try {
      console.log('🪟 Creating floating orb window...');
      
      // Get screen dimensions for full screen coverage
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      
      this.floatingWindow = new BrowserWindow({
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
        webPreferences: {
          contextIsolation: false,
          nodeIntegration: true,
          preload: path.join(__dirname, 'preload.js')
        }
      });

      // Use the correct port that Vite is running on (3003)
      const url = 'http://localhost:3003?orb=true';
      console.log(`🚀 Loading URL: ${url}`);
      
      this.floatingWindow.loadURL(url);

      this.floatingWindow.on('ready-to-show', () => {
        console.log('✅ Orb window ready to show');
        this.floatingWindow?.show();
        this.floatingWindow?.focus();
      });

      this.floatingWindow.webContents.on('did-finish-load', () => {
        console.log('✅ Orb page finished loading');
        setTimeout(() => {
          this.floatingWindow?.show();
          this.floatingWindow?.focus();
        }, 500);
      });

      this.floatingWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error(`❌ Failed to load ${validatedURL}: ${errorDescription}`);
      });

      console.log('✅ Floating orb window created successfully');
    } catch (error) {
      console.error('❌ Error creating floating orb window:', error);
    }
  }
}

// Start the app
new SimpleApp(); 