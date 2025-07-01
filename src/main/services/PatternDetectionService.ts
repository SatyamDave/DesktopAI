import { DELOCommandSystem, DeloContext, DeloCommandResult } from './DELOCommandSystem';
import { WorkflowManager, PatternDetection } from './WorkflowManager';
import { EnhancedAIPromptingService } from './EnhancedAIPromptingService';
import { DatabaseManager } from './DatabaseManager';

export interface UserAction {
  id: string;
  command: string;
  context: DeloContext;
  timestamp: number;
  success: boolean;
  duration: number;
  result?: DeloCommandResult;
}

export interface BehaviorPattern {
  id: string;
  name: string;
  description: string;
  actions: string[];
  frequency: number;
  confidence: number;
  context: string[];
  triggers: string[];
  lastSeen: number;
  firstSeen: number;
  suggestedWorkflow?: any;
  isAutomated: boolean;
}

export interface PatternSuggestion {
  pattern: BehaviorPattern;
  suggestion: string;
  confidence: number;
  estimatedTimeSavings: number;
  automationType: 'workflow' | 'shortcut' | 'reminder';
}

export interface UserBehavior {
  patterns: BehaviorPattern[];
  productivityScore: number;
  automationOpportunities: PatternSuggestion[];
  recentActions: UserAction[];
  sessionStats: {
    totalActions: number;
    successfulActions: number;
    averageActionTime: number;
    mostUsedCommands: Array<{ command: string; count: number }>;
  };
}

export class PatternDetectionService {
  private deloSystem: DELOCommandSystem;
  private workflowManager: WorkflowManager;
  private enhancedAI: EnhancedAIPromptingService;
  private databaseManager: DatabaseManager;
  private userActions: UserAction[] = [];
  private patterns: BehaviorPattern[] = [];
  private isInitialized = false;
  private maxActions = 1000; // Keep last 1000 actions
  private patternDetectionInterval = 300000; // Check for patterns every 5 minutes
  private lastPatternCheck = 0;

  constructor(deloSystem: DELOCommandSystem, workflowManager: WorkflowManager) {
    this.deloSystem = deloSystem;
    this.workflowManager = workflowManager;
    this.enhancedAI = new EnhancedAIPromptingService();
    this.databaseManager = DatabaseManager.getInstance();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔍 Initializing Pattern Detection Service...');
      
      // Load existing patterns and actions from database
      await this.loadUserData();
      
      // Start periodic pattern detection
      this.startPeriodicDetection();
      
      this.isInitialized = true;
      console.log('✅ Pattern Detection Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Pattern Detection Service:', error);
      throw error;
    }
  }

  /**
   * Record a user action for pattern analysis
   */
  public async recordAction(
    command: string, 
    context: DeloContext, 
    result: DeloCommandResult,
    duration: number
  ): Promise<void> {
    const action: UserAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      command,
      context,
      timestamp: Date.now(),
      success: result.success,
      duration,
      result
    };

    this.userActions.push(action);

    // Keep only the last maxActions
    if (this.userActions.length > this.maxActions) {
      this.userActions.shift();
    }

    // Save to database
    await this.saveUserAction(action);

    // Check if we should run pattern detection
    if (Date.now() - this.lastPatternCheck > this.patternDetectionInterval) {
      await this.detectPatterns();
    }
  }

  /**
   * Detect patterns in user behavior
   */
  public async detectPatterns(): Promise<BehaviorPattern[]> {
    console.log('🔍 Detecting user behavior patterns...');
    
    this.lastPatternCheck = Date.now();

    // Get recent actions (last 24 hours)
    const recentActions = this.userActions.filter(
      action => Date.now() - action.timestamp < 24 * 60 * 60 * 1000
    );

    if (recentActions.length < 3) {
      console.log('Not enough recent actions for pattern detection');
      return [];
    }

    // Extract action sequences
    const sequences = this.extractActionSequences(recentActions);
    
    // Find repeated patterns
    const repeatedPatterns = this.findRepeatedPatterns(sequences);
    
    // Analyze patterns with AI
    const analyzedPatterns = await this.analyzePatternsWithAI(repeatedPatterns);
    
    // Update existing patterns and add new ones
    this.updatePatterns(analyzedPatterns);
    
    // Save patterns to database
    await this.savePatterns();
    
    console.log(`🔍 Detected ${analyzedPatterns.length} patterns`);
    return analyzedPatterns;
  }

  /**
   * Generate automation suggestions based on detected patterns
   */
  public async generateAutomationSuggestions(): Promise<PatternSuggestion[]> {
    const suggestions: PatternSuggestion[] = [];
    
    for (const pattern of this.patterns) {
      if (pattern.frequency >= 2 && !pattern.isAutomated) {
        const suggestion = await this.createPatternSuggestion(pattern);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    // Sort by estimated time savings
    return suggestions.sort((a, b) => b.estimatedTimeSavings - a.estimatedTimeSavings);
  }

  /**
   * Get comprehensive user behavior analysis
   */
  public async getUserBehavior(): Promise<UserBehavior> {
    const recentActions = this.userActions.filter(
      action => Date.now() - action.timestamp < 7 * 24 * 60 * 60 * 1000 // Last week
    );

    const productivityScore = this.calculateProductivityScore(recentActions);
    const automationOpportunities = await this.generateAutomationSuggestions();
    const sessionStats = this.calculateSessionStats(recentActions);

    return {
      patterns: this.patterns,
      productivityScore,
      automationOpportunities,
      recentActions: recentActions.slice(-50), // Last 50 actions
      sessionStats
    };
  }

  /**
   * Extract action sequences from user actions
   */
  private extractActionSequences(actions: UserAction[]): Array<{ sequence: string[]; context: string; timestamp: number }> {
    const sequences: Array<{ sequence: string[]; context: string; timestamp: number }> = [];
    
    // Look for sequences of 2-5 actions within a time window
    const timeWindow = 30 * 60 * 1000; // 30 minutes
    
    for (let i = 0; i < actions.length - 1; i++) {
      const sequence: string[] = [actions[i].command];
      const context = this.getContextString(actions[i].context);
      const startTime = actions[i].timestamp;
      
      for (let j = i + 1; j < actions.length; j++) {
        if (actions[j].timestamp - startTime <= timeWindow) {
          sequence.push(actions[j].command);
        } else {
          break;
        }
      }
      
      if (sequence.length >= 2) {
        sequences.push({
          sequence,
          context,
          timestamp: startTime
        });
      }
    }
    
    return sequences;
  }

  /**
   * Find repeated patterns in sequences
   */
  private findRepeatedPatterns(sequences: Array<{ sequence: string[]; context: string; timestamp: number }>): Array<{ pattern: string[]; frequency: number; contexts: string[] }> {
    const patternMap = new Map<string, { pattern: string[]; frequency: number; contexts: string[] }>();
    
    for (const { sequence, context } of sequences) {
      const patternKey = sequence.join('|');
      const existing = patternMap.get(patternKey);
      
      if (existing) {
        existing.frequency++;
        if (!existing.contexts.includes(context)) {
          existing.contexts.push(context);
        }
      } else {
        patternMap.set(patternKey, {
          pattern: sequence,
          frequency: 1,
          contexts: [context]
        });
      }
    }
    
    return Array.from(patternMap.values())
      .filter(p => p.frequency >= 2)
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Analyze patterns with AI to understand intent and suggest automations
   */
  private async analyzePatternsWithAI(repeatedPatterns: Array<{ pattern: string[]; frequency: number; contexts: string[] }>): Promise<BehaviorPattern[]> {
    const analyzedPatterns: BehaviorPattern[] = [];
    
    for (const { pattern, frequency, contexts } of repeatedPatterns) {
      try {
        const analysis = await this.enhancedAI.analyzeIntent(pattern.join(' '));
        
        const behaviorPattern: BehaviorPattern = {
          id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: this.generatePatternName(pattern, analysis.intent),
          description: this.generatePatternDescription(pattern, analysis.intent),
          actions: pattern,
          frequency,
          confidence: this.calculatePatternConfidence(frequency, contexts.length),
          context: contexts,
          triggers: this.extractTriggers(pattern, contexts),
          lastSeen: Date.now(),
          firstSeen: Date.now() - (frequency * 24 * 60 * 60 * 1000), // Estimate
          isAutomated: false
        };
        
        analyzedPatterns.push(behaviorPattern);
      } catch (error) {
        console.error('Error analyzing pattern with AI:', error);
      }
    }
    
    return analyzedPatterns;
  }

  /**
   * Create automation suggestion for a pattern
   */
  private async createPatternSuggestion(pattern: BehaviorPattern): Promise<PatternSuggestion | null> {
    try {
      const analysis = await this.enhancedAI.analyzeIntent(pattern.actions.join(' '));
      
      const estimatedTimeSavings = this.estimateTimeSavings(pattern);
      const automationType = this.determineAutomationType(pattern);
      
      const suggestion: PatternSuggestion = {
        pattern,
        suggestion: `Automate "${pattern.name}" workflow to save ${Math.round(estimatedTimeSavings)} seconds per use`,
        confidence: pattern.confidence,
        estimatedTimeSavings,
        automationType
      };
      
      return suggestion;
    } catch (error) {
      console.error('Error creating pattern suggestion:', error);
      return null;
    }
  }

  /**
   * Update existing patterns with new data
   */
  private updatePatterns(newPatterns: BehaviorPattern[]): void {
    for (const newPattern of newPatterns) {
      const existingPattern = this.patterns.find(p => 
        p.actions.join('|') === newPattern.actions.join('|')
      );
      
      if (existingPattern) {
        // Update existing pattern
        existingPattern.frequency += newPattern.frequency;
        existingPattern.lastSeen = Math.max(existingPattern.lastSeen, newPattern.lastSeen);
        existingPattern.confidence = Math.max(existingPattern.confidence, newPattern.confidence);
        
        // Merge contexts
        for (const context of newPattern.context) {
          if (!existingPattern.context.includes(context)) {
            existingPattern.context.push(context);
          }
        }
      } else {
        // Add new pattern
        this.patterns.push(newPattern);
      }
    }
  }

  /**
   * Calculate productivity score based on user actions
   */
  private calculateProductivityScore(actions: UserAction[]): number {
    if (actions.length === 0) return 0;
    
    const successfulActions = actions.filter(a => a.success).length;
    const averageDuration = actions.reduce((sum, a) => sum + a.duration, 0) / actions.length;
    const uniqueCommands = new Set(actions.map(a => a.command)).size;
    
    // Score based on success rate, speed, and command variety
    const successScore = successfulActions / actions.length;
    const speedScore = Math.max(0, 1 - (averageDuration / 10000)); // Normalize to 10 seconds
    const varietyScore = Math.min(1, uniqueCommands / 10); // Normalize to 10 unique commands
    
    return (successScore * 0.5) + (speedScore * 0.3) + (varietyScore * 0.2);
  }

  /**
   * Calculate session statistics
   */
  private calculateSessionStats(actions: UserAction[]): UserBehavior['sessionStats'] {
    const totalActions = actions.length;
    const successfulActions = actions.filter(a => a.success).length;
    const averageActionTime = actions.reduce((sum, a) => sum + a.duration, 0) / totalActions || 0;
    
    // Count most used commands
    const commandCounts = new Map<string, number>();
    for (const action of actions) {
      commandCounts.set(action.command, (commandCounts.get(action.command) || 0) + 1);
    }
    
    const mostUsedCommands = Array.from(commandCounts.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      totalActions,
      successfulActions,
      averageActionTime,
      mostUsedCommands
    };
  }

  /**
   * Generate pattern name
   */
  private generatePatternName(actions: string[], intent: string): string {
    const actionNames = actions.map(action => {
      const parts = action.split(' ');
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    });
    
    return `${actionNames.slice(0, 2).join(' → ')}${actions.length > 2 ? '...' : ''}`;
  }

  /**
   * Generate pattern description
   */
  private generatePatternDescription(actions: string[], intent: string): string {
    return `Automated workflow for ${intent} tasks involving ${actions.length} steps`;
  }

  /**
   * Calculate pattern confidence
   */
  private calculatePatternConfidence(frequency: number, contextVariety: number): number {
    const frequencyScore = Math.min(frequency / 5, 1); // Normalize to 5 occurrences
    const contextScore = Math.min(contextVariety / 3, 1); // Normalize to 3 contexts
    
    return (frequencyScore * 0.7) + (contextScore * 0.3);
  }

  /**
   * Extract triggers from pattern and context
   */
  private extractTriggers(actions: string[], contexts: string[]): string[] {
    const triggers: string[] = [];
    
    // Add first action as trigger
    if (actions.length > 0) {
      triggers.push(actions[0]);
    }
    
    // Add context-based triggers
    for (const context of contexts) {
      if (context.includes('meeting') || context.includes('zoom')) {
        triggers.push('after meeting');
      }
      if (context.includes('email') || context.includes('gmail')) {
        triggers.push('email received');
      }
      if (context.includes('document') || context.includes('word')) {
        triggers.push('document opened');
      }
    }
    
    return [...new Set(triggers)]; // Remove duplicates
  }

  /**
   * Estimate time savings from automation
   */
  private estimateTimeSavings(pattern: BehaviorPattern): number {
    // Estimate based on pattern length and frequency
    const baseTimePerAction = 2000; // 2 seconds per action
    const totalTime = pattern.actions.length * baseTimePerAction;
    const automationTime = 500; // 0.5 seconds for automated workflow
    
    return (totalTime - automationTime) * pattern.frequency;
  }

  /**
   * Determine automation type
   */
  private determineAutomationType(pattern: BehaviorPattern): 'workflow' | 'shortcut' | 'reminder' {
    if (pattern.actions.length > 3) return 'workflow';
    if (pattern.actions.length > 1) return 'shortcut';
    return 'reminder';
  }

  /**
   * Get context string for pattern matching
   */
  private getContextString(context: DeloContext): string {
    return `${context.activeApp} ${context.windowTitle} ${context.clipboardContent.substring(0, 100)}`;
  }

  /**
   * Start periodic pattern detection
   */
  private startPeriodicDetection(): void {
    setInterval(async () => {
      if (this.isInitialized) {
        await this.detectPatterns();
      }
    }, this.patternDetectionInterval);
  }

  /**
   * Save user action to database
   */
  private async saveUserAction(action: UserAction): Promise<void> {
    try {
      await this.databaseManager.executeQuery(
        'save_user_action',
        'INSERT INTO user_actions (id, command, context, timestamp, success, duration) VALUES (?, ?, ?, ?, ?, ?)',
        [action.id, action.command, JSON.stringify(action.context), action.timestamp, action.success, action.duration]
      );
    } catch (error) {
      console.error('Error saving user action:', error);
    }
  }

  /**
   * Save patterns to database
   */
  private async savePatterns(): Promise<void> {
    try {
      await this.databaseManager.executeQuery(
        'delete_patterns',
        'DELETE FROM behavior_patterns'
      );
      
      for (const pattern of this.patterns) {
        await this.databaseManager.executeQuery(
          'insert_pattern',
          'INSERT INTO behavior_patterns (id, name, description, actions, frequency, confidence, context, triggers, last_seen, first_seen, is_automated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            pattern.id,
            pattern.name,
            pattern.description,
            JSON.stringify(pattern.actions),
            pattern.frequency,
            pattern.confidence,
            JSON.stringify(pattern.context),
            JSON.stringify(pattern.triggers),
            pattern.lastSeen,
            pattern.firstSeen,
            pattern.isAutomated
          ]
        );
      }
    } catch (error) {
      console.error('Error saving patterns:', error);
    }
  }

  /**
   * Load user data from database
   */
  private async loadUserData(): Promise<void> {
    try {
      // Load user actions
      const actions = await this.databaseManager.executeQuery(
        'load_user_actions',
        'SELECT * FROM user_actions ORDER BY timestamp DESC LIMIT ?',
        [this.maxActions]
      );
      
      this.userActions = actions.map((row: any) => ({
        id: row.id,
        command: row.command,
        context: JSON.parse(row.context),
        timestamp: row.timestamp,
        success: row.success,
        duration: row.duration
      }));
      
      // Load patterns
      const patterns = await this.databaseManager.executeQuery(
        'load_patterns',
        'SELECT * FROM behavior_patterns'
      );
      
      this.patterns = patterns.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        actions: JSON.parse(row.actions),
        frequency: row.frequency,
        confidence: row.confidence,
        context: JSON.parse(row.context),
        triggers: JSON.parse(row.triggers),
        lastSeen: row.last_seen,
        firstSeen: row.first_seen,
        isAutomated: row.is_automated
      }));
      
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }
} 