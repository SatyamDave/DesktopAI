import { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { ClipboardManager } from './services/ClipboardManager';
import { BehaviorTracker } from './services/BehaviorTracker';
import { AIProcessor } from './services/AIProcessor';
import { WhisperMode } from './services/WhisperMode';

class DoppelApp {
  private mainWindow: BrowserWindow | null = null;
  private floatingWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private clipboardManager: ClipboardManager;
  private behaviorTracker: BehaviorTracker;
  private aiProcessor: AIProcessor;
  private whisperMode: WhisperMode;
  private isDev = process.env.NODE_ENV === 'development';

  constructor() {
    this.clipboardManager = new ClipboardManager();
    this.behaviorTracker = new BehaviorTracker();
    this.aiProcessor = new AIProcessor();
    this.whisperMode = new WhisperMode();
    
    this.initializeApp();
  }

  private async initializeApp() {
    app.whenReady().then(async () => {
      await this.initializeServices();
      this.createTray();
      this.createFloatingWindow();
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
        this.createFloatingWindow();
      }
    });
  }

  private async initializeServices() {
    try {
      await this.clipboardManager.init();
      await this.behaviorTracker.init();
      await this.aiProcessor.init();
      await this.whisperMode.init();
      
      this.clipboardManager.start();
      this.behaviorTracker.start();
      this.whisperMode.start();
      
      console.log('All services initialized successfully');
    } catch (error) {
      console.error('Error initializing services:', error);
    }
  }

  private createTray() {
    try {
      // Create a simple icon if the file doesn't exist
      const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
      
      this.tray = new Tray(icon);
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show Doppel',
          click: () => this.showFloatingWindow()
        },
        {
          label: 'Settings',
          click: () => this.openSettings()
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => app.quit()
        }
      ]);
      
      this.tray.setContextMenu(contextMenu);
      this.tray.setToolTip('Doppel - AI Assistant');
    } catch (error) {
      console.error('Error creating tray:', error);
    }
  }

  private createFloatingWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    this.floatingWindow = new BrowserWindow({
      width: 60,
      height: 60,
      x: width - 80,
      y: height - 80,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const url = this.isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, '../renderer/index.html')}`;
    
    this.floatingWindow.loadURL(url);

    // Prevent window from being closed
    this.floatingWindow.on('close', (event) => {
      event.preventDefault();
      this.floatingWindow?.hide();
    });

    // Hide on blur (click outside)
    this.floatingWindow.on('blur', () => {
      this.floatingWindow?.hide();
    });
  }

  private setupGlobalShortcuts() {
    try {
      // Cmd/Ctrl + Shift + . to open command input
      const shortcut = process.platform === 'darwin' ? 'Command+Shift+.' : 'Control+Shift+.';
      
      globalShortcut.register(shortcut, () => {
        this.showCommandInput();
      });

      // ESC to hide floating window
      globalShortcut.register('Escape', () => {
        if (this.floatingWindow?.isVisible()) {
          this.floatingWindow.hide();
        }
      });
    } catch (error) {
      console.error('Error setting up global shortcuts:', error);
    }
  }

  private setupIPC() {
    // Handle command execution
    ipcMain.handle('execute-command', async (event, command: string) => {
      try {
        const result = await this.aiProcessor.processInput(command);
        return { success: true, result };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // Handle clipboard operations
    ipcMain.handle('get-clipboard-history', async () => {
      try {
        return await this.clipboardManager.getHistory();
      } catch (error) {
        console.error('Error getting clipboard history:', error);
        return [];
      }
    });

    ipcMain.handle('paste-from-history', async (event, index: number) => {
      try {
        return await this.clipboardManager.pasteFromHistory(index);
      } catch (error) {
        console.error('Error pasting from history:', error);
        return false;
      }
    });

    // Handle behavior tracking
    ipcMain.handle('get-user-context', async () => {
      try {
        const events = await this.behaviorTracker.getRecentEvents(5);
        const usage = await this.behaviorTracker.getAppUsageStats();
        return {
          currentApp: usage[0]?.app_name || 'Unknown',
          timeOfDay: this.getTimeOfDay(),
          dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          recentApps: usage.slice(0, 3).map(u => u.app_name),
          isInMeeting: false
        };
      } catch (error) {
        console.error('Error getting user context:', error);
        return {
          currentApp: 'Unknown',
          timeOfDay: 'unknown',
          dayOfWeek: 'unknown',
          recentApps: [],
          isInMeeting: false
        };
      }
    });

    // Handle whisper mode
    ipcMain.handle('toggle-whisper-mode', async (event, enabled: boolean) => {
      try {
        if (enabled) {
          await this.whisperMode.start();
        } else {
          this.whisperMode.stop();
        }
        return { success: true };
      } catch (error) {
        console.error('Error toggling whisper mode:', error);
        return { success: false, error: (error as Error).message };
      }
    });
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  private showFloatingWindow() {
    if (this.floatingWindow) {
      this.floatingWindow.show();
      this.floatingWindow.focus();
    }
  }

  private showCommandInput() {
    // Create a temporary command input window
    const commandWindow = new BrowserWindow({
      width: 600,
      height: 100,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const url = this.isDev 
      ? 'http://localhost:3000/command' 
      : `file://${path.join(__dirname, '../renderer/index.html')}#/command`;
    
    commandWindow.loadURL(url);
  }

  private openSettings() {
    if (!this.mainWindow) {
      this.mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      const url = this.isDev 
        ? 'http://localhost:3000/settings' 
        : `file://${path.join(__dirname, '../renderer/index.html')}#/settings`;
      
      this.mainWindow.loadURL(url);
    } else {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }
}

// Start the app
new DoppelApp(); 