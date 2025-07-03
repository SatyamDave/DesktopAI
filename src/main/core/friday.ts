import { intentParser } from './intentParser';
import { router } from './router';
import { registry } from './registry';
import { contextManager } from './context';
import { EventEmitter } from 'events';

export interface FridayResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  intent?: any;
  executionTime?: number;
  confidence?: number;
}

export interface FridayStats {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  averageExecutionTime: number;
  mostUsedPlugins: Array<{ name: string; count: number }>;
  uptime: number;
}

export class Friday extends EventEmitter {
  private isInitialized = false;
  private debug: boolean;
  private stats = {
    totalCommands: 0,
    successfulCommands: 0,
    failedCommands: 0,
    totalExecutionTime: 0,
    pluginUsage: new Map<string, number>(),
    startTime: Date.now()
  };

  constructor() {
    super();
    this.debug = process.env.DEBUG_MODE === 'true';
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.log('🚀 Initializing Friday AI Assistant...');
      
      // Initialize core components
      await registry.initialize();
      await contextManager.getCurrentContext({ skipScreenText: true }); // Warm up context without OCR

      this.isInitialized = true;
      this.log('✅ Friday AI Assistant initialized successfully');
      
      // Emit initialization event
      this.emit('initialized', {
        pluginsLoaded: registry.getStats().loadedPlugins,
        availablePlugins: registry.listPlugins()
      });
      
    } catch (error) {
      this.log('❌ Error initializing Friday:', error);
      throw error;
    }
  }

  public async processCommand(userInput: string): Promise<FridayResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    this.stats.totalCommands++;

    try {
      this.log(`🎯 Processing command: "${userInput}"`);

      // Emit command start event
      this.emit('commandStart', { input: userInput, timestamp: startTime });

      // Get current context
      const context = await contextManager.getCurrentContext();
      
      // Parse intent using GPT-4 function calling
      const intent = await intentParser.parseIntent(userInput, context);
      
      this.log(`🧠 Intent parsed: ${intent.functionName} (confidence: ${intent.confidence})`);
      
      // Emit intent parsed event
      this.emit('intentParsed', { intent, context, timestamp: Date.now() });

      // Dispatch to router
      const result = await router.dispatch(intent);
      
      const executionTime = Date.now() - startTime;
      this.stats.totalExecutionTime += executionTime;

      // Update stats
      if (result.success) {
        this.stats.successfulCommands++;
        if (result.pluginName) {
          const currentCount = this.stats.pluginUsage.get(result.pluginName) || 0;
          this.stats.pluginUsage.set(result.pluginName, currentCount + 1);
        }
      } else {
        this.stats.failedCommands++;
      }

      const fridayResult: FridayResult = {
        success: result.success,
        message: result.message,
        data: result.data,
        error: result.error,
        intent: {
          functionName: intent.functionName,
          arguments: intent.arguments,
          confidence: intent.confidence,
          reasoning: intent.reasoning
        },
        executionTime,
        confidence: intent.confidence
      };

      // Emit command completion event
      this.emit('commandComplete', { 
        result: fridayResult, 
        timestamp: Date.now(),
        executionTime 
      });

      this.log(`✅ Command completed in ${executionTime}ms`);
      return fridayResult;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.stats.failedCommands++;
      this.stats.totalExecutionTime += executionTime;

      this.log('❌ Error processing command:', error);

      const errorResult: FridayResult = {
        success: false,
        message: `Failed to process command: ${error}`,
        error: String(error),
        executionTime
      };

      // Emit error event
      this.emit('commandError', { 
        error: String(error), 
        input: userInput,
        timestamp: Date.now(),
        executionTime 
      });

      return errorResult;
    }
  }

  public async runPluginDirectly(pluginName: string, args: any): Promise<FridayResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    this.stats.totalCommands++;

    try {
      this.log(`🔧 Running plugin directly: ${pluginName}`, args);

      const result = await router.runPluginDirectly(pluginName, args);
      
      const executionTime = Date.now() - startTime;
      this.stats.totalExecutionTime += executionTime;

      if (result.success) {
        this.stats.successfulCommands++;
        const currentCount = this.stats.pluginUsage.get(pluginName) || 0;
        this.stats.pluginUsage.set(pluginName, currentCount + 1);
      } else {
        this.stats.failedCommands++;
      }

      return {
        success: result.success,
        message: result.message,
        data: result.data,
        error: result.error,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.stats.failedCommands++;
      this.stats.totalExecutionTime += executionTime;

      return {
        success: false,
        message: `Failed to run plugin ${pluginName}: ${error}`,
        error: String(error),
        executionTime
      };
    }
  }

  public getStats(): FridayStats {
    const mostUsedPlugins = Array.from(this.stats.pluginUsage.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalCommands: this.stats.totalCommands,
      successfulCommands: this.stats.successfulCommands,
      failedCommands: this.stats.failedCommands,
      averageExecutionTime: this.stats.totalCommands > 0 
        ? this.stats.totalExecutionTime / this.stats.totalCommands 
        : 0,
      mostUsedPlugins,
      uptime: Date.now() - this.stats.startTime
    };
  }

  public getAvailablePlugins(): string[] {
    return registry.listPlugins();
  }

  public getPluginManifests(): any[] {
    return registry.getManifests();
  }

  public async reloadPlugin(pluginName: string): Promise<boolean> {
    try {
      this.log(`🔄 Reloading plugin: ${pluginName}`);
      const success = await router.reloadPlugin(pluginName);
      
      if (success) {
        this.emit('pluginReloaded', { pluginName, timestamp: Date.now() });
      }
      
      return success;
    } catch (error) {
      this.log(`❌ Error reloading plugin ${pluginName}:`, error);
      return false;
    }
  }

  public async reloadAllPlugins(): Promise<void> {
    try {
      this.log('🔄 Reloading all plugins...');
      await router.reloadAllPlugins();
      this.emit('allPluginsReloaded', { timestamp: Date.now() });
      this.log('✅ All plugins reloaded successfully');
    } catch (error) {
      this.log('❌ Error reloading all plugins:', error);
      throw error;
    }
  }

  public async getCurrentContext(): Promise<any> {
    return await contextManager.getCurrentContext();
  }

  public async validatePlugin(pluginName: string, args: any): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    return await router.validatePlugin(pluginName, args);
  }

  public getRegistryStats(): any {
    return registry.getStats();
  }

  public getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  public resetStats(): void {
    this.stats = {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      totalExecutionTime: 0,
      pluginUsage: new Map(),
      startTime: Date.now()
    };
    this.log('📊 Stats reset');
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[Friday] ${message}`, data || '');
    }
  }
}

// Export singleton instance
export const friday = new Friday(); 