import { DynamicRegistry } from '../runtime/registry';
import { ContextManager } from '../services/ContextManager';
import { getTranscriptSnippets } from '../../audio/transcriptStore.js';

export interface PromptContext {
  tools: any[];
  liveContext: any;
  failureLog: string[];
  userRequest: string;
  platform: string;
}

export interface PromptTemplate {
  system: string;
  user: string;
  tools: any[];
}

/**
 * Manages prompt templates for LLM interactions
 */
export class PromptTemplateManager {
  private registry: DynamicRegistry;
  private contextManager: ContextManager;
  private failureLog: string[] = [];
  private maxFailureLogSize = 10;
  
  constructor(registry: DynamicRegistry, contextManager: ContextManager) {
    this.registry = registry;
    this.contextManager = contextManager;
  }
  
  /**
   * Builds a complete prompt with tools, context, and failure history
   */
  async buildPrompt(userRequest: string): Promise<PromptTemplate> {
    const tools = this.registry.getFunctionDeclarations();
    const recentContext = await this.contextManager.getRecentContext(1);
    const liveContext = recentContext.length > 0 ? recentContext[0] : {};
    const platform = process.platform;
    
    const systemPrompt = this.buildSystemPrompt(tools, liveContext, platform);
    const userPrompt = this.buildUserPrompt(userRequest, liveContext);
    
    return {
      system: systemPrompt,
      user: userPrompt,
      tools
    };
  }
  
  /**
   * Builds the system prompt with instructions and context
   */
  private buildSystemPrompt(tools: any[], liveContext: any, platform: string): string {
    const toolCount = tools.length;
    const platformName = platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : platform;
    
    let prompt = `You are DELO.FridayCore, an intelligent OS-level AI assistant with dynamic tool discovery capabilities.

PLATFORM: ${platformName}
AVAILABLE TOOLS: ${toolCount} discovered tools

CORE PRINCIPLES:
1. Always use function_call for actionable requests - never default to opening Chrome or giving up
2. Use fallback_request when tools are missing, apps need installation, or OAuth is required
3. Leverage the discovered tool catalog to perform complex automation tasks
4. Learn from failures and adapt your approach
5. Provide clear, actionable responses

TOOL USAGE RULES:
- For any automation request, use the most appropriate tool from the catalog
- If no exact tool exists, use fallback_request with appropriate reason and details
- For UI interactions, use uia_click and uia_type tools
- For app-specific actions, use the discovered AppleScript/COM tools
- For complex workflows, chain multiple tools together

FALLBACK STRATEGY:
- missing_app: When an app needs to be installed
- missing_oauth: When OAuth authorization is required
- missing_permission: When system permissions are needed
- missing_script: When a custom script needs to be generated
- unknown_action: When the action cannot be performed

CONTEXT AWARENESS:
You have access to live system context including:
- Frontmost application
- Clipboard content
- Screen text (OCR)
- Recent user interactions

FAILURE LEARNING:
Recent failures to learn from:
${this.formatFailureLog()}

AVAILABLE TOOLS:
${this.formatToolsList(tools)}

Remember: Always choose ONE tool or provide a clear answer. Never give up without trying a tool or fallback.`;

    return prompt;
  }
  
  /**
   * Builds the user prompt with request and context
   */
  private buildUserPrompt(userRequest: string, liveContext: any): string {
    // Get transcript snippet (last 2 min)
    let transcript = '';
    try {
      const snippets = getTranscriptSnippets();
      transcript = snippets.map(s => s.text).join(' ').slice(-1000); // last 1000 chars
    } catch {}
    let prompt = `USER REQUEST: ${userRequest}

LIVE CONTEXT:
- Front App: ${liveContext.frontApp || 'Unknown'}
- Clipboard: ${liveContext.clipboard ? `"${liveContext.clipboard.substring(0, 100)}${liveContext.clipboard.length > 100 ? '...' : ''}"` : 'Empty'}
- Screen Text: ${liveContext.screenText ? `"${liveContext.screenText.substring(0, 200)}${liveContext.screenText.length > 200 ? '...' : ''}"` : 'Not available'}
- Transcript (last 2 min): ${transcript || 'No recent transcript.'}

Please analyze this request and either:
1. Use an appropriate tool from the catalog
2. Use fallback_request if tools/apps/permissions are missing
3. Provide a helpful response if no action is needed

Choose your response carefully based on the available tools and current context.`;

    return prompt;
  }
  
  /**
   * Formats the tools list for the prompt
   */
  private formatToolsList(tools: any[]): string {
    if (tools.length === 0) {
      return 'No tools discovered yet. Use fallback_request for any automation needs.';
    }
    
    const toolDescriptions = tools.map(tool => {
      const params = tool.parameters?.properties ? 
        Object.keys(tool.parameters.properties).join(', ') : 
        'no parameters';
      return `- ${tool.name}: ${tool.description} (params: ${params})`;
    });
    
    return toolDescriptions.join('\n');
  }
  
  /**
   * Formats the failure log for learning
   */
  private formatFailureLog(): string {
    if (this.failureLog.length === 0) {
      return 'No recent failures to learn from.';
    }
    
    return this.failureLog.map((failure, index) => 
      `${index + 1}. ${failure}`
    ).join('\n');
  }
  
  /**
   * Records a failure for future learning
   */
  recordFailure(toolName: string, error: string, context: string): void {
    const failure = `${toolName} failed: ${error} (context: ${context})`;
    
    this.failureLog.unshift(failure);
    
    // Keep only the most recent failures
    if (this.failureLog.length > this.maxFailureLogSize) {
      this.failureLog = this.failureLog.slice(0, this.maxFailureLogSize);
    }
  }
  
  /**
   * Records a success for learning
   */
  recordSuccess(toolName: string, context: string): void {
    // Remove any matching failures from the log
    this.failureLog = this.failureLog.filter(failure => 
      !failure.includes(toolName)
    );
  }
  
  /**
   * Clears the failure log
   */
  clearFailureLog(): void {
    this.failureLog = [];
  }
  
  /**
   * Gets the current failure log
   */
  getFailureLog(): string[] {
    return [...this.failureLog];
  }
  
  /**
   * Builds a specialized prompt for script generation
   */
  buildScriptGenerationPrompt(action: string, context: string, platform: string): string {
    const platformName = platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : platform;
    
    return `You are a script generation expert for ${platformName} automation.

TASK: Generate a script to perform: ${action}

CONTEXT: ${context}

REQUIREMENTS:
1. Generate ONLY the script code, no explanations
2. Use proper error handling with try/catch blocks
3. Make the script reusable with parameters
4. For ${platformName}: Use appropriate automation APIs
5. Include parameter validation
6. Return success/failure status
7. Use System Events for UI automation if needed (macOS)
8. Use COM objects or cmdlets appropriately (Windows)

SCRIPT:`;
  }
  
  /**
   * Builds a prompt for tool discovery analysis
   */
  buildDiscoveryPrompt(discoveredTools: any[]): string {
    return `You are analyzing discovered automation tools.

DISCOVERED TOOLS: ${discoveredTools.length}

${discoveredTools.map(tool => 
  `- ${tool.name}: ${tool.description}`
).join('\n')}

Please analyze these tools and suggest:
1. Which tools are most useful for common automation tasks
2. Any potential improvements or missing capabilities
3. How to best utilize these tools in combination

Focus on practical automation scenarios and user workflows.`;
  }
} 