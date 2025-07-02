import fetch from 'node-fetch';
import { registry } from './registry';
import { Context, contextManager } from './context';
import { videoSearchService } from '../services/VideoSearchService';

export interface IntentResult {
  functionName: string;
  arguments: Record<string, any>;
  confidence: number;
  reasoning?: string;
}

export class IntentParser {
  private debug: boolean;

  constructor() {
    this.debug = process.env.DEBUG_MODE === 'true';
  }

  public async parseIntent(userText: string, context: Context): Promise<IntentResult> {
    try {
      this.log(`Parsing intent for: "${userText}"`);

      // Get available functions from registry
      const availableFunctions = registry.getManifests();
      if (availableFunctions.length === 0) {
        throw new Error('No plugins available for function calling');
      }

      // Gemini expects tools as [{ functionDeclarations: [...] }]
      const tools = [
        {
          functionDeclarations: availableFunctions.map(func => ({
            name: func.name,
            description: func.description,
            parameters: func.parameters
          }))
        }
      ];

      const systemPrompt = this.buildSystemPrompt(context);
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) throw new Error('Gemini API key not set.');
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + geminiApiKey;
      const body = {
        contents: [
          { role: 'model', parts: [{ text: systemPrompt }] },
          { role: 'user', parts: [{ text: userText }] }
        ],
        tools: tools,
        toolConfig: { mode: 'AUTO' }
      };
      this.log('Sending to Gemini:', JSON.stringify(body, null, 2));
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      this.log('Gemini response:', data);

      // Try to extract function call from Gemini response
      if (data.candidates && data.candidates[0]) {
        const candidate = data.candidates[0];
        if (candidate.content && candidate.content.parts) {
          // Look for a function call in the parts
          for (const part of candidate.content.parts) {
            if (part.functionCall) {
              const { name, args } = part.functionCall;
              this.log(`Intent parsed: ${name} with args:`, args);
              return {
                functionName: name,
                arguments: args || {},
                confidence: 0.9,
                reasoning: `Gemini selected function: ${name}`
              };
            }
          }
        }
        // If no function call, treat as conversation
        if (candidate.content && candidate.content.parts && candidate.content.parts[0].text) {
          return {
            functionName: 'conversation',
            arguments: { response: candidate.content.parts[0].text },
            confidence: 0.5,
            reasoning: 'No function call returned, treating as conversation'
          };
        }
      }
      // Fallback to keyword logic
      return this.fallbackIntentParsing(userText, context);
    } catch (error) {
      this.log('Error parsing intent:', error);
      // Fallback to simple keyword matching
      return this.fallbackIntentParsing(userText, context);
    }
  }

  private buildSystemPrompt(context: Context): string {
    const contextInfo = `
Current Context:
- Active Application: ${context.activeApp}
- Window Title: ${context.windowTitle}
- Clipboard Content: ${context.clipboardContent.substring(0, 200)}${context.clipboardContent.length > 200 ? '...' : ''}
- Recent Commands: ${context.recentCommands.slice(-3).join(', ')}
- Screen Text: ${context.screenText?.substring(0, 100) || 'None'}${context.screenText && context.screenText.length > 100 ? '...' : ''}
`;

    return `You are Friday, an advanced AI assistant that can control the user's computer and perform various tasks.

${contextInfo}

CRITICAL INSTRUCTIONS:
1. ALWAYS try to use the available functions to perform actions rather than just providing information
2. If the user asks for something that can be done with a function, use the function
3. Only provide conversational responses for general questions that don't require system actions
4. Be precise with function arguments - extract the exact information the user wants
5. If the user's request is ambiguous, ask for clarification or make reasonable assumptions
6. When opening applications, prefer native apps over web versions unless specifically requested

FUNCTION MAPPING GUIDE:
- For opening applications: Use 'open_app' with appName parameter
- For opening websites/URLs: Use 'open_url' with url parameter  
- For web searches: Use 'open_url' with the search query as url parameter
- For email composition: Use 'email_draft' with recipient, subject, and body parameters

EXAMPLES:
- "open Chrome" → open_app with appName: "chrome"
- "search for cats" → open_url with url: "cats" (will be treated as search)
- "open google.com" → open_url with url: "https://google.com"
- "email john@example.com" → email_draft with recipient: "john@example.com"

Available functions are provided below. Choose the most appropriate one based on the user's request.`;
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