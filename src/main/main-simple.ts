import { app, BrowserWindow, globalShortcut, ipcMain, screen, Menu, Tray } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';

console.log('Loading .env from:', path.resolve(__dirname, '../../.env'));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

app.disableHardwareAcceleration();

class SimpleGlassmorphicApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
    
    app.whenReady().then(() => {
      this.createWindow();
      this.setupTray();
      this.setupGlobalShortcuts();
      this.setupIPC();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private createWindow() {
    console.log('🚀 Starting SimpleGlassmorphicApp initialization...');

    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    console.log('📱 Screen dimensions:', { screenWidth, screenHeight });

    // Create the main glassmorphic chat window
    this.mainWindow = new BrowserWindow({
      width: 400,
      height: 600,
      x: screenWidth - 420,
      y: screenHeight - 620,
      frame: false,
      transparent: true,
      resizable: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload-simple.js')
      }
    });

    // Load the glassmorphic chat UI
    const url = this.isDev ? 'http://localhost:3001?glasschat=true' : `file://${path.join(__dirname, '../renderer/index.html')}?glasschat=true`;
    console.log('🚀 Loading URL:', url);
    
    this.mainWindow.loadURL(url);

    this.mainWindow.once('ready-to-show', () => {
      console.log('✅ Glassmorphic chat window ready to show');
      this.mainWindow?.show();
    });

    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('✅ Glassmorphic chat page finished loading');
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupTray() {
    console.log('📱 Creating system tray...');
    
    const trayIcon = path.join(__dirname, '../assets/tray-icon.png');
    this.tray = new Tray(trayIcon);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Glassmorphic Chat',
        click: () => {
          this.mainWindow?.show();
        }
      },
      {
        label: 'Hide Glassmorphic Chat',
        click: () => {
          this.mainWindow?.hide();
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
    this.tray.setToolTip('Glassmorphic Chat AI');
    console.log('✅ System tray created successfully');
  }

  private setupGlobalShortcuts() {
    console.log('⌨️ Setting up global shortcuts...');
    
    // Ctrl+Shift+G to toggle glassmorphic chat visibility
    globalShortcut.register('CommandOrControl+Shift+G', () => {
      if (this.mainWindow?.isVisible()) {
        this.mainWindow.hide();
        console.log('🪟 Glassmorphic chat hidden');
      } else {
        this.mainWindow?.show();
        console.log('🪟 Glassmorphic chat shown');
      }
    });

    // Escape to hide glassmorphic chat
    globalShortcut.register('Escape', () => {
      if (this.mainWindow?.isVisible()) {
        this.mainWindow.hide();
        console.log('🪟 Glassmorphic chat hidden (Escape)');
      }
    });

    console.log('✅ Global shortcuts registered successfully');
  }

  private setupIPC() {
    console.log('🔌 Setting up IPC handlers...');

    // Handle glassmorphic chat visibility toggle
    ipcMain.handle('toggle-glassmorphic-chat', () => {
      if (this.mainWindow?.isVisible()) {
        this.mainWindow.hide();
        return { visible: false };
      } else {
        this.mainWindow?.show();
        return { visible: true };
      }
    });

    // Handle window movement
    ipcMain.handle('move-window', (event, x: number, y: number) => {
      this.mainWindow?.setPosition(x, y);
    });

    // Handle window resizing
    ipcMain.handle('resize-window', (event, width: number, height: number) => {
      this.mainWindow?.setSize(width, height);
    });

    console.log('✅ IPC handlers setup complete');
  }
}

// Start the application
new SimpleGlassmorphicApp(); 