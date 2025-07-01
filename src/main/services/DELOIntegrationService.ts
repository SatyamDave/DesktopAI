import * as path from 'path';
import * as os from 'os';
import { sessionMemoryManager } from './SessionMemoryManager';
import { agenticCommandProcessor } from './AgenticCommandProcessor';
import { enhancedAIPromptingService } from './EnhancedAIPromptingService';
import { enhancedBrowserAutomationService } from './EnhancedBrowserAutomationService';
import { configManager } from './ConfigManager';

interface DELOContext {
  activeApp: string;
  windowTitle: string;
  clipboardContent: string;
  activeFile?: string;
  fileType?: string;
  userIntent?: string;
  recentCommands: string[];
  sessionDuration: number;
}

interface DELOResponse {
  success: boolean;
  message: string;
  action: string;
  context: DELOContext;
  suggestions?: string[];
  nextAction?: {
    suggestion: string;
    confidence: number;
    basedOn: string;
  };
  memory?: {
    isDuplicate: boolean;
    previousTask?: any;
    similarity?: any;
  };
}

export class DELOIntegrationService {
  private isInitialized = false;
  private debug: boolean;
  private currentContext: DELOContext | null = null;
  private lastContextUpdate = 0;
  private contextUpdateInterval = 5000; // 5 seconds

  constructor() {
    this.debug = configManager.isDebugMode();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🧠 Initializing DELO Integration Service...');
      
      // Initialize core services
      await Promise.all([
        sessionMemoryManager.initialize(),
        // Other services will be initialized on-demand
      ]);

      this.isInitialized = true;
      console.log('✅ DELO Integration Service initialized');
    } catch (error) {
      console.error('❌ Error initializing DELO Integration Service:', error);
      throw error;
    }
  }

  public async processDELOCommand(input: string): Promise<DELOResponse> {
    await this.initialize();
    
    try {
      // Update context
      await this.updateContext();
      
      // Process command with memory awareness
      const result = await agenticCommandProcessor.processCommand(input);
      
      // Get current context
      const context = await this.getCurrentContext();
      
      // Build DELO response
      const deloResponse: DELOResponse = {
        success: result.success,
        message: result.message,
        action: this.determineAction(result),
        context,
        memory: result.data?.isDuplicate || result.data?.isSimilar ? {
          isDuplicate: result.data.isDuplicate,
          previousTask: result.data.previousTask,
          similarity: result.data.similarity
        } : undefined
      };

      // Add next action suggestions
      if (result.data?.nextAction) {
        deloResponse.nextAction = result.data.nextAction;
      }

      // Add contextual suggestions
      deloResponse.suggestions = await this.generateContextualSuggestions(context, input);

      console.log(`🧠 DELO processed: "${input}" -> ${result.success ? 'success' : 'failed'}`);
      return deloResponse;

    } catch (error) {
      console.error('❌ Error in DELO processing:', error);
      return {
        success: false,
        message: 'I encountered an error while processing your request.',
        action: 'error',
        context: await this.getCurrentContext()
      };
    }
  }

  private async updateContext(): Promise<void> {
    const now = Date.now();
    if (now - this.lastContextUpdate < this.contextUpdateInterval) {
      return;
    }

    try {
      // Get clipboard content
      const clipboardContent = await this.getClipboardContent();
      
      // Get active window info (simplified for now)
      const activeApp = this.getActiveApp();
      const windowTitle = this.getWindowTitle();
      
      // Get session context
      const sessionContext = await sessionMemoryManager.getSessionContext();
      
      this.currentContext = {
        activeApp,
        windowTitle,
        clipboardContent,
        recentCommands: sessionContext?.recentCommands || [],
        sessionDuration: sessionContext ? now - sessionContext.startTime : 0
      };

      // Update session memory context
      await sessionMemoryManager.updateContext(
        activeApp,
        windowTitle,
        clipboardContent
      );

      this.lastContextUpdate = now;
    } catch (error) {
      console.error('Error updating context:', error);
    }
  }

  private async getCurrentContext(): Promise<DELOContext> {
    if (!this.currentContext) {
      await this.updateContext();
    }
    return this.currentContext || {
      activeApp: '',
      windowTitle: '',
      clipboardContent: '',
      recentCommands: [],
      sessionDuration: 0
    };
  }

  private async getClipboardContent(): Promise<string> {
    try {
      // This would integrate with the actual clipboard manager
      // For now, return empty string
      return '';
    } catch (error) {
      console.error('Error getting clipboard content:', error);
      return '';
    }
  }

  private getActiveApp(): string {
    // This would integrate with the actual system to get active app
    // For now, return a placeholder
    return 'Unknown';
  }

  private getWindowTitle(): string {
    // This would integrate with the actual system to get window title
    // For now, return a placeholder
    return 'Unknown Window';
  }

  private determineAction(result: any): string {
    if (result.data?.isDuplicate) return 'duplicate_warning';
    if (result.data?.isSimilar) return 'similarity_warning';
    if (result.success) return 'completed';
    return 'failed';
  }

  private async generateContextualSuggestions(context: DELOContext, input: string): Promise<string[]> {
    const suggestions: string[] = [];

    // Context-based suggestions
    if (context.clipboardContent) {
      suggestions.push('Use clipboard content in your request');
    }

    if (context.activeApp) {
      suggestions.push(`Perform action in ${context.activeApp}`);
    }

    // Pattern-based suggestions
    if (input.toLowerCase().includes('email')) {
      suggestions.push('Schedule follow-up reminder');
      suggestions.push('Save to drafts');
    }

    if (input.toLowerCase().includes('search')) {
      suggestions.push('Save search results');
      suggestions.push('Open in new tab');
    }

    if (input.toLowerCase().includes('file')) {
      suggestions.push('Create backup');
      suggestions.push('Share via email');
    }

    // Session-based suggestions
    if (context.recentCommands.length > 0) {
      const lastCommand = context.recentCommands[context.recentCommands.length - 1];
      if (lastCommand.toLowerCase().includes('open')) {
        suggestions.push('Pin to taskbar');
        suggestions.push('Set as default');
      }
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  public async getDELOStatus(): Promise<{
    isInitialized: boolean;
    sessionMemoryStatus: any;
    contextStatus: any;
    lastActivity: number;
  }> {
    await this.initialize();

    return {
      isInitialized: this.isInitialized,
      sessionMemoryStatus: sessionMemoryManager.getStatus(),
      contextStatus: {
        hasContext: !!this.currentContext,
        lastUpdate: this.lastContextUpdate
      },
      lastActivity: this.currentContext?.sessionDuration || 0
    };
  }

  public async getSessionInsights(): Promise<{
    recentTasks: any[];
    userHabits: any[];
    productivityScore: number;
    suggestions: string[];
  }> {
    await this.initialize();

    const recentTasks = await sessionMemoryManager.getRecentTasks(10);
    const userHabits = await sessionMemoryManager.getUserHabits();
    const nextAction = await sessionMemoryManager.suggestNextAction();

    // Calculate productivity score based on successful tasks
    const successfulTasks = recentTasks.filter(task => task.success);
    const productivityScore = recentTasks.length > 0 ? 
      (successfulTasks.length / recentTasks.length) * 100 : 0;

    const suggestions: string[] = [];
    
    // Add habit-based suggestions
    const frequentHabits = userHabits
      .filter(habit => habit.frequency > 3)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    frequentHabits.forEach(habit => {
      suggestions.push(`Frequent workflow: ${habit.pattern}`);
    });

    // Add next action suggestion
    if (nextAction) {
      suggestions.push(`Suggested: ${nextAction.suggestion}`);
    }

    return {
      recentTasks,
      userHabits,
      productivityScore,
      suggestions
    };
  }

  public async clearSessionMemory(): Promise<void> {
    await this.initialize();
    await sessionMemoryManager.cleanup();
    console.log('🧹 DELO session memory cleared');
  }

  public async forceContextUpdate(): Promise<void> {
    this.lastContextUpdate = 0;
    await this.updateContext();
  }
}

// Export singleton instance
export const deloIntegrationService = new DELOIntegrationService();
