import fetch from 'node-fetch';
import { OpenAI } from 'openai';
import { registry, getAvailableTools, DiscoveredTool, executeTool } from './registry';
import { Context, contextManager } from './context';
import * as fs from 'fs';
import * as path from 'path';
require('dotenv').config();

export interface IntentResult {
  functionName: string;
  arguments: Record<string, any>;
  confidence: number;
  reasoning?: string;
}

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
});

export class IntentParser {
  private debug: boolean;

  constructor() {
    this.debug = process.env.DEBUG_MODE === 'true';
  }

  public async parseIntent(userText: string, context: Context): Promise<IntentResult> {
    // 1. Try OpenRouter
    try {
      const openRouterResult = await this.tryOpenRouter(userText, context);
      if (openRouterResult) {
        // Always return the result - let the dynamic registry handle missing capabilities
        return openRouterResult;
      }
    } catch (error) {
      this.log('OpenRouter failed, falling back to Gemini:', error);
    }
    // 2. Try Gemini
    try {
      const geminiResult = await this.tryGemini(userText, context);
      if (geminiResult) {
        // Always return the result - let the dynamic registry handle missing capabilities
        return geminiResult;
      }
    } catch (error) {
      this.log('Gemini failed, falling back to fallbackIntentParsing:', error);
    }
    // 3. Fallback - be more aggressive about trying to match actions
    return this.fallbackIntentParsing(userText, context);
  }

  private async tryOpenRouter(userText: string, context: Context): Promise<IntentResult | null> {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key not set.');
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const availableFunctions = registry.getManifests();
    if (availableFunctions.length === 0) throw new Error('No plugins available for function calling');
    const tools = availableFunctions.map(func => ({
      type: 'function',
      function: {
        name: func.name,
        description: func.description,
        parameters: func.parameters
      }
    }));
    const systemPrompt = this.buildSystemPrompt(context);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText }
    ];
    const body = {
      model: 'openai/gpt-4o',
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 1024
    };
    const headers = {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    };
    this.log('Sending to OpenRouter:', JSON.stringify(body, null, 2));
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const data = await response.json();
    this.log('OpenRouter response:', data);
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.tool_calls &&
      data.choices[0].message.tool_calls.length > 0
    ) {
      const toolCall = data.choices[0].message.tool_calls[0];
      return {
        functionName: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments),
        confidence: 0.98,
        reasoning: 'OpenRouter function_call response'
      };
    }
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      return {
        functionName: 'conversation',
        arguments: { response: data.choices[0].message.content },
        confidence: 0.5,
        reasoning: 'No function call returned, treating as conversation (OpenRouter)'
      };
    }
    return null;
  }

  private async tryGemini(userText: string, context: Context): Promise<IntentResult | null> {
    const availableFunctions = registry.getManifests();
    if (availableFunctions.length === 0) throw new Error('No plugins available for function calling');
    const functions = availableFunctions.map(func => ({
      name: func.name,
      description: func.description,
      parameters: func.parameters
    }));
    const systemPrompt = this.buildSystemPrompt(context);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText }
    ];
    const response = await openai.chat.completions.create({
      model: 'gemini-1.5-flash',
      messages: messages as any,
      functions
    });
    this.log('Gemini response:', response);
    const choice = response.choices && response.choices[0];
    if (choice && choice.message && choice.message.function_call) {
      const { name, arguments: argsStr } = choice.message.function_call;
      let args = {};
      try {
        args = argsStr ? JSON.parse(argsStr) : {};
      } catch (e) {
        this.log('Failed to parse function_call arguments as JSON:', argsStr);
      }
      this.log(`Intent parsed: ${name} with args:`, args);
      return {
        functionName: name,
        arguments: args,
        confidence: 0.95,
        reasoning: 'Gemini (OpenAI) function_call response'
      };
    }
    if (choice && choice.message && choice.message.content) {
      return {
        functionName: 'conversation',
        arguments: { response: choice.message.content },
        confidence: 0.5,
        reasoning: 'No function call returned, treating as conversation (Gemini)'
      };
    }
    return null;
  }

  private buildSystemPrompt(context: Context): string {
    const contextInfo = `Context: ${context.activeApp} | ${context.windowTitle?.substring(0, 50) || ''}`;

    const availableFunctions = registry.getManifests();
    const toolsJson = JSON.stringify(availableFunctions, null, 2);

    return `You are DELO.FridayCore, an OS-level AI agent. Use available tools to automate tasks.

${contextInfo}

Available tools:
${toolsJson}

Examples:
- "block calendar tomorrow 9-10pm" → create_event with title="Busy", start="tomorrow 21:00", end="tomorrow 22:00"
- "open calculator" → open_app with appName="Calculator"
- "search python tutorials" → open_url with url="python tutorials"

Always use function calls for automation tasks.`;
  }

  private fallbackIntentParsing(userText: string, context: Context): IntentResult {
    const lowerText = userText.toLowerCase();
    
    // AGGRESSIVE pattern matching for common automation requests
    if (lowerText.includes('calendar') || lowerText.includes('event') || lowerText.includes('meeting') || lowerText.includes('schedule')) {
      return {
        functionName: 'create_event',
        arguments: { title: 'New Event', start: 'now', end: '1 hour from now' },
        confidence: 0.8,
        reasoning: 'Calendar event detected, attempting to create event.'
      };
    }
    
    if (lowerText.includes('email') || lowerText.includes('mail') || lowerText.includes('send')) {
      return {
        functionName: 'send_email',
        arguments: { to: '', subject: '', body: '' },
        confidence: 0.8,
        reasoning: 'Email request detected, attempting to send email.'
      };
    }
    
    if (lowerText.includes('music') || lowerText.includes('play') || lowerText.includes('song') || lowerText.includes('spotify')) {
      return {
        functionName: 'open_app',
        arguments: { app: 'Music' },
        confidence: 0.8,
        reasoning: 'Music request detected, attempting to open Music app.'
      };
    }
    
    if (lowerText.includes('note') || lowerText.includes('write') || lowerText.includes('text')) {
      return {
        functionName: 'create_note',
        arguments: { title: 'New Note', content: '' },
        confidence: 0.8,
        reasoning: 'Note creation detected, attempting to create note.'
      };
    }
    
    if (lowerText.includes('reminder') || lowerText.includes('todo') || lowerText.includes('task')) {
      return {
        functionName: 'create_reminder',
        arguments: { title: 'New Reminder', dueDate: 'tomorrow' },
        confidence: 0.8,
        reasoning: 'Reminder request detected, attempting to create reminder.'
      };
    }
    
    if (lowerText.includes('file') || lowerText.includes('folder') || lowerText.includes('open')) {
      return {
        functionName: 'open_file',
        arguments: { path: '' },
        confidence: 0.7,
        reasoning: 'File operation detected, attempting to open file.'
      };
    }
    
    // Check for available tools by name
    const availableTools = registry.getManifests().map(f => f.name);
    for (const tool of availableTools) {
      if (lowerText.includes(tool.replace(/_/g, ' '))) {
        return {
          functionName: tool,
          arguments: {},
          confidence: 0.7,
          reasoning: 'Matched tool by name in fallback.'
        };
      }
    }
    
    // If no specific pattern matches, try to infer the action and use fallback_request
    if (lowerText.includes('app') || lowerText.includes('launch') || lowerText.includes('start')) {
      return {
        functionName: 'fallback_request',
        arguments: {
          reason: 'missing_app',
          proposal: `I can help you install or set up the app you're looking for. What would you like to do?`,
          details: { action: 'app_installation' }
        },
        confidence: 0.6,
        reasoning: 'App launch request detected, offering installation help.'
      };
    }
    
    // Last resort: generic fallback_request
    return {
      functionName: 'fallback_request',
      arguments: {
        reason: 'unknown_action',
        proposal: `I can help you with this request. Would you like me to install the necessary app, set up automation, or guide you through the process?`,
        details: { action: userText }
      },
      confidence: 0.3,
      reasoning: 'No specific pattern matched, offering general assistance.'
    };
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[IntentParser] ${message}`, data || '');
    }
  }
}

export const intentParser = new IntentParser();

export async function matchIntentToTool(userInput: string): Promise<DiscoveredTool | undefined> {
  const tools = await getAvailableTools();
  const input = userInput.toLowerCase();
  return tools.find(tool =>
    tool.name.toLowerCase().includes(input) ||
    tool.description.toLowerCase().includes(input)
  );
}

// Use OpenRouter API to generate AppleScript for the user input
async function generateScriptWithLLM(userInput: string): Promise<{ success: boolean; script: string; error?: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { success: false, script: '', error: 'OpenRouter API key not set.' };
  }
  const prompt = `You are an expert AppleScript developer. Write a complete AppleScript that accomplishes the following user request on macOS. Only output the script, no explanation.\n\nUser request: ${userInput}`;
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert AppleScript developer.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 512,
        temperature: 0.2
      })
    });
    if (!response.ok) {
      return { success: false, script: '', error: `OpenRouter API error: ${response.statusText}` };
    }
    const data = await response.json();
    const script = data.choices?.[0]?.message?.content?.trim();
    if (!script) {
      return { success: false, script: '', error: 'No script returned from OpenRouter.' };
    }
    return { success: true, script };
  } catch (error: any) {
    return { success: false, script: '', error: error.message || 'OpenRouter API call failed.' };
  }
}

// Test the generated AppleScript by running it
async function testAppleScript(script: string): Promise<boolean> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  try {
    await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    return true;
  } catch {
    return false;
  }
}

// Save the script to plugins/generated/ and return the tool metadata
async function saveGeneratedScript(userInput: string, script: string): Promise<import('./registry').DiscoveredTool> {
  const safeName = userInput.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  const dir = path.resolve(__dirname, '../../../plugins/generated');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${safeName}.applescript`);
  fs.writeFileSync(filePath, script, 'utf8');
  return {
    name: safeName,
    description: `Generated AppleScript for: ${userInput}`,
    type: 'applescript',
    command: filePath,
  };
}

export type RunUserIntentResult = Promise<{
  success: boolean;
  output: string;
  error?: string;
}>;

export async function runUserIntent(userInput: string): Promise<{ success: boolean; output: string; error?: string }> {
  const tool = await matchIntentToTool(userInput);
  if (tool) {
    return executeTool(tool);
  }
  // LLM fallback: try to generate a script
  const llmResult = await generateScriptWithLLM(userInput);
  if (!llmResult.success) {
    return { success: false, output: '', error: 'No matching tool found, and script generation failed.' };
  }
  // Test the generated script
  const testPassed = await testAppleScript(llmResult.script);
  if (!testPassed) {
    return { success: false, output: '', error: 'Generated script did not work.' };
  }
  // Save and register the new tool
  const newTool = await saveGeneratedScript(userInput, llmResult.script);
  // Optionally: hot-reload registry here if needed
  return executeTool(newTool);
} 