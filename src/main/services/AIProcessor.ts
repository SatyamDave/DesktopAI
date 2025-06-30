import initSqlJs from 'sql.js';
import type { Database, SqlJsStatic } from 'sql.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import axios from 'axios';
import { shell } from 'electron';
import { CommandExecutor } from './CommandExecutor';
import { ConfigManager } from './ConfigManager';
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
  private db: Database | null = null;
  private sqlJS: SqlJsStatic | null = null;
  private dbPath: string;
  private commands: Map<string, Command> = new Map();
  private commandExecutor: CommandExecutor;
  private configManager: ConfigManager;
  private emailService: EmailService;
  private debug: boolean;
  private openaiApiKey: string | null = null;
  private openaiEndpoint: string | null = null;
  private openaiDeployment: string | null = null;
  private geminiApiKey: string | null = null;

  constructor() {
    this.configManager = new ConfigManager();
    this.debug = this.configManager.isDebugMode();
    const dbDir = path.join(os.homedir(), '.doppel');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.dbPath = path.join(dbDir, 'ai.sqlite');
    this.commandExecutor = new CommandExecutor();
    this.emailService = new EmailService();
    
    // Load AI configuration
    this.openaiApiKey = process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || null;
    this.openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT || null;
    this.openaiDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || null;
    this.geminiApiKey = process.env.GEMINI_API_KEY || null;
    
    if (this.debug) {
      console.log('[AIProcessor] AI Configuration:', {
        hasOpenAIKey: !!this.openaiApiKey,
        hasOpenAIEndpoint: !!this.openaiEndpoint,
        hasOpenAIDeployment: !!this.openaiDeployment,
        hasGeminiKey: !!this.geminiApiKey,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION
      });
    }
  }

  public async init() {
    this.sqlJS = await initSqlJs();
    if (fs.existsSync(this.dbPath)) {
      const filebuffer = fs.readFileSync(this.dbPath);
      this.db = new this.sqlJS.Database(filebuffer);
    } else {
      this.db = new this.sqlJS.Database();
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
      
      // Handle email composition with EmailService
      if (intent === 'email') {
        return await this.emailService.composeAndOpenEmail(input, context);
      }
      
      const conversation: Conversation = {
        id: 0,
        user_input: input,
        ai_response: '',
        timestamp: Date.now(),
        context: context ? JSON.stringify(context) : '',
        intent: intent
      };
      
      // Use CommandExecutor for actual command execution
      const commandResult = await this.commandExecutor.executeCommand(input);
      // Generate AI response based on command result
      const response = this.generateAIResponse(input, commandResult, context);
      conversation.ai_response = response;
      
      // Save conversation to database
      this.db!.run(
        'INSERT INTO conversations (user_input, ai_response, timestamp, context, intent) VALUES (?, ?, ?, ?, ?)',
        [conversation.user_input, conversation.ai_response, conversation.timestamp, conversation.context, conversation.intent]
      );
      this.saveToDisk();
      if (this.debug) console.log(`[AIProcessor] Command processed: success=${commandResult.success}`);
      return response;
    } catch (error) {
      console.error('[AIProcessor] Error processing input:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  }

  private async handleEmailComposition(input: string, context?: any): Promise<string> {
    try {
      if (!this.openaiApiKey && !this.geminiApiKey) {
        return 'No AI API key configured. Please set OPENAI_API_KEY or GEMINI_API_KEY in your environment variables.';
      }

      const emailDraft = await this.generateEmailDraft(input, context);
      
      // Save email draft to database
      this.db!.run(
        'INSERT INTO email_drafts (user_prompt, subject, body, recipient, tone, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [input, emailDraft.subject, emailDraft.body, emailDraft.recipient || '', emailDraft.tone, Date.now()]
      );
      this.saveToDisk();

      // Open email client with the generated content
      const mailtoUrl = this.createMailtoUrl(emailDraft);
      await shell.openExternal(mailtoUrl);

      return `Email draft created and opened in your email client!\n\nSubject: ${emailDraft.subject}\n\nBody:\n${emailDraft.body}`;
    } catch (error) {
      console.error('[AIProcessor] Error composing email:', error);
      return 'I encountered an error while composing your email. Please try again.';
    }
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
        } catch (error) {
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

  private generateAIResponse(input: string, commandResult: any, context?: any): string {
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
  public getEmailHistory(limit: number = 20) {
    return this.emailService.getEmailHistory(limit);
  }

  public clearEmailHistory() {
    return this.emailService.clearEmailHistory();
  }

  public getEmailConfigurationStatus() {
    return this.emailService.getConfigurationStatus();
  }
} 