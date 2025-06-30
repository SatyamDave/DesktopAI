import * as path from 'path';
import * as os from 'os';
import { DatabaseManager } from './DatabaseManager';
import { PerformanceOptimizer } from './PerformanceOptimizer';
import { ScreenPerception } from './ScreenPerception';
import { AudioPerception } from './AudioPerception';
import { aiProcessor } from './AIProcessor';

interface ContextSnapshot {
  id: number;
  timestamp: number;
  screen_snapshot_id: number;
  audio_session_id: number | null;
  app_name: string;
  window_title: string;
  screen_content: string;
  audio_transcript: string | null;
  user_intent: string | null;
  confidence: number;
  metadata: string;
}

interface UserIntent {
  intent_type: string;
  confidence: number;
  triggers: string[];
  suggested_actions: string[];
  context_required: boolean;
}

interface ContextPattern {
  id: number;
  pattern_name: string;
  app_name: string;
  window_pattern: string;
  audio_keywords: string[];
  screen_keywords: string[];
  trigger_actions: string[];
  is_active: boolean;
}

export class ContextManager {
  private databaseManager: DatabaseManager;
  private performanceOptimizer: PerformanceOptimizer;
  private screenPerception: ScreenPerception;
  private audioPerception: AudioPerception;
  private aiProcessor: typeof aiProcessor;
  private isActive = false;
  private dbName = 'context_manager';
  private contextInterval: NodeJS.Timeout | null = null;
  private currentContext: ContextSnapshot | null = null;
  private contextPatterns: Map<string, ContextPattern> = new Map();
  private userIntents: Map<string, UserIntent> = new Map();
  private quietHours: { start: number; end: number } | null = null;
  private isQuietHours = false;

  constructor() {
    this.databaseManager = DatabaseManager.getInstance();
    this.performanceOptimizer = PerformanceOptimizer.getInstance();
    this.screenPerception = new ScreenPerception();
    this.audioPerception = new AudioPerception();
    this.aiProcessor = aiProcessor;
    
    // Register database with optimized settings
    this.databaseManager.registerDatabase({
      name: this.dbName,
      filePath: path.join(os.homedir(), '.doppel', 'context_manager.sqlite'),
      autoSave: true,
      saveInterval: 300000, // 5 minutes
      maxConnections: 1
    });
    
    // Setup performance throttling
    this.performanceOptimizer.createThrottleConfig('context_manager', 15000, 60000, 1.3);
    
    this.initializeUserIntents();
    this.loadContextPatterns();
  }

  public async init() {
    try {
      await this.databaseManager.initialize();
      await this.initializeDatabase();
      await this.screenPerception.init();
      await this.audioPerception.init();
      await this.aiProcessor.init();
      console.log('✅ ContextManager initialized');
    } catch (error) {
      console.error('❌ Error initializing ContextManager:', error);
      throw error;
    }
  }

  private async initializeDatabase() {
    const db = await this.databaseManager.getDatabase(this.dbName);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS context_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        screen_snapshot_id INTEGER,
        audio_session_id INTEGER,
        app_name TEXT NOT NULL,
        window_title TEXT NOT NULL,
        screen_content TEXT,
        audio_transcript TEXT,
        user_intent TEXT,
        confidence REAL DEFAULT 0.0,
        metadata TEXT,
        FOREIGN KEY (screen_snapshot_id) REFERENCES screen_snapshots(id),
        FOREIGN KEY (audio_session_id) REFERENCES audio_sessions(id)
      );
      CREATE TABLE IF NOT EXISTS context_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_name TEXT UNIQUE NOT NULL,
        app_name TEXT NOT NULL,
        window_pattern TEXT,
        audio_keywords TEXT,
        screen_keywords TEXT,
        trigger_actions TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
      CREATE TABLE IF NOT EXISTS user_intents (
        intent_type TEXT PRIMARY KEY,
        confidence REAL DEFAULT 0.0,
        triggers TEXT,
        suggested_actions TEXT,
        context_required INTEGER DEFAULT 0,
        last_updated INTEGER DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_context_timestamp ON context_snapshots(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_context_app ON context_snapshots(app_name);
      CREATE INDEX IF NOT EXISTS idx_context_intent ON context_snapshots(user_intent);
    `);
  }

  public async start() {
    if (this.isActive) return;
    
    this.isActive = true;
    await this.screenPerception.start();
    await this.audioPerception.start();
    
    const interval = this.performanceOptimizer.getThrottledInterval('context_manager');
    this.contextInterval = setInterval(() => this.processContext(), interval);
    
    console.log(`🧠 Context management started (interval: ${interval}ms)`);
  }

  public stop() {
    this.isActive = false;
    
    if (this.contextInterval) {
      clearInterval(this.contextInterval);
      this.contextInterval = null;
    }
    
    this.screenPerception.stop();
    this.audioPerception.stop();
    
    console.log('🧠 Context management stopped');
  }

  private async processContext() {
    if (!this.isActive) return;
    
    try {
      // Check quiet hours
      if (this.isInQuietHours()) {
        return;
      }
      
      // Get latest screen and audio data
      const screenSnapshots = await this.screenPerception.getRecentSnapshots(1);
      const audioSessions = await this.audioPerception.getRecentSessions(1);
      
      if (screenSnapshots.length === 0) return;
      
      const screenSnapshot = screenSnapshots[0];
      const audioSession = audioSessions.length > 0 ? audioSessions[0] : null;
      
      // Check if we have new context
      if (this.hasNewContext(screenSnapshot, audioSession)) {
        const contextSnapshot = await this.createContextSnapshot(screenSnapshot, audioSession);
        await this.analyzeContext(contextSnapshot);
        await this.saveContextSnapshot(contextSnapshot);
        
        this.currentContext = contextSnapshot;
        console.log(`🧠 New context captured: ${contextSnapshot.app_name} - ${contextSnapshot.user_intent || 'No intent detected'}`);
      }
      
    } catch (error) {
      console.error('❌ Error processing context:', error);
      this.performanceOptimizer.increaseThrottle('context_manager');
    }
  }

  private hasNewContext(screenSnapshot: any, audioSession: any | null): boolean {
    if (!this.currentContext) return true;
    
    // Check if screen content has changed significantly
    if (screenSnapshot.content_hash !== this.currentContext.screen_content) {
      return true;
    }
    
    // Check if we have new audio
    if (audioSession && (!this.currentContext.audio_transcript || 
        audioSession.transcript !== this.currentContext.audio_transcript)) {
      return true;
    }
    
    return false;
  }

  private async createContextSnapshot(screenSnapshot: any, audioSession: any | null): Promise<ContextSnapshot> {
    const now = Date.now();
    
    return {
      id: 0,
      timestamp: now,
      screen_snapshot_id: screenSnapshot.id,
      audio_session_id: audioSession?.id || null,
      app_name: screenSnapshot.app_name,
      window_title: screenSnapshot.window_title,
      screen_content: screenSnapshot.content_text,
      audio_transcript: audioSession?.transcript || null,
      user_intent: null, // Will be set by analyzeContext
      confidence: 0,
      metadata: JSON.stringify({
        screen_confidence: screenSnapshot.ocr_confidence,
        audio_confidence: audioSession?.confidence || 0,
        accessibility_available: screenSnapshot.accessibility_available
      })
    };
  }

  private async analyzeContext(contextSnapshot: ContextSnapshot): Promise<void> {
    try {
      // Analyze user intent based on context
      const intent = await this.detectUserIntent(contextSnapshot);
      contextSnapshot.user_intent = intent.intent_type;
      contextSnapshot.confidence = intent.confidence;
      
      // Check for pattern matches
      const matchedPatterns = this.findMatchingPatterns(contextSnapshot);
      
      // Trigger actions based on patterns
      for (const pattern of matchedPatterns) {
        await this.triggerPatternActions(pattern, contextSnapshot);
      }
      
      // Update user intent history
      await this.updateUserIntent(intent);
      
    } catch (error) {
      console.error('Error analyzing context:', error);
    }
  }

  private async detectUserIntent(contextSnapshot: ContextSnapshot): Promise<UserIntent> {
    try {
      // Combine screen content and audio transcript for analysis
      const combinedText = [
        contextSnapshot.screen_content,
        contextSnapshot.audio_transcript
      ].filter(Boolean).join(' ');
      
      // Use AI processor to detect intent
      const intentAnalysis = await this.aiProcessor.processInput(
        `Analyze this context and detect user intent: ${combinedText}`,
        { context: contextSnapshot }
      );
      
      // Parse AI response to extract intent
      const intent = this.parseIntentFromAI(intentAnalysis, combinedText);
      
      return intent;
      
    } catch (error) {
      console.error('Error detecting user intent:', error);
      return this.getDefaultIntent();
    }
  }

  private parseIntentFromAI(aiResponse: string, contextText: string): UserIntent {
    const lowerText = contextText.toLowerCase();
    const lowerResponse = aiResponse.toLowerCase();
    
    // Intent detection logic
    if (lowerText.includes('email') || lowerText.includes('mail') || lowerResponse.includes('email')) {
      return {
        intent_type: 'email_composition',
        confidence: 0.85,
        triggers: ['email', 'mail', 'send'],
        suggested_actions: ['open_email_client', 'draft_email', 'search_contacts'],
        context_required: true
      };
    }
    
    if (lowerText.includes('code') || lowerText.includes('programming') || lowerResponse.includes('code')) {
      return {
        intent_type: 'coding',
        confidence: 0.9,
        triggers: ['code', 'programming', 'debug', 'error'],
        suggested_actions: ['open_ide', 'search_documentation', 'suggest_fix'],
        context_required: true
      };
    }
    
    if (lowerText.includes('search') || lowerText.includes('find') || lowerResponse.includes('search')) {
      return {
        intent_type: 'information_search',
        confidence: 0.8,
        triggers: ['search', 'find', 'lookup'],
        suggested_actions: ['open_browser', 'search_web', 'search_local'],
        context_required: false
      };
    }
    
    if (lowerText.includes('meeting') || lowerText.includes('call') || lowerResponse.includes('meeting')) {
      return {
        intent_type: 'communication',
        confidence: 0.75,
        triggers: ['meeting', 'call', 'video', 'zoom'],
        suggested_actions: ['join_meeting', 'schedule_meeting', 'mute_notifications'],
        context_required: true
      };
    }
    
    return this.getDefaultIntent();
  }

  private getDefaultIntent(): UserIntent {
    return {
      intent_type: 'general_activity',
      confidence: 0.5,
      triggers: [],
      suggested_actions: [],
      context_required: false
    };
  }

  private findMatchingPatterns(contextSnapshot: ContextSnapshot): ContextPattern[] {
    const matchedPatterns: ContextPattern[] = [];
    
    for (const pattern of this.contextPatterns.values()) {
      if (!pattern.is_active) continue;
      
      // Check app name match
      if (pattern.app_name && !contextSnapshot.app_name.toLowerCase().includes(pattern.app_name.toLowerCase())) {
        continue;
      }
      
      // Check window pattern match
      if (pattern.window_pattern && !contextSnapshot.window_title.toLowerCase().includes(pattern.window_pattern.toLowerCase())) {
        continue;
      }
      
      // Check screen keywords
      if (pattern.screen_keywords.length > 0) {
        const screenMatch = pattern.screen_keywords.some(keyword => 
          contextSnapshot.screen_content.toLowerCase().includes(keyword.toLowerCase())
        );
        if (!screenMatch) continue;
      }
      
      // Check audio keywords
      if (pattern.audio_keywords.length > 0 && contextSnapshot.audio_transcript) {
        const audioMatch = pattern.audio_keywords.some(keyword => 
          contextSnapshot.audio_transcript!.toLowerCase().includes(keyword.toLowerCase())
        );
        if (!audioMatch) continue;
      }
      
      matchedPatterns.push(pattern);
    }
    
    return matchedPatterns;
  }

  private async triggerPatternActions(pattern: ContextPattern, contextSnapshot: ContextSnapshot): Promise<void> {
    try {
      for (const action of pattern.trigger_actions) {
        console.log(`🎯 Triggering action: ${action} for pattern: ${pattern.pattern_name}`);
        
        // Execute action through AI processor
        await this.aiProcessor.processInput(
          `Execute action: ${action} in context of: ${contextSnapshot.app_name}`,
          { context: contextSnapshot, pattern: pattern }
        );
      }
    } catch (error) {
      console.error('Error triggering pattern actions:', error);
    }
  }

  private async saveContextSnapshot(contextSnapshot: ContextSnapshot): Promise<void> {
    try {
      await this.databaseManager.batchExecute(
        this.dbName,
        'INSERT INTO context_snapshots (timestamp, screen_snapshot_id, audio_session_id, app_name, window_title, screen_content, audio_transcript, user_intent, confidence, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [contextSnapshot.timestamp, contextSnapshot.screen_snapshot_id, contextSnapshot.audio_session_id, contextSnapshot.app_name, contextSnapshot.window_title, contextSnapshot.screen_content, contextSnapshot.audio_transcript, contextSnapshot.user_intent, contextSnapshot.confidence, contextSnapshot.metadata]
      );
    } catch (error) {
      console.error('Error saving context snapshot:', error);
    }
  }

  private async updateUserIntent(intent: UserIntent): Promise<void> {
    try {
      await this.databaseManager.batchExecute(
        this.dbName,
        'INSERT OR REPLACE INTO user_intents (intent_type, confidence, triggers, suggested_actions, context_required, last_updated) VALUES (?, ?, ?, ?, ?, ?)',
        [intent.intent_type, intent.confidence, JSON.stringify(intent.triggers), JSON.stringify(intent.suggested_actions), intent.context_required ? 1 : 0, Date.now()]
      );
      
      this.userIntents.set(intent.intent_type, intent);
    } catch (error) {
      console.error('Error updating user intent:', error);
    }
  }

  private initializeUserIntents(): void {
    // Initialize common user intents
    const defaultIntents: UserIntent[] = [
      {
        intent_type: 'email_composition',
        confidence: 0.8,
        triggers: ['email', 'mail', 'send'],
        suggested_actions: ['open_email_client', 'draft_email'],
        context_required: true
      },
      {
        intent_type: 'coding',
        confidence: 0.9,
        triggers: ['code', 'programming', 'debug'],
        suggested_actions: ['open_ide', 'search_documentation'],
        context_required: true
      },
      {
        intent_type: 'information_search',
        confidence: 0.7,
        triggers: ['search', 'find', 'lookup'],
        suggested_actions: ['open_browser', 'search_web'],
        context_required: false
      }
    ];
    
    for (const intent of defaultIntents) {
      this.userIntents.set(intent.intent_type, intent);
    }
  }

  private async loadContextPatterns(): Promise<void> {
    try {
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT * FROM context_patterns WHERE is_active = 1'
      );
      
      if (result[0] && result[0].values) {
        for (const row of result[0].values) {
          const pattern: ContextPattern = {
            id: row[0],
            pattern_name: row[1],
            app_name: row[2],
            window_pattern: row[3],
            audio_keywords: JSON.parse(row[4] || '[]'),
            screen_keywords: JSON.parse(row[5] || '[]'),
            trigger_actions: JSON.parse(row[6] || '[]'),
            is_active: !!row[7]
          };
          this.contextPatterns.set(pattern.pattern_name, pattern);
        }
      }
    } catch (error) {
      console.error('Error loading context patterns:', error);
    }
  }

  // Public API methods
  public async addContextPattern(pattern: Omit<ContextPattern, 'id'>): Promise<void> {
    try {
      await this.databaseManager.batchExecute(
        this.dbName,
        'INSERT INTO context_patterns (pattern_name, app_name, window_pattern, audio_keywords, screen_keywords, trigger_actions, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [pattern.pattern_name, pattern.app_name, pattern.window_pattern, JSON.stringify(pattern.audio_keywords), JSON.stringify(pattern.screen_keywords), JSON.stringify(pattern.trigger_actions), pattern.is_active ? 1 : 0]
      );
      
      this.contextPatterns.set(pattern.pattern_name, { ...pattern, id: 0 });
    } catch (error) {
      console.error('Error adding context pattern:', error);
    }
  }

  public setQuietHours(startHour: number, endHour: number): void {
    this.quietHours = { start: startHour, end: endHour };
    console.log(`🔇 Quiet hours set: ${startHour}:00 - ${endHour}:00`);
  }

  private isInQuietHours(): boolean {
    if (!this.quietHours) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    if (this.quietHours.start <= this.quietHours.end) {
      // Same day quiet hours (e.g., 22:00 - 06:00)
      this.isQuietHours = currentHour >= this.quietHours.start || currentHour < this.quietHours.end;
    } else {
      // Overnight quiet hours (e.g., 22:00 - 06:00)
      this.isQuietHours = currentHour >= this.quietHours.start || currentHour < this.quietHours.end;
    }
    
    return this.isQuietHours;
  }

  public async getRecentContext(limit = 20): Promise<ContextSnapshot[]> {
    try {
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT * FROM context_snapshots ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );
      
      if (result[0] && result[0].values) {
        return result[0].values.map((row: any) => ({
          id: row[0],
          timestamp: row[1],
          screen_snapshot_id: row[2],
          audio_session_id: row[3],
          app_name: row[4],
          window_title: row[5],
          screen_content: row[6],
          audio_transcript: row[7],
          user_intent: row[8],
          confidence: row[9],
          metadata: row[10]
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting recent context:', error);
      return [];
    }
  }

  public getStatus(): { isActive: boolean; currentContext: any; isQuietHours: boolean; patternsCount: number } {
    return {
      isActive: this.isActive,
      currentContext: this.currentContext,
      isQuietHours: this.isQuietHours,
      patternsCount: this.contextPatterns.size
    };
  }
} 