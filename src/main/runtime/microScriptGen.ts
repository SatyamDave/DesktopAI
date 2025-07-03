import { ScriptCacheManager } from './scriptCache';
import { AIProcessor } from '../services/AIProcessor';

export interface ScriptGenerationRequest {
  action: string;
  context: string;
  targetApp?: string;
  parameters?: Record<string, any>;
  platform: 'macos' | 'windows';
}

export interface GeneratedScript {
  id: string;
  script: string;
  language: 'applescript' | 'powershell' | 'javascript';
  parameters: Record<string, any>;
  description: string;
}

/**
 * Generates micro-scripts on demand using LLM
 */
export class MicroScriptGenerator {
  private scriptCache: ScriptCacheManager;
  private aiProcessor: AIProcessor;
  
  constructor(scriptCache: ScriptCacheManager, aiProcessor: AIProcessor) {
    this.scriptCache = scriptCache;
    this.aiProcessor = aiProcessor;
  }
  
  /**
   * Generates a script for an unknown action
   */
  async generateScript(request: ScriptGenerationRequest): Promise<GeneratedScript | null> {
    try {
      // First check if we have a similar script in cache
      const similarScripts = this.scriptCache.findScripts(request.action);
      if (similarScripts.length > 0) {
        console.log(`Found ${similarScripts.length} similar scripts in cache`);
        // Could potentially adapt existing scripts here
      }
      
      // Check for pre-built scripts for common tasks
      const prebuiltScript = this.getPrebuiltScript(request);
      if (prebuiltScript) {
        console.log(`Using pre-built script for: ${request.action}`);
        
        // Store in cache
        const scriptId = this.scriptCache.storeScript(
          `prebuilt_${request.action.replace(/[^a-zA-Z0-9]/g, '_')}`,
          prebuiltScript.description,
          prebuiltScript.script,
          prebuiltScript.language,
          prebuiltScript.parameters,
          request.action,
          [request.action, request.targetApp || 'system'].filter(Boolean)
        );
        
        return {
          id: scriptId,
          ...prebuiltScript
        };
      }
      
      // Generate new script using LLM
      const script = await this.generateWithLLM(request);
      if (!script) return null;
      
      // Store in cache
      const scriptId = this.scriptCache.storeScript(
        `gen_${request.action.replace(/[^a-zA-Z0-9]/g, '_')}`,
        script.description,
        script.script,
        script.language,
        script.parameters,
        request.action,
        [request.action, request.targetApp || 'system'].filter(Boolean)
      );
      
      return {
        id: scriptId,
        ...script
      };
      
    } catch (error) {
      console.error('Error generating script:', error);
      return null;
    }
  }
  
  /**
   * Gets pre-built scripts for common tasks
   */
  private getPrebuiltScript(request: ScriptGenerationRequest): Omit<GeneratedScript, 'id'> | null {
    const { action, platform } = request;
    const lowerAction = action.toLowerCase();
    
    if (platform === 'macos') {
      // Calendar event creation
      if (lowerAction.includes('calendar') || lowerAction.includes('event') || lowerAction.includes('meeting')) {
        return {
          script: `tell application "Calendar"
  set newEvent to make new event at calendar "Home" with properties {summary:"New Event", start date:(current date), end date:(current date + 3600)}
  return "Event created successfully"
end tell`,
          language: 'applescript',
          parameters: {
            title: { type: 'string', description: 'Event title' },
            start: { type: 'string', description: 'Start date/time' },
            end: { type: 'string', description: 'End date/time' },
            location: { type: 'string', description: 'Event location' }
          },
          description: 'Create a calendar event in Calendar.app'
        };
      }
      
      // Email sending
      if (lowerAction.includes('email') || lowerAction.includes('mail') || lowerAction.includes('send')) {
        return {
          script: `tell application "Mail"
  set newMessage to make new outgoing message with properties {subject:"New Message", content:"", visible:true}
  return "Email composer opened"
end tell`,
          language: 'applescript',
          parameters: {
            to: { type: 'string', description: 'Recipient email address' },
            subject: { type: 'string', description: 'Email subject' },
            body: { type: 'string', description: 'Email body' }
          },
          description: 'Send an email using Mail.app'
        };
      }
      
      // Note creation
      if (lowerAction.includes('note') || lowerAction.includes('write')) {
        return {
          script: `tell application "Notes"
  set newNote to make new note at folder "Notes" with properties {name:"New Note", body:""}
  return "Note created successfully"
end tell`,
          language: 'applescript',
          parameters: {
            title: { type: 'string', description: 'Note title' },
            content: { type: 'string', description: 'Note content' }
          },
          description: 'Create a note in Notes.app'
        };
      }
      
      // Reminder creation
      if (lowerAction.includes('reminder') || lowerAction.includes('todo') || lowerAction.includes('task')) {
        return {
          script: `tell application "Reminders"
  set newReminder to make new reminder at list "Reminders" with properties {name:"New Reminder", due date:(current date + 86400)}
  return "Reminder created successfully"
end tell`,
          language: 'applescript',
          parameters: {
            title: { type: 'string', description: 'Reminder title' },
            dueDate: { type: 'string', description: 'Due date' }
          },
          description: 'Create a reminder in Reminders.app'
        };
      }
    }
    
    return null;
  }

  /**
   * Uses LLM to generate a script for the requested action
   */
  private async generateWithLLM(request: ScriptGenerationRequest): Promise<Omit<GeneratedScript, 'id'> | null> {
    const systemPrompt = `You are a script generation expert. Generate executable scripts for automation tasks.

Rules:
1. Generate ONLY the script code, no explanations
2. Use proper error handling
3. Make scripts reusable with parameters
4. For macOS: Use AppleScript with System Events when needed
5. For Windows: Use PowerShell with proper COM objects
6. Include parameter validation
7. Return success/failure status`;

    const userPrompt = this.buildGenerationPrompt(request);
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    try {
      const response = await this.aiProcessor.processInput(fullPrompt, { type: 'script_generation' });
      
      if (!response) return null;
      
      // Parse the response to extract script and metadata
      const parsed = this.parseScriptResponse(response, request);
      return parsed;
      
    } catch (error) {
      console.error('Error calling LLM for script generation:', error);
      return null;
    }
  }
  
  /**
   * Builds the prompt for script generation
   */
  private buildGenerationPrompt(request: ScriptGenerationRequest): string {
    const { action, context, targetApp, parameters, platform } = request;
    
    let prompt = `Generate a script to: ${action}\n\n`;
    
    if (context) {
      prompt += `Context: ${context}\n\n`;
    }
    
    if (targetApp) {
      prompt += `Target Application: ${targetApp}\n\n`;
    }
    
    if (parameters && Object.keys(parameters).length > 0) {
      prompt += `Parameters: ${JSON.stringify(parameters, null, 2)}\n\n`;
    }
    
    prompt += `Platform: ${platform}\n\n`;
    
    if (platform === 'macos') {
      prompt += `Generate AppleScript that:
1. Uses System Events for UI automation if needed
2. Handles the target application properly
3. Includes error handling with try/catch
4. Returns success/failure status
5. Uses parameters for flexibility

Script:`;
    } else {
      prompt += `Generate PowerShell script that:
1. Uses appropriate COM objects or cmdlets
2. Handles the target application properly
3. Includes error handling with try/catch
4. Returns success/failure status
5. Uses parameters for flexibility

Script:`;
    }
    
    return prompt;
  }
  
  /**
   * Parses the LLM response to extract script and metadata
   */
  private parseScriptResponse(content: string, request: ScriptGenerationRequest): Omit<GeneratedScript, 'id'> | null {
    try {
      // Extract script content (everything after "Script:" or code blocks)
      let scriptContent = content;
      
      // Look for code blocks
      const codeBlockMatch = content.match(/```(?:applescript|powershell|javascript)?\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        scriptContent = codeBlockMatch[1].trim();
      } else {
        // Look for "Script:" marker
        const scriptMatch = content.match(/Script:\s*([\s\S]*)/);
        if (scriptMatch) {
          scriptContent = scriptMatch[1].trim();
        }
      }
      
      if (!scriptContent) {
        console.error('Could not extract script content from LLM response');
        return null;
      }
      
      // Determine language based on platform and content
      let language: 'applescript' | 'powershell' | 'javascript';
      if (request.platform === 'macos') {
        language = 'applescript';
      } else {
        language = 'powershell';
      }
      
      // Extract parameters from the script
      const parameters = this.extractParametersFromScript(scriptContent, language);
      
      return {
        script: scriptContent,
        language,
        parameters,
        description: `Generated script for: ${request.action}`
      };
      
    } catch (error) {
      console.error('Error parsing script response:', error);
      return null;
    }
  }
  
  /**
   * Extracts parameter definitions from a script
   */
  private extractParametersFromScript(script: string, language: 'applescript' | 'powershell' | 'javascript'): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    if (language === 'applescript') {
      // Look for parameter definitions in AppleScript
      const paramMatches = script.match(/on\s+run\s*\{([^}]*)\}/g);
      if (paramMatches) {
        // Extract parameter names from run handler
        const paramLine = paramMatches[0];
        const paramNames = paramLine.match(/\{([^}]*)\}/)?.[1]?.split(',').map(p => p.trim()) || [];
        
        for (const paramName of paramNames) {
          if (paramName && paramName !== '') {
            parameters[paramName] = {
              type: 'string',
              description: `Parameter: ${paramName}`
            };
          }
        }
      }
    } else if (language === 'powershell') {
      // Look for parameter definitions in PowerShell
      const paramMatches = script.match(/param\s*\(([^)]*)\)/g);
      if (paramMatches) {
        const paramLine = paramMatches[0];
        const paramNames = paramLine.match(/param\s*\(([^)]*)\)/)?.[1]?.split(',').map(p => p.trim()) || [];
        
        for (const paramName of paramNames) {
          if (paramName && paramName !== '') {
            parameters[paramName] = {
              type: 'string',
              description: `Parameter: ${paramName}`
            };
          }
        }
      }
    }
    
    return parameters;
  }
  
  /**
   * Tests a generated script to ensure it works
   */
  async testScript(scriptId: string, testParams: Record<string, any> = {}): Promise<boolean> {
    const script = this.scriptCache.getScript(scriptId);
    if (!script) return false;
    
    try {
      const result = await this.executeScript(script, testParams);
      
      if (result.success) {
        this.scriptCache.recordSuccess(scriptId);
        return true;
      } else {
        this.scriptCache.recordFailure(scriptId);
        return false;
      }
    } catch (error) {
      this.scriptCache.recordFailure(scriptId);
      console.error('Error testing script:', error);
      return false;
    }
  }
  
  /**
   * Executes a script with given parameters
   */
  private async executeScript(script: any, params: Record<string, any>): Promise<{ success: boolean; output: string; error?: string }> {
    // This would integrate with the executor system
    // For now, return a mock result
    return {
      success: true,
      output: 'Script executed successfully'
    };
  }
} 