import * as path from 'path';
import { app, BrowserWindow, screen } from 'electron';

// Minimal main process that only creates the orb window
class MinimalOrbApp {
  private floatingWindow: BrowserWindow | null = null;
  private isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  constructor() {
    console.log('🚀 Starting MinimalOrbApp...');
    this.initializeApp();
  }

  private async initializeApp() {
    app.whenReady().then(() => {
      console.log('✅ Electron app is ready');
      this.createFloatingWindow();
      console.log('✅ Floating window created');
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

  private createFloatingWindow() {
    try {
      console.log('🪟 Creating floating orb window...');
      
      // Get screen dimensions for better positioning
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      
      console.log('📱 Screen dimensions:', { screenWidth, screenHeight });
      
      // Make the window larger to ensure the orb is visible
      const orbSize = 120;
      const margin = 30;
      const x = screenWidth - orbSize - margin;
      const y = screenHeight - orbSize - margin;
      
      console.log('📍 Orb position:', { x, y, width: orbSize, height: orbSize });
      
      this.floatingWindow = new BrowserWindow({
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

      // Use the correct port that Vite is running on
      const url = this.isDev ? 'http://localhost:3005?orb=true' : `file://${path.join(__dirname, '../renderer/index.html')}?orb=true`;
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
          console.log('🎯 Orb window should now be visible');
        }, 1000);
      });

      this.floatingWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error(`❌ Failed to load ${validatedURL}: ${errorDescription}`);
        // Try loading the simple HTML file as fallback
        console.log('🔄 Trying fallback HTML file...');
        this.floatingWindow?.loadFile('test-orb.html');
      });

      this.floatingWindow.on('close', (event) => {
        event.preventDefault();
        this.floatingWindow?.hide();
      });

      console.log('✅ Floating orb window created successfully');
    } catch (error) {
      console.error('❌ Error creating floating orb window:', error);
    }
  }
}

// Start the app
new MinimalOrbApp(); 