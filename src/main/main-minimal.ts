import { app, BrowserWindow, globalShortcut, ipcMain, screen, Menu, Tray } from 'electron';
import * as path from 'path';

// Minimal main process that only creates the glassmorphic chat window
class MinimalGlassmorphicApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
    
    console.log('🚀 Starting MinimalGlassmorphicApp...');
    
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
    console.log('🪟 Creating glassmorphic chat window...');
    
    // Get screen dimensions for better positioning
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Create a proper sized window for the glassmorphic chat
    const chatWidth = 400;
    const chatHeight = 600;
    const margin = 50;
    const x = screenWidth - chatWidth - margin;
    const y = screenHeight - chatHeight - margin;
    
    console.log('📍 Glassmorphic chat position:', { x, y, width: chatWidth, height: chatHeight });
    
    this.mainWindow = new BrowserWindow({
      width: chatWidth,
      height: chatHeight,
      x: x,
      y: y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
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

    // Load the glassmorphic chat UI
    const url = this.isDev ? 'http://localhost:3006?glasschat=true' : `file://${path.join(__dirname, '../renderer/index.html')}?glasschat=true`;
    console.log('🚀 Loading URL:', url);
    
    this.mainWindow.loadURL(url);

    this.mainWindow.on('ready-to-show', () => {
      console.log('✅ Glassmorphic chat window ready to show');
      this.mainWindow?.show();
      this.mainWindow?.focus();
    });

    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('✅ Glassmorphic chat page finished loading');
      setTimeout(() => {
        this.mainWindow?.show();
        this.mainWindow?.focus();
      }, 500);
    });

    this.mainWindow.on('close', (event) => {
      event.preventDefault();
      this.mainWindow?.hide();
    });

    console.log('✅ Glassmorphic chat window created successfully');
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
new MinimalGlassmorphicApp(); 