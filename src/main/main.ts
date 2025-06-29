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
import { ConfigManager } from './services/ConfigManager';
import { PerformanceOptimizer } from './services/PerformanceOptimizer';
import { DatabaseManager } from './services/DatabaseManager';

class DoppelApp {
  private mainWindow: BrowserWindow | null = null;
  private floatingWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private clipboardManager: ClipboardManager;
  private behaviorTracker: BehaviorTracker;
  private aiProcessor: AIProcessor;
  private whisperMode: WhisperMode;
  private commandExecutor: CommandExecutor;
  private performanceOptimizer: PerformanceOptimizer;
  private databaseManager: DatabaseManager;
  private isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  // Lazy initialization methods
  private databaseInitialized = false;
  private clipboardInitialized = false;
  private behaviorInitialized = false;
  private whisperInitialized = false;
  private aiProcessorInitialized = false;

  constructor() {
    this.performanceOptimizer = PerformanceOptimizer.getInstance();
    this.databaseManager = DatabaseManager.getInstance();
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
    console.log('🚀 Starting DoppelApp initialization...');
    
    app.whenReady().then(async () => {
      console.log('✅ Electron app is ready');
      await this.initializeServices();
      console.log('✅ Services initialized');
      this.createTray();
      console.log('✅ Tray created');
      this.createFloatingWindow();
      console.log('✅ Floating window created');
      this.setupGlobalShortcuts();
      console.log('✅ Global shortcuts setup');
      this.setupIPC();
      console.log('✅ IPC setup complete');
      this.setupPerformanceMonitoring();
      console.log('✅ Performance monitoring setup');
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

    // Cleanup on app quit
    app.on('before-quit', async () => {
      console.log('🛑 App quitting, starting cleanup...');
      await this.cleanup();
    });
  }

  private async initializeServices() {
    try {
      console.log('🚀 Initializing services in ULTRA-LIGHTWEIGHT mode...');
      
      // Check for ultra-lightweight mode environment variables
      const isUltraLightweight = process.env.ULTRA_LIGHTWEIGHT === 'true';
      const disableClipboard = process.env.DISABLE_CLIPBOARD_TRACKING === 'true';
      const disableBehavior = process.env.DISABLE_BEHAVIOR_TRACKING === 'true';
      const disableWhisper = process.env.DISABLE_WHISPER_MODE === 'true';
      const disableAI = process.env.DISABLE_AI_PROCESSING === 'true';
      const disablePerformanceMonitoring = process.env.DISABLE_PERFORMANCE_MONITORING === 'true';
      const disableDatabase = process.env.DISABLE_DATABASE === 'true';
      
      if (isUltraLightweight) {
        console.log('⚡ ULTRA-LIGHTWEIGHT MODE DETECTED - Disabling all heavy services');
        console.log('📋 Clipboard tracking: DISABLED');
        console.log('👁️ Behavior tracking: DISABLED');
        console.log('🎤 Whisper mode: DISABLED');
        console.log('🤖 AI processing: DISABLED');
        if (disablePerformanceMonitoring) {
          console.log('🔍 Performance monitoring: DISABLED');
        }
        if (disableDatabase) {
          console.log('🗄️ Database: DISABLED');
        }
      }
      
      // Initialize performance monitoring with very long interval
      const monitoringInterval = parseInt(process.env.PERFORMANCE_MONITORING_INTERVAL || '60000');
      console.log(`🔍 Starting performance monitoring (interval: ${monitoringInterval}ms)...`);
      
      // Skip performance monitoring in ultra-lightweight mode to prevent lag
      if (!isUltraLightweight && !disablePerformanceMonitoring) {
        this.performanceOptimizer.startMonitoring(monitoringInterval);
      } else {
        console.log('⚡ Ultra-lightweight mode: Performance monitoring disabled');
      }
      
      // Initialize database manager only when needed
      if (!disableDatabase) {
        console.log('🗄️ Database manager will be initialized on-demand...');
      } else {
        console.log('🗄️ Database manager: DISABLED');
      }
      
      // Initialize only the most essential services
      console.log('🤖 Initializing only essential services...');
      
      // Don't initialize heavy services at startup - they'll be initialized on-demand
      console.log('⚡ ULTRA-LIGHTWEIGHT MODE: Skipping all heavy services at startup');
      console.log('📋 Clipboard manager: Will initialize on first use');
      console.log('👁️ Behavior tracker: Will initialize on first use');
      console.log('🎤 Whisper mode: Will initialize on first use');
      
      console.log('✅ Services initialized in ultra-lightweight mode');
    } catch (error) {
      console.error('❌ Error initializing services:', error);
      // Continue running even if some services fail
    }
  }

  private async ensureDatabaseInitialized(): Promise<void> {
    if (process.env.DISABLE_DATABASE === 'true') {
      console.log('🗄️ Database disabled by environment variable');
      return;
    }
    
    if (!this.databaseInitialized) {
      console.log('🗄️ Initializing database manager on-demand...');
      await this.databaseManager.initialize();
      this.databaseInitialized = true;
    }
  }

  private async ensureClipboardManagerInitialized(): Promise<void> {
    if (process.env.DISABLE_CLIPBOARD_TRACKING === 'true') {
      console.log('📋 Clipboard manager disabled by environment variable');
      return;
    }
    
    if (!this.clipboardInitialized) {
      console.log('📋 Initializing clipboard manager on-demand...');
      await this.ensureDatabaseInitialized();
      await this.clipboardManager.init();
      this.clipboardInitialized = true;
    }
  }

  private async ensureBehaviorTrackerInitialized(): Promise<void> {
    if (process.env.DISABLE_BEHAVIOR_TRACKING === 'true') {
      console.log('👁️ Behavior tracker disabled by environment variable');
      return;
    }
    
    if (!this.behaviorInitialized) {
      console.log('👁️ Initializing behavior tracker on-demand...');
      await this.ensureDatabaseInitialized();
      await this.behaviorTracker.init();
      this.behaviorInitialized = true;
    }
  }

  private async ensureWhisperModeInitialized(): Promise<void> {
    if (process.env.DISABLE_WHISPER_MODE === 'true') {
      console.log('🎤 Whisper mode disabled by environment variable');
      return;
    }
    
    if (!this.whisperInitialized) {
      console.log('🎤 Initializing whisper mode on-demand...');
      await this.whisperMode.init();
      this.whisperInitialized = true;
    }
  }

  private async ensureAIProcessorInitialized(): Promise<void> {
    if (process.env.DISABLE_AI_PROCESSING === 'true') {
      console.log('🤖 AI processor disabled by environment variable');
      return;
    }
    
    if (!this.aiProcessorInitialized) {
      console.log('🤖 Initializing AI processor on-demand...');
      await this.aiProcessor.init();
      this.aiProcessorInitialized = true;
    }
  }

  private setupPerformanceMonitoring() {
    // Listen for performance warnings
    this.performanceOptimizer.on('performance-warning', (data) => {
      console.warn('⚠️ Performance warning detected:', data.warnings);
      
      // Automatically apply low-performance optimizations
      if (data.metrics.memoryUsage > 600) { // 600MB threshold (was 400MB)
        this.performanceOptimizer.optimizeForLowPerformance();
      }
    });

    // Listen for emergency mode
    this.performanceOptimizer.on('emergency-mode', () => {
      console.log('🚨 EMERGENCY MODE: Stopping all heavy services');
      
      // Immediately stop heavy services
      this.clipboardManager.stop();
      this.behaviorTracker.stop();
      
      // Reduce animation complexity
      if (this.floatingWindow) {
        this.floatingWindow.webContents.send('emergency-mode', true);
      }
    });

    // Listen for emergency mode exit
    this.performanceOptimizer.on('emergency-mode-exit', () => {
      console.log('✅ Emergency mode exited: Restarting services gradually');
      
      // Gradually restart services
      setTimeout(() => {
        this.clipboardManager.start();
      }, 5000);
      
      setTimeout(() => {
        this.behaviorTracker.start();
      }, 10000);
      
      // Restore normal animations
      if (this.floatingWindow) {
        this.floatingWindow.webContents.send('emergency-mode', false);
      }
    });

    // Listen for low-performance mode
    this.performanceOptimizer.on('low-performance-mode', () => {
      console.log('⚡ Switching to low-performance mode');
      // Reduce animation complexity, increase intervals, etc.
    });

    // Listen for high-performance mode
    this.performanceOptimizer.on('high-performance-mode', () => {
      console.log('⚡ Switching to high-performance mode');
      // Restore normal performance settings
    });

    // Add emergency shutdown handler
    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      this.emergencyShutdown();
    });

    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      this.emergencyShutdown();
    });
  }

  private async cleanup() {
    console.log('🧹 Cleaning up resources...');
    
    try {
      // Stop performance monitoring
      this.performanceOptimizer.stopMonitoring();
      
      // Stop all services
      this.clipboardManager.stop();
      this.behaviorTracker.stop();
      this.whisperMode.stop();
      
      // Close all databases
      await this.databaseManager.closeAll();
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
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
    try {
      console.log('🪟 Creating floating orb window...');
      
      this.floatingWindow = new BrowserWindow({
        width: 100,
        height: 100,
        x: 100,
        y: 100,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        show: true,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false
        }
      });

      const url = this.isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../renderer/index.html')}`;
      console.log(`🚀 Loading URL: ${url}`);
      
      this.floatingWindow.loadURL(url);

      this.floatingWindow.on('ready-to-show', () => {
        console.log('✅ Orb window ready to show');
        this.floatingWindow?.focus();
      });

      this.floatingWindow.webContents.on('did-finish-load', () => {
        console.log('✅ Orb page finished loading');
        this.floatingWindow?.show();
        this.floatingWindow?.focus();
      });

      this.floatingWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error(`❌ Failed to load ${validatedURL}: ${errorDescription}`);
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
        await this.ensureAIProcessorInitialized();
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
        await this.ensureClipboardManagerInitialized();
        return await this.clipboardManager.getHistory();
      } catch (error) {
        console.error('❌ Error getting clipboard history:', error);
        return [];
      }
    });

    ipcMain.handle('paste-from-history', async (event, index: number) => {
      try {
        await this.ensureClipboardManagerInitialized();
        return await this.clipboardManager.pasteFromHistory(index);
      } catch (error) {
        console.error('❌ Error pasting from history:', error);
        return false;
      }
    });

    // Handle behavior tracking
    ipcMain.handle('get-user-context', async () => {
      try {
        await this.ensureBehaviorTrackerInitialized();
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
        await this.ensureWhisperModeInitialized();
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
        let whisperStatus = { isActive: false };
        if (this.whisperInitialized) {
          whisperStatus = this.whisperMode.getStatus();
        }
        
        return {
          success: true,
          status: {
            clipboardManager: this.clipboardInitialized,
            behaviorTracker: this.behaviorInitialized,
            aiProcessor: this.aiProcessorInitialized,
            whisperMode: whisperStatus.isActive,
            commandExecutor: true,
            databaseManager: this.databaseInitialized
          }
        };
      } catch (error) {
        console.error('❌ Error getting app status:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // Performance monitoring handlers
    ipcMain.handle('get-performance-metrics', async () => {
      try {
        const metrics = this.performanceOptimizer.getCurrentMetrics();
        const systemInfo = this.performanceOptimizer.getSystemInfo();
        
        // Only get database stats if initialized
        let dbStats: any = null;
        if (this.databaseInitialized) {
          dbStats = this.databaseManager.getDatabaseStats();
        }
        
        // Only get service stats if initialized
        let clipboardStats: any = null;
        let behaviorStats: any = null;
        
        if (this.clipboardInitialized) {
          clipboardStats = this.clipboardManager.getPerformanceStats();
        }
        
        if (this.behaviorInitialized) {
          behaviorStats = this.behaviorTracker.getPerformanceStats();
        }
        
        return {
          success: true,
          metrics,
          systemInfo,
          dbStats,
          clipboardStats,
          behaviorStats,
          serviceStatus: {
            database: this.databaseInitialized,
            clipboard: this.clipboardInitialized,
            behavior: this.behaviorInitialized,
            whisper: this.whisperInitialized,
            aiProcessor: this.aiProcessorInitialized
          }
        };
      } catch (error) {
        console.error('❌ Error getting performance metrics:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('optimize-performance', async (event, mode: 'low' | 'high') => {
      try {
        if (mode === 'low') {
          await this.performanceOptimizer.optimizeForLowPerformance();
        } else {
          await this.performanceOptimizer.optimizeForHighPerformance();
        }
        return { success: true, mode };
      } catch (error) {
        console.error('❌ Error optimizing performance:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('get-performance-history', async () => {
      try {
        const metrics = this.performanceOptimizer.getMetrics();
        return { success: true, metrics };
      } catch (error) {
        console.error('❌ Error getting performance history:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // Emergency mode handlers
    ipcMain.handle('get-emergency-status', async () => {
      try {
        const status = this.performanceOptimizer.getEmergencyStatus();
        return { success: true, status };
      } catch (error) {
        console.error('❌ Error getting emergency status:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('force-emergency-mode', async () => {
      try {
        await this.performanceOptimizer.optimizeForLowPerformance();
        return { success: true };
      } catch (error) {
        console.error('❌ Error forcing emergency mode:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.on('move-window', (event, x: number, y: number) => {
      if (this.floatingWindow) {
        this.floatingWindow.setPosition(Math.round(x), Math.round(y));
      }
    });

    ipcMain.on('resize-window', (event, width: number, height: number) => {
      if (this.floatingWindow) {
        this.floatingWindow.setSize(Math.round(width), Math.round(height));
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

  private async emergencyShutdown() {
    console.log('🚨 EMERGENCY SHUTDOWN INITIATED');
    
    try {
      // Stop performance monitoring immediately
      this.performanceOptimizer.stopMonitoring();
      
      // Stop all services
      this.clipboardManager.stop();
      this.behaviorTracker.stop();
      this.whisperMode.stop();
      
      // Close all databases
      await this.databaseManager.closeAll();
      
      // Close all windows
      if (this.floatingWindow) {
        this.floatingWindow.destroy();
      }
      if (this.mainWindow) {
        this.mainWindow.destroy();
      }
      
      console.log('✅ Emergency shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during emergency shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the app
new DoppelApp(); 