import * as path from 'path';
import * as os from 'os';
import { DatabaseManager } from './DatabaseManager';
import { PerformanceOptimizer } from './PerformanceOptimizer';

interface BehaviorEvent {
  id: number;
  event_type: string;
  app_name: string;
  window_title: string;
  timestamp: number;
  duration: number;
  metadata: string;
}

interface AppUsage {
  app_name: string;
  total_duration: number;
  sessions: number;
}

interface TimeBasedStats {
  appSwitches: number;
  windowChanges: number;
  idleTime: number;
  activeTime: number;
}

export class BehaviorTracker {
  private databaseManager: DatabaseManager;
  private performanceOptimizer: PerformanceOptimizer;
  private isTracking = false;
  private currentApp = '';
  private currentWindow = '';
  private lastEventTime = 0;
  private trackingInterval: NodeJS.Timeout | null = null;
  private dbName = 'behavior';

  constructor() {
    this.databaseManager = DatabaseManager.getInstance();
    this.performanceOptimizer = PerformanceOptimizer.getInstance();
    
    // Register database with optimized settings
    this.databaseManager.registerDatabase({
      name: this.dbName,
      filePath: path.join(os.homedir(), '.doppel', 'behavior.sqlite'),
      autoSave: true,
      saveInterval: 120000, // 120 seconds (was 60 seconds)
      maxConnections: 1
    });
    
    // Setup performance throttling with longer intervals
    this.performanceOptimizer.createThrottleConfig('behavior', 60000, 300000, 2.0);
  }

  public async init() {
    try {
      await this.databaseManager.initialize();
      await this.initializeDatabase();
      console.log('✅ BehaviorTracker initialized with performance optimizations');
    } catch (error) {
      console.error('❌ Error initializing BehaviorTracker:', error);
      throw error;
    }
  }

  private async initializeDatabase() {
    const db = await this.databaseManager.getDatabase(this.dbName);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS behavior_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        app_name TEXT,
        window_title TEXT,
        timestamp INTEGER NOT NULL,
        duration INTEGER DEFAULT 0,
        metadata TEXT
      );
      CREATE TABLE IF NOT EXISTS app_usage (
        app_name TEXT PRIMARY KEY,
        total_time INTEGER DEFAULT 0,
        last_used INTEGER,
        usage_count INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_behavior_timestamp ON behavior_events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_behavior_app ON behavior_events(app_name);
    `);
  }

  public async start() {
    if (!this.isTracking) {
      this.isTracking = true;
      const interval = this.performanceOptimizer.getThrottledInterval('behavior');
      this.trackingInterval = setInterval(() => this.trackBehavior(), interval);
      console.log(`📊 Behavior tracking started (interval: ${interval}ms)`);
    }
  }

  public stop() {
    this.isTracking = false;
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    console.log('📊 Behavior tracking stopped');
  }

  private async trackBehavior() {
    if (!this.isTracking) return;
    
    const now = Date.now();
    const minInterval = 25000; // Minimum 25 seconds between events
    
    if (now - this.lastEventTime < minInterval) {
      return;
    }
    
    try {
      await this.checkActiveApplication();
      
      // Periodic cleanup (10% chance)
      if (Math.random() < 0.1) {
        await this.cleanupOldData();
      }
      
      // Adjust throttle based on activity
      this.performanceOptimizer.decreaseThrottle('behavior');
    } catch (error) {
      console.error('❌ Error in behavior tracking:', error);
      // Increase throttle on error to reduce load
      this.performanceOptimizer.increaseThrottle('behavior');
    }
  }

  private async checkActiveApplication() {
    // Simulate app switching with reduced frequency
    if (Math.random() < 0.2) { // 20% chance instead of 30%
      const apps = ['Chrome', 'VS Code', 'Terminal', 'Spotify', 'Discord'];
      const randomApp = apps[Math.floor(Math.random() * apps.length)];
      const oldApp = this.currentApp;
      
      this.currentApp = randomApp;
      if (oldApp && oldApp !== randomApp) {
        await this.recordAppSwitch(oldApp, randomApp);
      }
      await this.updateAppUsage(randomApp);
    }
  }

  private async recordAppSwitch(fromApp: string, toApp: string) {
    const event: BehaviorEvent = {
      id: 0,
      event_type: 'app_switch',
      app_name: toApp,
      window_title: `${toApp} Window`,
      timestamp: Date.now(),
      duration: 0,
      metadata: JSON.stringify({ from: fromApp, to: toApp })
    };
    
    await this.saveEvent(event);
  }

  private async updateAppUsage(appName: string) {
    const now = Date.now();
    
    try {
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT * FROM app_usage WHERE app_name = ?',
        [appName]
      );
      
      if (result[0] && result[0].values && result[0].values.length > 0) {
        await this.databaseManager.batchExecute(
          this.dbName,
          'UPDATE app_usage SET last_used = ?, usage_count = usage_count + 1 WHERE app_name = ?',
          [now, appName]
        );
      } else {
        await this.databaseManager.batchExecute(
          this.dbName,
          'INSERT INTO app_usage (app_name, total_time, last_used, usage_count) VALUES (?, 0, ?, 1)',
          [appName, now]
        );
      }
    } catch (error) {
      console.error('❌ Error updating app usage:', error);
    }
  }

  private async saveEvent(event: BehaviorEvent) {
    try {
      await this.databaseManager.batchExecute(
        this.dbName,
        'INSERT INTO behavior_events (event_type, app_name, window_title, timestamp, duration, metadata) VALUES (?, ?, ?, ?, ?, ?)',
        [event.event_type, event.app_name, event.window_title, event.timestamp, event.duration, event.metadata]
      );
    } catch (error) {
      console.error('❌ Error saving behavior event:', error);
    }
  }

  public async recordEvent(eventType: string, data: string, appName?: string) {
    const event: BehaviorEvent = {
      id: 0,
      event_type: eventType,
      app_name: appName || this.currentApp,
      window_title: this.currentWindow || 'Unknown',
      timestamp: Date.now(),
      duration: 0,
      metadata: data
    };
    
    await this.saveEvent(event);
  }

  public async getRecentEvents(limit = 20): Promise<BehaviorEvent[]> {
    try {
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT * FROM behavior_events ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );
      
      if (result[0] && result[0].values) {
        return result[0].values.map((row: any[]) => ({
          id: row[0],
          event_type: row[1],
          app_name: row[2],
          window_title: row[3],
          timestamp: row[4],
          duration: row[5],
          metadata: row[6]
        }));
      }
      return [];
    } catch (error) {
      console.error('❌ Error getting recent events:', error);
      return [];
    }
  }

  public async getAppUsageStats(limit = 10): Promise<AppUsage[]> {
    try {
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT app_name, total_time, usage_count FROM app_usage ORDER BY last_used DESC LIMIT ?',
        [limit]
      );
      
      if (result[0] && result[0].values) {
        return result[0].values.map((row: any[]) => ({
          app_name: row[0],
          total_duration: row[1],
          sessions: row[2]
        }));
      }
      return [];
    } catch (error) {
      console.error('❌ Error getting app usage stats:', error);
      return [];
    }
  }

  public async getTimeBasedStats(): Promise<TimeBasedStats> {
    try {
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT event_type, COUNT(*) as count FROM behavior_events WHERE timestamp > ? GROUP BY event_type',
        [oneDayAgo]
      );
      
      const stats: TimeBasedStats = {
        appSwitches: 0,
        windowChanges: 0,
        idleTime: 0,
        activeTime: 0
      };
      
      if (result[0] && result[0].values) {
        for (const row of result[0].values) {
          const eventType = row[0];
          const count = row[1];
          
          switch (eventType) {
            case 'app_switch':
              stats.appSwitches = count;
              break;
            case 'window_change':
              stats.windowChanges = count;
              break;
            case 'idle':
              stats.idleTime = count;
              break;
            case 'active':
              stats.activeTime = count;
              break;
          }
        }
      }
      
      return stats;
    } catch (error) {
      console.error('❌ Error getting time-based stats:', error);
      return {
        appSwitches: 0,
        windowChanges: 0,
        idleTime: 0,
        activeTime: 0
      };
    }
  }

  public async getProductivityScore(): Promise<number> {
    try {
      const stats = await this.getTimeBasedStats();
      const totalEvents = stats.appSwitches + stats.windowChanges;
      
      if (totalEvents === 0) return 0;
      
      // Simple productivity calculation
      const productivityScore = Math.min(100, (stats.activeTime / totalEvents) * 100);
      return Math.round(productivityScore);
    } catch (error) {
      console.error('❌ Error calculating productivity score:', error);
      return 0;
    }
  }

  private async cleanupOldData() {
    try {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      await this.databaseManager.executeQuery(
        this.dbName,
        'DELETE FROM behavior_events WHERE timestamp < ?',
        [thirtyDaysAgo]
      );
      
      console.debug('🧹 Cleaned up old behavior data');
    } catch (error) {
      console.error('❌ Error cleaning up old data:', error);
    }
  }

  public getPerformanceStats(): {
    isTracking: boolean;
    currentApp: string;
    throttleInterval: number;
    lastEventTime: number;
  } {
    return {
      isTracking: this.isTracking,
      currentApp: this.currentApp,
      throttleInterval: this.performanceOptimizer.getThrottledInterval('behavior'),
      lastEventTime: this.lastEventTime
    };
  }
} 