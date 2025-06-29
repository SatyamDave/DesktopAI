import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

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

  constructor() {
    const dbDir = path.join(os.homedir(), '.doppel');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.dbPath = path.join(dbDir, 'ai.sqlite');
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
      const conversation: Conversation = {
        id: 0,
        user_input: input,
        ai_response: '',
        timestamp: Date.now(),
        context: context ? JSON.stringify(context) : '',
        intent: this.detectIntent(input)
      };
      const response = await this.generateResponse(input, context);
      conversation.ai_response = response;
      this.db!.run(
        'INSERT INTO conversations (user_input, ai_response, timestamp, context, intent) VALUES (?, ?, ?, ?, ?)',
        [conversation.user_input, conversation.ai_response, conversation.timestamp, conversation.context, conversation.intent]
      );
      this.saveToDisk();
      return response;
    } catch (error) {
      console.error('Error processing input:', error);
      return 'I apologize, but I encountered an error processing your request.';
    }
  }

  private detectIntent(input: string): string {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('open') || lowerInput.includes('launch')) {
      return 'app_launch';
    }
    if (lowerInput.includes('search') || lowerInput.includes('find')) {
      return 'search';
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

  private async generateResponse(input: string, context?: any): Promise<string> {
    const intent = this.detectIntent(input);
    const lowerInput = input.toLowerCase();

    switch (intent) {
      case 'app_launch':
        return this.handleAppLaunch(input);
      
      case 'search':
        return this.handleSearch(input);
      
      case 'clipboard':
        return this.handleClipboard(input);
      
      case 'scheduling':
        return this.handleScheduling(input);
      
      case 'help':
        return this.getHelpResponse();
      
      default:
        return this.handleGeneralQuery(input, context);
    }
  }

  private handleAppLaunch(input: string): string {
    const apps = [
      { name: 'chrome', aliases: ['browser', 'google chrome', 'web browser'] },
      { name: 'notepad', aliases: ['text editor', 'notes'] },
      { name: 'calculator', aliases: ['calc', 'math'] },
      { name: 'explorer', aliases: ['file explorer', 'files', 'folder'] },
      { name: 'spotify', aliases: ['music', 'audio'] },
      { name: 'discord', aliases: ['chat', 'communication'] },
      { name: 'vscode', aliases: ['code', 'visual studio code', 'editor'] }
    ];

    for (const app of apps) {
      if (app.aliases.some(alias => input.toLowerCase().includes(alias))) {
        return `I'll help you open ${app.name}. You can use the command: "open ${app.name}" or I can assist with launching it directly.`;
      }
    }

    return 'I can help you open applications. Try saying "open [application name]" or "launch [application name]".';
  }

  private handleSearch(input: string): string {
    const searchTerms = input.toLowerCase().replace(/search|find/g, '').trim();
    if (searchTerms) {
      return `I'll help you search for "${searchTerms}". You can search the web, your files, or clipboard history. What would you like to search?`;
    }
    return 'What would you like me to search for? I can search the web, your files, or clipboard history.';
  }

  private handleClipboard(input: string): string {
    if (input.toLowerCase().includes('history')) {
      return 'I can show you your clipboard history. You can also search through it or clear it if needed.';
    }
    if (input.toLowerCase().includes('clear')) {
      return 'I can help you clear your clipboard history. Would you like me to do that now?';
    }
    return 'I can help you manage your clipboard. I can show history, search through it, or help you copy/paste items.';
  }

  private handleScheduling(input: string): string {
    return 'I can help you schedule tasks and set reminders. What would you like to schedule?';
  }

  private getHelpResponse(): string {
    return `I'm Doppel, your AI assistant! Here's what I can help you with:

• **Open applications**: "Open Chrome", "Launch Notepad"
• **Search**: "Search for files", "Find documents"
• **Clipboard management**: "Show clipboard history", "Search clipboard"
• **Scheduling**: "Remind me to call mom", "Schedule meeting"
• **General assistance**: Ask me anything!

Just type your request and I'll help you get things done!`;
  }

  private async handleGeneralQuery(input: string, context?: any): Promise<string> {
    // Simple response generation based on input patterns
    if (input.toLowerCase().includes('hello') || input.toLowerCase().includes('hi')) {
      return 'Hello! I\'m Doppel, your AI assistant. How can I help you today?';
    }
    
    if (input.toLowerCase().includes('time')) {
      return `The current time is ${new Date().toLocaleTimeString()}.`;
    }
    
    if (input.toLowerCase().includes('date')) {
      return `Today is ${new Date().toLocaleDateString()}.`;
    }
    
    if (input.toLowerCase().includes('weather')) {
      return 'I can help you check the weather. Would you like me to look up the current weather for your location?';
    }
    
    if (input.toLowerCase().includes('thank')) {
      return 'You\'re welcome! Is there anything else I can help you with?';
    }

    return 'I understand you\'re asking about "' + input + '". I\'m here to help! Could you be more specific about what you\'d like me to do?';
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