import { scanMacApps, scanShortcuts } from '../discovery/macScriptDict';
import { scanWindowsCom, scanPowerShellCmdlets } from '../discovery/winComScan';
import { ScriptCacheManager } from './scriptCache';
import { UIABridge } from './uiaBridge';
import { FallbackHandler } from './fallback';
import { MicroScriptGenerator } from './microScriptGen';
import { AIProcessor } from '../services/AIProcessor';
import * as os from 'os';

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  exec: {
    type: string;
    [key: string]: any;
  };
}

export interface ExecutionContext {
  platform: string;
  frontApp?: string;
  clipboard?: string;
  screenText?: string;
  userRequest?: string;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Dynamic tool registry that discovers capabilities at runtime
 */
export class DynamicRegistry {
  private tools: Map<string, Tool> = new Map();
  private scriptCache: ScriptCacheManager;
  private uiaBridge: UIABridge;
  private fallbackHandler: FallbackHandler;
  private microScriptGen: MicroScriptGenerator;
  private aiProcessor: AIProcessor;
  private platform: string;
  private isInitialized = false;
  
  constructor(aiProcessor: AIProcessor) {
    this.aiProcessor = aiProcessor;
    this.platform = os.platform();
    this.scriptCache = new ScriptCacheManager();
    this.uiaBridge = new UIABridge();
    this.fallbackHandler = new FallbackHandler();
    this.microScriptGen = new MicroScriptGenerator(this.scriptCache, this.aiProcessor);
  }
  
  /**
   * Initializes the registry by scanning for available tools
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('[DynamicRegistry] Initializing tool discovery...');
    
    try {
      // Clear existing tools
      this.tools.clear();
      
      // Discover platform-specific tools
      if (this.platform === 'darwin') {
        await this.discoverMacOSTools();
      } else if (this.platform === 'win32') {
        await this.discoverWindowsTools();
      }
      
      // Add generic UIA tools
      this.addGenericUITools();
      
      // Add fallback tools
      this.addFallbackTools();
      
      // Add cached generated scripts
      this.addCachedScripts();
      
      console.log(`[DynamicRegistry] Discovered ${this.tools.size} tools`);
      this.isInitialized = true;
      
    } catch (error) {
      console.error('[DynamicRegistry] Error during initialization:', error);
      throw error;
    }
  }
  
  /**
   * Discovers macOS-specific tools
   */
  private async discoverMacOSTools(): Promise<void> {
    console.log('[DynamicRegistry] Discovering macOS tools...');
    
    try {
      // Scan AppleScript dictionaries from installed apps
      const appTools = await scanMacApps();
      for (const tool of appTools) {
        this.tools.set(tool.name, tool);
      }
      console.log(`[DynamicRegistry] Found ${appTools.length} AppleScript tools`);
      
      // Scan macOS Shortcuts
      const shortcutTools = await scanShortcuts();
      for (const tool of shortcutTools) {
        this.tools.set(tool.name, tool);
      }
      console.log(`[DynamicRegistry] Found ${shortcutTools.length} Shortcut tools`);
      
    } catch (error) {
      console.error('[DynamicRegistry] Error discovering macOS tools:', error);
    }
  }
  
  /**
   * Discovers Windows-specific tools
   */
  private async discoverWindowsTools(): Promise<void> {
    console.log('[DynamicRegistry] Discovering Windows tools...');
    
    try {
      // Scan COM objects
      const comTools = await scanWindowsCom();
      for (const tool of comTools) {
        this.tools.set(tool.name, tool);
      }
      console.log(`[DynamicRegistry] Found ${comTools.length} COM tools`);
      
      // Scan PowerShell cmdlets
      const psTools = await scanPowerShellCmdlets();
      for (const tool of psTools) {
        this.tools.set(tool.name, tool);
      }
      console.log(`[DynamicRegistry] Found ${psTools.length} PowerShell tools`);
      
    } catch (error) {
      console.error('[DynamicRegistry] Error discovering Windows tools:', error);
    }
  }
  
  /**
   * Adds generic UI automation tools
   */
  private addGenericUITools(): void {
    const uiaTools = this.uiaBridge.getGenericToolSchema();
    for (const tool of uiaTools) {
      this.tools.set(tool.name, tool);
    }
    console.log(`[DynamicRegistry] Added ${uiaTools.length} UIA tools`);
  }
  
  /**
   * Adds fallback tools
   */
  private addFallbackTools(): void {
    const fallbackTools = this.fallbackHandler.getFallbackToolSchema();
    for (const tool of fallbackTools) {
      this.tools.set(tool.name, tool);
    }
    console.log(`[DynamicRegistry] Added ${fallbackTools.length} fallback tools`);
  }
  
  /**
   * Adds cached generated scripts as tools
   */
  private addCachedScripts(): void {
    const cachedTools = this.scriptCache.exportAsTools();
    for (const tool of cachedTools) {
      this.tools.set(tool.name, tool);
    }
    console.log(`[DynamicRegistry] Added ${cachedTools.length} cached script tools`);
  }
  
  /**
   * Gets all available tools as a catalog for OpenRouter
   */
  getFunctionDeclarations(): any[] {
    const declarations: any[] = [];
    
    for (const tool of this.tools.values()) {
      declarations.push({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      });
    }
    
    return declarations;
  }
  
  /**
   * Executes a tool by name with given arguments
   */
  async run(name: string, args: Record<string, any>, ctx: ExecutionContext): Promise<ExecutionResult> {
    const tool = this.tools.get(name);
    
    if (!tool) {
      // Tool not found - try to generate a script
      return await this.handleMissingTool(name, args, ctx);
    }
    
    try {
      const result = await this.executeTool(tool, args, ctx);
      return result;
    } catch (error) {
      console.error(`[DynamicRegistry] Error executing tool ${name}:`, error);
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Handles missing tools by attempting script generation
   */
  private async handleMissingTool(name: string, args: Record<string, any>, ctx: ExecutionContext): Promise<ExecutionResult> {
    console.log(`[DynamicRegistry] Tool not found: ${name}, attempting script generation...`);
    
    try {
      // Generate a script for the missing action
      const script = await this.microScriptGen.generateScript({
        action: name,
        context: ctx.userRequest || 'Unknown action',
        platform: this.platform === 'darwin' ? 'macos' : 'windows',
        parameters: args
      });
      
      if (script) {
        // Execute the generated script
        const result = await this.executeGeneratedScript(script, args, ctx);
        
        // Cache the result for future use
        if (result.success) {
          this.scriptCache.recordSuccess(script.id);
          
          // Add the generated script as a tool for future use
          const tool: Tool = {
            name: name,
            description: script.description,
            parameters: {
              type: 'object',
              properties: script.parameters,
              required: []
            },
            exec: {
              type: 'generated_script',
              scriptId: script.id
            }
          };
          
          this.tools.set(name, tool);
          console.log(`[DynamicRegistry] Added generated tool '${name}' to registry`);
        } else {
          this.scriptCache.recordFailure(script.id);
        }
        
        return result;
      } else {
        // Script generation failed - try fallback handler
        const fallbackResponse = await this.fallbackHandler.handleFallback({
          reason: 'missing_script',
          proposal: `DELO can help you set up the necessary app or capability for: ${name}`,
          details: { action: name }
        });
        
        return {
          success: fallbackResponse.success,
          output: fallbackResponse.message,
          error: fallbackResponse.success ? undefined : fallbackResponse.message,
          metadata: {
            action: fallbackResponse.action,
            nextSteps: fallbackResponse.nextSteps
          }
        };
      }
      
    } catch (error) {
      console.error(`[DynamicRegistry] Error handling missing tool ${name}:`, error);
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Executes a specific tool based on its type
   */
  private async executeTool(tool: Tool, args: Record<string, any>, ctx: ExecutionContext): Promise<ExecutionResult> {
    const { exec } = tool;
    
    switch (exec.type) {
      case 'applescript':
        return await this.executeAppleScript(exec, args);
      case 'shortcut':
        return await this.executeShortcut(exec, args);
      case 'com':
        return await this.executeComObject(exec, args);
      case 'powershell':
        return await this.executePowerShell(exec, args);
      case 'uia':
        return await this.executeUIA(exec, args);
      case 'fallback':
        return await this.executeFallback(exec, args);
      case 'generated':
        return await this.executeGeneratedScriptById(exec, args, ctx);
      default:
        return {
          success: false,
          output: '',
          error: `Unknown tool type: ${exec.type}`
        };
    }
  }
  
  /**
   * Executes an AppleScript
   */
  private async executeAppleScript(exec: any, args: Record<string, any>): Promise<ExecutionResult> {
    const { execSync } = require('child_process');
    
    try {
      // Build AppleScript with arguments
      let script = `tell application "${exec.bundle}"\n`;
      script += `  ${exec.verb}`;
      
      if (args && Object.keys(args).length > 0) {
        const argList = Object.entries(args).map(([key, value]) => `${key}:${JSON.stringify(value)}`).join(', ');
        script += ` ${argList}`;
      }
      
      script += '\nend tell';
      
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
      
      return {
        success: true,
        output: result.trim(),
        metadata: { type: 'applescript', bundle: exec.bundle, verb: exec.verb }
      };
      
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `AppleScript execution failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { type: 'applescript', bundle: exec.bundle, verb: exec.verb }
      };
    }
  }
  
  /**
   * Executes a macOS Shortcut
   */
  private async executeShortcut(exec: any, args: Record<string, any>): Promise<ExecutionResult> {
    const { execSync } = require('child_process');
    
    try {
      let command = `shortcuts run "${exec.bundle}"`;
      
      if (args.input) {
        command += ` --input-text "${args.input}"`;
      }
      
      const result = execSync(command, { encoding: 'utf8' });
      
      return {
        success: true,
        output: result.trim(),
        metadata: { type: 'shortcut', name: exec.bundle }
      };
      
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Shortcut execution failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { type: 'shortcut', name: exec.bundle }
      };
    }
  }
  
  /**
   * Executes a COM object method
   */
  private async executeComObject(exec: any, args: Record<string, any>): Promise<ExecutionResult> {
    const { execSync } = require('child_process');
    
    try {
      let psScript = `
        try {
          $obj = New-Object -ComObject "${exec.progId}"
          $result = $obj.${exec.method}(${args.args ? JSON.stringify(args.args) : ''})
          Write-Output $result
        } catch {
          Write-Output "Error: $($_.Exception.Message)"
        }
      `;
      
      const result = execSync(`powershell -Command "${psScript}"`, { encoding: 'utf8' });
      
      if (result.includes('Error:')) {
        return {
          success: false,
          output: '',
          error: result.trim(),
          metadata: { type: 'com', progId: exec.progId, method: exec.method }
        };
      }
      
      return {
        success: true,
        output: result.trim(),
        metadata: { type: 'com', progId: exec.progId, method: exec.method }
      };
      
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `COM execution failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { type: 'com', progId: exec.progId, method: exec.method }
      };
    }
  }
  
  /**
   * Executes a PowerShell cmdlet
   */
  private async executePowerShell(exec: any, args: Record<string, any>): Promise<ExecutionResult> {
    const { execSync } = require('child_process');
    
    try {
      let command = exec.progId;
      
      if (args.parameters) {
        const params = Object.entries(args.parameters)
          .map(([key, value]) => `-${key} "${value}"`)
          .join(' ');
        command += ` ${params}`;
      }
      
      const result = execSync(`powershell -Command "${command}"`, { encoding: 'utf8' });
      
      return {
        success: true,
        output: result.trim(),
        metadata: { type: 'powershell', cmdlet: exec.progId }
      };
      
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `PowerShell execution failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { type: 'powershell', cmdlet: exec.progId }
      };
    }
  }
  
  /**
   * Executes a UIA operation
   */
  private async executeUIA(exec: any, args: Record<string, any>): Promise<ExecutionResult> {
    try {
      if (exec.action === 'click') {
        const result = await this.uiaBridge.click({
          title: args.title,
          role: args.role,
          index: args.index
        });
        
        return {
          success: result.success,
          output: result.message,
          error: result.success ? undefined : result.message,
          metadata: { type: 'uia', action: 'click' }
        };
      } else if (exec.action === 'type') {
        const result = await this.uiaBridge.type(args.text, {
          title: args.title
        });
        
        return {
          success: result.success,
          output: result.message,
          error: result.success ? undefined : result.message,
          metadata: { type: 'uia', action: 'type', charactersTyped: result.charactersTyped }
        };
      } else {
        return {
          success: false,
          output: '',
          error: `Unknown UIA action: ${exec.action}`,
          metadata: { type: 'uia', action: exec.action }
        };
      }
      
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `UIA execution failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { type: 'uia', action: exec.action }
      };
    }
  }
  
  /**
   * Executes a fallback operation
   */
  private async executeFallback(exec: any, args: Record<string, any>): Promise<ExecutionResult> {
    try {
      const fallbackRequest = {
        reason: args.reason as any,
        proposal: args.proposal,
        details: args.details
      };
      
      const response = await this.fallbackHandler.handleFallback(fallbackRequest);
      
      return {
        success: response.success,
        output: response.message,
        error: response.success ? undefined : response.message,
        metadata: { 
          type: 'fallback', 
          action: response.action,
          nextSteps: response.nextSteps 
        }
      };
      
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Fallback execution failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { type: 'fallback' }
      };
    }
  }
  
  /**
   * Executes a generated script by ID
   */
  private async executeGeneratedScriptById(exec: any, args: Record<string, any>, ctx: ExecutionContext): Promise<ExecutionResult> {
    const script = this.scriptCache.getScript(exec.scriptId);
    
    if (!script) {
      return {
        success: false,
        output: '',
        error: `Generated script not found: ${exec.scriptId}`
      };
    }
    
    return await this.executeGeneratedScript(script, args, ctx);
  }
  
  /**
   * Executes a generated script
   */
  private async executeGeneratedScript(script: any, args: Record<string, any>, ctx: ExecutionContext): Promise<ExecutionResult> {
    const { execSync } = require('child_process');
    
    try {
      let result: string;
      
      if (script.language === 'applescript') {
        result = execSync(`osascript -e '${script.script}'`, { encoding: 'utf8' });
      } else if (script.language === 'powershell') {
        result = execSync(`powershell -Command "${script.script}"`, { encoding: 'utf8' });
      } else {
        return {
          success: false,
          output: '',
          error: `Unsupported script language: ${script.language}`
        };
      }
      
      return {
        success: true,
        output: result.trim(),
        metadata: { 
          type: 'generated', 
          language: script.language,
          scriptId: script.id 
        }
      };
      
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Generated script execution failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          type: 'generated', 
          language: script.language,
          scriptId: script.id 
        }
      };
    }
  }
  
  /**
   * Refreshes the tool catalog (useful after installing new apps)
   */
  async refresh(): Promise<void> {
    console.log('[DynamicRegistry] Refreshing tool catalog...');
    this.isInitialized = false;
    await this.initialize();
  }
  
  /**
   * Gets statistics about the registry
   */
  getStats(): {
    totalTools: number;
    byType: Record<string, number>;
    platform: string;
  } {
    const byType: Record<string, number> = {};
    
    for (const tool of this.tools.values()) {
      const type = tool.exec.type;
      byType[type] = (byType[type] || 0) + 1;
    }
    
    return {
      totalTools: this.tools.size,
      byType,
      platform: this.platform
    };
  }
} 