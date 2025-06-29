import { clipboard } from 'electron';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

interface ClipboardItem {
  id: number;
  content: string;
  type: 'text' | 'image' | 'file';
  timestamp: number;
  hash: string;
}

export class ClipboardManager {
  private db: Database | null = null;
  private sqlJS: SqlJsStatic | null = null;
  private dbPath: string;
  private isWatching = false;
  private lastContent = '';
  private maxHistorySize = 100;

  constructor() {
    const dbDir = path.join(os.homedir(), '.doppel');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.dbPath = path.join(dbDir, 'clipboard.sqlite');
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

  private saveToDisk() {
    if (this.db) {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    }
  }

  public async start() {
    if (!this.db) await this.init();
    if (this.isWatching) return;
    this.isWatching = true;
    this.watchClipboard();
  }

  public stop() {
    this.isWatching = false;
  }

  private async watchClipboard() {
    while (this.isWatching) {
      try {
        const content = clipboard.readText();
        if (content && content !== this.lastContent) {
          await this.addToHistory(content);
          this.lastContent = content;
        }
      } catch (error) {
        console.error('Error reading clipboard:', error);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  private async addToHistory(content: string): Promise<void> {
    const hash = this.generateHash(content);
    const type = this.detectContentType(content);
    const timestamp = Date.now();
    try {
      this.db!.run(
        'INSERT OR IGNORE INTO clipboard_history (content, type, timestamp, hash) VALUES (?, ?, ?, ?)',
        [content, type, timestamp, hash]
      );
      this.cleanupOldEntries();
      this.saveToDisk();
    } catch (error) {
      console.error('Error adding to clipboard history:', error);
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

  private cleanupOldEntries() {
    this.db!.run(
      `DELETE FROM clipboard_history WHERE id NOT IN (SELECT id FROM clipboard_history ORDER BY timestamp DESC LIMIT ?)`,
      [this.maxHistorySize]
    );
  }

  public async getHistory(limit = 50): Promise<ClipboardItem[]> {
    if (!this.db) await this.init();
    try {
      const res = this.db!.exec('SELECT * FROM clipboard_history ORDER BY timestamp DESC LIMIT ?', [limit]);
      if (res[0] && res[0].values) {
        return res[0].values.map((row: any[]) => ({
          id: row[0],
          content: row[1],
          type: row[2],
          timestamp: row[3],
          hash: row[4]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting clipboard history:', error);
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
    if (!this.db) await this.init();
    try {
      const res = this.db!.exec('SELECT * FROM clipboard_history WHERE content LIKE ? ORDER BY timestamp DESC LIMIT 20', [`%${query}%`]);
      if (res[0] && res[0].values) {
        return res[0].values.map((row: any[]) => ({
          id: row[0],
          content: row[1],
          type: row[2],
          timestamp: row[3],
          hash: row[4]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error searching clipboard history:', error);
      return [];
    }
  }

  public async clearHistory(): Promise<void> {
    if (!this.db) await this.init();
    this.db!.run('DELETE FROM clipboard_history');
    this.saveToDisk();
  }
} 