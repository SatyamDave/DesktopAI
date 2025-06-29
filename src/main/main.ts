import * as path from 'path';
import * as dotenv from 'dotenv';
console.log('Loading .env from:', path.resolve(__dirname, '../../.env'));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
console.log('DEBUG ENV:', {
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION,
  TEST_ENV_VAR: process.env.TEST_ENV_VAR,
});
import { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';
import { ClipboardManager } from './services/ClipboardManager';
import { BehaviorTracker } from './services/BehaviorTracker';
import { AIProcessor } from './services/AIProcessor';
import { WhisperMode } from './services/WhisperMode';
import { CommandExecutor } from './services/CommandExecutor';

class DoppelApp {
  private mainWindow: BrowserWindow | null = null;
  private floatingWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private clipboardManager: ClipboardManager;
  private behaviorTracker: BehaviorTracker;
  private aiProcessor: AIProcessor;
  private whisperMode: WhisperMode;
  private commandExecutor: CommandExecutor;
  private isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  constructor() {
    this.clipboardManager = new ClipboardManager();
    this.behaviorTracker = new BehaviorTracker();
    this.aiProcessor = new AIProcessor();
    this.whisperMode = new WhisperMode();
    this.commandExecutor = new CommandExecutor();
    
    console.log(`🔧 Development mode: ${this.isDev}`);
    console.log(`📦 App packaged: ${app.isPackaged}`);
    
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
      
      console.log('✅ All services initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing services:', error);
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
      width: width,
      height: height,
      x: 0,
      y: 0,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    // Try different ports for dev server
    const devUrls = [
      'http://localhost:3000',  // Vite default port
      'http://localhost:5173',  // Vite alternative port
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005'
    ];
    
    const url = this.isDev 
      ? devUrls[0] // Use 3000 first since that's what Vite is using
      : `file://${path.join(__dirname, '../renderer/index.html')}`;
    
    console.log(`🚀 Loading URL: ${url}`);
    this.floatingWindow.loadURL(url);

    // Show the window when it's ready
    this.floatingWindow.once('ready-to-show', () => {
      console.log('✅ Window ready to show');
      this.floatingWindow?.show();
      this.floatingWindow?.focus();
    });

    // Fallback: show window after a timeout if ready-to-show doesn't fire
    setTimeout(() => {
      if (this.floatingWindow && !this.floatingWindow.isVisible()) {
        console.log('⏰ Fallback: showing window after timeout');
        this.floatingWindow.show();
        this.floatingWindow.focus();
      }
    }, 3000);

    // Handle load errors
    this.floatingWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`❌ Failed to load ${validatedURL}: ${errorDescription}`);
      
      // Try next URL if in dev mode
      if (this.isDev) {
        const currentIndex = devUrls.indexOf(validatedURL);
        if (currentIndex < devUrls.length - 1) {
          const nextUrl = devUrls[currentIndex + 1];
          console.log(`🔄 Trying next URL: ${nextUrl}`);
          this.floatingWindow?.loadURL(nextUrl);
        }
      }
    });

    // Add load success handler
    this.floatingWindow.webContents.on('did-finish-load', () => {
      console.log('✅ Page finished loading');
    });

    // Prevent window from being closed
    this.floatingWindow.on('close', (event) => {
      event.preventDefault();
      this.floatingWindow?.hide();
    });

    // Don't hide on blur - let user interact with it
    // this.floatingWindow.on('blur', () => {
    //   this.floatingWindow?.hide();
    // });
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

      // Ctrl+Shift+W to toggle whisper mode
      const whisperShortcut = process.platform === 'darwin' ? 'Command+Shift+W' : 'Control+Shift+W';
      globalShortcut.register(whisperShortcut, () => {
        this.toggleWhisperMode();
      });

      console.log('✅ Global shortcuts registered successfully');
    } catch (error) {
      console.error('❌ Error setting up global shortcuts:', error);
    }
  }

  private setupIPC() {
    // Handle command execution with enhanced logging
    ipcMain.handle('execute-command', async (event, command: string) => {
      try {
        console.log(`🎯 Executing command via IPC: "${command}"`);
        
        // Check if this is an email composition request
        const lowerCommand = command.toLowerCase();
        if (lowerCommand.includes('email') || lowerCommand.includes('mail') || lowerCommand.includes('send') || 
            lowerCommand.includes('compose') || lowerCommand.includes('draft')) {
          console.log(`📧 Email composition detected, routing to AIProcessor`);
          const result = await this.aiProcessor.processInput(command);
          return { success: true, result, data: { type: 'email_composition' } };
        }
        
        // Handle regular commands
        const result = await this.commandExecutor.executeCommand(command);
        console.log(`✅ Command execution result:`, result);
        return { success: true, result: result.message, data: result.data };
      } catch (error) {
        console.error('❌ Command execution error:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // Handle AI processing
    ipcMain.handle('process-ai-input', async (event, input: string, context?: any) => {
      try {
        console.log(`🤖 Processing AI input: "${input}"`);
        const result = await this.aiProcessor.processInput(input, context);
        return { success: true, result };
      } catch (error) {
        console.error('❌ AI processing error:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // Handle command history
    ipcMain.handle('get-command-history', async (event, limit = 10) => {
      try {
        const history = this.commandExecutor.getCommandHistory(limit);
        return { success: true, history };
      } catch (error) {
        console.error('❌ Error getting command history:', error);
        return { success: false, error: (error as Error).message, history: [] };
      }
    });

    // Handle command suggestions
    ipcMain.handle('get-command-suggestions', async (event, input: string) => {
      try {
        const suggestions = this.commandExecutor.getCommandSuggestions(input);
        return { success: true, suggestions };
      } catch (error) {
        console.error('❌ Error getting command suggestions:', error);
        return { success: false, error: (error as Error).message, suggestions: [] };
      }
    });

    // Handle command queue execution
    ipcMain.handle('execute-command-queue', async (event, commands: string[]) => {
      try {
        console.log(`🔄 Executing command queue:`, commands);
        const results = await this.commandExecutor.executeCommandQueue(commands);
        return { success: true, results };
      } catch (error) {
        console.error('❌ Error executing command queue:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // Handle clipboard operations
    ipcMain.handle('get-clipboard-history', async () => {
      try {
        return await this.clipboardManager.getHistory();
      } catch (error) {
        console.error('❌ Error getting clipboard history:', error);
        return [];
      }
    });

    ipcMain.handle('paste-from-history', async (event, index: number) => {
      try {
        return await this.clipboardManager.pasteFromHistory(index);
      } catch (error) {
        console.error('❌ Error pasting from history:', error);
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
        console.error('❌ Error getting user context:', error);
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
        console.error('❌ Error toggling whisper mode:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // Handle app status
    ipcMain.handle('get-app-status', async () => {
      try {
        const whisperStatus = this.whisperMode.getStatus();
        const aiConfigured = this.aiProcessor.isOpenAIConfigured();
        return {
          success: true,
          status: {
            clipboardManager: true,
            behaviorTracker: true,
            aiProcessor: true,
            openaiConfigured: aiConfigured,
            whisperMode: whisperStatus.isActive,
            commandExecutor: true
          }
        };
      } catch (error) {
        console.error('❌ Error getting app status:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // Handle email draft history
    ipcMain.handle('get-email-draft-history', async (event, limit = 20) => {
      try {
        const history = await this.aiProcessor.getEmailDraftHistory(limit);
        return { success: true, history };
      } catch (error) {
        console.error('❌ Error getting email draft history:', error);
        return { success: false, error: (error as Error).message, history: [] };
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
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    const url = this.isDev 
      ? 'http://localhost:3003/command' 
      : `file://${path.join(__dirname, '../renderer/index.html')}#/command`;
    
    commandWindow.loadURL(url);
  }

  private toggleWhisperMode() {
    try {
      const status = this.whisperMode.getStatus();
      if (status.isActive) {
        this.whisperMode.stop();
        console.log('🔇 Whisper mode disabled');
      } else {
        this.whisperMode.start();
        console.log('🎤 Whisper mode enabled');
      }
    } catch (error) {
      console.error('❌ Error toggling whisper mode:', error);
    }
  }

  private openSettings() {
    if (!this.mainWindow) {
      this.mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false
        }
      });

      const url = this.isDev 
        ? 'http://localhost:3003/settings' 
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