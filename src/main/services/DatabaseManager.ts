import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { PerformanceOptimizer } from './PerformanceOptimizer';

interface DatabaseConfig {
  name: string;
  filePath: string;
  autoSave: boolean;
  saveInterval: number;
  maxConnections: number;
}

interface BatchOperation {
  sql: string;
  params: any[];
  timestamp: number;
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private sqlJS: SqlJsStatic | null = null;
  private databases = new Map<string, Database>();
  private configs = new Map<string, DatabaseConfig>();
  private batchQueues = new Map<string, BatchOperation[]>();
  private saveTimers = new Map<string, NodeJS.Timeout>();
  private performanceOptimizer: PerformanceOptimizer;
  private isInitialized = false;

  private constructor() {
    this.performanceOptimizer = PerformanceOptimizer.getInstance();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      this.sqlJS = await initSqlJs();
      this.isInitialized = true;
      console.log('✅ DatabaseManager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize DatabaseManager:', error);
      throw error;
    }
  }

  public registerDatabase(config: DatabaseConfig): void {
    this.configs.set(config.name, config);
    
    // Create database directory if it doesn't exist
    const dbDir = path.dirname(config.filePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Initialize batch queue
    this.batchQueues.set(config.name, []);
    
    // Setup auto-save timer if enabled
    if (config.autoSave) {
      this.setupAutoSave(config.name, config.saveInterval);
    }
    
    console.log(`📊 Database registered: ${config.name}`);
  }

  public async getDatabase(name: string): Promise<Database> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.databases.has(name)) {
      return this.databases.get(name)!;
    }
    
    const config = this.configs.get(name);
    if (!config) {
      throw new Error(`Database '${name}' not registered`);
    }
    
    const db = await this.createDatabase(config);
    this.databases.set(name, db);
    return db;
  }

  private async createDatabase(config: DatabaseConfig): Promise<Database> {
    try {
      let db: Database;
      
      if (fs.existsSync(config.filePath)) {
        const filebuffer = fs.readFileSync(config.filePath);
        db = new this.sqlJS!.Database(filebuffer);
      } else {
        db = new this.sqlJS!.Database();
      }
      
      console.log(`📊 Database created/loaded: ${config.name}`);
      return db;
    } catch (error) {
      console.error(`❌ Error creating database ${config.name}:`, error);
      throw error;
    }
  }

  public async executeQuery(name: string, sql: string, params: any[] = []): Promise<any> {
    const db = await this.getDatabase(name);
    const config = this.configs.get(name)!;
    
    try {
      const startTime = performance.now();
      const result = db.exec(sql, params);
      const endTime = performance.now();
      
      // Record performance metrics
      this.performanceOptimizer.recordDiskIO();
      
      if (config.autoSave && (endTime - startTime) > 100) {
        // If query took more than 100ms, trigger immediate save
        this.scheduleSave(name);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Database query error in ${name}:`, error);
      throw error;
    }
  }

  public async batchExecute(name: string, sql: string, params: any[] = []): Promise<void> {
    const queue = this.batchQueues.get(name);
    if (!queue) {
      throw new Error(`Database '${name}' not registered for batching`);
    }
    
    queue.push({
      sql,
      params,
      timestamp: Date.now()
    });
    
    // Process batch if queue is getting large
    if (queue.length >= 10) {
      await this.processBatch(name);
    }
  }

  private async processBatch(name: string): Promise<void> {
    const queue = this.batchQueues.get(name);
    if (!queue || queue.length === 0) return;
    
    const db = await this.getDatabase(name);
    const operations = [...queue];
    queue.length = 0; // Clear queue
    
    try {
      // Begin transaction
      db.run('BEGIN TRANSACTION');
      
      for (const op of operations) {
        db.run(op.sql, op.params);
      }
      
      // Commit transaction
      db.run('COMMIT');
      
      // Schedule save
      this.scheduleSave(name);
      
      console.debug(`📊 Processed batch of ${operations.length} operations for ${name}`);
    } catch (error) {
      // Rollback on error
      db.run('ROLLBACK');
      console.error(`❌ Batch processing error for ${name}:`, error);
      throw error;
    }
  }

  private setupAutoSave(name: string, interval: number): void {
    const timer = setInterval(async () => {
      await this.saveDatabase(name);
    }, interval);
    
    this.saveTimers.set(name, timer);
  }

  private scheduleSave(name: string): void {
    // Debounce save operations
    const existingTimer = this.saveTimers.get(name);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    const timer = setTimeout(async () => {
      await this.saveDatabase(name);
    }, 1000); // 1 second debounce
    
    this.saveTimers.set(name, timer);
  }

  private async saveDatabase(name: string): Promise<void> {
    const db = this.databases.get(name);
    const config = this.configs.get(name);
    
    if (!db || !config) return;
    
    try {
      const startTime = performance.now();
      const data = db.export();
      
      // Use async file writing to avoid blocking
      await fs.promises.writeFile(config.filePath, Buffer.from(data));
      
      const endTime = performance.now();
      console.debug(`💾 Database ${name} saved in ${(endTime - startTime).toFixed(2)}ms`);
      
      this.performanceOptimizer.recordDiskIO();
    } catch (error) {
      console.error(`❌ Error saving database ${name}:`, error);
    }
  }

  public async closeDatabase(name: string): Promise<void> {
    // Process any remaining batch operations
    await this.processBatch(name);
    
    // Save database
    await this.saveDatabase(name);
    
    // Close database
    const db = this.databases.get(name);
    if (db) {
      db.close();
      this.databases.delete(name);
    }
    
    // Clear timer
    const timer = this.saveTimers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.saveTimers.delete(name);
    }
    
    console.log(`📊 Database ${name} closed`);
  }

  public async closeAll(): Promise<void> {
    const names = Array.from(this.databases.keys());
    
    for (const name of names) {
      await this.closeDatabase(name);
    }
    
    console.log('📊 All databases closed');
  }

  public getDatabaseStats(): {
    totalDatabases: number;
    activeConnections: number;
    batchQueueSizes: Record<string, number>;
  } {
    const batchQueueSizes: Record<string, number> = {};
    
    for (const [name, queue] of this.batchQueues) {
      batchQueueSizes[name] = queue.length;
    }
    
    return {
      totalDatabases: this.databases.size,
      activeConnections: this.databases.size,
      batchQueueSizes
    };
  }

  public async optimizeForPerformance(): Promise<void> {
    console.log('⚡ Optimizing database performance...');
    
    // Process all pending batches
    for (const name of this.batchQueues.keys()) {
      await this.processBatch(name);
    }
    
    // Save all databases
    for (const name of this.databases.keys()) {
      await this.saveDatabase(name);
    }
  }
} 