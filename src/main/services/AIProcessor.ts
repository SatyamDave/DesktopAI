import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { CommandExecutor } from './CommandExecutor';

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

export class AIProcessor {
  private db: Database | null = null;
  private sqlJS: SqlJsStatic | null = null;
  private dbPath: string;
  private commands: Map<string, Command> = new Map();
  private commandExecutor: CommandExecutor;

  constructor() {
    const dbDir = path.join(os.homedir(), '.doppel');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.dbPath = path.join(dbDir, 'ai.sqlite');
    this.commandExecutor = new CommandExecutor();
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
      CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp DESC);
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
      console.log(`🤖 Processing input: "${input}"`);
      
      const conversation: Conversation = {
        id: 0,
        user_input: input,
        ai_response: '',
        timestamp: Date.now(),
        context: context ? JSON.stringify(context) : '',
        intent: this.detectIntent(input)
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
      
      console.log(`✅ Command processed successfully: ${commandResult.success}`);
      return response;
    } catch (error) {
      console.error('Error processing input:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
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
    if (lowerInput.includes('email') || lowerInput.includes('mail') || lowerInput.includes('send')) {
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
      
      return {
        conversations,
        commands,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting conversations:', error);
      return null;
    }
  }
} 