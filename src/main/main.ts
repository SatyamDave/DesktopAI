import * as path from 'path';
import * as dotenv from 'dotenv';
console.log('Loading .env from:', path.resolve(__dirname, '../../.env'));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Simplified environment logging
console.log('DEBUG ENV:', {
  NODE_ENV: process.env.NODE_ENV,
  ULTRA_LIGHTWEIGHT: process.env.ULTRA_LIGHTWEIGHT,
  DEBUG_MODE: process.env.DEBUG_MODE,
});

import { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';
// Lightweight imports only
import { ConfigManager } from './services/ConfigManager';
import { ScreenPerception } from './services/ScreenPerception';
import { AudioPerception } from './services/AudioPerception';
import { ContextManager } from './services/ContextManager';
import { DELOCommandSystem } from './services/DELOCommandSystem';

app.disableHardwareAcceleration();

// Overlay window variables must be at the top level, not inside the class
let overlayWin: BrowserWindow | null = null;
let overlayBackdrop: BrowserWindow | null = null;

class DoppelApp {
  private mainWindow: BrowserWindow | null = null;
  private floatingWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  // Service initialization flags
  private databaseInitialized = false;
  private clipboardInitialized = false;
  private behaviorInitialized = false;
  private whisperInitialized = false;
  private aiProcessorInitialized = false;
  
  // Service instances (lazy loaded)
  private databaseManager: any = null;
  private clipboardManager: any = null;
  private behaviorTracker: any = null;
  private whisperMode: any = null;
  private aiProcessor: any = null;
  private screenPerception: any = null;
  private audioPerception: any = null;
  private contextManager: any = null;
  private deloCommandSystem: any = null;
  private performanceOptimizer: any = null;
  private commandExecutor: any = null;

  constructor() {
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
      this.createOverlayWindow();
      console.log('✅ Overlay window created');
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
      
      // Skip all heavy service initialization to prevent memory issues
      console.log('⚡ ULTRA-LIGHTWEIGHT MODE: Skipping all heavy services');
      console.log('📋 Clipboard tracking: DISABLED');
      console.log('👁️ Behavior tracking: DISABLED');
      console.log('🎤 Whisper mode: DISABLED');
      console.log('🤖 AI processing: DISABLED');
      console.log('🔍 Performance monitoring: DISABLED');
      console.log('🗄️ Database: DISABLED');
      console.log('🖥️ System Control: DISABLED');
      
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

  // Lazy initialization methods for heavy services
  private async ensureScreenPerceptionInitialized(): Promise<void> {
    if (!this.screenPerception) {
      console.log('📸 Initializing ScreenPerception on-demand...');
      this.screenPerception = new ScreenPerception();
      await this.screenPerception.init();
    }
  }

  private async ensureAudioPerceptionInitialized(): Promise<void> {
    if (!this.audioPerception) {
      console.log('🎵 Initializing AudioPerception on-demand...');
      this.audioPerception = new AudioPerception();
      await this.audioPerception.init();
    }
  }

  private async ensureContextManagerInitialized(): Promise<void> {
    if (!this.contextManager) {
      console.log('🧠 Initializing ContextManager on-demand...');
      this.contextManager = new ContextManager();
      await this.contextManager.init();
    }
  }

  private async ensureDeloCommandSystemInitialized(): Promise<void> {
    if (!this.deloCommandSystem) {
      console.log('🧠 Initializing DELOCommandSystem on-demand...');
      this.deloCommandSystem = new DELOCommandSystem();
      await this.deloCommandSystem.initialize();
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
      
      // Get screen dimensions for better positioning
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      
      // Make the window larger to ensure the orb is visible
      const orbSize = 120; // Increased from 80 to 120
      const margin = 30; // Increased margin
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
        show: false, // Don't show until ready
        titleBarStyle: 'hidden',
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: false
        }
      });

      // Use the correct port that Vite is running on (3005)
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
        // Small delay to ensure everything is ready
        setTimeout(() => {
          this.floatingWindow?.show();
          this.floatingWindow?.focus();
        }, 500);
      });

      this.floatingWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error(`❌ Failed to load ${validatedURL}: ${errorDescription}`);
        // Retry loading after a short delay
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

      // --- NEW: Cmd/Ctrl+H to toggle overlay ---
      const overlayShortcut = process.platform === 'darwin' ? 'Command+H' : 'Control+H';
      globalShortcut.register(overlayShortcut, () => {
        if (overlayWin) {
          if (overlayWin.isVisible()) {
            overlayWin.hide();
            overlayBackdrop?.hide();
          } else {
            const { width, height } = overlayWin.getBounds();
            const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
            overlayWin.setPosition(Math.round((sw - width) / 2), Math.round((sh - height) / 4));
            overlayBackdrop?.showInactive();
            overlayWin.showInactive();
            overlayWin.webContents.send('overlay-aria', 'opened');
          }
        }
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
          console.log(`📧 Email composition detected, routing to AIProcessor for draft generation`);
          // Always use AI to generate the draft first
          const result = await this.aiProcessor.processInput(command);
          if (typeof result === 'string' && result.startsWith('❌')) {
            // AI failed, return error, do NOT open browser
            return { success: false, result, data: { type: 'email_composition', error: true } };
          }
          // If successful, result contains the draft and the mailto link is opened by EmailService
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

    // Handle DELO command processing - TEMPORARILY DISABLED
    /*
    ipcMain.handle('process-delo-command', async (event, command: string) => {
      await this.ensureDeloCommandSystemInitialized();
      try {
        const result = await this.deloCommandSystem!.processCommand(command);
        return { success: result.success, ...result };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });
    */

    // Handle DELO suggestions - TEMPORARILY DISABLED
    /*
    ipcMain.handle('get-delo-suggestions', async (event) => {
      try {
        const context = await DELOCommandSystem['getCurrentContext']();
        const suggestions = DELOCommandSystem.getSuggestions(context);
        return { success: true, suggestions };
      } catch (error) {
        console.error('❌ Error getting DELO suggestions:', error);
        return { success: false, error: (error as Error).message, suggestions: [] };
      }
    });
    */

    // Handle DELO session insights - TEMPORARILY DISABLED
    /*
    ipcMain.handle('get-delo-insights', async (event) => {
      try {
        const insights = DELOCommandSystem.getSessionInsights();
        return { success: true, insights };
      } catch (error) {
        console.error('❌ Error getting DELO insights:', error);
        return { success: false, error: (error as Error).message };
      }
    });
    */

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
        
        const aiConfigured = this.aiProcessor.isAIConfigured();
        return {
          success: true,
          status: {
            clipboardManager: this.clipboardInitialized,
            behaviorTracker: this.behaviorInitialized,
            aiProcessor: this.aiProcessorInitialized,
            openaiConfigured: aiConfigured,
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

    // Handle email draft history
    ipcMain.handle('get-email-draft-history', async (event, limit = 20) => {
      try {
        await this.ensureAIProcessorInitialized();
        const history = await this.aiProcessor.getEmailDraftHistory(limit);
        return { success: true, history };
      } catch (error) {
        console.error('❌ Error getting email draft history:', error);
        return { success: false, error: (error as Error).message, history: [] };
      }
    });

    // Handle conversation history
    ipcMain.handle('get-conversation-history', async (event, limit = 20) => {
      try {
        await this.ensureAIProcessorInitialized();
        const history = await this.aiProcessor.getConversationHistory(limit);
        return { success: true, history };
      } catch (error) {
        console.error('❌ Error getting conversation history:', error);
        return { success: false, error: (error as Error).message, history: [] };
      }
    });

    // Handle overlay
    ipcMain.handle('toggle-overlay', () => {
      if (!overlayWin) return;
      if (overlayWin.isVisible()) {
        overlayWin.hide();
        overlayWin.setFocusable(false);
      } else {
        overlayWin.setFocusable(true);
        const { width, height } = overlayWin.getBounds();
        const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
        overlayWin.setPosition(Math.round((sw - width) / 2), Math.round((sh - height) / 4));
        overlayWin.show();
        overlayWin.webContents.send('overlay-aria', 'opened');
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
    console.log('🛑 EMERGENCY SHUTDOWN INITIATED');
    
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

  private createOverlayWindow() {
    if (!overlayWin) {
      overlayWin = new BrowserWindow({
        width: 440,
        height: 72,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        focusable: true,
        fullscreenable: false,
        webPreferences: {
          devTools: true,
          nodeIntegration: true,
          contextIsolation: false,
          preload: __dirname + '/preload.js',
        },
      });
      overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      overlayWin.setIgnoreMouseEvents(false);
      const url = this.isDev
        ? 'http://localhost:3000/overlay'
        : `file://${path.join(__dirname, '../renderer/index.html')}?overlay`;
      overlayWin.loadURL(url);
      overlayWin.on('blur', () => {
        overlayWin?.hide();
        overlayWin?.webContents.send('overlay-aria', 'closed');
      });
    }
  }
}

// Start the app
new DoppelApp(); 