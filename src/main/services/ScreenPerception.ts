import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { DatabaseManager } from './DatabaseManager';
import { PerformanceOptimizer } from './PerformanceOptimizer';

interface ScreenSnapshot {
  id: number;
  timestamp: number;
  app_name: string;
  window_title: string;
  content_text: string;
  content_hash: string;
  ocr_confidence: number;
  accessibility_available: boolean;
  metadata: string;
}

interface AppFilter {
  app_name: string;
  is_whitelisted: boolean;
  is_blacklisted: boolean;
  window_patterns: string[];
}

export class ScreenPerception {
  private databaseManager: DatabaseManager;
  private performanceOptimizer: PerformanceOptimizer;
  private isActive = false;
  private currentSnapshot: ScreenSnapshot | null = null;
  private lastContentHash = '';
  private appFilters: Map<string, AppFilter> = new Map();
  private dbName = 'screen_perception';
  private snapshotInterval: NodeJS.Timeout | null = null;
  private diffThreshold = 0.1; // Minimum change threshold to trigger new snapshot

  constructor() {
    this.databaseManager = DatabaseManager.getInstance();
    this.performanceOptimizer = PerformanceOptimizer.getInstance();
    
    // Register database with optimized settings
    this.databaseManager.registerDatabase({
      name: this.dbName,
      filePath: path.join(os.homedir(), '.doppel', 'screen_perception.sqlite'),
      autoSave: true,
      saveInterval: 300000, // 5 minutes
      maxConnections: 1
    });
    
    // Setup performance throttling
    this.performanceOptimizer.createThrottleConfig('screen_perception', 30000, 120000, 1.5);
    
    this.loadAppFilters();
  }

  public async init() {
    try {
      await this.databaseManager.initialize();
      await this.initializeDatabase();
      console.log('✅ ScreenPerception initialized');
    } catch (error) {
      console.error('❌ Error initializing ScreenPerception:', error);
      throw error;
    }
  }

  private async initializeDatabase() {
    const db = await this.databaseManager.getDatabase(this.dbName);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS screen_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        app_name TEXT NOT NULL,
        window_title TEXT NOT NULL,
        content_text TEXT,
        content_hash TEXT NOT NULL,
        ocr_confidence REAL DEFAULT 0.0,
        accessibility_available INTEGER DEFAULT 0,
        metadata TEXT
      );
      CREATE TABLE IF NOT EXISTS app_filters (
        app_name TEXT PRIMARY KEY,
        is_whitelisted INTEGER DEFAULT 0,
        is_blacklisted INTEGER DEFAULT 0,
        window_patterns TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON screen_snapshots(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_snapshots_app ON screen_snapshots(app_name);
      CREATE INDEX IF NOT EXISTS idx_snapshots_hash ON screen_snapshots(content_hash);
    `);
  }

  public async start() {
    if (this.isActive) return;
    
    this.isActive = true;
    const interval = this.performanceOptimizer.getThrottledInterval('screen_perception');
    this.snapshotInterval = setInterval(() => this.captureScreenSnapshot(), interval);
    console.log(`📸 Screen perception started (interval: ${interval}ms)`);
  }

  public stop() {
    this.isActive = false;
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
    console.log('📸 Screen perception stopped');
  }

  private async captureScreenSnapshot() {
    if (!this.isActive) return;
    
    try {
      const activeApp = await this.getActiveApplication();
      
      // Check if app should be monitored
      if (!this.shouldMonitorApp(activeApp.name, activeApp.title)) {
        return;
      }

      const content = await this.extractScreenContent(activeApp);
      
      // Check if content has changed significantly
      const contentHash = this.generateContentHash(content.text);
      if (this.hasSignificantChange(contentHash, content.text)) {
        const snapshot: ScreenSnapshot = {
          id: 0,
          timestamp: Date.now(),
          app_name: activeApp.name,
          window_title: activeApp.title,
          content_text: content.text,
          content_hash: contentHash,
          ocr_confidence: content.confidence,
          accessibility_available: content.accessibilityAvailable,
          metadata: JSON.stringify({
            platform: process.platform,
            screen_resolution: await this.getScreenResolution(),
            window_state: activeApp.state
          })
        };

        await this.saveSnapshot(snapshot);
        this.currentSnapshot = snapshot;
        this.lastContentHash = contentHash;
        
        console.log(`📸 Captured snapshot: ${activeApp.name} - ${activeApp.title.substring(0, 50)}...`);
      }
      
    } catch (error) {
      console.error('❌ Error capturing screen snapshot:', error);
      this.performanceOptimizer.increaseThrottle('screen_perception');
    }
  }

  private async getActiveApplication(): Promise<{ name: string; title: string; state: string }> {
    // Cross-platform active application detection
    switch (process.platform) {
      case 'darwin':
        return this.getActiveAppMacOS();
      case 'win32':
        return this.getActiveAppWindows();
      case 'linux':
        return this.getActiveAppLinux();
      default:
        return { name: 'Unknown', title: 'Unknown Window', state: 'unknown' };
    }
  }

  private async getActiveAppMacOS(): Promise<{ name: string; title: string; state: string }> {
    try {
      // Use AppleScript to get active application info
      const { execSync } = require('child_process');
      const script = `
        tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
          set frontWindow to name of first window of (first process whose frontmost is true)
        end tell
        return frontApp & "|" & frontWindow
      `;
      
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      const [appName, windowTitle] = result.trim().split('|');
      
      return {
        name: appName || 'Unknown',
        title: windowTitle || 'Unknown Window',
        state: 'active'
      };
    } catch (error) {
      console.error('Error getting active app on macOS:', error);
      return { name: 'Unknown', title: 'Unknown Window', state: 'error' };
    }
  }

  private async getActiveAppWindows(): Promise<{ name: string; title: string; state: string }> {
    try {
      // Use PowerShell to get active window info
      const { execSync } = require('child_process');
      const script = `
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
          [DllImport("user32.dll")]
          public static extern IntPtr GetForegroundWindow();
          [DllImport("user32.dll")]
          public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
          [DllImport("user32.dll")]
          public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
        }
"@
        $hwnd = [Win32]::GetForegroundWindow()
        $title = New-Object System.Text.StringBuilder 256
        [Win32]::GetWindowText($hwnd, $title, 256)
        $processId = 0
        [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId)
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        Write-Output "$($process.ProcessName)|$($title.ToString())"
      `;
      
      const result = execSync('powershell -Command "' + script.replace(/"/g, '\\"') + '"', { encoding: 'utf8' });
      const [appName, windowTitle] = result.trim().split('|');
      
      return {
        name: appName || 'Unknown',
        title: windowTitle || 'Unknown Window',
        state: 'active'
      };
    } catch (error) {
      console.error('Error getting active app on Windows:', error);
      return { name: 'Unknown', title: 'Unknown Window', state: 'error' };
    }
  }

  private async getActiveAppLinux(): Promise<{ name: string; title: string; state: string }> {
    try {
      // Use xdotool to get active window info
      const { execSync } = require('child_process');
      const windowId = execSync('xdotool getactivewindow', { encoding: 'utf8' }).trim();
      const windowName = execSync(`xdotool getwindowname ${windowId}`, { encoding: 'utf8' }).trim();
      const processId = execSync(`xdotool getwindowpid ${windowId}`, { encoding: 'utf8' }).trim();
      const processName = execSync(`ps -p ${processId} -o comm=`, { encoding: 'utf8' }).trim();
      
      return {
        name: processName || 'Unknown',
        title: windowName || 'Unknown Window',
        state: 'active'
      };
    } catch (error) {
      console.error('Error getting active app on Linux:', error);
      return { name: 'Unknown', title: 'Unknown Window', state: 'error' };
    }
  }

  private async extractScreenContent(app: { name: string; title: string }): Promise<{ text: string; confidence: number; accessibilityAvailable: boolean }> {
    // Try accessibility APIs first, then fallback to OCR
    const accessibilityText = await this.getAccessibilityText(app);
    
    if (accessibilityText.text) {
      return {
        text: accessibilityText.text,
        confidence: 0.95,
        accessibilityAvailable: true
      };
    }
    
    // Fallback to OCR
    const ocrText = await this.performOCR();
    return {
      text: ocrText.text,
      confidence: ocrText.confidence,
      accessibilityAvailable: false
    };
  }

  private async getAccessibilityText(app: { name: string; title: string }): Promise<{ text: string }> {
    try {
      switch (process.platform) {
        case 'darwin':
          return this.getAccessibilityTextMacOS(app);
        case 'win32':
          return this.getAccessibilityTextWindows(app);
        case 'linux':
          return this.getAccessibilityTextLinux(app);
        default:
          return { text: '' };
      }
    } catch (error) {
      console.error('Error getting accessibility text:', error);
      return { text: '' };
    }
  }

  private async getAccessibilityTextMacOS(app: { name: string; title: string }): Promise<{ text: string }> {
    try {
      const { execSync } = require('child_process');
      const script = `
        tell application "System Events"
          set frontApp to first application process whose frontmost is true
          set frontWindow to first window of frontApp
          set uiElements to entire contents of frontWindow
          set textContent to ""
          repeat with element in uiElements
            try
              set textContent to textContent & " " & (value of element as string)
            end try
          end repeat
          return textContent
        end tell
      `;
      
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      return { text: result.trim() };
    } catch (error) {
      return { text: '' };
    }
  }

  private async getAccessibilityTextWindows(app: { name: string; title: string }): Promise<{ text: string }> {
    try {
      // Windows UI Automation would be used here
      // For now, return empty as it requires complex COM interop
      return { text: '' };
    } catch (error) {
      return { text: '' };
    }
  }

  private async getAccessibilityTextLinux(app: { name: string; title: string }): Promise<{ text: string }> {
    try {
      // Linux AT-SPI would be used here
      // For now, return empty as it requires complex DBus integration
      return { text: '' };
    } catch (error) {
      return { text: '' };
    }
  }

  private async performOCR(): Promise<{ text: string; confidence: number }> {
    try {
      // For now, simulate OCR with placeholder text
      // In a real implementation, you would:
      // 1. Capture screen screenshot
      // 2. Use Tesseract.js or similar for OCR
      // 3. Return extracted text with confidence
      
      const placeholderTexts = [
        "Sample text from screen capture",
        "Document content extracted via OCR",
        "Application interface text",
        "User interface elements"
      ];
      
      const randomText = placeholderTexts[Math.floor(Math.random() * placeholderTexts.length)];
      return {
        text: randomText,
        confidence: 0.7 + Math.random() * 0.2 // 70-90% confidence
      };
    } catch (error) {
      console.error('Error performing OCR:', error);
      return { text: '', confidence: 0 };
    }
  }

  private generateContentHash(content: string): string {
    // Simple hash for content change detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private hasSignificantChange(newHash: string, newContent: string): boolean {
    if (newHash !== this.lastContentHash) {
      // Simple similarity check - could be enhanced with more sophisticated diffing
      if (this.currentSnapshot) {
        const similarity = this.calculateSimilarity(this.currentSnapshot.content_text, newContent);
        return similarity < (1 - this.diffThreshold);
      }
      return true;
    }
    return false;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private shouldMonitorApp(appName: string, windowTitle: string): boolean {
    const filter = this.appFilters.get(appName.toLowerCase());
    
    if (!filter) {
      // Default behavior: monitor unless explicitly blacklisted
      return true;
    }
    
    if (filter.is_blacklisted) {
      return false;
    }
    
    if (filter.is_whitelisted) {
      // Check window patterns for whitelisted apps
      return filter.window_patterns.some(pattern => 
        windowTitle.toLowerCase().includes(pattern.toLowerCase())
      );
    }
    
    return true;
  }

  private async saveSnapshot(snapshot: ScreenSnapshot) {
    try {
      await this.databaseManager.batchExecute(
        this.dbName,
        'INSERT INTO screen_snapshots (timestamp, app_name, window_title, content_text, content_hash, ocr_confidence, accessibility_available, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [snapshot.timestamp, snapshot.app_name, snapshot.window_title, snapshot.content_text, snapshot.content_hash, snapshot.ocr_confidence, snapshot.accessibility_available ? 1 : 0, snapshot.metadata]
      );
    } catch (error) {
      console.error('Error saving screen snapshot:', error);
    }
  }

  private async getScreenResolution(): Promise<{ width: number; height: number }> {
    try {
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      return {
        width: primaryDisplay.size.width,
        height: primaryDisplay.size.height
      };
    } catch (error) {
      return { width: 1920, height: 1080 }; // Default fallback
    }
  }

  // App filtering methods
  public async addAppFilter(filter: Omit<AppFilter, 'app_name'> & { app_name: string }): Promise<void> {
    this.appFilters.set(filter.app_name.toLowerCase(), filter);
    
    try {
      await this.databaseManager.batchExecute(
        this.dbName,
        'INSERT OR REPLACE INTO app_filters (app_name, is_whitelisted, is_blacklisted, window_patterns) VALUES (?, ?, ?, ?)',
        [filter.app_name, filter.is_whitelisted ? 1 : 0, filter.is_blacklisted ? 1 : 0, JSON.stringify(filter.window_patterns)]
      );
    } catch (error) {
      console.error('Error saving app filter:', error);
    }
  }

  private async loadAppFilters(): Promise<void> {
    try {
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT * FROM app_filters'
      );
      
      if (result[0] && result[0].values) {
        for (const row of result[0].values) {
          const filter: AppFilter = {
            app_name: row[1],
            is_whitelisted: !!row[2],
            is_blacklisted: !!row[3],
            window_patterns: JSON.parse(row[4] || '[]')
          };
          this.appFilters.set(filter.app_name.toLowerCase(), filter);
        }
      }
    } catch (error) {
      console.error('Error loading app filters:', error);
    }
  }

  public async getRecentSnapshots(limit = 20): Promise<ScreenSnapshot[]> {
    try {
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT * FROM screen_snapshots ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );
      
      if (result[0] && result[0].values) {
        return result[0].values.map((row: any) => ({
          id: row[0],
          timestamp: row[1],
          app_name: row[2],
          window_title: row[3],
          content_text: row[4],
          content_hash: row[5],
          ocr_confidence: row[6],
          accessibility_available: !!row[7],
          metadata: row[8]
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting recent snapshots:', error);
      return [];
    }
  }

  public getStatus(): { isActive: boolean; currentApp: string; lastSnapshotTime: number } {
    return {
      isActive: this.isActive,
      currentApp: this.currentSnapshot?.app_name || 'None',
      lastSnapshotTime: this.currentSnapshot?.timestamp || 0
    };
  }
} 