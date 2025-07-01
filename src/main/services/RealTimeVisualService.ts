import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { DELOCommandSystem } from './DELOCommandSystem';
import { ScreenOCRService } from './ScreenOCRService';

export interface VisualContext {
  timestamp: number;
  screenshot: Buffer;
  ocrText: string;
  activeWindow: string;
  windowTitle: string;
  mousePosition: { x: number; y: number };
  screenResolution: { width: number; height: number };
  uiElements: UIElement[];
  changes: VisualChange[];
  confidence: number;
}

export interface UIElement {
  type: 'button' | 'input' | 'text' | 'image' | 'link' | 'menu';
  text: string;
  position: { x: number; y: number; width: number; height: number };
  confidence: number;
  action?: string;
}

export interface VisualChange {
  type: 'text' | 'ui' | 'window' | 'content';
  description: string;
  timestamp: number;
  importance: 'low' | 'medium' | 'high';
}

export interface VisualConfig {
  enabled: boolean;
  captureInterval: number; // milliseconds
  ocrEnabled: boolean;
  uiDetectionEnabled: boolean;
  changeDetectionEnabled: boolean;
  maxScreenshots: number;
  quality: 'low' | 'medium' | 'high';
  regions: ScreenRegion[];
  sensitivity: number;
  saveScreenshots: boolean;
  screenshotPath: string;
}

export interface ScreenRegion {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: 'low' | 'medium' | 'high';
}

export interface VisualState {
  isMonitoring: boolean;
  isCapturing: boolean;
  isProcessing: boolean;
  lastScreenshot: number;
  screenshotsCaptured: number;
  changesDetected: number;
  error?: string;
}

export class RealTimeVisualService extends EventEmitter {
  private deloSystem: DELOCommandSystem;
  private screenOCR: ScreenOCRService;
  private config: VisualConfig;
  private state: VisualState;
  private screenshotBuffer: VisualContext[] = [];
  private changeHistory: VisualChange[] = [];
  private captureInterval?: NodeJS.Timeout;
  private lastVisualContext?: VisualContext;
  private isInitialized = false;
  private configPath: string;
  private screenshotDir: string;

  constructor(deloSystem: DELOCommandSystem) {
    super();
    this.deloSystem = deloSystem;
    this.screenOCR = new ScreenOCRService();
    this.configPath = path.join(os.homedir(), '.doppel', 'visual-config.json');
    this.screenshotDir = path.join(os.homedir(), '.doppel', 'screenshots');
    
    this.config = {
      enabled: true,
      captureInterval: 2000, // 2 seconds
      ocrEnabled: true,
      uiDetectionEnabled: true,
      changeDetectionEnabled: true,
      maxScreenshots: 100,
      quality: 'medium',
      regions: [
        {
          name: 'fullscreen',
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          priority: 'high'
        }
      ],
      sensitivity: 0.7,
      saveScreenshots: false,
      screenshotPath: this.screenshotDir
    };

    this.state = {
      isMonitoring: false,
      isCapturing: false,
      isProcessing: false,
      lastScreenshot: 0,
      screenshotsCaptured: 0,
      changesDetected: 0
    };

    this.ensureScreenshotDir();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('👁️ Initializing Real-Time Visual Service...');
      
      // Ensure config directory exists
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.loadConfig();
      
      // Initialize screen OCR
      await this.screenOCR.initialize();
      
      // Initialize platform-specific visual capture
      await this.initializeVisualCapture();
      
      this.isInitialized = true;
      console.log('✅ Real-Time Visual Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Real-Time Visual Service:', error);
      this.state.error = String(error);
      throw error;
    }
  }

  /**
   * Start real-time visual monitoring
   */
  public async startMonitoring(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Visual monitoring is disabled');
    }

    if (this.state.isMonitoring) {
      console.log('Already monitoring visual content');
      return;
    }

    try {
      this.state.isMonitoring = true;
      this.emit('monitoring', true);

      // Start periodic capture
      this.startPeriodicCapture();
      
      // Initial capture
      await this.captureVisualContext();

      console.log('👁️ Real-time visual monitoring started');
    } catch (error) {
      this.state.isMonitoring = false;
      this.state.error = String(error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop visual monitoring
   */
  public async stopMonitoring(): Promise<void> {
    if (!this.state.isMonitoring) return;

    try {
      this.state.isMonitoring = false;
      this.emit('monitoring', false);

      // Stop periodic capture
      if (this.captureInterval) {
        clearInterval(this.captureInterval);
        this.captureInterval = undefined;
      }

      console.log('👁️ Real-time visual monitoring stopped');
    } catch (error) {
      console.error('Error stopping visual monitoring:', error);
    }
  }

  /**
   * Capture current visual context
   */
  public async captureVisualContext(): Promise<VisualContext | null> {
    if (this.state.isCapturing) return null;

    try {
      this.state.isCapturing = true;
      
      // Capture screenshot
      const screenshot = await this.captureScreenshot();
      if (!screenshot) return null;

      // Get active window info
      const activeWindow = await this.getActiveWindowInfo();
      
      // Get mouse position
      const mousePosition = await this.getMousePosition();
      
      // Get screen resolution
      const screenResolution = await this.getScreenResolution();

      // Perform OCR if enabled
      let ocrText = '';
      if (this.config.ocrEnabled) {
        ocrText = await this.screenOCR.extractText(screenshot);
      }

      // Detect UI elements if enabled
      let uiElements: UIElement[] = [];
      if (this.config.uiDetectionEnabled) {
        uiElements = await this.detectUIElements(screenshot);
      }

      // Detect changes
      let changes: VisualChange[] = [];
      if (this.config.changeDetectionEnabled && this.lastVisualContext) {
        changes = await this.detectChanges(this.lastVisualContext, {
          screenshot,
          ocrText,
          activeWindow: activeWindow.title,
          windowTitle: activeWindow.title,
          mousePosition,
          screenResolution,
          uiElements,
          changes: [],
          confidence: 0.9,
          timestamp: Date.now()
        });
      }

      const visualContext: VisualContext = {
        timestamp: Date.now(),
        screenshot,
        ocrText,
        activeWindow: activeWindow.app,
        windowTitle: activeWindow.title,
        mousePosition,
        screenResolution,
        uiElements,
        changes,
        confidence: 0.9
      };

      // Add to buffer
      this.screenshotBuffer.push(visualContext);
      this.state.screenshotsCaptured++;
      
      // Keep only recent screenshots
      if (this.screenshotBuffer.length > this.config.maxScreenshots) {
        this.screenshotBuffer.shift();
      }

      // Save screenshot if enabled
      if (this.config.saveScreenshots) {
        await this.saveScreenshot(screenshot, visualContext.timestamp);
      }

      // Update last context
      this.lastVisualContext = visualContext;
      
      // Emit visual context event
      this.emit('visualContext', visualContext);
      
      // Analyze for DELO intelligence
      await this.analyzeVisualContext(visualContext);

      return visualContext;

    } catch (error) {
      console.error('Error capturing visual context:', error);
      return null;
    } finally {
      this.state.isCapturing = false;
    }
  }

  /**
   * Get recent visual context
   */
  public getRecentVisualContext(count: number = 10): VisualContext[] {
    return this.screenshotBuffer.slice(-count);
  }

  /**
   * Get visual changes history
   */
  public getVisualChanges(duration: number = 300): VisualChange[] {
    const cutoffTime = Date.now() - (duration * 1000);
    return this.changeHistory.filter(change => change.timestamp > cutoffTime);
  }

  /**
   * Get current visual state
   */
  public getVisualState(): VisualState {
    return { ...this.state };
  }

  /**
   * Get visual configuration
   */
  public getVisualConfig(): VisualConfig {
    return { ...this.config };
  }

  /**
   * Update visual configuration
   */
  public updateVisualConfig(newConfig: Partial<VisualConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.emit('configUpdated', this.config);
  }

  /**
   * Capture screenshot based on platform
   */
  private async captureScreenshot(): Promise<Buffer | null> {
    try {
      if (process.platform === 'win32') {
        return await this.captureWindowsScreenshot();
      } else if (process.platform === 'darwin') {
        return await this.captureMacScreenshot();
      } else {
        return await this.captureLinuxScreenshot();
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return null;
    }
  }

  /**
   * Capture screenshot on Windows
   */
  private async captureWindowsScreenshot(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;
      
      // Use Electron's capturePage method
      const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.capturePage().then(image => {
          resolve(image.toPNG());
        }).catch(reject);
      } else {
        reject(new Error('No main window available'));
      }
    });
  }

  /**
   * Capture screenshot on macOS
   */
  private async captureMacScreenshot(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const tempFile = path.join(this.screenshotDir, `screenshot_${Date.now()}.png`);
      
      const process = spawn('screencapture', ['-x', tempFile]);
      
      process.on('close', (code) => {
        if (code === 0) {
          try {
            const buffer = fs.readFileSync(tempFile);
            fs.unlinkSync(tempFile); // Clean up
            resolve(buffer);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Screencapture failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Capture screenshot on Linux
   */
  private async captureLinuxScreenshot(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const process = spawn('import', ['-window', 'root', 'png:-']);
      
      const chunks: Buffer[] = [];
      
      process.stdout.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`Import failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Get active window information
   */
  private async getActiveWindowInfo(): Promise<{ app: string; title: string }> {
    try {
      // This would integrate with the existing ActiveWindowService
      const activeWindowService = this.deloSystem['activeWindow'];
      if (activeWindowService) {
        const windowInfo = await activeWindowService.getActiveWindow();
        return { app: windowInfo.process, title: windowInfo.title };
      }
      
      return { app: 'unknown', title: 'unknown' };
    } catch (error) {
      console.error('Error getting active window info:', error);
      return { app: 'unknown', title: 'unknown' };
    }
  }

  /**
   * Get mouse position
   */
  private async getMousePosition(): Promise<{ x: number; y: number }> {
    try {
      const { screen } = require('electron');
      const point = screen.getCursorScreenPoint();
      return { x: point.x, y: point.y };
    } catch (error) {
      console.error('Error getting mouse position:', error);
      return { x: 0, y: 0 };
    }
  }

  /**
   * Get screen resolution
   */
  private async getScreenResolution(): Promise<{ width: number; height: number }> {
    try {
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      return primaryDisplay.size;
    } catch (error) {
      console.error('Error getting screen resolution:', error);
      return { width: 1920, height: 1080 };
    }
  }

  /**
   * Detect UI elements in screenshot
   */
  private async detectUIElements(screenshot: Buffer): Promise<UIElement[]> {
    try {
      // This would use computer vision or UI automation libraries
      // For now, return basic detection based on OCR
      const ocrText = await this.screenOCR.extractText(screenshot);
      const elements: UIElement[] = [];
      
      // Simple button detection
      const buttonPatterns = ['button', 'click', 'submit', 'ok', 'cancel'];
      buttonPatterns.forEach(pattern => {
        if (ocrText.toLowerCase().includes(pattern)) {
          elements.push({
            type: 'button',
            text: pattern,
            position: { x: 0, y: 0, width: 100, height: 30 },
            confidence: 0.7
          });
        }
      });
      
      return elements;
    } catch (error) {
      console.error('Error detecting UI elements:', error);
      return [];
    }
  }

  /**
   * Detect changes between visual contexts
   */
  private async detectChanges(
    previous: VisualContext, 
    current: VisualContext
  ): Promise<VisualChange[]> {
    const changes: VisualChange[] = [];
    
    // Check for text changes
    if (previous.ocrText !== current.ocrText) {
      changes.push({
        type: 'text',
        description: 'Text content changed',
        timestamp: current.timestamp,
        importance: 'medium'
      });
    }
    
    // Check for window changes
    if (previous.activeWindow !== current.activeWindow) {
      changes.push({
        type: 'window',
        description: `Switched from ${previous.activeWindow} to ${current.activeWindow}`,
        timestamp: current.timestamp,
        importance: 'high'
      });
    }
    
    // Check for UI changes
    if (previous.uiElements.length !== current.uiElements.length) {
      changes.push({
        type: 'ui',
        description: 'UI elements changed',
        timestamp: current.timestamp,
        importance: 'medium'
      });
    }
    
    // Add to change history
    this.changeHistory.push(...changes);
    this.state.changesDetected += changes.length;
    
    // Keep only recent changes
    if (this.changeHistory.length > 1000) {
      this.changeHistory = this.changeHistory.slice(-500);
    }
    
    return changes;
  }

  /**
   * Analyze visual context for DELO intelligence
   */
  private async analyzeVisualContext(visualContext: VisualContext): Promise<void> {
    try {
      // Check for meeting indicators
      if (this.isMeetingContext(visualContext)) {
        this.emit('meeting', {
          context: visualContext,
          timestamp: Date.now()
        });
      }
      
      // Check for work indicators
      if (this.isWorkContext(visualContext)) {
        this.emit('work', {
          context: visualContext,
          timestamp: Date.now()
        });
      }
      
      // Check for urgent indicators
      if (this.isUrgentContext(visualContext)) {
        this.emit('urgent', {
          context: visualContext,
          timestamp: Date.now()
        });
      }
      
      // Send to DELO for processing
      await this.deloSystem['processVisualContext'](visualContext);
    } catch (error) {
      console.error('Error analyzing visual context:', error);
    }
  }

  /**
   * Check if visual context indicates meeting
   */
  private isMeetingContext(visualContext: VisualContext): boolean {
    const meetingKeywords = [
      'zoom', 'teams', 'meeting', 'call', 'participants',
      'share screen', 'mute', 'unmute', 'chat'
    ];
    
    const text = visualContext.ocrText.toLowerCase();
    return meetingKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if visual context indicates work
   */
  private isWorkContext(visualContext: VisualContext): boolean {
    const workKeywords = [
      'document', 'spreadsheet', 'presentation', 'email',
      'code', 'editor', 'terminal', 'browser'
    ];
    
    const text = visualContext.ocrText.toLowerCase();
    return workKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if visual context indicates urgency
   */
  private isUrgentContext(visualContext: VisualContext): boolean {
    const urgentKeywords = [
      'error', 'warning', 'alert', 'urgent', 'critical',
      'deadline', 'overdue', 'failed', 'broken'
    ];
    
    const text = visualContext.ocrText.toLowerCase();
    return urgentKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Initialize platform-specific visual capture
   */
  private async initializeVisualCapture(): Promise<void> {
    // Platform-specific initialization
    if (process.platform === 'win32') {
      await this.initializeWindowsVisualCapture();
    } else if (process.platform === 'darwin') {
      await this.initializeMacVisualCapture();
    } else {
      await this.initializeLinuxVisualCapture();
    }
  }

  /**
   * Initialize Windows visual capture
   */
  private async initializeWindowsVisualCapture(): Promise<void> {
    console.log('👁️ Windows visual capture initialized');
  }

  /**
   * Initialize macOS visual capture
   */
  private async initializeMacVisualCapture(): Promise<void> {
    console.log('👁️ macOS visual capture initialized');
  }

  /**
   * Initialize Linux visual capture
   */
  private async initializeLinuxVisualCapture(): Promise<void> {
    console.log('👁️ Linux visual capture initialized');
  }

  /**
   * Start periodic capture
   */
  private startPeriodicCapture(): void {
    this.captureInterval = setInterval(async () => {
      if (this.state.isMonitoring && !this.state.isCapturing) {
        await this.captureVisualContext();
      }
    }, this.config.captureInterval);
  }

  /**
   * Save screenshot to file
   */
  private async saveScreenshot(screenshot: Buffer, timestamp: number): Promise<void> {
    try {
      const filename = `screenshot_${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);
      fs.writeFileSync(filepath, screenshot);
    } catch (error) {
      console.error('Error saving screenshot:', error);
    }
  }

  /**
   * Ensure screenshot directory exists
   */
  private ensureScreenshotDir(): void {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  /**
   * Save configuration to file
   */
  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving visual config:', error);
    }
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        this.config = { ...this.config, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Error loading visual config:', error);
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    await this.stopMonitoring();
    this.removeAllListeners();
  }
} 