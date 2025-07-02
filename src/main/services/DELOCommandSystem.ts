import { clipboard } from 'electron';
import { shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { DatabaseManager } from './DatabaseManager';
import { SessionMemoryManager } from './SessionMemoryManager';
import { LocalLLMService } from './LocalLLMService';
import { ScreenOCRService } from './ScreenOCRService';
import { ActiveWindowService } from './ActiveWindowService';
import { EmailService } from './EmailService';
import { AppLaunchService } from './AppLaunchService';
import natural from 'natural';
import { EnhancedAIPromptingService } from './EnhancedAIPromptingService';
import { WorkflowManager } from './WorkflowManager';
import { VoiceControlService } from './VoiceControlService';
import { PatternDetectionService } from './PatternDetectionService';
import { RealTimeAudioService } from './RealTimeAudioService';
import { RealTimeVisualService } from './RealTimeVisualService';
import { SensoryIntelligenceService } from './SensoryIntelligenceService';
import { agenticCommandProcessor } from './AgenticCommandProcessor';

const execAsync = promisify(exec);

// Core DELO Command Interface
export interface DeloCommand {
  name: string;
  description: string;
  match(input: string, context: DeloContext): boolean;
  execute(context: DeloContext, args?: any): Promise<DeloCommandResult>;
  getSuggestions?(context: DeloContext): string[];
}

// DELO Context Interface
export interface DeloContext {
  clipboardContent: string;
  activeApp: string;
  windowTitle: string;
  screenText?: string;
  recentCommands: string[];
  sessionDuration: number;
  userIntent?: string;
  extractedArgs?: any;
}

// Command Result Interface
export interface DeloCommandResult {
  success: boolean;
  message: string;
  action: string;
  data?: any;
  nextAction?: string;
  requiresConfirmation?: boolean;
}

// Session Memory Interface
export interface DeloSessionMemory {
  lastActions: Array<{
    command: string;
    timestamp: number;
    context: DeloContext;
    result: DeloCommandResult;
  }>;
  patterns: Array<{
    pattern: string;
    frequency: number;
    lastUsed: number;
  }>;
  contentHashes: Set<string>;
}

export class DELOCommandSystem extends EventEmitter {
  private commands: Map<string, DeloCommand> = new Map();
  private sessionMemory: DeloSessionMemory;
  private databaseManager: DatabaseManager;
  private sessionMemoryManager: SessionMemoryManager | null;
  private localLLM: LocalLLMService | null;
  private screenOCR: ScreenOCRService | null;
  private activeWindow: ActiveWindowService | null;
  private emailService: EmailService | null;
  private appLaunch: AppLaunchService | null;
  private isInitialized = false;
  private debug = process.env.DEBUG_MODE === 'true';
  private spellcheck: natural.Spellcheck;
  private enhancedAI: EnhancedAIPromptingService | null;
  private commandSynonyms: Record<string, string[]> = {
    summarize: ['summarize', 'summary', 'brief', 'sumarize', 'sumry'],
    translate: ['translate', 'translation', 'language', 'translat'],
    email: ['email', 'mail', 'send', 'compose', 'message', 'emal'],
    task: ['task', 'todo', 'reminder', 'tsk'],
    search: ['search', 'find', 'lookup', 'srch'],
    open: ['open', 'launch', 'start', 'opne'],
    screenshot: ['screenshot', 'capture', 'screen', 'screnshot'],
    clipboard: ['clipboard', 'copy', 'paste', 'clipbord'],
    system: ['system', 'control', 'settings', 'sys']
  };
  private confidenceThreshold = 0.7;
  private workflowManager: WorkflowManager | null;
  private voiceControl: VoiceControlService | null;
  private patternDetection: PatternDetectionService | null;
  private audioService: RealTimeAudioService | null;
  private visualService: RealTimeVisualService | null;
  private sensoryIntelligence: SensoryIntelligenceService | null;

  constructor() {
    super();
    this.databaseManager = DatabaseManager.getInstance();
    
    // Initialize session memory
    this.sessionMemory = {
      lastActions: [],
      patterns: [],
      contentHashes: new Set()
    };
    
    // Build spellcheck dictionary from all command keywords and synonyms
    const dict = Object.values(this.commandSynonyms).flat();
    this.spellcheck = new natural.Spellcheck(dict);
    
    // Lazy initialization - services will be created only when needed
    this.sessionMemoryManager = null;
    this.localLLM = null;
    this.screenOCR = null;
    this.activeWindow = null;
    this.emailService = null;
    this.appLaunch = null;
    this.enhancedAI = null;
    this.workflowManager = null;
    this.voiceControl = null;
    this.patternDetection = null;
    this.audioService = null;
    this.visualService = null;
    this.sensoryIntelligence = null;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🧠 Initializing DELO Command System...');
      
      // Initialize core services using lazy initialization
      await Promise.all([
        this.databaseManager.initialize(),
        this.ensureSessionMemoryManagerInitialized(),
        this.ensureLocalLLMInitialized(),
        this.ensureWorkflowManagerInitialized(),
        this.ensureVoiceControlInitialized(),
        this.ensurePatternDetectionInitialized(),
        this.ensureSensoryIntelligenceInitialized()
      ]);

      // Start services that don't have initialize methods
      await this.ensureScreenOCRInitialized();
      await this.ensureActiveWindowInitialized();

      // Register all commands
      this.registerCommands();
      
      this.isInitialized = true;
      console.log('✅ DELO Command System initialized');
    } catch (error) {
      console.error('❌ Error initializing DELO Command System:', error);
      throw error;
    }
  }

  // Lazy initialization methods
  private async ensureSessionMemoryManagerInitialized(): Promise<void> {
    if (!this.sessionMemoryManager) {
      console.log('🧠 Initializing SessionMemoryManager...');
      this.sessionMemoryManager = new SessionMemoryManager();
      await this.sessionMemoryManager.initialize();
    }
  }

  private async ensureLocalLLMInitialized(): Promise<void> {
    if (!this.localLLM) {
      console.log('🤖 Initializing LocalLLMService...');
      this.localLLM = new LocalLLMService();
      await this.localLLM.initialize();
    }
  }

  private async ensureScreenOCRInitialized(): Promise<void> {
    if (!this.screenOCR) {
      console.log('👁️ Initializing ScreenOCRService...');
      this.screenOCR = new ScreenOCRService();
      this.screenOCR.start();
    }
  }

  private async ensureActiveWindowInitialized(): Promise<void> {
    if (!this.activeWindow) {
      console.log('🪟 Initializing ActiveWindowService...');
      this.activeWindow = new ActiveWindowService();
      this.activeWindow.startPolling();
    }
  }

  private async ensureEmailServiceInitialized(): Promise<void> {
    if (!this.emailService) {
      console.log('📧 Initializing EmailService...');
      this.emailService = new EmailService();
    }
  }

  private async ensureAppLaunchInitialized(): Promise<void> {
    if (!this.appLaunch) {
      console.log('🚀 Initializing AppLaunchService...');
      this.appLaunch = new AppLaunchService();
    }
  }

  private async ensureEnhancedAIInitialized(): Promise<void> {
    if (!this.enhancedAI) {
      console.log('🧠 Initializing EnhancedAIPromptingService...');
      this.enhancedAI = new EnhancedAIPromptingService();
    }
  }

  private async ensureWorkflowManagerInitialized(): Promise<void> {
    if (!this.workflowManager) {
      console.log('⚙️ Initializing WorkflowManager...');
      this.workflowManager = new WorkflowManager(this);
      await this.workflowManager.initialize();
    }
  }

  private async ensureVoiceControlInitialized(): Promise<void> {
    if (!this.voiceControl) {
      console.log('🎤 Initializing VoiceControlService...');
      await this.ensureWorkflowManagerInitialized();
      this.voiceControl = new VoiceControlService(this, this.workflowManager!);
      await this.voiceControl.initialize();
    }
  }

  private async ensurePatternDetectionInitialized(): Promise<void> {
    if (!this.patternDetection) {
      console.log('🔍 Initializing PatternDetectionService...');
      await this.ensureWorkflowManagerInitialized();
      this.patternDetection = new PatternDetectionService(this, this.workflowManager!);
      await this.patternDetection.initialize();
    }
  }

  private async ensureAudioServiceInitialized(): Promise<void> {
    if (!this.audioService) {
      console.log('🎵 Initializing RealTimeAudioService...');
      this.audioService = new RealTimeAudioService(this);
    }
  }

  private async ensureVisualServiceInitialized(): Promise<void> {
    if (!this.visualService) {
      console.log('👁️ Initializing RealTimeVisualService...');
      this.visualService = new RealTimeVisualService(this);
    }
  }

  private async ensureSensoryIntelligenceInitialized(): Promise<void> {
    if (!this.sensoryIntelligence) {
      console.log('🧠 Initializing SensoryIntelligenceService...');
      await this.ensureAudioServiceInitialized();
      await this.ensureVisualServiceInitialized();
      this.sensoryIntelligence = new SensoryIntelligenceService(this, this.audioService!, this.visualService!);
      await this.sensoryIntelligence.initialize();
    }
  }

  private registerCommands(): void {
    // Core automation commands
    this.registerCommand(new SummarizeCommand());
    this.registerCommand(new TranslateCommand());
    this.registerCommand(new EmailCommand());
    this.registerCommand(new TaskCommand());
    this.registerCommand(new SearchCommand());
    this.registerCommand(new OpenAppCommand());
    this.registerCommand(new ScreenshotCommand());
    this.registerCommand(new ClipboardCommand());
    this.registerCommand(new SystemCommand());
    
    console.log(`📝 Registered ${this.commands.size} DELO commands`);
  }

  private registerCommand(command: DeloCommand): void {
    this.commands.set(command.name, command);
  }

  /**
   * Refactored: Always use AgenticCommandProcessor for all commands.
   * This is now a thin wrapper for agenticCommandProcessor.
   */
  public async processCommand(input: string): Promise<DeloCommandResult> {
    // Forward the input to the agentic processor
    const result = await agenticCommandProcessor.processCommand(input);

    // Optionally update session memory (if needed for analytics/habits)
    this.updateSessionMemory(input, {
      clipboardContent: '',
      activeApp: '',
      windowTitle: '',
      recentCommands: [],
      sessionDuration: 0
    }, result as any);

    // Adapt result to DeloCommandResult interface if needed
    return {
      success: result.success,
      message: result.message,
      action: result.success ? 'executed' : 'error',
      data: result.data,
      nextAction: result.fallback || undefined,
      requiresConfirmation: false
    };
  }

  private autoCorrectInput(input: string): string {
    // Tokenize and correct each word if needed
    return input.split(' ').map(word => {
      if (this.spellcheck.isCorrect(word)) return word;
      const [correction] = this.spellcheck.getCorrections(word, 1);
      return correction || word;
    }).join(' ');
  }

  private fuzzyFindMatchingCommand(intent: string, input: string, context: DeloContext): { command: DeloCommand | null, confidence: number, suggestion: string } {
    let bestMatch: DeloCommand | null = null;
    let bestScore = 0;
    let bestSuggestion = '';
    for (const command of this.commands.values()) {
      // Fuzzy match against command name and synonyms
      const synonyms = this.commandSynonyms[command.name] || [command.name];
      for (const syn of synonyms) {
        const levDist = natural.LevenshteinDistance(input.toLowerCase(), syn.toLowerCase());
        const maxLen = Math.max(input.length, syn.length);
        const similarity = 1 - levDist / maxLen;
        if (similarity > bestScore) {
          bestScore = similarity;
          bestMatch = command;
          bestSuggestion = syn;
        }
        // Also check if the command's match() returns true
        if (command.match(input, context)) {
          bestScore = Math.max(bestScore, 0.95);
          bestMatch = command;
          bestSuggestion = syn;
        }
      }
    }
    return { command: bestMatch, confidence: bestScore, suggestion: bestSuggestion };
  }

  private getClosestCommandSuggestions(input: string): string[] {
    // Suggest the top 3 closest commands by Levenshtein distance
    const suggestions: { name: string, score: number }[] = [];
    for (const command of this.commands.values()) {
      const synonyms = this.commandSynonyms[command.name] || [command.name];
      let best = 0;
      for (const syn of synonyms) {
        const levDist = natural.LevenshteinDistance(input.toLowerCase(), syn.toLowerCase());
        const maxLen = Math.max(input.length, syn.length);
        const similarity = 1 - levDist / maxLen;
        if (similarity > best) best = similarity;
      }
      suggestions.push({ name: command.name, score: best });
    }
    return suggestions.sort((a, b) => b.score - a.score).slice(0, 3).map(s => s.name);
  }

  private async llmFallback(input: string): Promise<string | null> {
    try {
      await this.ensureLocalLLMInitialized();
      if (!this.localLLM) return null;
      
      const prompt = `Given this user input: "${input}", suggest a corrected or alternative command. Return only the corrected command, nothing else.`;
      const commandIntent = await this.localLLM.processCommand(prompt);
      return typeof commandIntent === 'string' ? commandIntent : null;
    } catch (error) {
      console.error('LLM fallback error:', error);
      return null;
    }
  }

  private async getCurrentContext(): Promise<DeloContext> {
    await this.ensureActiveWindowInitialized();
    
    const activeApp = this.activeWindow ? await this.activeWindow.getActiveWindow() : { name: 'Unknown', title: 'Unknown', process: 'Unknown' };
    const appName = (activeApp as any).name || (activeApp as any).process || 'Unknown';
    const clipboardContent = await this.getClipboardContent();
    
    return {
      clipboardContent,
      activeApp: appName,
      windowTitle: activeApp.title,
      recentCommands: this.sessionMemory.lastActions.slice(-5).map(a => a.command),
      sessionDuration: Date.now() - (this.sessionMemory.lastActions[0]?.timestamp || Date.now())
    };
  }

  private async getClipboardContent(): Promise<string> {
    try {
      return await clipboard.readText() || '';
    } catch (error) {
      console.error('Error reading clipboard:', error);
      return '';
    }
  }

  private async parseIntent(input: string, context: DeloContext): Promise<{ intent: string; args: any }> {
    await this.ensureLocalLLMInitialized();
    
    if (!this.localLLM) {
      // Fallback to simple keyword matching if LLM is not available
      const lowerInput = input.toLowerCase();
      if (lowerInput.includes('summarize')) return { intent: 'summarize', args: {} };
      if (lowerInput.includes('translate')) return { intent: 'translate', args: {} };
      if (lowerInput.includes('email')) return { intent: 'email', args: {} };
      if (lowerInput.includes('task')) return { intent: 'task', args: {} };
      if (lowerInput.includes('search')) return { intent: 'search', args: {} };
      if (lowerInput.includes('open')) return { intent: 'open', args: {} };
      if (lowerInput.includes('screenshot')) return { intent: 'screenshot', args: {} };
      if (lowerInput.includes('clipboard')) return { intent: 'clipboard', args: {} };
      if (lowerInput.includes('system')) return { intent: 'system', args: {} };
      
      return { intent: 'unknown', args: {} };
    }

    try {
      const commandIntent = await this.localLLM.processCommand(input, context);
      return {
        intent: commandIntent.intent || 'unknown',
        args: commandIntent.parameters || {}
      };
    } catch (error) {
      // Fallback to simple keyword matching
      const lowerInput = input.toLowerCase();
      if (lowerInput.includes('summarize')) return { intent: 'summarize', args: {} };
      if (lowerInput.includes('translate')) return { intent: 'translate', args: {} };
      if (lowerInput.includes('email')) return { intent: 'email', args: {} };
      if (lowerInput.includes('task')) return { intent: 'task', args: {} };
      if (lowerInput.includes('search')) return { intent: 'search', args: {} };
      if (lowerInput.includes('open')) return { intent: 'open', args: {} };
      if (lowerInput.includes('screenshot')) return { intent: 'screenshot', args: {} };
      if (lowerInput.includes('clipboard')) return { intent: 'clipboard', args: {} };
      if (lowerInput.includes('system')) return { intent: 'system', args: {} };
      
      return { intent: 'unknown', args: {} };
    }
  }

  private findMatchingCommand(intent: string, context: DeloContext): DeloCommand | null {
    for (const command of this.commands.values()) {
      if (command.match(intent, context)) {
        return command;
      }
    }
    return null;
  }

  private async checkForDuplicates(input: string, context: DeloContext): Promise<{ isDuplicate: boolean; suggestion: string }> {
    await this.ensureSessionMemoryManagerInitialized();
    
    if (!this.sessionMemoryManager) {
      return { isDuplicate: false, suggestion: '' };
    }

    const recentActions = this.sessionMemory.lastActions.slice(-3);
    const contentHash = this.generateContentHash(input + context.clipboardContent);
    
    for (const action of recentActions) {
      const actionHash = this.generateContentHash(action.command + action.context.clipboardContent);
      if (contentHash === actionHash) {
        return { 
          isDuplicate: true, 
          suggestion: 'This action was performed recently. Are you sure you want to repeat it?' 
        };
      }
    }
    
    return { isDuplicate: false, suggestion: '' };
  }

  private generateContentHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  private updateSessionMemory(input: string, context: DeloContext, result: DeloCommandResult): void {
    const action = {
      command: input,
      timestamp: Date.now(),
      context,
      result
    };

    this.sessionMemory.lastActions.push(action);
    if (this.sessionMemory.lastActions.length > 20) {
      this.sessionMemory.lastActions.shift();
    }

    // Update content hashes
    const contentHash = this.generateContentHash(context.clipboardContent + context.screenText);
    this.sessionMemory.contentHashes.add(contentHash);
    if (this.sessionMemory.contentHashes.size > 100) {
      this.sessionMemory.contentHashes.clear();
    }

    // Update patterns
    this.updatePatterns(input);
  }

  private updatePatterns(input: string): void {
    const words = input.toLowerCase().split(' ');
    const pattern = words.slice(0, 3).join(' '); // First 3 words as pattern
    
    const existingPattern = this.sessionMemory.patterns.find(p => p.pattern === pattern);
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastUsed = Date.now();
    } else {
      this.sessionMemory.patterns.push({
        pattern,
        frequency: 1,
        lastUsed: Date.now()
      });
    }
  }

  private generateNextActionSuggestion(context: DeloContext, result: DeloCommandResult): string | null {
    // Analyze patterns and suggest next action
    const recentPatterns = this.sessionMemory.patterns
      .filter(p => p.frequency > 1 && Date.now() - p.lastUsed < 3600000) // Last hour
      .sort((a, b) => b.frequency - a.frequency);

    if (recentPatterns.length > 0) {
      const topPattern = recentPatterns[0];
      if (topPattern.frequency >= 2) {
        return `Based on your pattern, you might want to: ${topPattern.pattern}...`;
      }
    }

    // Context-based suggestions
    if (context.clipboardContent && context.clipboardContent.length > 100) {
      return 'You have text in your clipboard. Try "summarize this" or "translate this"';
    }

    if (context.activeApp.toLowerCase().includes('zoom') || context.activeApp.toLowerCase().includes('meet')) {
      return 'Meeting detected. Try "summarize this and email to team"';
    }

    return null;
  }

  public getSuggestions(context: DeloContext): string[] {
    const suggestions: string[] = [];
    
    for (const command of this.commands.values()) {
      if (command.getSuggestions) {
        suggestions.push(...command.getSuggestions(context));
      }
    }

    return suggestions.slice(0, 10);
  }

  public getSessionInsights(): {
    recentTasks: any[];
    userHabits: any[];
    productivityScore: number;
    suggestions: string[];
  } {
    const recentTasks = this.sessionMemory.lastActions.slice(-10);
    const userHabits = this.sessionMemory.patterns
      .filter(p => p.frequency > 1)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    const productivityScore = this.calculateProductivityScore();
    const suggestions = this.generateInsightSuggestions();

    return {
      recentTasks,
      userHabits,
      productivityScore,
      suggestions
    };
  }

  private calculateProductivityScore(): number {
    const recentActions = this.sessionMemory.lastActions.slice(-20);
    const successfulActions = recentActions.filter(a => a.result.success).length;
    return Math.round((successfulActions / recentActions.length) * 100) || 0;
  }

  private generateInsightSuggestions(): string[] {
    const suggestions: string[] = [];
    
    // Pattern-based suggestions
    const frequentPatterns = this.sessionMemory.patterns.filter(p => p.frequency >= 3);
    if (frequentPatterns.length > 0) {
      suggestions.push(`You frequently ${frequentPatterns[0].pattern}... Consider creating a shortcut.`);
    }

    // Productivity suggestions
    const productivityScore = this.calculateProductivityScore();
    if (productivityScore < 70) {
      suggestions.push('Try being more specific in your commands for better results.');
    }

    return suggestions;
  }

  /**
   * Try to execute a workflow based on the input
   */
  private async tryWorkflowExecution(input: string, context: DeloContext): Promise<DeloCommandResult | null> {
    await this.ensureWorkflowManagerInitialized();
    
    if (!this.workflowManager) return null;

    try {
      const workflows = this.workflowManager.getWorkflows();
      for (const workflow of workflows) {
        if (workflow.trigger && input.toLowerCase().includes(workflow.trigger.toLowerCase())) {
          console.log(`🔄 Executing workflow: ${workflow.name}`);
          const result = await this.workflowManager.executeWorkflow(workflow.trigger, context);
          return {
            success: true,
            message: `Executed workflow: ${workflow.name}`,
            action: 'workflow_executed',
            data: result
          };
        }
      }
    } catch (error) {
      console.error('Workflow execution error:', error);
    }
    
    return null;
  }

  /**
   * Start voice control
   */
  public async startVoiceControl(): Promise<void> {
    if (this.voiceControl) {
      try {
        await this.voiceControl.startListening();
      } catch (error) {
        console.error('Error starting voice control:', error);
        throw error;
      }
    } else {
      throw new Error('VoiceControlService not initialized');
    }
  }

  /**
   * Stop voice control
   */
  public async stopVoiceControl(): Promise<void> {
    if (this.voiceControl) {
      try {
        await this.voiceControl.stopListening();
      } catch (error) {
        console.error('Error stopping voice control:', error);
        throw error;
      }
    } else {
      throw new Error('VoiceControlService not initialized');
    }
  }

  /**
   * Get workflow suggestions based on detected patterns
   */
  public async getWorkflowSuggestions(): Promise<any[]> {
    if (this.workflowManager) {
      // Example: Suggest workflows based on patterns
      const patterns = this.workflowManager.getPatterns();
      const workflows = this.workflowManager.getWorkflows();
      // Return workflows that match detected patterns or just return all workflows
      return workflows;
    }
    return [];
  }

  /**
   * Get user behavior analysis
   */
  public async getUserBehavior(): Promise<any> {
    if (this.patternDetection) {
      return this.patternDetection.getUserBehavior();
    }
    return {};
  }

  /**
   * Create a new workflow
   */
  public async createWorkflow(workflowData: any): Promise<string> {
    try {
      await this.ensureWorkflowManagerInitialized();
      if (!this.workflowManager) {
        throw new Error('WorkflowManager not available');
      }
      return this.workflowManager.addWorkflow(workflowData);
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Get all available workflows
   */
  public getWorkflows(): any[] {
    if (this.workflowManager) {
      return this.workflowManager.getWorkflows();
    }
    return [];
  }

  /**
   * Get voice control state
   */
  public getVoiceState(): any {
    if (this.voiceControl) {
      return this.voiceControl.getState();
    }
    return null;
  }

  /**
   * Get voice configuration
   */
  public getVoiceConfig(): any {
    if (this.voiceControl) {
      return this.voiceControl.getConfig();
    }
    return null;
  }

  /**
   * Update voice configuration
   */
  public updateVoiceConfig(config: any): void {
    if (this.voiceControl) {
      this.voiceControl.updateConfig(config);
    }
  }

  /**
   * Start sensory intelligence monitoring
   */
  public async startSensoryMonitoring(): Promise<void> {
    try {
      await this.ensureSensoryIntelligenceInitialized();
      if (!this.sensoryIntelligence) {
        throw new Error('SensoryIntelligenceService not available');
      }
      await this.sensoryIntelligence.startMonitoring();
    } catch (error) {
      console.error('Error starting sensory monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop sensory intelligence monitoring
   */
  public async stopSensoryMonitoring(): Promise<void> {
    try {
      if (!this.sensoryIntelligence) {
        return; // Already stopped or not initialized
      }
      await this.sensoryIntelligence.stopMonitoring();
    } catch (error) {
      console.error('Error stopping sensory monitoring:', error);
      throw error;
    }
  }

  /**
   * Get current sensory context
   */
  public async getCurrentSensoryContext(): Promise<any> {
    try {
      if (!this.sensoryIntelligence) {
        return null;
      }
      return await this.sensoryIntelligence.getCurrentSensoryContext();
    } catch (error) {
      console.error('Error getting sensory context:', error);
      return null;
    }
  }

  /**
   * Get recent sensory contexts
   */
  public getRecentSensoryContexts(count: number = 10): any[] {
    try {
      if (!this.sensoryIntelligence) {
        return [];
      }
      return this.sensoryIntelligence.getRecentSensoryContexts(count);
    } catch (error) {
      console.error('Error getting recent sensory contexts:', error);
      return [];
    }
  }

  /**
   * Get active suggestions from sensory intelligence
   */
  public getActiveSuggestions(): any[] {
    try {
      if (!this.sensoryIntelligence) {
        return [];
      }
      return this.sensoryIntelligence.getActiveSuggestions();
    } catch (error) {
      console.error('Error getting active suggestions:', error);
      return [];
    }
  }

  /**
   * Get detected patterns from sensory intelligence
   */
  public getDetectedPatterns(): any[] {
    try {
      if (!this.sensoryIntelligence) {
        return [];
      }
      return this.sensoryIntelligence.getDetectedPatterns();
    } catch (error) {
      console.error('Error getting detected patterns:', error);
      return [];
    }
  }

  /**
   * Process audio context for intelligence
   */
  public async processAudioContext(audioContext: any): Promise<void> {
    try {
      // Analyze audio context for potential actions
      const keywords = this.extractKeywordsFromAudio(audioContext.transcript);
      
      if (keywords.length > 0) {
        // Generate suggestions based on audio context
        const suggestions = this.generateAudioBasedSuggestions(audioContext, keywords);
        
        // Emit audio-based suggestions
        this.emit('audioSuggestions', suggestions);
      }
    } catch (error) {
      console.error('Error processing audio context:', error);
    }
  }

  /**
   * Process visual context for intelligence
   */
  public async processVisualContext(visualContext: any): Promise<void> {
    try {
      // Analyze visual context for potential actions
      const visualKeywords = this.extractKeywordsFromVisual(visualContext.ocrText);
      const appContext = this.analyzeAppContext(visualContext.activeWindow);
      
      if (visualKeywords.length > 0 || appContext) {
        // Generate suggestions based on visual context
        const suggestions = this.generateVisualBasedSuggestions(visualContext, visualKeywords, appContext);
        
        // Emit visual-based suggestions
        this.emit('visualSuggestions', suggestions);
      }
    } catch (error) {
      console.error('Error processing visual context:', error);
    }
  }

  /**
   * Extract keywords from audio transcript
   */
  private extractKeywordsFromAudio(transcript: string): string[] {
    const keywords = [
      'delo', 'assistant', 'help', 'automate', 'workflow',
      'meeting', 'email', 'summarize', 'schedule', 'reminder',
      'urgent', 'important', 'deadline', 'project', 'task'
    ];
    
    const lowerTranscript = transcript.toLowerCase();
    return keywords.filter(keyword => lowerTranscript.includes(keyword));
  }

  /**
   * Extract keywords from visual content
   */
  private extractKeywordsFromVisual(ocrText: string): string[] {
    const keywords = [
      'meeting', 'email', 'document', 'code', 'research',
      'urgent', 'important', 'deadline', 'project', 'task',
      'error', 'warning', 'alert', 'notification'
    ];
    
    const lowerText = ocrText.toLowerCase();
    return keywords.filter(keyword => lowerText.includes(keyword));
  }

  /**
   * Analyze app context
   */
  private analyzeAppContext(appName: string): string | null {
    const appContexts = {
      'zoom': 'meeting',
      'teams': 'meeting',
      'gmail': 'email',
      'outlook': 'email',
      'chrome': 'browsing',
      'vscode': 'coding',
      'terminal': 'development'
    };
    
    return appContexts[appName.toLowerCase()] || null;
  }

  /**
   * Generate audio-based suggestions
   */
  private generateAudioBasedSuggestions(audioContext: any, keywords: string[]): any[] {
    const suggestions: any[] = [];
    
    if (keywords.includes('meeting')) {
      suggestions.push({
        type: 'assistance',
        title: 'Meeting Assistant',
        description: 'I can help with meeting notes, follow-ups, or scheduling',
        action: 'meeting_assistance',
        confidence: 0.9
      });
    }
    
    if (keywords.includes('email')) {
      suggestions.push({
        type: 'automation',
        title: 'Email Automation',
        description: 'I can help compose, summarize, or organize emails',
        action: 'email_assistance',
        confidence: 0.8
      });
    }
    
    if (keywords.includes('urgent') || keywords.includes('important')) {
      suggestions.push({
        type: 'action',
        title: 'Priority Task',
        description: 'This sounds urgent. Would you like me to help prioritize?',
        action: 'priority_assistance',
        confidence: 0.9
      });
    }
    
    return suggestions;
  }

  /**
   * Generate visual-based suggestions
   */
  private generateVisualBasedSuggestions(visualContext: any, keywords: string[], appContext: string | null): any[] {
    const suggestions: any[] = [];
    
    if (appContext === 'meeting') {
      suggestions.push({
        type: 'assistance',
        title: 'Meeting Support',
        description: 'I can help with meeting notes, recordings, or follow-ups',
        action: 'meeting_support',
        confidence: 0.9
      });
    }
    
    if (appContext === 'email') {
      suggestions.push({
        type: 'automation',
        title: 'Email Management',
        description: 'I can help organize, compose, or prioritize emails',
        action: 'email_management',
        confidence: 0.8
      });
    }
    
    if (keywords.includes('error') || keywords.includes('warning')) {
      suggestions.push({
        type: 'action',
        title: 'Issue Detection',
        description: 'I detected an error or warning. Would you like help resolving it?',
        action: 'issue_resolution',
        confidence: 0.9
      });
    }
    
    return suggestions;
  }

  /**
   * Get sensory intelligence state
   */
  public getSensoryState(): any {
    if (this.sensoryIntelligence) {
      return this.sensoryIntelligence.getSensoryState();
    }
    return null;
  }

  /**
   * Get sensory intelligence configuration
   */
  public getSensoryConfig(): any {
    if (this.sensoryIntelligence) {
      return this.sensoryIntelligence.getSensoryConfig();
    }
    return null;
  }

  /**
   * Update sensory intelligence configuration
   */
  public updateSensoryConfig(config: any): void {
    if (this.sensoryIntelligence) {
      this.sensoryIntelligence.updateSensoryConfig(config);
    }
  }
}

// Command Implementations

class SummarizeCommand implements DeloCommand {
  name = 'summarize';
  description = 'Summarize clipboard content or screen text';

  match(input: string, context: DeloContext): boolean {
    const lowerInput = input.toLowerCase();
    return lowerInput.includes('summarize') || lowerInput.includes('summary');
  }

  async execute(context: DeloContext, args?: any): Promise<DeloCommandResult> {
    const content = context.clipboardContent || context.screenText || '';
    if (!content) {
      return {
        success: false,
        message: 'No content found to summarize. Copy some text or ensure screen text is visible.',
        action: 'no_content'
      };
    }

    try {
      const prompt = `Summarize the following content in 3-5 bullet points:

${content}

Provide a concise summary:`;

      const commandIntent = await new LocalLLMService().processCommand(prompt);
      const summary = commandIntent.action || 'Summary generated';
      
      // Copy summary to clipboard
      await clipboard.writeText(summary);

      return {
        success: true,
        message: 'Summary created and copied to clipboard.',
        action: 'summarized',
        data: { summary }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create summary.',
        action: 'error',
        data: { error: String(error) }
      };
    }
  }

  getSuggestions(context: DeloContext): string[] {
    if (context.clipboardContent || context.screenText) {
      return ['Summarize this', 'Create summary', 'Summarize and email'];
    }
    return [];
  }
}

class TranslateCommand implements DeloCommand {
  name = 'translate';
  description = 'Translate clipboard content or screen text';

  match(input: string, context: DeloContext): boolean {
    const lowerInput = input.toLowerCase();
    return lowerInput.includes('translate') || lowerInput.includes('translation');
  }

  async execute(context: DeloContext, args?: any): Promise<DeloCommandResult> {
    const content = context.clipboardContent || context.screenText || '';
    if (!content) {
      return {
        success: false,
        message: 'No content found to translate.',
        action: 'no_content'
      };
    }

    const targetLanguage = args?.language || 'Spanish';
    
    try {
      const prompt = `Translate the following text to ${targetLanguage}:

${content}

Translation:`;

      const commandIntent = await new LocalLLMService().processCommand(prompt);
      const translation = commandIntent.action || 'Translation generated';
      
      // Copy translation to clipboard
      await clipboard.writeText(translation);

      return {
        success: true,
        message: `Translated to ${targetLanguage} and copied to clipboard.`,
        action: 'translated',
        data: { translation, targetLanguage }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to translate content.',
        action: 'error',
        data: { error: String(error) }
      };
    }
  }

  getSuggestions(context: DeloContext): string[] {
    if (context.clipboardContent || context.screenText) {
      return ['Translate to Spanish', 'Translate to French', 'Translate to German'];
    }
    return [];
  }
}

class EmailCommand implements DeloCommand {
  name = 'email';
  description = 'Compose and send emails';

  match(input: string, context: DeloContext): boolean {
    const lowerInput = input.toLowerCase();
    return lowerInput.includes('email') || lowerInput.includes('mail') || lowerInput.includes('send');
  }

  async execute(context: DeloContext, args?: any): Promise<DeloCommandResult> {
    const content = context.clipboardContent || context.screenText || '';
    const recipient = args?.destination || '';
    
    try {
      const emailService = new EmailService();
      const emailDraft = await emailService.composeAndOpenEmail(content, { recipient });
      
      return {
        success: true,
        message: 'Email draft created and opened in your email client.',
        action: 'email_drafted',
        data: { emailDraft },
        requiresConfirmation: true
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create email draft.',
        action: 'error',
        data: { error: String(error) }
      };
    }
  }

  getSuggestions(context: DeloContext): string[] {
    if (context.clipboardContent || context.screenText) {
      return ['Send as email', 'Email this to team', 'Create email draft'];
    }
    return [];
  }
}

class TaskCommand implements DeloCommand {
  name = 'task';
  description = 'Create tasks from content';

  match(input: string, context: DeloContext): boolean {
    const lowerInput = input.toLowerCase();
    return lowerInput.includes('task') || lowerInput.includes('todo') || lowerInput.includes('reminder');
  }

  async execute(context: DeloContext, args?: any): Promise<DeloCommandResult> {
    const content = context.clipboardContent || context.screenText || '';
    if (!content) {
      return {
        success: false,
        message: 'No content found to create task from.',
        action: 'no_content'
      };
    }

    try {
      const prompt = `Create a task from this content:

${content}

Format as: [Priority] Task Description - Due Date`;

      const commandIntent = await new LocalLLMService().processCommand(prompt);
      const task = commandIntent.action || 'Task created';
      
      // Save task to file
      const taskFile = path.join(process.env.HOME || process.env.USERPROFILE || '', 'tasks.txt');
      fs.appendFileSync(taskFile, `\n${new Date().toISOString()}: ${task}`);
      
      // Copy task to clipboard
      await clipboard.writeText(task);

      return {
        success: true,
        message: 'Task created and saved. Also copied to clipboard.',
        action: 'task_created',
        data: { task }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create task.',
        action: 'error',
        data: { error: String(error) }
      };
    }
  }

  getSuggestions(context: DeloContext): string[] {
    if (context.clipboardContent || context.screenText) {
      return ['Create task', 'Add to todo', 'Set reminder'];
    }
    return [];
  }
}

class SearchCommand implements DeloCommand {
  name = 'search';
  description = 'Search for content';

  match(input: string, context: DeloContext): boolean {
    const lowerInput = input.toLowerCase();
    return lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('look up');
  }

  async execute(context: DeloContext, args?: any): Promise<DeloCommandResult> {
    const searchTerm = context.clipboardContent || args?.target || '';
    if (!searchTerm) {
      return {
        success: false,
        message: 'No search term provided.',
        action: 'no_search_term'
      };
    }

    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
      await shell.openExternal(searchUrl);

      return {
        success: true,
        message: `Searching for "${searchTerm}" in your browser.`,
        action: 'searched',
        data: { searchTerm, searchUrl }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to open search.',
        action: 'error',
        data: { error: String(error) }
      };
    }
  }

  getSuggestions(context: DeloContext): string[] {
    if (context.clipboardContent) {
      return ['Search this', 'Look up this', 'Find more info'];
    }
    return [];
  }
}

class OpenAppCommand implements DeloCommand {
  name = 'open';
  description = 'Open applications';

  match(input: string, context: DeloContext): boolean {
    const lowerInput = input.toLowerCase();
    return lowerInput.includes('open') || lowerInput.includes('launch') || lowerInput.includes('start');
  }

  async execute(context: DeloContext, args?: any): Promise<DeloCommandResult> {
    const appName = args?.app || '';
    if (!appName) {
      return {
        success: false,
        message: 'No application specified to open.',
        action: 'no_app_specified'
      };
    }

    try {
      const appLaunch = new AppLaunchService();
      const result = await appLaunch.launchApp(appName);

      return {
        success: result.success,
        message: result.message,
        action: 'app_opened',
        data: { appName, result }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to open ${appName}.`,
        action: 'error',
        data: { error: String(error) }
      };
    }
  }

  getSuggestions(context: DeloContext): string[] {
    return ['Open Gmail', 'Open Chrome', 'Open Notepad', 'Open Calculator'];
  }
}

class ScreenshotCommand implements DeloCommand {
  name = 'screenshot';
  description = 'Take screenshots';

  match(input: string, context: DeloContext): boolean {
    const lowerInput = input.toLowerCase();
    return lowerInput.includes('screenshot') || lowerInput.includes('capture') || lowerInput.includes('screen');
  }

  async execute(context: DeloContext, args?: any): Promise<DeloCommandResult> {
    try {
      // Use system screenshot command
      const screenshotPath = path.join(process.env.HOME || process.env.USERPROFILE || '', 'screenshot.png');
      
      if (process.platform === 'win32') {
        await execAsync('powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'{PrtSc}\')"');
      } else {
        await execAsync('screencapture -x screenshot.png');
      }

      return {
        success: true,
        message: 'Screenshot taken and saved.',
        action: 'screenshot_taken',
        data: { screenshotPath }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to take screenshot.',
        action: 'error',
        data: { error: String(error) }
      };
    }
  }

  getSuggestions(context: DeloContext): string[] {
    return ['Take screenshot', 'Capture screen', 'Screen capture'];
  }
}

class ClipboardCommand implements DeloCommand {
  name = 'clipboard';
  description = 'Manage clipboard operations';

  match(input: string, context: DeloContext): boolean {
    const lowerInput = input.toLowerCase();
    return lowerInput.includes('clipboard') || lowerInput.includes('copy') || lowerInput.includes('paste');
  }

  async execute(context: DeloContext, args?: any): Promise<DeloCommandResult> {
    const action = args?.action || 'show';
    
    try {
      switch (action) {
        case 'clear':
          await clipboard.clear();
          return {
            success: true,
            message: 'Clipboard cleared.',
            action: 'clipboard_cleared'
          };
        
        case 'show':
          const content = await clipboard.readText();
          return {
            success: true,
            message: `Clipboard content: ${content.substring(0, 100)}...`,
            action: 'clipboard_shown',
            data: { content }
          };
        
        default:
          return {
            success: false,
            message: 'Unknown clipboard action.',
            action: 'unknown_action'
          };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to perform clipboard operation.',
        action: 'error',
        data: { error: String(error) }
      };
    }
  }

  getSuggestions(context: DeloContext): string[] {
    return ['Show clipboard', 'Clear clipboard', 'Copy to clipboard'];
  }
}

class SystemCommand implements DeloCommand {
  name = 'system';
  description = 'System control operations';

  match(input: string, context: DeloContext): boolean {
    const lowerInput = input.toLowerCase();
    return lowerInput.includes('system') || lowerInput.includes('volume') || lowerInput.includes('brightness') || 
           lowerInput.includes('lock') || lowerInput.includes('sleep');
  }

  async execute(context: DeloContext, args?: any): Promise<DeloCommandResult> {
    const action = args?.action || '';
    
    try {
      switch (action) {
        case 'volume_up':
          await execAsync('powershell -command "[System.Windows.Forms.SendKeys]::SendWait(\'{VolumeUp}\')"');
          return {
            success: true,
            message: 'Volume increased.',
            action: 'volume_up'
          };
        
        case 'volume_down':
          await execAsync('powershell -command "[System.Windows.Forms.SendKeys]::SendWait(\'{VolumeDown}\')"');
          return {
            success: true,
            message: 'Volume decreased.',
            action: 'volume_down'
          };
        
        case 'lock':
          await execAsync('rundll32.exe user32.dll,LockWorkStation');
          return {
            success: true,
            message: 'System locked.',
            action: 'system_locked'
          };
        
        default:
          return {
            success: false,
            message: 'Unknown system action.',
            action: 'unknown_action'
          };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to perform system operation.',
        action: 'error',
        data: { error: String(error) }
      };
    }
  }

  getSuggestions(context: DeloContext): string[] {
    return ['Volume up', 'Volume down', 'Lock system', 'Sleep system'];
  }
}

// Temporarily disabled to prevent memory leak during startup
// export const deloCommandSystem = new DELOCommandSystem();
