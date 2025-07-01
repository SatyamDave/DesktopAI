import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { createHash, randomBytes } from 'crypto';
import { DatabaseManager } from './DatabaseManager';
import { PerformanceOptimizer } from './PerformanceOptimizer';

interface TaskMemory {
  id: string;
  taskHash: string;
  taskType: string;
  input: string;
  context: string;
  output: string;
  success: boolean;
  timestamp: number;
  sessionId: string;
  recipient?: string;
  destination?: string;
  fileType?: string;
  appName?: string;
  metadata: Record<string, any>;
}

interface SessionContext {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  activeApp: string;
  clipboardContent: string;
  recentCommands: string[];
  completedTasks: string[];
  userHabits: UserHabit[];
  contextSnapshots: ContextSnapshot[];
}

interface UserHabit {
  id: string;
  pattern: string;
  frequency: number;
  lastUsed: number;
  successRate: number;
  suggestedActions: string[];
  context: string;
}

interface ContextSnapshot {
  id: string;
  timestamp: number;
  appName: string;
  windowTitle: string;
  clipboardContent: string;
  activeFile?: string;
  fileType?: string;
}

interface TaskSimilarity {
  similarity: number;
  previousTask: TaskMemory;
  reason: string;
}

export class SessionMemoryManager {
  private databaseManager: DatabaseManager;
  private performanceOptimizer: PerformanceOptimizer;
  private isInitialized = false;
  private dbName = 'session_memory';
  
  // Session state
  private currentSessionId: string;
  private currentSession: SessionContext | null = null;
  private taskMemory: Map<string, TaskMemory> = new Map();
  private userHabits: Map<string, UserHabit> = new Map();
  
  // Performance tracking
  private lastCleanup = 0;
  private maxTaskMemory = 1000;
  private maxSessionHistory = 50;

  private memoryFile = path.join(process.cwd(), 'session-memory.json');
  private recentActions: string[] = [];
  private habits: Record<string, number> = {};
  private maxActions = 50;

  constructor() {
    this.databaseManager = DatabaseManager.getInstance();
    this.performanceOptimizer = PerformanceOptimizer.getInstance();
    this.currentSessionId = this.generateSessionId();
    
    // Register database with optimized settings
    this.databaseManager.registerDatabase({
      name: this.dbName,
      filePath: path.join(os.homedir(), '.doppel', 'session_memory.sqlite'),
      autoSave: true,
      saveInterval: 300000, // 5 minutes
      maxConnections: 1
    });
    
    // Setup performance throttling
    this.performanceOptimizer.createThrottleConfig('session_memory', 10000, 60000, 1.5);

    this.load();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.databaseManager.initialize();
      await this.initializeDatabase();
      await this.loadSessionData();
      await this.startNewSession();
      
      this.isInitialized = true;
      console.log('🧠 SessionMemoryManager initialized');
    } catch (error) {
      console.error('❌ Error initializing SessionMemoryManager:', error);
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    const db = await this.databaseManager.getDatabase(this.dbName);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS task_memory (
        id TEXT PRIMARY KEY,
        task_hash TEXT NOT NULL,
        task_type TEXT NOT NULL,
        input TEXT NOT NULL,
        context TEXT,
        output TEXT,
        success INTEGER DEFAULT 1,
        timestamp INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        recipient TEXT,
        destination TEXT,
        file_type TEXT,
        app_name TEXT,
        metadata TEXT,
        UNIQUE(task_hash, session_id)
      );
      
      CREATE TABLE IF NOT EXISTS session_contexts (
        session_id TEXT PRIMARY KEY,
        start_time INTEGER NOT NULL,
        last_activity INTEGER NOT NULL,
        active_app TEXT,
        clipboard_content TEXT,
        recent_commands TEXT,
        completed_tasks TEXT,
        user_habits TEXT,
        context_snapshots TEXT
      );
      
      CREATE TABLE IF NOT EXISTS user_habits (
        id TEXT PRIMARY KEY,
        pattern TEXT NOT NULL,
        frequency INTEGER DEFAULT 1,
        last_used INTEGER NOT NULL,
        success_rate REAL DEFAULT 1.0,
        suggested_actions TEXT,
        context TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_task_hash ON task_memory(task_hash);
      CREATE INDEX IF NOT EXISTS idx_task_type ON task_memory(task_type);
      CREATE INDEX IF NOT EXISTS idx_session_id ON task_memory(session_id);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON task_memory(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_habit_pattern ON user_habits(pattern);
    `);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  private generateTaskHash(input: string, context: string): string {
    const content = `${input.toLowerCase().trim()}_${context.toLowerCase().trim()}`;
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private async startNewSession(): Promise<void> {
    this.currentSessionId = this.generateSessionId();
    
    this.currentSession = {
      sessionId: this.currentSessionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      activeApp: '',
      clipboardContent: '',
      recentCommands: [],
      completedTasks: [],
      userHabits: [],
      contextSnapshots: []
    };

    console.log(`🔄 New session started: ${this.currentSessionId}`);
  }

  public async checkTaskCompletion(input: string, context: string = ''): Promise<{
    isDuplicate: boolean;
    previousTask?: TaskMemory;
    similarity?: TaskSimilarity;
    suggestion?: string;
  }> {
    await this.initialize();
    
    const taskHash = this.generateTaskHash(input, context);
    
    // Check current session first
    const currentSessionTask = this.taskMemory.get(taskHash);
    if (currentSessionTask) {
      return {
        isDuplicate: true,
        previousTask: currentSessionTask,
        suggestion: `I already completed this task in this session. Would you like me to repeat it or show you the previous result?`
      };
    }

    // Check for similar tasks in current session
    const similarity = this.findSimilarTask(input, context);
    if (similarity && similarity.similarity > 0.8) {
      return {
        isDuplicate: false,
        similarity,
        suggestion: `This seems similar to a previous task. Would you like me to proceed or check the previous result first?`
      };
    }

    // Check database for recent sessions
    const recentTask = await this.findRecentTask(taskHash);
    if (recentTask) {
      const timeDiff = Date.now() - recentTask.timestamp;
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff < 24) { // Within 24 hours
        return {
          isDuplicate: true,
          previousTask: recentTask,
          suggestion: `I completed a similar task recently (${Math.round(hoursDiff)} hours ago). Would you like me to repeat it?`
        };
      }
    }

    return { isDuplicate: false };
  }

  public async recordTaskCompletion(
    input: string,
    taskType: string,
    output: string,
    success: boolean = true,
    context: string = '',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.initialize();
    
    const taskHash = this.generateTaskHash(input, context);
    const taskId = `task_${Date.now()}_${randomBytes(4).toString('hex')}`;
    
    const task: TaskMemory = {
      id: taskId,
      taskHash,
      taskType,
      input,
      context,
      output,
      success,
      timestamp: Date.now(),
      sessionId: this.currentSessionId,
      recipient: metadata.recipient,
      destination: metadata.destination,
      fileType: metadata.fileType,
      appName: metadata.appName,
      metadata
    };

    // Store in memory
    this.taskMemory.set(taskHash, task);
    
    // Update session context
    if (this.currentSession) {
      this.currentSession.lastActivity = Date.now();
      this.currentSession.recentCommands.push(input);
      this.currentSession.completedTasks.push(taskId);
      
      // Keep only recent commands
      if (this.currentSession.recentCommands.length > 20) {
        this.currentSession.recentCommands = this.currentSession.recentCommands.slice(-20);
      }
    }

    // Save to database
    await this.saveTaskToDatabase(task);
    
    // Update user habits
    await this.updateUserHabits(input, taskType, success, context);
    
    console.log(`💾 Task recorded: ${taskType} (${success ? 'success' : 'failed'})`);
  }

  public async getSessionContext(): Promise<SessionContext | null> {
    await this.initialize();
    return this.currentSession;
  }

  public async getRecentTasks(limit: number = 10): Promise<TaskMemory[]> {
    await this.initialize();
    
    const tasks = Array.from(this.taskMemory.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    return tasks;
  }

  public async getUserHabits(): Promise<UserHabit[]> {
    await this.initialize();
    return Array.from(this.userHabits.values());
  }

  public async suggestNextAction(context: string = ''): Promise<{
    suggestion: string;
    confidence: number;
    basedOn: string;
  } | null> {
    await this.initialize();
    
    if (!this.currentSession || this.currentSession.recentCommands.length === 0) {
      return null;
    }

    const recentCommands = this.currentSession.recentCommands.slice(-3);
    const pattern = recentCommands.join(' → ');
    
    // Find matching habit
    const matchingHabit = Array.from(this.userHabits.values())
      .find(habit => pattern.includes(habit.pattern) || habit.pattern.includes(pattern));
    
    if (matchingHabit && matchingHabit.suggestedActions.length > 0) {
      const nextAction = matchingHabit.suggestedActions[0];
      return {
        suggestion: nextAction,
        confidence: matchingHabit.successRate,
        basedOn: `Your frequent workflow: ${matchingHabit.pattern}`
      };
    }

    // Analyze recent tasks for patterns
    const recentTasks = await this.getRecentTasks(5);
    if (recentTasks.length >= 2) {
      const lastTask = recentTasks[0];
      
      // Common follow-up patterns
      if (lastTask.taskType === 'email_composition') {
        return {
          suggestion: 'Would you like me to schedule a follow-up reminder for this email?',
          confidence: 0.7,
          basedOn: 'Email composition completed'
        };
      }
      
      if (lastTask.taskType === 'file_operation' && lastTask.fileType) {
        return {
          suggestion: `Would you like me to open ${lastTask.fileType} files in your default editor?`,
          confidence: 0.6,
          basedOn: 'File operation completed'
        };
      }
      
      if (lastTask.taskType === 'web_search') {
        return {
          suggestion: 'Would you like me to save this search result or open it in a new tab?',
          confidence: 0.5,
          basedOn: 'Web search completed'
        };
      }
    }

    return null;
  }

  public async updateContext(
    appName: string,
    windowTitle: string,
    clipboardContent: string,
    activeFile?: string
  ): Promise<void> {
    await this.initialize();
    
    if (!this.currentSession) return;
    
    this.currentSession.activeApp = appName;
    this.currentSession.clipboardContent = clipboardContent;
    this.currentSession.lastActivity = Date.now();
    
    // Create context snapshot
    const snapshot: ContextSnapshot = {
      id: `snapshot_${Date.now()}_${randomBytes(4).toString('hex')}`,
      timestamp: Date.now(),
      appName,
      windowTitle,
      clipboardContent,
      activeFile,
      fileType: activeFile ? path.extname(activeFile) : undefined
    };
    
    this.currentSession.contextSnapshots.push(snapshot);
    
    // Keep only recent snapshots
    if (this.currentSession.contextSnapshots.length > 50) {
      this.currentSession.contextSnapshots = this.currentSession.contextSnapshots.slice(-50);
    }
  }

  private findSimilarTask(input: string, context: string): TaskSimilarity | null {
    const inputWords = input.toLowerCase().split(/\s+/);
    
    let bestSimilarity: TaskSimilarity | null = null;
    
    for (const task of this.taskMemory.values()) {
      const taskWords = task.input.toLowerCase().split(/\s+/);
      const contextWords = context.toLowerCase().split(/\s+/);
      const taskContextWords = task.context.toLowerCase().split(/\s+/);
      
      // Calculate word overlap
      const inputTaskOverlap = inputWords.filter(word => taskWords.includes(word)).length;
      const contextOverlap = contextWords.filter(word => taskContextWords.includes(word)).length;
      
      const inputSimilarity = inputTaskOverlap / Math.max(inputWords.length, taskWords.length);
      const contextSimilarity = contextOverlap / Math.max(contextWords.length, taskContextWords.length);
      
      const overallSimilarity = (inputSimilarity * 0.7) + (contextSimilarity * 0.3);
      
      if (overallSimilarity > 0.8 && (!bestSimilarity || overallSimilarity > bestSimilarity.similarity)) {
        bestSimilarity = {
          similarity: overallSimilarity,
          previousTask: task,
          reason: `Similar input (${Math.round(overallSimilarity * 100)}% match)`
        };
      }
    }
    
    return bestSimilarity;
  }

  private async findRecentTask(taskHash: string): Promise<TaskMemory | null> {
    try {
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT * FROM task_memory WHERE task_hash = ? ORDER BY timestamp DESC LIMIT 1',
        [taskHash]
      );
      
      if (result[0] && result[0].values && result[0].values.length > 0) {
        const row = result[0].values[0];
        return {
          id: row[0],
          taskHash: row[1],
          taskType: row[2],
          input: row[3],
          context: row[4],
          output: row[5],
          success: !!row[6],
          timestamp: row[7],
          sessionId: row[8],
          recipient: row[9],
          destination: row[10],
          fileType: row[11],
          appName: row[12],
          metadata: row[13] ? JSON.parse(row[13]) : {}
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error finding recent task:', error);
      return null;
    }
  }

  private async saveTaskToDatabase(task: TaskMemory): Promise<void> {
    try {
      await this.databaseManager.batchExecute(
        this.dbName,
        `INSERT OR REPLACE INTO task_memory 
         (id, task_hash, task_type, input, context, output, success, timestamp, session_id, recipient, destination, file_type, app_name, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          task.id,
          task.taskHash,
          task.taskType,
          task.input,
          task.context,
          task.output,
          task.success ? 1 : 0,
          task.timestamp,
          task.sessionId,
          task.recipient,
          task.destination,
          task.fileType,
          task.appName,
          JSON.stringify(task.metadata)
        ]
      );
    } catch (error) {
      console.error('Error saving task to database:', error);
    }
  }

  private async updateUserHabits(
    input: string,
    taskType: string,
    success: boolean,
    context: string
  ): Promise<void> {
    const pattern = this.extractPattern(input, taskType);
    const habitId = createHash('sha256').update(pattern).digest('hex').substring(0, 16);
    
    const existingHabit = this.userHabits.get(habitId);
    
    if (existingHabit) {
      existingHabit.frequency += 1;
      existingHabit.lastUsed = Date.now();
      existingHabit.successRate = (existingHabit.successRate * (existingHabit.frequency - 1) + (success ? 1 : 0)) / existingHabit.frequency;
    } else {
      const newHabit: UserHabit = {
        id: habitId,
        pattern,
        frequency: 1,
        lastUsed: Date.now(),
        successRate: success ? 1 : 0,
        suggestedActions: this.generateSuggestedActions(taskType, context),
        context
      };
      this.userHabits.set(habitId, newHabit);
    }
    
    // Save habits to database periodically
    if (Date.now() - this.lastCleanup > 300000) { // Every 5 minutes
      await this.saveHabitsToDatabase();
      this.lastCleanup = Date.now();
    }
  }

  private extractPattern(input: string, taskType: string): string {
    // Extract key words and structure from input
    const words = input.toLowerCase().split(/\s+/);
    const keyWords = words.filter(word => 
      word.length > 3 && 
      !['the', 'and', 'for', 'with', 'this', 'that', 'from', 'about'].includes(word)
    );
    
    return `${taskType}:${keyWords.slice(0, 3).join('_')}`;
  }

  private generateSuggestedActions(taskType: string, context: string): string[] {
    const suggestions: string[] = [];
    
    switch (taskType) {
      case 'email_composition':
        suggestions.push('Schedule follow-up reminder');
        suggestions.push('Save to drafts');
        suggestions.push('Add to calendar');
        break;
      case 'file_operation':
        suggestions.push('Open in default editor');
        suggestions.push('Create backup');
        suggestions.push('Share via email');
        break;
      case 'web_search':
        suggestions.push('Save bookmark');
        suggestions.push('Open in new tab');
        suggestions.push('Share link');
        break;
      case 'app_launch':
        suggestions.push('Pin to taskbar');
        suggestions.push('Create shortcut');
        suggestions.push('Set as default');
        break;
    }
    
    return suggestions;
  }

  private async saveHabitsToDatabase(): Promise<void> {
    try {
      for (const habit of this.userHabits.values()) {
        await this.databaseManager.batchExecute(
          this.dbName,
          `INSERT OR REPLACE INTO user_habits 
           (id, pattern, frequency, last_used, success_rate, suggested_actions, context)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            habit.id,
            habit.pattern,
            habit.frequency,
            habit.lastUsed,
            habit.successRate,
            JSON.stringify(habit.suggestedActions),
            habit.context
          ]
        );
      }
    } catch (error) {
      console.error('Error saving habits to database:', error);
    }
  }

  private async loadSessionData(): Promise<void> {
    try {
      // Load recent habits
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT * FROM user_habits ORDER BY last_used DESC LIMIT 100'
      );
      
      if (result[0] && result[0].values) {
        for (const row of result[0].values) {
          const habit: UserHabit = {
            id: row[0],
            pattern: row[1],
            frequency: row[2],
            lastUsed: row[3],
            successRate: row[4],
            suggestedActions: row[5] ? JSON.parse(row[5]) : [],
            context: row[6]
          };
          this.userHabits.set(habit.id, habit);
        }
      }
    } catch (error) {
      console.error('Error loading session data:', error);
    }
  }

  public async cleanup(): Promise<void> {
    // Clean up old task memory
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    for (const [hash, task] of this.taskMemory.entries()) {
      if (task.timestamp < cutoffTime) {
        this.taskMemory.delete(hash);
      }
    }
    
    // Keep only recent habits
    const habitCutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
    for (const [id, habit] of this.userHabits.entries()) {
      if (habit.lastUsed < habitCutoff && habit.frequency < 3) {
        this.userHabits.delete(id);
      }
    }
    
    console.log('🧹 Session memory cleaned up');
  }

  public getStatus(): {
    isInitialized: boolean;
    currentSessionId: string;
    taskMemorySize: number;
    habitsCount: number;
    lastActivity: number;
  } {
    return {
      isInitialized: this.isInitialized,
      currentSessionId: this.currentSessionId,
      taskMemorySize: this.taskMemory.size,
      habitsCount: this.userHabits.size,
      lastActivity: this.currentSession?.lastActivity || 0
    };
  }

  addAction(action: string) {
    if (this.recentActions[0] === action) return; // deduplication
    this.recentActions.unshift(action);
    if (this.recentActions.length > this.maxActions) this.recentActions.pop();
    this.habits[action] = (this.habits[action] || 0) + 1;
    this.save();
  }

  getRecentActions() {
    return this.recentActions;
  }

  getHabitSuggestions() {
    return Object.entries(this.habits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action]) => action);
  }

  private load() {
    try {
      if (fs.existsSync(this.memoryFile)) {
        const data = JSON.parse(fs.readFileSync(this.memoryFile, 'utf-8'));
        this.recentActions = data.recentActions || [];
        this.habits = data.habits || {};
      }
    } catch (err) {
      console.error('[SessionMemoryManager] Load error:', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.memoryFile, JSON.stringify({ recentActions: this.recentActions, habits: this.habits }));
    } catch (err) {
      console.error('[SessionMemoryManager] Save error:', err);
    }
  }
}

// Export singleton instance
export const sessionMemoryManager = new SessionMemoryManager();
