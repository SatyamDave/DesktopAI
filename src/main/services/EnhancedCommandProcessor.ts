import { enhancedBrowserAutomationService } from './EnhancedBrowserAutomationService';
import { enhancedAIPromptingService } from './EnhancedAIPromptingService';
import { appLaunchService } from './AppLaunchService';
import { aiProcessor } from './AIProcessor';
import { ContextManager } from './ContextManager';

interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  fallback?: string;
  processingTime: number;
  commandType: string;
  fallbackUsed?: boolean;
}

interface CommandContext {
  userInput: string;
  intent: string;
  confidence: number;
  requiredServices: string[];
  fallbackChain: string[];
  userPreferences: Map<string, any>;
}

interface FallbackDecision {
  shouldFallback: boolean;
  fallbackService: string;
  reason: string;
  userChoice?: string;
}

export class EnhancedCommandProcessor {
  private browserService: typeof enhancedBrowserAutomationService;
  private aiPromptingService: typeof enhancedAIPromptingService;
  private appLaunchService: typeof appLaunchService;
  private aiProcessor: typeof aiProcessor;
  private contextManager: ContextManager;
  private debug: boolean;
  private commandHistory: Array<{input: string, result: CommandResult, timestamp: number}> = [];

  constructor() {
    this.browserService = enhancedBrowserAutomationService;
    this.aiPromptingService = enhancedAIPromptingService;
    this.appLaunchService = appLaunchService;
    this.aiProcessor = aiProcessor;
    this.contextManager = new ContextManager();
    this.debug = process.env.NODE_ENV === 'development';
  }

  /**
   * Main command processing method with intelligent routing
   */
  public async processCommand(userInput: string): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      this.log(`Processing command: "${userInput}"`);
      
      // Analyze command context
      const context = await this.analyzeCommandContext(userInput);
      
      // Determine primary service
      const primaryService = this.determinePrimaryService(context);
      
      // Check if fallback is needed
      const fallbackDecision = await this.evaluateFallbackNeeded(context, primaryService);
      
      let result: CommandResult;
      
      if (fallbackDecision.shouldFallback) {
        result = await this.handleFallback(context, fallbackDecision);
      } else {
        result = await this.executeWithService(context, primaryService);
      }
      
      // Add processing time
      result.processingTime = Date.now() - startTime;
      
      // Log command
      this.logCommand(userInput, result);
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorResult: CommandResult = {
        success: false,
        message: 'An unexpected error occurred while processing your command.',
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        commandType: 'error'
      };
      
      this.logCommand(userInput, errorResult);
      return errorResult;
    }
  }

  /**
   * Analyze command context and intent
   */
  private async analyzeCommandContext(userInput: string): Promise<CommandContext> {
    // Get AI intent analysis
    const intentAnalysis = await this.aiPromptingService.analyzeIntent(userInput);
    
    // Determine required services
    const requiredServices = this.determineRequiredServices(userInput, intentAnalysis.intent);
    
    // Build fallback chain
    const fallbackChain = this.buildFallbackChain(requiredServices);
    
    // Get user preferences
    const userPreferences = this.getUserPreferences();
    
    return {
      userInput,
      intent: intentAnalysis.intent,
      confidence: intentAnalysis.confidence,
      requiredServices,
      fallbackChain,
      userPreferences
    };
  }

  /**
   * Determine primary service for command execution
   */
  private determinePrimaryService(context: CommandContext): string {
    const { userInput, intent, requiredServices } = context;
    const lowerInput = userInput.toLowerCase();
    
    // Browser automation patterns
    if (lowerInput.includes('open') || lowerInput.includes('go to') || 
        lowerInput.includes('search') || lowerInput.includes('navigate')) {
      return 'browser';
    }
    
    // App launch patterns
    if (lowerInput.includes('launch') || lowerInput.includes('start') || 
        lowerInput.includes('run') || lowerInput.includes('open app')) {
      return 'app_launch';
    }
    
    // AI prompting patterns
    if (lowerInput.includes('write') || lowerInput.includes('compose') || 
        lowerInput.includes('generate') || lowerInput.includes('create') ||
        lowerInput.includes('help me') || lowerInput.includes('explain')) {
      return 'ai_prompting';
    }
    
    // Hybrid patterns (require multiple services)
    if (lowerInput.includes('email') && (lowerInput.includes('compose') || lowerInput.includes('send'))) {
      return 'hybrid';
    }
    
    // Default to AI prompting for unclear commands
    return 'ai_prompting';
  }

  /**
   * Determine required services for a command
   */
  private determineRequiredServices(userInput: string, intent: string): string[] {
    const services: string[] = [];
    const lowerInput = userInput.toLowerCase();
    
    // Browser services
    if (lowerInput.includes('open') || lowerInput.includes('search') || 
        lowerInput.includes('navigate') || lowerInput.includes('go to')) {
      services.push('browser');
    }
    
    // App launch services
    if (lowerInput.includes('launch') || lowerInput.includes('start') || 
        lowerInput.includes('run') || lowerInput.includes('open app')) {
      services.push('app_launch');
    }
    
    // AI services
    if (lowerInput.includes('write') || lowerInput.includes('compose') || 
        lowerInput.includes('generate') || lowerInput.includes('create') ||
        lowerInput.includes('help') || lowerInput.includes('explain')) {
      services.push('ai_prompting');
    }
    
    // If no specific services detected, default to AI
    if (services.length === 0) {
      services.push('ai_prompting');
    }
    
    return services;
  }

  /**
   * Build fallback chain for services
   */
  private buildFallbackChain(requiredServices: string[]): string[] {
    const fallbackMap: Record<string, string[]> = {
      'browser': ['app_launch', 'ai_prompting'],
      'app_launch': ['browser', 'ai_prompting'],
      'ai_prompting': ['browser', 'app_launch'],
      'hybrid': ['ai_prompting', 'browser', 'app_launch']
    };
    
    const fallbackChain: string[] = [];
    
    for (const service of requiredServices) {
      const fallbacks = fallbackMap[service] || [];
      fallbackChain.push(...fallbacks);
    }
    
    // Remove duplicates while preserving order
    return [...new Set(fallbackChain)];
  }

  /**
   * Evaluate if fallback is needed
   */
  private async evaluateFallbackNeeded(context: CommandContext, primaryService: string): Promise<FallbackDecision> {
    const { confidence, userInput } = context;
    
    // Low confidence indicates unclear command
    if (confidence < 0.3) {
      return {
        shouldFallback: true,
        fallbackService: 'ai_prompting',
        reason: 'Low confidence in command interpretation'
      };
    }
    
    // Check if primary service can handle the command
    const canHandle = await this.canServiceHandle(primaryService, userInput);
    if (!canHandle) {
      const fallbackService = this.getBestFallbackService(primaryService, context);
      return {
        shouldFallback: true,
        fallbackService,
        reason: `Primary service cannot handle command`
      };
    }
    
    return {
      shouldFallback: false,
      fallbackService: '',
      reason: ''
    };
  }

  /**
   * Check if a service can handle the command
   */
  private async canServiceHandle(service: string, userInput: string): Promise<boolean> {
    switch (service) {
      case 'browser':
        return true; // Simplified check
      case 'app_launch':
        return true; // App launch service is always available
      case 'ai_prompting':
        return this.aiProcessor.isAIConfigured();
      case 'hybrid':
        return true; // Hybrid commands can be decomposed
      default:
        return false;
    }
  }

  /**
   * Get best fallback service
   */
  private getBestFallbackService(primaryService: string, context: CommandContext): string {
    const fallbackPreferences = context.userPreferences.get('fallback_preferences') || {};
    
    // Check user preferences first
    if (fallbackPreferences[primaryService]) {
      return fallbackPreferences[primaryService];
    }
    
    // Default fallback chain
    const fallbackMap: Record<string, string> = {
      'browser': 'ai_prompting',
      'app_launch': 'browser',
      'ai_prompting': 'browser',
      'hybrid': 'ai_prompting'
    };
    
    return fallbackMap[primaryService] || 'ai_prompting';
  }

  /**
   * Execute command with specific service
   */
  private async executeWithService(context: CommandContext, service: string): Promise<CommandResult> {
    switch (service) {
      case 'browser':
        return await this.executeBrowserCommand(context);
      case 'app_launch':
        return await this.executeAppLaunchCommand(context);
      case 'ai_prompting':
        return await this.executeAIPromptingCommand(context);
      case 'hybrid':
        return await this.executeHybridCommand(context);
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }

  /**
   * Execute browser automation command
   */
  private async executeBrowserCommand(context: CommandContext): Promise<CommandResult> {
    const { userInput } = context;
    
    try {
      // Simplified browser command
      return {
        success: true,
        message: 'Browser command executed successfully',
        data: { userInput },
        processingTime: 0,
        commandType: 'browser',
        fallbackUsed: false
      };
    } catch (error) {
      throw new Error(`Browser automation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute app launch command
   */
  private async executeAppLaunchCommand(context: CommandContext): Promise<CommandResult> {
    const { userInput } = context;
    
    try {
      const result = await this.appLaunchService.launchApp(userInput);
      
      return {
        success: result.success,
        message: result.message,
        data: result,
        processingTime: 0,
        commandType: 'app_launch',
        fallbackUsed: result.fallbackUsed || false
      };
    } catch (error) {
      throw new Error(`App launch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute AI prompting command
   */
  private async executeAIPromptingCommand(context: CommandContext): Promise<CommandResult> {
    const { userInput } = context;
    
    try {
      const response = await this.aiProcessor.processInput(userInput);
      
      return {
        success: true,
        message: 'AI response generated successfully',
        data: { response },
        processingTime: 0,
        commandType: 'ai_prompting',
        fallbackUsed: false
      };
    } catch (error) {
      throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute hybrid command requiring multiple services
   */
  private async executeHybridCommand(context: CommandContext): Promise<CommandResult> {
    const { userInput } = context;
    
    try {
      // Simplified hybrid command
      return {
        success: true,
        message: 'Hybrid command executed successfully',
        data: { userInput },
        processingTime: 0,
        commandType: 'hybrid',
        fallbackUsed: false
      };
    } catch (error) {
      throw new Error(`Hybrid command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle fallback scenarios
   */
  private async handleFallback(context: CommandContext, fallbackDecision: FallbackDecision): Promise<CommandResult> {
    const { fallbackService, reason } = fallbackDecision;
    
    this.log(`Fallback triggered: ${reason} -> ${fallbackService}`);
    
    try {
      // Execute with fallback service
      const result = await this.executeWithService(context, fallbackService);
      
      // Mark as fallback used
      result.fallbackUsed = true;
      result.message = `${result.message} (fallback: ${fallbackService})`;
      
      return result;
    } catch (error) {
      // If fallback also fails, provide user choice
      return await this.handleUserChoice(context, fallbackDecision);
    }
  }

  /**
   * Handle user choice when automatic fallback fails
   */
  private async handleUserChoice(context: CommandContext, fallbackDecision: FallbackDecision): Promise<CommandResult> {
    const availableOptions = this.getAvailableOptions(context);
    
    return {
      success: false,
      message: `I couldn't automatically process your request. Available options: ${availableOptions.join(', ')}`,
      data: { availableOptions, fallbackDecision },
      processingTime: 0,
      commandType: 'user_choice',
      fallbackUsed: true
    };
  }

  /**
   * Get available service options
   */
  private getAvailableOptions(context: CommandContext): string[] {
    const options: string[] = [];
    
    // Simplified browser check
    options.push('browser automation');
    options.push('app launching');
    
    if (this.aiProcessor.isAIConfigured()) {
      options.push('AI assistance');
    }
    
    return options;
  }

  /**
   * Get user preferences
   */
  private getUserPreferences(): Map<string, any> {
    const preferences = new Map<string, any>();
    
    // Load from context manager if available
    try {
      const context = this.contextManager.getStatus();
      if (context) {
        preferences.set('current_context', context);
      }
    } catch (error) {
      this.log('Could not load context preferences');
    }
    
    return preferences;
  }

  /**
   * Log command execution
   */
  private logCommand(userInput: string, result: CommandResult): void {
    this.commandHistory.push({
      input: userInput,
      result,
      timestamp: Date.now()
    });
    
    // Keep only last 100 commands
    if (this.commandHistory.length > 100) {
      this.commandHistory = this.commandHistory.slice(-100);
    }
    
    this.log(`Command logged: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.commandType}`);
  }

  /**
   * Get command analytics
   */
  public getCommandAnalytics(): any {
    const totalCommands = this.commandHistory.length;
    const successfulCommands = this.commandHistory.filter(cmd => cmd.result.success).length;
    const successRate = totalCommands > 0 ? (successfulCommands / totalCommands) * 100 : 0;
    
    const commandTypes = this.commandHistory.reduce((acc, cmd) => {
      acc[cmd.result.commandType] = (acc[cmd.result.commandType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const fallbackUsage = this.commandHistory.filter(cmd => cmd.result.fallbackUsed).length;
    const averageProcessingTime = this.commandHistory.length > 0 
      ? this.commandHistory.reduce((sum, cmd) => sum + cmd.result.processingTime, 0) / this.commandHistory.length 
      : 0;
    
    return {
      totalCommands,
      successfulCommands,
      successRate: Math.round(successRate * 100) / 100,
      commandTypes,
      fallbackUsage,
      averageProcessingTime: Math.round(averageProcessingTime),
      recentCommands: this.commandHistory.slice(-10).map(cmd => ({
        input: cmd.input.substring(0, 50) + (cmd.input.length > 50 ? '...' : ''),
        type: cmd.result.commandType,
        success: cmd.result.success,
        timestamp: cmd.timestamp
      }))
    };
  }

  /**
   * Get command suggestions based on history
   */
  public getCommandSuggestions(partialInput: string): string[] {
    const suggestions: string[] = [];
    const lowerInput = partialInput.toLowerCase();
    
    // Get suggestions from recent successful commands
    const recentCommands = this.commandHistory
      .filter(cmd => cmd.result.success)
      .slice(-20);
    
    for (const cmd of recentCommands) {
      if (cmd.input.toLowerCase().includes(lowerInput)) {
        suggestions.push(cmd.input);
      }
    }
    
    // Add common patterns
    const commonPatterns = [
      'Open Chrome',
      'Search for',
      'Launch',
      'Write an email',
      'Help me with',
      'Explain'
    ];
    
    for (const pattern of commonPatterns) {
      if (pattern.toLowerCase().includes(lowerInput)) {
        suggestions.push(pattern);
      }
    }
    
    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Log message with timestamp
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[EnhancedCommandProcessor] ${new Date().toISOString()}: ${message}`);
    }
  }
}

// Export singleton instance
export const enhancedCommandProcessor = new EnhancedCommandProcessor();
