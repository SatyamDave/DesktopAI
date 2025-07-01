// Optional sql.js import
let initSqlJs: any = null;
let Database: any = null;
let SqlJsStatic: any = null;

try {
  const sqlJs = require('sql.js');
  initSqlJs = sqlJs.default || sqlJs;
  Database = sqlJs.Database;
  SqlJsStatic = sqlJs.SqlJsStatic;
} catch (error) {
  console.warn('⚠️ sql.js not available - database features will be disabled');
}

import { configManager } from './ConfigManager';
import { DatabaseManager } from './DatabaseManager';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import axios from 'axios';
import { shell } from 'electron';
import { agenticCommandProcessor } from './AgenticCommandProcessor';
import { EmailService } from './EmailService';

interface Conversation {
  id: number;
  user_input: string;
  ai_response: string;
  timestamp: number;
  context: string;
  intent: string;
}

interface Command {
  id: number;
  name: string;
  description: string;
  pattern: string;
  action: string;
  is_active: boolean;
}

interface EmailDraft {
  subject: string;
  body: string;
  recipient?: string;
  tone: 'professional' | 'casual' | 'formal' | 'friendly';
  length: 'brief' | 'detailed' | 'concise';
}

export class AIProcessor {
  private db: any = null;
  private sqlJs: any = null;
  private dbPath: string;
  private commands: Map<string, Command> = new Map();
  private agenticCommandProcessor: typeof agenticCommandProcessor;
  private configManager: typeof configManager;
  private emailService: EmailService;
  private debug: boolean;
  private openaiApiKey: string | null = null;
  private openaiEndpoint: string | null = null;
  private openaiDeployment: string | null = null;
  private geminiApiKey: string | null = null;
  private azureOpenaiKey: string | null = null;
  private azureOpenaiEndpoint: string | null = null;
  private azureOpenaiDeployment: string | null = null;
  private azureOpenaiApiVersion: string | null = null;
  private databaseManager: DatabaseManager;
  private conversationHistory: Conversation[] = [];
  private maxHistoryLength = 50;
  private isInitialized = false;

  constructor() {
    this.agenticCommandProcessor = agenticCommandProcessor;
    this.emailService = new EmailService();
    this.configManager = configManager;
    this.databaseManager = DatabaseManager.getInstance();
    this.debug = this.configManager.isDebugMode();
    const dbDir = path.join(os.homedir(), '.doppel');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.dbPath = path.join(dbDir, 'ai.sqlite');
    
    // Load AI configuration
    this.openaiApiKey = process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || null;
    this.openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT || null;
    this.openaiDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || null;
    this.geminiApiKey = process.env.GEMINI_API_KEY || null;
    this.azureOpenaiKey = process.env.AZURE_OPENAI_API_KEY || null;
    this.azureOpenaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT || null;
    this.azureOpenaiDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || null;
    this.azureOpenaiApiVersion = process.env.AZURE_OPENAI_API_VERSION || null;
    
    if (this.debug) {
      console.log('[AIProcessor] AI Configuration:', {
        hasOpenAIKey: !!this.openaiApiKey,
        hasOpenAIEndpoint: !!this.openaiEndpoint,
        hasOpenAIDeployment: !!this.openaiDeployment,
        hasGeminiKey: !!this.geminiApiKey,
        hasAzureOpenAIKey: !!this.azureOpenaiKey,
        hasAzureOpenAIEndpoint: !!this.azureOpenaiEndpoint,
        hasAzureOpenAIDeployment: !!this.azureOpenaiDeployment,
        apiVersion: this.azureOpenaiApiVersion
      });
    }
  }

  public async init() {
    this.sqlJs = await initSqlJs();
    if (fs.existsSync(this.dbPath)) {
      const filebuffer = fs.readFileSync(this.dbPath);
      this.db = new this.sqlJs.Database(filebuffer);
      // Ensure tables exist even in existing database
      this.initializeDatabase();
    } else {
      this.db = new this.sqlJs.Database();
      this.initializeDatabase();
      this.saveToDisk();
    }
    this.loadCommands();
  }

  private initializeDatabase() {
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_input TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        context TEXT,
        intent TEXT
      );
      CREATE TABLE IF NOT EXISTS commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        pattern TEXT NOT NULL,
        action TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS email_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_prompt TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        recipient TEXT,
        tone TEXT,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_email_drafts_timestamp ON email_drafts(timestamp DESC);
    `);
  }

  private saveToDisk() {
    if (this.db) {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    }
  }

  private loadCommands() {
    if (!this.db) return;
    const res = this.db.exec('SELECT * FROM commands WHERE is_active = 1');
    if (res[0] && res[0].values) {
      for (const row of res[0].values) {
        const cmd: Command = {
          id: row[0],
          name: row[1],
          description: row[2],
          pattern: row[3],
          action: row[4],
          is_active: !!row[5]
        };
        this.commands.set(cmd.name, cmd);
      }
    }
  }

  public async processInput(input: string, context?: any): Promise<string> {
    if (!this.db) await this.init();
    try {
      if (this.debug) console.log(`[AIProcessor] Processing input: "${input}"`);
      
      const intent = this.detectIntent(input);
      
      // Handle email composition with validation
      if (intent === 'email') {
        return await this.handleEmailComposition(input, context);
      }
      
      // Handle simple conversational inputs directly with Gemini
      if (intent === 'general' || intent === 'help') {
        if (this.geminiApiKey) {
          try {
            const prompt = `You are a helpful AI assistant. The user said: "${input}". Please provide a friendly, helpful response. Keep it concise and conversational.`;
            const response = await this.callGeminiAPI(prompt);
            if (this.debug) console.log(`[AIProcessor] Using Gemini for conversational response`);
            
            // Save conversation to database
            const conversation: Conversation = {
              id: 0,
              user_input: input,
              ai_response: response,
              timestamp: Date.now(),
              context: context ? JSON.stringify(context) : '',
              intent: intent
            };
            
            this.db!.run(
              'INSERT INTO conversations (user_input, ai_response, timestamp, context, intent) VALUES (?, ?, ?, ?, ?)',
              [conversation.user_input, conversation.ai_response, conversation.timestamp, conversation.context, conversation.intent]
            );
            this.saveToDisk();
            
            return response;
          } catch (error) {
            if (this.debug) console.log(`[AIProcessor] Gemini failed for conversation, falling back to command executor:`, error);
          }
        }
      }
      
      const conversation: Conversation = {
        id: 0,
        user_input: input,
        ai_response: '',
        timestamp: Date.now(),
        context: context ? JSON.stringify(context) : '',
        intent: intent
      };
      
      // Use AgenticCommandProcessor for command execution
      const commandResult = await this.agenticCommandProcessor.processCommand(input);
      
      // Generate AI response based on command result
      const aiResponse = this.generateAIResponse(input, commandResult);
      conversation.ai_response = aiResponse;
      
      // Save conversation
      await this.saveConversation(conversation);
      
      return aiResponse;
      
    } catch (error) {
      console.error('[AIProcessor] Error processing input:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  }

  private async handleEmailComposition(input: string, context?: any): Promise<string> {
    try {
      // Ensure database is initialized
      if (!this.db) {
        await this.init();
      }
      
      // Validate email address first
      const emailValidation = this.validateEmailAddress(input);
      
      if (!emailValidation.hasValidEmail && emailValidation.nameOnly) {
        if (emailValidation.nameOnly === 'email_only') {
          // Check if we have a pending email request in context
          if (context && context.pendingEmailRequest) {
            // User provided email address for a pending request
            const completeRequest = context.pendingEmailRequest.replace('{EMAIL}', emailValidation.emailAddress!);
            if (this.debug) console.log(`[AIProcessor] Processing pending email request: "${completeRequest}"`);
            
            // Clear the pending request
            delete context.pendingEmailRequest;
            
            // Process the complete request
            return await this.processEmailRequest(completeRequest, context);
          } else {
            return `I see you provided an email address (${emailValidation.emailAddress}), but I need more context about what you'd like to write. Please provide a complete request like "write an email to ${emailValidation.emailAddress} about the meeting" or "compose an email to ${emailValidation.emailAddress} regarding the project update".`;
          }
        }
        
        // Extract the name and create a conversational response
        const name = emailValidation.nameOnly;
        const emailKeywords = ['email', 'mail', 'send', 'compose', 'draft', 'write'];
        const hasEmailKeywords = emailKeywords.some(keyword => input.toLowerCase().includes(keyword));
        
        if (hasEmailKeywords) {
          // Create a template for the pending request
          const pendingRequest = input.replace(new RegExp(`\\b${name}\\b`, 'gi'), '{EMAIL}');
          
          // Store the pending request in context for the next interaction
          if (!context) context = {};
          context.pendingEmailRequest = pendingRequest;
          
          return `I'd be happy to help you write that email to ${name}! Could you please provide ${name}'s email address?`;
        }
        
        return `I'd be happy to help you compose an email to ${emailValidation.nameOnly}, but I need their email address to proceed. Please provide the complete email address (e.g., "write an email to john@example.com" or "compose email to john.smith@gmail.com").`;
      }
      
      // Process the original request
      return await this.processEmailRequest(input, context);
    } catch (error) {
      console.error('[AIProcessor] Email composition error:', error);
      return 'I encountered an error while composing your email. Please try again.';
    }
  }

  private async processEmailRequest(input: string, context?: any): Promise<string> {
    if (!this.openaiApiKey && !this.geminiApiKey) {
      return 'No AI API key configured. Please set OPENAI_API_KEY or GEMINI_API_KEY in your environment variables.';
    }

    const emailDraft = await this.generateEmailDraft(input, context);
    const mailtoUrl = this.createMailtoUrl(emailDraft);
    
    // Save email draft to database (with error handling)
    try {
      this.db!.run(
        'INSERT INTO email_drafts (user_prompt, subject, body, recipient, tone, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [input, emailDraft.subject, emailDraft.body, emailDraft.recipient || '', emailDraft.tone, Date.now()]
      );
      this.saveToDisk();
    } catch (dbError) {
      console.warn('[AIProcessor] Failed to save email draft to database:', dbError);
      // Continue with email composition even if database save fails
    }
    
    await shell.openExternal(mailtoUrl);
    return `Email draft created and opened in your default email client. Subject: "${emailDraft.subject}"`;
  }

  private async generateEmailDraft(input: string, context?: any): Promise<EmailDraft> {
    const prompt = this.createEmailPrompt(input, context);
    
    try {
      let response;
      
      // Try Gemini first (free), then OpenAI
      if (this.geminiApiKey) {
        try {
          response = await this.callGeminiAPI(prompt);
          if (this.debug) console.log('[AIProcessor] Using Gemini API');
        } catch (error: any) {
          if (this.debug) console.log('[AIProcessor] Gemini failed, trying OpenAI:', error.message);
          if (this.openaiApiKey) {
            response = await this.callOpenAIAPI(prompt);
            if (this.debug) console.log('[AIProcessor] Using OpenAI API');
          } else {
            throw error;
          }
        }
      } else if (this.openaiApiKey) {
        response = await this.callOpenAIAPI(prompt);
        if (this.debug) console.log('[AIProcessor] Using OpenAI API');
      } else {
        throw new Error('No AI API keys configured');
      }

      const aiResponse = response;
      
      // Parse JSON response
      try {
        let jsonText = aiResponse;
        
        // Remove markdown code blocks if present
        if (aiResponse.includes('```json')) {
          jsonText = aiResponse.split('```json')[1].split('```')[0].trim();
        } else if (aiResponse.includes('```')) {
          jsonText = aiResponse.split('```')[1].split('```')[0].trim();
        }
        
        const emailData = JSON.parse(jsonText);
        return {
          subject: emailData.subject || 'Email',
          body: emailData.body || '',
          recipient: emailData.recipient,
          tone: emailData.tone || 'professional',
          length: emailData.length || 'brief'
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          subject: 'Email',
          body: aiResponse,
          tone: 'professional',
          length: 'brief'
        };
      }
    } catch (error) {
      console.error('[AIProcessor] AI API error:', error);
      throw new Error('Failed to generate email draft with AI');
    }
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    try {
      // Try gemini-2.0-flash first (free tier model)
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.candidates[0].content.parts[0].text;
    } catch (error: any) {
      // If gemini-2.0-flash fails, try gemini-pro (legacy)
      if (error.response?.status === 404) {
        const altResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`,
          {
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000
            }
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        return altResponse.data.candidates[0].content.parts[0].text;
      }
      throw error;
    }
  }

  private async callOpenAIAPI(prompt: string): Promise<string> {
    let response;
    
    if (this.openaiEndpoint && this.openaiDeployment) {
      // Azure OpenAI
      const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-04-01-preview';
      response = await axios.post(
        `${this.openaiEndpoint}/openai/deployments/${this.openaiDeployment}/chat/completions?api-version=${apiVersion}`,
        {
          messages: [
            {
              role: 'system',
              content: 'You are an expert email composer. Create professional, well-structured email drafts based on user requests. Always respond with valid JSON containing subject, body, recipient (if specified), tone, and length fields.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        },
        {
          headers: {
            'api-key': this.openaiApiKey,
            'Content-Type': 'application/json'
          }
        }
      );
    } else {
      // OpenAI
      response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert email composer. Create professional, well-structured email drafts based on user requests. Always respond with valid JSON containing subject, body, recipient (if specified), tone, and length fields.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    return response.data.choices[0].message.content;
  }

  private createEmailPrompt(input: string, context?: any): string {
    const contextInfo = context ? `\nContext: ${JSON.stringify(context)}` : '';
    
    return `Please compose an email based on this request: "${input}"${contextInfo}

Requirements:
- Extract recipient from the request if mentioned
- Determine appropriate tone (professional, casual, formal, friendly)
- Choose appropriate length (brief, detailed, concise)
- Create a clear, professional subject line
- Write a well-structured email body

Respond with JSON in this format:
{
  "subject": "Email Subject",
  "body": "Email body content...",
  "recipient": "email@example.com" (if specified),
  "tone": "professional",
  "length": "brief"
}`;
  }

  private createMailtoUrl(emailDraft: EmailDraft): string {
    const params = new URLSearchParams();
    if (emailDraft.subject) params.append('subject', emailDraft.subject);
    if (emailDraft.body) params.append('body', emailDraft.body);
    
    const mailtoUrl = emailDraft.recipient 
      ? `mailto:${emailDraft.recipient}?${params.toString()}`
      : `mailto:?${params.toString()}`;
    
    return mailtoUrl;
  }

  private detectIntent(input: string): string {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('open') || lowerInput.includes('launch') || lowerInput.includes('start')) {
      return 'app_launch';
    }
    if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('google')) {
      return 'search';
    }
    if (lowerInput.includes('youtube') || lowerInput.includes('video')) {
      return 'youtube_search';
    }
    if (lowerInput.includes('email') || lowerInput.includes('mail') || lowerInput.includes('send') || 
        lowerInput.includes('compose') || lowerInput.includes('draft')) {
      return 'email';
    }
    if (lowerInput.includes('copy') || lowerInput.includes('clipboard')) {
      return 'clipboard';
    }
    if (lowerInput.includes('schedule') || lowerInput.includes('remind')) {
      return 'scheduling';
    }
    if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
      return 'help';
    }
    
    return 'general';
  }

  private validateEmailAddress(input: string): { hasValidEmail: boolean; emailAddress?: string; nameOnly?: string } {
    // Email regex pattern
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    
    // Find email addresses in the input
    const emailMatches = input.match(emailRegex);
    
    if (emailMatches && emailMatches.length > 0) {
      // If the input is just an email address (no other context), it might be a response to a previous prompt
      const trimmedInput = input.trim();
      if (trimmedInput === emailMatches[0]) {
        return { 
          hasValidEmail: false, 
          nameOnly: 'email_only',
          emailAddress: emailMatches[0] 
        };
      }
      return { hasValidEmail: true, emailAddress: emailMatches[0] };
    }
    
    // Check if input contains common email-related words that might indicate a name-only request
    const emailKeywords = ['email', 'mail', 'send', 'compose', 'draft', 'write', 'to'];
    const hasEmailKeywords = emailKeywords.some(keyword => input.toLowerCase().includes(keyword));
    
    if (hasEmailKeywords) {
      // Extract potential name (words that could be a name)
      const words = input.split(/\s+/).filter(word => 
        word.length > 0 && 
        !emailKeywords.includes(word.toLowerCase()) &&
        !['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word.toLowerCase())
      );
      
      if (words.length > 0) {
        return { hasValidEmail: false, nameOnly: words.join(' ') };
      }
    }
    
    return { hasValidEmail: false };
  }

  private generateAIResponse(input: string, commandResult: any): string {
    if (commandResult.success) {
      // Command was executed successfully
      return commandResult.message;
    } else {
      // Command failed, provide helpful response
      const intent = this.detectIntent(input);
      
      switch (intent) {
        case 'app_launch':
          return `I couldn't launch that application. ${commandResult.message} Try saying "open Chrome", "launch Notepad", or "start Calculator".`;
        
        case 'search':
          return `I couldn't perform that search. ${commandResult.message} Try saying "search for React tutorials" or "find TypeScript documentation".`;
        
        case 'youtube_search':
          return `I couldn't search YouTube. ${commandResult.message} Try saying "YouTube React tutorial" or "video Logan Paul".`;
        
        case 'email':
          return `I couldn't open your email client. ${commandResult.message} Make sure you have a default email application configured.`;
        
        default:
          return commandResult.message || 'I understand your request, but I need more specific instructions. Try saying "open Chrome" or "search for something".';
      }
    }
  }

  public async getConversationHistory(limit = 20): Promise<Conversation[]> {
    if (!this.db) await this.init();
    try {
      const res = this.db!.exec('SELECT * FROM conversations ORDER BY timestamp DESC LIMIT ?', [limit]);
      if (res[0] && res[0].values) {
        return res[0].values.map((row: any) => ({
          id: row[0],
          user_input: row[1],
          ai_response: row[2],
          timestamp: row[3],
          context: row[4],
          intent: row[5]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  public async getEmailDraftHistory(limit = 20): Promise<any[]> {
    if (!this.db) await this.init();
    try {
      const res = this.db!.exec('SELECT * FROM email_drafts ORDER BY timestamp DESC LIMIT ?', [limit]);
      if (res[0] && res[0].values) {
        return res[0].values.map((row: any) => ({
          id: row[0],
          user_prompt: row[1],
          subject: row[2],
          body: row[3],
          recipient: row[4],
          tone: row[5],
          timestamp: row[6]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting email draft history:', error);
      return [];
    }
  }

  public async addCommand(command: Omit<Command, 'id'>): Promise<boolean> {
    if (!this.db) await this.init();
    try {
      this.db!.run(
        'INSERT OR REPLACE INTO commands (name, description, pattern, action, is_active) VALUES (?, ?, ?, ?, ?)',
        [command.name, command.description, command.pattern, command.action, command.is_active ? 1 : 0]
      );
      this.loadCommands();
      this.saveToDisk();
      return true;
    } catch (error) {
      console.error('Error adding command:', error);
      return false;
    }
  }

  public async getCommands(): Promise<Command[]> {
    if (!this.db) await this.init();
    try {
      const res = this.db!.exec('SELECT * FROM commands ORDER BY name');
      if (res[0] && res[0].values) {
        return res[0].values.map((row: any) => ({
          id: row[0],
          name: row[1],
          description: row[2],
          pattern: row[3],
          action: row[4],
          is_active: !!row[5]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting commands:', error);
      return [];
    }
  }

  public async deleteCommand(commandName: string): Promise<boolean> {
    if (!this.db) await this.init();
    try {
      this.db!.run('DELETE FROM commands WHERE name = ?', [commandName]);
      this.loadCommands();
      this.saveToDisk();
      return true;
    } catch (error) {
      console.error('Error deleting command:', error);
      return false;
    }
  }

  public async exportConversations(): Promise<any> {
    if (!this.db) await this.init();
    try {
      const conversations = await this.getConversationHistory(1000);
      const commands = await this.getCommands();
      const emailHistory = this.emailService.getEmailHistory(1000);
      
      return {
        conversations,
        commands,
        emailHistory,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting conversations:', error);
      return null;
    }
  }

  public isAIConfigured(): boolean {
    return this.emailService.isAIConfigured();
  }

  // Email service methods
  public getEmailHistory(limit: number = 20): any[] {
    return this.emailService.getEmailHistory(limit);
  }

  public clearEmailHistory(): void {
    return this.emailService.clearEmailHistory();
  }

  public getEmailConfigurationStatus(): any {
    return this.emailService.getConfigurationStatus();
  }

  private async saveConversation(conversation: Conversation) {
    if (!this.db) await this.init();
    this.db!.run(
      'INSERT INTO conversations (user_input, ai_response, timestamp, context, intent) VALUES (?, ?, ?, ?, ?)',
      [conversation.user_input, conversation.ai_response, conversation.timestamp, conversation.context, conversation.intent]
    );
    this.saveToDisk();
  }
}

export const aiProcessor = new AIProcessor();
