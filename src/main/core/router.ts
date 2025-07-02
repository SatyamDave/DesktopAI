import { registry } from './registry';
import { contextManager } from './context';
import { IntentResult } from './intentParser';

export interface RouterResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  pluginName?: string;
  executionTime?: number;
  requiresConfirmation?: boolean;
}

export class Router {
  private debug: boolean;

  constructor() {
    this.debug = process.env.DEBUG_MODE === 'true';
  }

  public async dispatch(intent: IntentResult): Promise<RouterResult> {
    const startTime = Date.now();
    
    try {
      this.log(`Dispatching intent: ${intent.functionName}`, intent.arguments);

      // Handle conversation responses
      if (intent.functionName === 'conversation') {
        return {
          success: true,
          message: intent.arguments.response || 'I understand. How can I help you?',
          data: { type: 'conversation' },
          executionTime: Date.now() - startTime
        };
      }

      // Get current context
      const context = await contextManager.getCurrentContext();
      
      // Add command to context history
      contextManager.addCommand(`${intent.functionName} ${JSON.stringify(intent.arguments)}`);

      // Check if plugin exists
      const plugin = registry.getPlugin(intent.functionName);
      if (!plugin) {
        return {
          success: false,
          message: `Plugin '${intent.functionName}' not found`,
          error: 'PLUGIN_NOT_FOUND',
          executionTime: Date.now() - startTime
        };
      }

      // Run the plugin
      const result = await registry.runPlugin(intent.functionName, intent.arguments, context);
      
      const executionTime = Date.now() - startTime;
      
      this.log(`Plugin ${intent.functionName} completed in ${executionTime}ms`);

      return {
        success: true,
        message: result.message || result.summary || `Successfully executed ${intent.functionName}`,
        data: result,
        pluginName: intent.functionName,
        executionTime,
        requiresConfirmation: result.requiresConfirmation || false
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.log(`Error dispatching intent ${intent.functionName}:`, error);

      return {
        success: false,
        message: `Failed to execute ${intent.functionName}: ${error}`,
        error: String(error),
        pluginName: intent.functionName,
        executionTime
      };
    }
  }

  public async runPluginDirectly(pluginName: string, args: any): Promise<RouterResult> {
    const startTime = Date.now();
    
    try {
      this.log(`Running plugin directly: ${pluginName}`, args);

      const context = await contextManager.getCurrentContext();
      const result = await registry.runPlugin(pluginName, args, context);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        message: result.message || result.summary || `Successfully executed ${pluginName}`,
        data: result,
        pluginName,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.log(`Error running plugin ${pluginName}:`, error);

      return {
        success: false,
        message: `Failed to execute ${pluginName}: ${error}`,
        error: String(error),
        pluginName,
        executionTime
      };
    }
  }

  public getAvailablePlugins(): string[] {
    return registry.listPlugins();
  }

  public getPluginManifests(): any[] {
    return registry.getManifests();
  }

  public async reloadPlugin(pluginName: string): Promise<boolean> {
    try {
      this.log(`Reloading plugin: ${pluginName}`);
      return await registry.reloadPlugin(pluginName);
    } catch (error) {
      this.log(`Error reloading plugin ${pluginName}:`, error);
      return false;
    }
  }

  public async reloadAllPlugins(): Promise<void> {
    try {
      this.log('Reloading all plugins...');
      await registry.reloadAllPlugins();
      this.log('All plugins reloaded successfully');
    } catch (error) {
      this.log('Error reloading all plugins:', error);
      throw error;
    }
  }

  public getRegistryStats(): any {
    return registry.getStats();
  }

  public async validatePlugin(pluginName: string, args: any): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    try {
      const plugin = registry.getPlugin(pluginName);
      if (!plugin) {
        return {
          valid: false,
          errors: [`Plugin '${pluginName}' not found`]
        };
      }

      // Simple argument validation without fast-json-schema
      const requiredParams = plugin.manifest.parametersSchema.required || [];
      const errors: string[] = [];
      
      for (const param of requiredParams) {
        if (args[param] === undefined) {
          errors.push(`Missing required parameter: ${param}`);
        }
      }
      
      if (errors.length > 0) {
        return {
          valid: false,
          errors
        };
      }

      return {
        valid: true,
        errors: []
      };

    } catch (error) {
      return {
        valid: false,
        errors: [String(error)]
      };
    }
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[Router] ${message}`, data || '');
    }
  }
}

// Export singleton instance
export const router = new Router(); 