import fetch from 'node-fetch';
import { OpenAI } from 'openai';
import { registry } from './registry';
import { Context, contextManager } from './context';
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
      if (openRouterResult) return openRouterResult;
    } catch (error) {
      this.log('OpenRouter failed, falling back to Gemini:', error);
    }
    // 2. Try Gemini
    try {
      const geminiResult = await this.tryGemini(userText, context);
      if (geminiResult) return geminiResult;
    } catch (error) {
      this.log('Gemini failed, falling back to fallbackIntentParsing:', error);
    }
    // 3. Fallback
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
    const contextInfo = `
Current Context:
- Active Application: ${context.activeApp}
- Window Title: ${context.windowTitle}
- Clipboard Content: ${context.clipboardContent?.substring(0, 200) || ''}${context.clipboardContent && context.clipboardContent.length > 200 ? '...' : ''}
- Recent Commands: ${context.recentCommands?.slice(-3).join(', ') || ''}
- Screen Text: ${context.screenText?.substring(0, 100) || 'None'}${context.screenText && context.screenText.length > 100 ? '...' : ''}
`;
    return `You are Friday, an advanced AI assistant that can control the user's computer and perform various tasks.\n\n${contextInfo}\n\nCRITICAL INSTRUCTIONS:\n1. ALWAYS try to use the available functions to perform actions rather than just providing information\n2. If the user asks for something that can be done with a function, use the function\n3. Only provide conversational responses for general questions that don't require system actions\n4. Be precise with function arguments - extract the exact information the user wants\n5. If the user's request is ambiguous, ask for clarification or make reasonable assumptions\n6. When opening applications, prefer native apps over web versions unless specifically requested\n\nFUNCTION MAPPING GUIDE:\n- For opening applications: Use 'open_app' with appName parameter\n- For opening websites/URLs: Use 'open_url' with url parameter  \n- For web searches: Use 'open_url' with the search query as url parameter\n- For email composition: Use 'email_draft' with recipient, subject, and body parameters\n\nEXAMPLES:\n- \"open Chrome\" → open_app with appName: \"chrome\"\n- \"search for cats\" → open_url with url: \"cats\" (will be treated as search)\n- \"open google.com\" → open_url with url: \"https://google.com\"\n- \"email john@example.com\" → email_draft with recipient: \"john@example.com\"\n\nAvailable functions are provided below. Choose the most appropriate one based on the user's request.`;
  }

  private fallbackIntentParsing(userText: string, context: Context): IntentResult {
    const lowerText = userText.toLowerCase();

    // Generalized app opening (for known apps)
    if (lowerText.includes('open') && (
      lowerText.includes('app') || 
      lowerText.includes('application') || 
      lowerText.includes('chrome') || 
      lowerText.includes('firefox') || 
      lowerText.includes('spotify') || 
      lowerText.includes('vscode') || 
      lowerText.includes('terminal') ||
      lowerText.includes('notepad') ||
      lowerText.includes('calculator') ||
      lowerText.includes('finder') ||
      lowerText.includes('explorer')
    )) {
      const appName = this.extractAppName(userText);
      return {
        functionName: 'open_app',
        arguments: { appName },
        confidence: 0.8,
        reasoning: 'Fallback: detected app opening request'
      };
    }

    // Generalized URL opening: 'open X', 'open X on browser', etc.
    if (lowerText.startsWith('open ')) {
      const url = this.extractUrl(userText);
      return {
        functionName: 'open_url',
        arguments: { url },
        confidence: 0.8,
        reasoning: 'Fallback: detected open URL or search request'
      };
    }

    // General search patterns
    if (lowerText.includes('search') || lowerText.includes('find') || lowerText.includes('google') || lowerText.includes('look up')) {
      const query = this.extractSearchQuery(userText);
      return {
        functionName: 'open_url',
        arguments: { url: query },
        confidence: 0.7,
        reasoning: 'Fallback: detected search request'
      };
    }

    // Email patterns - only if there's a valid email address
    if ((lowerText.includes('email') || lowerText.includes('mail') || lowerText.includes('send email') || lowerText.includes('compose')) && 
        (lowerText.includes('@') || lowerText.includes('.com') || lowerText.includes('.org') || lowerText.includes('.net'))) {
      const emailInfo = this.extractEmailInfo(userText);
      if (emailInfo.recipient) {
        return {
          functionName: 'email_draft',
          arguments: emailInfo,
          confidence: 0.6,
          reasoning: 'Fallback: detected email request'
        };
      }
    }

    return {
      functionName: 'conversation',
      arguments: { response: `I understand: "${userText}". How can I help you?` },
      confidence: 0.3,
      reasoning: 'Fallback: no specific action detected'
    };
  }

  private extractAppName(text: string): string {
    const match = text.match(/open\s+(?:the\s+)?(?:app\s+)?(?:application\s+)?([a-zA-Z0-9\s]+)/i);
    const appName = match ? match[1].trim() : 'unknown';
    
    // Map common app names to their system names
    const appMappings: { [key: string]: string } = {
      'notepad': 'notepad',
      'chrome': 'chrome',
      'firefox': 'firefox',
      'spotify': 'spotify',
      'vscode': 'vscode',
      'terminal': 'terminal',
      'calculator': 'calculator',
      'finder': 'finder',
      'explorer': 'explorer'
    };
    
    const lowerAppName = appName.toLowerCase();
    return appMappings[lowerAppName] || appName;
  }

  private extractSearchQuery(text: string): string {
    // Handle various search patterns
    const patterns = [
      /(?:search\s+for|find|google|look up)\s+(.+)/i,
      /(?:open|go to|visit)\s+(.+)/i,
      /(.+)/i  // fallback to entire text
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const query = match[1].trim();
        
        // If it's a general search, use Google
        return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      }
    }
    
    return text;
  }

  private extractUrl(text: string): string {
    // Extract the main part after 'open'
    let match = text.match(/open\s+(.+?)(?:\s+on\s+browser|\s+in\s+browser|$)/i);
    let raw = match ? match[1].trim() : text.trim();

    // Remove common trailing words
    raw = raw.replace(/\s+(website|site|browser)$/i, '').trim();

    // If it looks like a URL already, return as is
    if (/^(https?:\/\/|www\.)/i.test(raw)) {
      return raw.startsWith('http') ? raw : `https://${raw}`;
    }
    // If it looks like a domain (e.g. notion.so, chat.openai.com)
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i.test(raw)) {
      return `https://${raw}`;
    }

    // Try common TLDs
    const tlds = ['.com', '.ai', '.so', '.net', '.org', '.io', '.app'];
    for (const tld of tlds) {
      if (!raw.endsWith(tld)) {
        const candidate = `https://${raw.replace(/\s+/g, '').toLowerCase()}${tld}`;
        // Optionally: could check if domain exists, but for now just return first candidate
        return candidate;
      }
    }

    // Fallback: treat as a Google search
    return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
  }

  private extractEmailInfo(text: string): any {
    const emailMatch = text.match(/(?:email|mail|send to)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const recipient = emailMatch ? emailMatch[1] : '';
    
    const subjectMatch = text.match(/(?:subject|about)\s+(.+?)(?:\s+body|\s+content|$)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : '';
    
    const bodyMatch = text.match(/(?:body|content|message)\s+(.+)/i);
    const body = bodyMatch ? bodyMatch[1].trim() : '';
    
    return {
      recipient,
      subject,
      body,
      useClipboard: true
    };
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[IntentParser] ${message}`, data || '');
    }
  }
}

export const intentParser = new IntentParser(); 