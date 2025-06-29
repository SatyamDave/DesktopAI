import { clipboard } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { DatabaseManager } from './DatabaseManager';
import { PerformanceOptimizer } from './PerformanceOptimizer';

interface ClipboardItem {
  id: number;
  content: string;
  type: 'text' | 'image' | 'file';
  timestamp: number;
  hash: string;
}

export class ClipboardManager {
  private databaseManager: DatabaseManager;
  private performanceOptimizer: PerformanceOptimizer;
  private isWatching = false;
  private lastContent = '';
  private maxHistorySize = 100;
  private watchInterval: NodeJS.Timeout | null = null;
  private lastSaveTime = 0;
  private lastClipboardText = '';
  private dbName = 'clipboard';

  constructor() {
    this.databaseManager = DatabaseManager.getInstance();
    this.performanceOptimizer = PerformanceOptimizer.getInstance();
    
    // Register database with optimized settings
    this.databaseManager.registerDatabase({
      name: this.dbName,
      filePath: path.join(os.homedir(), '.doppel', 'clipboard.sqlite'),
      autoSave: true,
      saveInterval: 60000, // 60 seconds (was 30 seconds)
      maxConnections: 1
    });
    
    // Setup performance throttling with more conservative intervals
    this.performanceOptimizer.createThrottleConfig('clipboard', 10000, 120000, 2.0);
  }

  public async init() {
    try {
      await this.databaseManager.initialize();
      await this.initializeDatabase();
      console.log('✅ ClipboardManager initialized with performance optimizations');
    } catch (error) {
      console.error('❌ Error initializing ClipboardManager:', error);
      throw error;
    }
  }

  private async initializeDatabase() {
    const db = await this.databaseManager.getDatabase(this.dbName);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS clipboard_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        hash TEXT UNIQUE NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_timestamp ON clipboard_history(timestamp DESC);
    `);
  }

  public start() {
    if (this.isWatching) return;
    
    this.isWatching = true;
    const interval = this.performanceOptimizer.getThrottledInterval('clipboard');
    this.watchInterval = setInterval(() => this.checkClipboard(), interval);
    
    console.log(`📋 Clipboard manager started (interval: ${interval}ms)`);
  }

  public stop() {
    this.isWatching = false;
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    console.log('📋 Clipboard manager stopped');
  }

  private async checkClipboard() {
    try {
      const currentText = await clipboard.readText();
      if (currentText && currentText !== this.lastClipboardText) {
        const now = Date.now();
        const minInterval = 5000; // Minimum 5 seconds between saves
        
        if (now - this.lastSaveTime > minInterval) {
          this.lastClipboardText = currentText;
          this.lastSaveTime = now;
          await this.saveToHistory(currentText);
          
          // Adjust throttle based on activity
          this.performanceOptimizer.decreaseThrottle('clipboard');
        }
      } else {
        // No change detected, increase throttle to reduce CPU usage
        this.performanceOptimizer.increaseThrottle('clipboard');
      }
    } catch (error) {
      console.debug('📋 Clipboard read error (non-critical):', error);
    }
  }

  private async saveToHistory(content: string): Promise<void> {
    const hash = this.generateHash(content);
    const type = this.detectContentType(content);
    const timestamp = Date.now();
    
    try {
      // Use batch execution for better performance
      await this.databaseManager.batchExecute(
        this.dbName,
        'INSERT OR IGNORE INTO clipboard_history (content, type, timestamp, hash) VALUES (?, ?, ?, ?)',
        [content, type, timestamp, hash]
      );
      
      // Cleanup old entries periodically
      if (Math.random() < 0.1) { // 10% chance to cleanup
        await this.cleanupOldEntries();
      }
    } catch (error) {
      console.error('❌ Error adding to clipboard history:', error);
    }
  }

  private generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  private detectContentType(content: string): 'text' | 'image' | 'file' {
    if (content.startsWith('data:image/')) return 'image';
    if (content.includes('\n') || content.length > 100) return 'text';
    return 'text';
  }

  private async cleanupOldEntries() {
    try {
      await this.databaseManager.executeQuery(
        this.dbName,
        `DELETE FROM clipboard_history WHERE id NOT IN (SELECT id FROM clipboard_history ORDER BY timestamp DESC LIMIT ?)`,
        [this.maxHistorySize]
      );
    } catch (error) {
      console.error('❌ Error cleaning up clipboard history:', error);
    }
  }

  public async getHistory(limit = 50): Promise<ClipboardItem[]> {
    try {
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT * FROM clipboard_history ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );
      
      if (result[0] && result[0].values) {
        return result[0].values.map((row: any[]) => ({
          id: row[0],
          content: row[1],
          type: row[2],
          timestamp: row[3],
          hash: row[4]
        }));
      }
      return [];
    } catch (error) {
      console.error('❌ Error getting clipboard history:', error);
      return [];
    }
  }

  public async pasteFromHistory(index: number): Promise<boolean> {
    const history = await this.getHistory();
    if (index >= 0 && index < history.length) {
      const item = history[index];
      clipboard.writeText(item.content);
      return true;
    }
    return false;
  }

  public async searchHistory(query: string): Promise<ClipboardItem[]> {
    try {
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT * FROM clipboard_history WHERE content LIKE ? ORDER BY timestamp DESC LIMIT 20',
        [`%${query}%`]
      );
      
      if (result[0] && result[0].values) {
        return result[0].values.map((row: any[]) => ({
          id: row[0],
          content: row[1],
          type: row[2],
          timestamp: row[3],
          hash: row[4]
        }));
      }
      return [];
    } catch (error) {
      console.error('❌ Error searching clipboard history:', error);
      return [];
    }
  }

  public async clearHistory(): Promise<void> {
    try {
      await this.databaseManager.executeQuery(
        this.dbName,
        'DELETE FROM clipboard_history'
      );
      console.log('📋 Clipboard history cleared');
    } catch (error) {
      console.error('❌ Error clearing clipboard history:', error);
    }
  }

  public getPerformanceStats(): {
    isWatching: boolean;
    lastSaveTime: number;
    throttleInterval: number;
  } {
    return {
      isWatching: this.isWatching,
      lastSaveTime: this.lastSaveTime,
      throttleInterval: this.performanceOptimizer.getThrottledInterval('clipboard')
    };
  }
} 