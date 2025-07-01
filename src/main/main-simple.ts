import * as path from 'path';
import * as dotenv from 'dotenv';
import { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';

console.log('Loading .env from:', path.resolve(__dirname, '../../.env'));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

app.disableHardwareAcceleration();

class SimpleOrbApp {
  private floatingWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  constructor() {
    console.log(`🔧 Development mode: ${this.isDev}`);
    console.log(`📦 App packaged: ${app.isPackaged}`);
    
    this.initializeApp();
  }

  private async initializeApp() {
    console.log('🚀 Starting SimpleOrbApp initialization...');
    
    app.whenReady().then(async () => {
      console.log('✅ Electron app is ready');
      this.createTray();
      console.log('✅ Tray created');
      this.createFloatingWindow();
      console.log('✅ Floating window created');
      this.setupGlobalShortcuts();
      console.log('✅ Global shortcuts setup');
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

    app.on('before-quit', async () => {
      console.log('🛑 App quitting, starting cleanup...');
      await this.cleanup();
    });
  }

  private createTray() {
    try {
      console.log('📱 Creating system tray...');
      
      // Create a simple icon for the tray
      const iconPath = path.join(__dirname, '../../assets/vite.svg');
      const icon = nativeImage.createFromPath(iconPath);
      
      this.tray = new Tray(icon);
      this.tray.setToolTip('DELO AI Assistant');
      
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show Orb',
          click: () => {
            this.showFloatingWindow();
          }
        },
        {
          label: 'Hide Orb',
          click: () => {
            if (this.floatingWindow) {
              this.floatingWindow.hide();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => {
            app.quit();
          }
        }
      ]);
      
      this.tray.setContextMenu(contextMenu);
      this.tray.on('click', () => {
        this.showFloatingWindow();
      });
      
      console.log('✅ System tray created successfully');
    } catch (error) {
      console.error('❌ Error creating system tray:', error);
    }
  }

  private createFloatingWindow() {
    try {
      console.log('🪟 Creating floating orb window...');
      
      // Get screen dimensions for better positioning
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      
      // Make the window larger to ensure the orb is visible
      const orbSize = 120;
      const margin = 30;
      const x = screenWidth - orbSize - margin;
      const y = screenHeight - orbSize - margin;
      
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
          preload: path.join(__dirname, 'preload-simple.js'),
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: false
        }
      });

      // Use the correct port that Vite is running on (3006)
      const url = this.isDev ? 'http://localhost:3006?orb=true' : `file://${path.join(__dirname, '../renderer/index.html')}?orb=true`;
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
        setTimeout(() => {
          console.log('🔄 Retrying to load orb window...');
          this.floatingWindow?.loadURL(url);
        }, 2000);
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

  private setupGlobalShortcuts() {
    try {
      // Cmd/Ctrl + H to toggle orb visibility
      const toggleOrbShortcut = process.platform === 'darwin' ? 'Command+H' : 'Control+H';
      globalShortcut.register(toggleOrbShortcut, () => {
        if (this.floatingWindow) {
          if (this.floatingWindow.isVisible()) {
            this.floatingWindow.hide();
          } else {
            this.floatingWindow.show();
            this.floatingWindow.focus();
          }
        }
      });

      // Alt + Space to show orb
      globalShortcut.register('Alt+Space', () => {
        this.showFloatingWindow();
      });

      // ESC to hide floating window
      globalShortcut.register('Escape', () => {
        if (this.floatingWindow?.isVisible()) {
          this.floatingWindow.hide();
        }
      });

      console.log('✅ Global shortcuts registered successfully');
    } catch (error) {
      console.error('❌ Error setting up global shortcuts:', error);
    }
  }

  private setupIPC() {
    // Handle simple command execution
    ipcMain.handle('execute-command', async (event, command: string) => {
      try {
        console.log(`🎯 Executing command: "${command}"`);
        return { 
          success: true, 
          result: `Command executed: ${command}`,
          data: { type: 'command' }
        };
      } catch (error) {
        console.error('❌ Command execution error:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // Handle AI processing (simplified)
    ipcMain.handle('process-ai-input', async (event, input: string) => {
      try {
        console.log(`🤖 Processing AI input: "${input}"`);
        return { 
          success: true, 
          result: `I understand: ${input}. How can I help you?`
        };
      } catch (error) {
        console.error('❌ AI processing error:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // Handle orb visibility toggle
    ipcMain.handle('toggle-orb', () => {
      if (this.floatingWindow) {
        if (this.floatingWindow.isVisible()) {
          this.floatingWindow.hide();
        } else {
          this.floatingWindow.show();
          this.floatingWindow.focus();
        }
      }
    });

    // Handle app status
    ipcMain.handle('get-app-status', () => {
      return {
        isVisible: this.floatingWindow?.isVisible() || false,
        isDev: this.isDev,
        platform: process.platform
      };
    });

    console.log('✅ IPC handlers setup complete');
  }

  private async cleanup() {
    try {
      console.log('🧹 Starting cleanup...');
      
      if (this.tray) {
        this.tray.destroy();
        this.tray = null;
      }
      
      if (this.floatingWindow) {
        this.floatingWindow.destroy();
        this.floatingWindow = null;
      }
      
      console.log('✅ Cleanup complete');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  private showFloatingWindow() {
    if (this.floatingWindow) {
      this.floatingWindow.show();
      this.floatingWindow.focus();
      console.log('✅ Floating window shown');
    }
  }
}

// Start the app
new SimpleOrbApp(); 