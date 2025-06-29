import * as schedule from 'node-schedule';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

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
  private db: Database | null = null;
  private sqlJS: SqlJsStatic | null = null;
  private dbPath: string;
  private isTracking = false;
  private currentApp = '';
  private currentWindow = '';
  private lastEventTime = 0;
  private trackingInterval: NodeJS.Timeout | null = null;

  constructor() {
    const dbDir = path.join(os.homedir(), '.doppel');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.dbPath = path.join(dbDir, 'behavior.sqlite');
  }

  public async init() {
    this.sqlJS = await initSqlJs();
    if (fs.existsSync(this.dbPath)) {
      const filebuffer = fs.readFileSync(this.dbPath);
      this.db = new this.sqlJS.Database(filebuffer);
    } else {
      this.db = new this.sqlJS.Database();
      this.initializeDatabase();
      this.saveToDisk();
    }
  }

  private initializeDatabase() {
    this.db!.run(`
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

  private saveToDisk() {
    if (this.db) {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    }
  }

  public async start() {
    if (!this.db) await this.init();
    this.isTracking = true;
    this.trackingInterval = setInterval(() => this.trackBehavior(), 5000);
    console.log('Behavior tracking started');
  }

  public stop() {
    this.isTracking = false;
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    console.log('Behavior tracking stopped');
  }

  private async trackBehavior() {
    if (!this.isTracking) return;
    
    await this.checkActiveApplication();
    this.cleanupOldData();
  }

  private async checkActiveApplication() {
    // Simulate app switching for demo
    const apps = ['Chrome', 'VS Code', 'Terminal', 'Spotify', 'Discord'];
    const randomApp = apps[Math.floor(Math.random() * apps.length)];
    const oldApp = this.currentApp;
    
    this.currentApp = randomApp;
    if (oldApp) {
      await this.recordAppSwitch(oldApp, randomApp);
    }
    await this.updateAppUsage(randomApp);
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
    this.saveEvent(event);
  }

  private async updateAppUsage(appName: string) {
    const now = Date.now();
    // Upsert logic for sql.js
    const res = this.db!.exec('SELECT * FROM app_usage WHERE app_name = ?', [appName]);
    if (res[0] && res[0].values && res[0].values.length > 0) {
      this.db!.run(
        'UPDATE app_usage SET last_used = ?, usage_count = usage_count + 1 WHERE app_name = ?',
        [now, appName]
      );
    } else {
      this.db!.run(
        'INSERT INTO app_usage (app_name, total_time, last_used, usage_count) VALUES (?, 0, ?, 1)',
        [appName, now]
      );
    }
    this.saveToDisk();
  }

  private saveEvent(event: BehaviorEvent) {
    this.db!.run(
      'INSERT INTO behavior_events (event_type, app_name, window_title, timestamp, duration, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      [event.event_type, event.app_name, event.window_title, event.timestamp, event.duration, event.metadata]
    );
    this.saveToDisk();
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
    this.saveEvent(event);
  }

  public async getRecentEvents(limit = 20): Promise<BehaviorEvent[]> {
    if (!this.db) await this.init();
    try {
      const res = this.db!.exec('SELECT * FROM behavior_events ORDER BY timestamp DESC LIMIT ?', [limit]);
      if (res[0] && res[0].values) {
        return res[0].values.map((row: any[]) => ({
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
      console.error('Error getting recent events:', error);
      return [];
    }
  }

  public async getAppUsageStats(limit = 10): Promise<AppUsage[]> {
    if (!this.db) await this.init();
    try {
      const res = this.db!.exec('SELECT app_name, SUM(duration) as total_duration, COUNT(*) as sessions FROM behavior_events WHERE event_type = "app_switch" GROUP BY app_name ORDER BY total_duration DESC LIMIT ?', [limit]);
      if (res[0] && res[0].values) {
        return res[0].values.map((row: any[]) => ({
          app_name: row[0],
          total_duration: row[1],
          sessions: row[2]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting app usage stats:', error);
      return [];
    }
  }

  public async getTimeBasedStats(): Promise<TimeBasedStats> {
    if (!this.db) await this.init();
    try {
      const res = this.db!.exec('SELECT event_type, COUNT(*) as count FROM behavior_events WHERE timestamp > ? GROUP BY event_type', [Date.now() - 24 * 60 * 60 * 1000]);
      if (res[0] && res[0].values) {
        const stats = res[0].values.reduce((acc: any, row: any[]) => {
          acc[row[0]] = row[1];
          return acc;
        }, {});
        return {
          appSwitches: stats.app_switch || 0,
          windowChanges: stats.window_change || 0,
          idleTime: stats.idle || 0,
          activeTime: stats.active || 0
        };
      }
      return { appSwitches: 0, windowChanges: 0, idleTime: 0, activeTime: 0 };
    } catch (error) {
      console.error('Error getting time-based stats:', error);
      return { appSwitches: 0, windowChanges: 0, idleTime: 0, activeTime: 0 };
    }
  }

  public async getProductivityScore(): Promise<number> {
    if (!this.db) await this.init();
    try {
      const res = this.db!.exec('SELECT SUM(duration) as total_active FROM behavior_events WHERE event_type = "active" AND timestamp > ?', [Date.now() - 24 * 60 * 60 * 1000]);
      if (res[0] && res[0].values && res[0].values[0]) {
        const totalActive = res[0].values[0][0] || 0;
        const totalTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        return Math.round((totalActive / totalTime) * 100);
      }
      return 0;
    } catch (error) {
      console.error('Error calculating productivity score:', error);
      return 0;
    }
  }

  private cleanupOldData() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    this.db!.run('DELETE FROM behavior_events WHERE timestamp < ?', [thirtyDaysAgo]);
    this.saveToDisk();
  }

  public async exportData(): Promise<any> {
    const events = await this.getRecentEvents(1000);
    const usage = await this.getAppUsageStats();
    const patterns = await this.getBehaviorPatterns();
    return {
      events,
      usage,
      patterns,
      exportDate: new Date().toISOString()
    };
  }

  private trackAppSwitch(appName: string, windowTitle: string) {
    const event: BehaviorEvent = {
      id: 0,
      event_type: 'app_switch',
      app_name: appName,
      window_title: windowTitle,
      timestamp: Date.now(),
      duration: 0,
      metadata: JSON.stringify({ action: 'switch' })
    };
    this.saveEvent(event);
  }

  private trackWindowChange(windowTitle: string) {
    const event: BehaviorEvent = {
      id: 0,
      event_type: 'window_change',
      app_name: this.currentApp || 'Unknown',
      window_title: windowTitle,
      timestamp: Date.now(),
      duration: 0,
      metadata: JSON.stringify({ action: 'change' })
    };
    this.saveEvent(event);
  }

  private trackIdleTime(duration: number) {
    const event: BehaviorEvent = {
      id: 0,
      event_type: 'idle',
      app_name: this.currentApp || 'Unknown',
      window_title: this.currentWindow || 'Unknown',
      timestamp: Date.now(),
      duration,
      metadata: JSON.stringify({ action: 'idle' })
    };
    this.saveEvent(event);
  }

  private trackActiveTime(duration: number) {
    const event: BehaviorEvent = {
      id: 0,
      event_type: 'active',
      app_name: this.currentApp || 'Unknown',
      window_title: this.currentWindow || 'Unknown',
      timestamp: Date.now(),
      duration,
      metadata: JSON.stringify({ action: 'active' })
    };
    this.saveEvent(event);
  }

  public async getBehaviorPatterns(): Promise<any[]> {
    if (!this.db) await this.init();
    try {
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const res = this.db!.exec(
        'SELECT app_name, COUNT(*) as event_count, MAX(timestamp) as last_activity FROM behavior_events WHERE timestamp > ? GROUP BY app_name ORDER BY event_count DESC',
        [weekAgo]
      );
      if (res[0] && res[0].values) {
        return res[0].values.map((row: any[]) => ({
          app_name: row[0],
          event_count: row[1],
          last_activity: row[2]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting behavior patterns:', error);
      return [];
    }
  }
} 