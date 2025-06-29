import { shell, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface AppConfig {
  name: string;
  aliases: string[];
  windowsPath?: string;
  macPath?: string;
  linuxPath?: string;
  url?: string;
}

interface CommandHistory {
  command: string;
  timestamp: number;
  success: boolean;
  result: string;
}

export class CommandExecutor {
  private commandHistory: CommandHistory[] = [];
  private maxHistorySize = 50;
  private historyFile: string;

  // App configurations for different platforms
  private appConfigs: AppConfig[] = [
    {
      name: 'chrome',
      aliases: ['browser', 'google chrome', 'web browser', 'chromium'],
      windowsPath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      macPath: '/Applications/Google Chrome.app',
      linuxPath: 'google-chrome'
    },
    {
      name: 'notepad',
      aliases: ['text editor', 'notes', 'notepad++'],
      windowsPath: 'notepad.exe',
      macPath: '/Applications/TextEdit.app',
      linuxPath: 'gedit'
    },
    {
      name: 'calculator',
      aliases: ['calc', 'math', 'calculator app'],
      windowsPath: 'calc.exe',
      macPath: '/Applications/Calculator.app',
      linuxPath: 'gnome-calculator'
    },
    {
      name: 'explorer',
      aliases: ['file explorer', 'files', 'folder', 'file manager'],
      windowsPath: 'explorer.exe',
      macPath: '/System/Library/CoreServices/Finder.app',
      linuxPath: 'nautilus'
    },
    {
      name: 'spotify',
      aliases: ['music', 'audio', 'spotify app'],
      windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Roaming\\Spotify\\Spotify.exe',
      macPath: '/Applications/Spotify.app',
      linuxPath: 'spotify'
    },
    {
      name: 'discord',
      aliases: ['chat', 'communication', 'discord app'],
      windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Local\\Discord\\app-*\\Discord.exe',
      macPath: '/Applications/Discord.app',
      linuxPath: 'discord'
    },
    {
      name: 'vscode',
      aliases: ['code', 'visual studio code', 'editor', 'vs code'],
      windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',
      macPath: '/Applications/Visual Studio Code.app',
      linuxPath: 'code'
    },
    {
      name: 'figma',
      aliases: ['design', 'figma app'],
      url: 'https://www.figma.com'
    },
    {
      name: 'zoom',
      aliases: ['meeting', 'video call', 'zoom app'],
      windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Roaming\\Zoom\\bin\\Zoom.exe',
      macPath: '/Applications/zoom.us.app',
      linuxPath: 'zoom'
    },
    {
      name: 'notion',
      aliases: ['notes', 'notion app', 'workspace'],
      url: 'https://www.notion.so'
    }
  ];

  constructor() {
    const dbDir = path.join(os.homedir(), '.doppel');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.historyFile = path.join(dbDir, 'command-history.json');
    this.loadCommandHistory();
  }

  private loadCommandHistory() {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8');
        this.commandHistory = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading command history:', error);
      this.commandHistory = [];
    }
  }

  private saveCommandHistory() {
    try {
      // Keep only the last maxHistorySize commands
      if (this.commandHistory.length > this.maxHistorySize) {
        this.commandHistory = this.commandHistory.slice(-this.maxHistorySize);
      }
      fs.writeFileSync(this.historyFile, JSON.stringify(this.commandHistory, null, 2));
    } catch (error) {
      console.error('Error saving command history:', error);
    }
  }

  private addToHistory(command: string, success: boolean, result: string) {
    this.commandHistory.push({
      command,
      timestamp: Date.now(),
      success,
      result
    });
    this.saveCommandHistory();
  }

  public async executeCommand(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase().trim();
    console.log(`🔧 Executing command: "${input}"`);

    try {
      // App launch commands
      if (lowerInput.includes('open') || lowerInput.includes('launch') || lowerInput.includes('start')) {
        return await this.handleAppLaunch(input);
      }

      // Web search commands
      if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('google')) {
        return await this.handleWebSearch(input);
      }

      // Email commands
      if (lowerInput.includes('email') || lowerInput.includes('mail') || lowerInput.includes('send')) {
        return await this.handleEmailDraft(input);
      }

      // YouTube search
      if (lowerInput.includes('youtube') || lowerInput.includes('video')) {
        return await this.handleYouTubeSearch(input);
      }

      // General help
      if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
        return this.getHelpResponse();
      }

      // Default response
      const result = {
        success: true,
        message: `I understand you want to "${input}". I can help you open apps, search the web, send emails, and more. Try saying "open Chrome" or "search for something".`
      };
      this.addToHistory(input, true, result.message);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Command execution error:', errorMessage);
      const result = {
        success: false,
        message: 'Sorry, I encountered an error while processing your request.',
        error: errorMessage
      };
      this.addToHistory(input, false, errorMessage);
      return result;
    }
  }

  private async handleAppLaunch(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // Find matching app
    const app = this.appConfigs.find(config => 
      config.aliases.some(alias => lowerInput.includes(alias)) ||
      lowerInput.includes(config.name)
    );

    if (!app) {
      return {
        success: false,
        message: 'I couldn\'t find that application. Try saying "open Chrome", "launch Notepad", or "start Calculator".'
      };
    }

    try {
      if (app.url) {
        // Web-based app
        await shell.openExternal(app.url);
        return {
          success: true,
          message: `Opening ${app.name} in your browser...`,
          data: { app: app.name, type: 'web' }
        };
      } else {
        // Desktop app
        const appPath = this.getAppPath(app);
        if (!appPath) {
          return {
            success: false,
            message: `I couldn't find ${app.name} on your system. Please make sure it's installed.`
          };
        }

        await this.launchApp(appPath);
        return {
          success: true,
          message: `Launching ${app.name}...`,
          data: { app: app.name, type: 'desktop', path: appPath }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to launch ${app.name}. Please make sure it's installed and accessible.`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private getAppPath(app: AppConfig): string | null {
    const platform = os.platform();
    
    switch (platform) {
      case 'win32':
        return app.windowsPath || null;
      case 'darwin':
        return app.macPath || null;
      case 'linux':
        return app.linuxPath || null;
      default:
        return null;
    }
  }

  private async launchApp(appPath: string): Promise<void> {
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Handle Windows path with environment variables
      const expandedPath = appPath.replace(/%USERNAME%/g, os.userInfo().username);
      
      // Handle wildcards in path (like Discord app-*)
      if (expandedPath.includes('*')) {
        const basePath = expandedPath.substring(0, expandedPath.lastIndexOf('\\'));
        const pattern = expandedPath.substring(expandedPath.lastIndexOf('\\') + 1);
        
        if (fs.existsSync(basePath)) {
          const dirs = fs.readdirSync(basePath);
          const matchingDir = dirs.find(dir => dir.startsWith(pattern.replace('*', '')));
          if (matchingDir) {
            const fullPath = path.join(basePath, matchingDir, 'Discord.exe');
            if (fs.existsSync(fullPath)) {
              await execAsync(`"${fullPath}"`);
              return;
            }
          }
        }
      }
      
      // Try direct execution
      if (fs.existsSync(expandedPath)) {
        await execAsync(`"${expandedPath}"`);
      } else {
        // Try just the executable name
        await execAsync(appPath);
      }
    } else if (platform === 'darwin') {
      await execAsync(`open "${appPath}"`);
    } else {
      await execAsync(appPath);
    }
  }

  private async handleWebSearch(input: string): Promise<CommandResult> {
    const searchTerms = input
      .toLowerCase()
      .replace(/search|find|google/g, '')
      .trim();
    
    if (!searchTerms) {
      return {
        success: false,
        message: 'What would you like me to search for? Try saying "search for React tutorials" or "find information about TypeScript".'
      };
    }

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerms)}`;
    
    try {
      await shell.openExternal(searchUrl);
      return {
        success: true,
        message: `Searching for "${searchTerms}"...`,
        data: { searchTerms, url: searchUrl }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to open search in browser.',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async handleYouTubeSearch(input: string): Promise<CommandResult> {
    const searchTerms = input
      .toLowerCase()
      .replace(/youtube|video|search|find/g, '')
      .trim();
    
    if (!searchTerms) {
      return {
        success: false,
        message: 'What would you like me to search for on YouTube? Try saying "YouTube Logan Paul" or "video React tutorial".'
      };
    }

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerms)}`;
    
    try {
      await shell.openExternal(searchUrl);
      return {
        success: true,
        message: `Searching YouTube for "${searchTerms}"...`,
        data: { searchTerms, url: searchUrl }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to open YouTube search.',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async handleEmailDraft(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // Extract email content from input
    let subject = '';
    let body = '';
    let recipient = '';
    
    // Simple parsing for common email patterns
    if (lowerInput.includes('to ')) {
      const toMatch = input.match(/to\s+([^,\s]+)/i);
      if (toMatch) recipient = toMatch[1];
    }
    
    if (lowerInput.includes('asking for') || lowerInput.includes('requesting')) {
      subject = 'Request';
      body = input.replace(/.*?(asking for|requesting)\s+/i, '');
    } else if (lowerInput.includes('time off')) {
      subject = 'Time Off Request';
      body = 'I would like to request time off. Please let me know if you need any additional information.';
    } else {
      subject = 'Email';
      body = input.replace(/.*?(email|mail|send)\s+/i, '');
    }

    // Create mailto URL
    const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      await shell.openExternal(mailtoUrl);
      return {
        success: true,
        message: `Opening email client${recipient ? ` to ${recipient}` : ''}...`,
        data: { recipient, subject, body, url: mailtoUrl }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to open email client. Please make sure you have a default email application configured.',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private getHelpResponse(): CommandResult {
    return {
      success: true,
      message: `I'm Doppel, your AI assistant! Here's what I can help you with:

🎯 **App Launch**: "Open Chrome", "Launch Notepad", "Start Calculator"
🔍 **Web Search**: "Search for React tutorials", "Find TypeScript documentation"
📧 **Email**: "Send email to manager asking for time off", "Email team about meeting"
📺 **YouTube**: "YouTube React tutorial", "Video Logan Paul"
⚙️ **Other**: "Help", "What can you do?"

Just type your request and I'll help you get things done!`,
      data: { type: 'help' }
    };
  }

  public getCommandHistory(limit = 10): CommandHistory[] {
    return this.commandHistory.slice(-limit);
  }

  public getCommandSuggestions(input: string): string[] {
    const lowerInput = input.toLowerCase();
    const suggestions: string[] = [];
    
    // App suggestions
    this.appConfigs.forEach(app => {
      if (app.name.includes(lowerInput) || app.aliases.some(alias => alias.includes(lowerInput))) {
        suggestions.push(`Open ${app.name}`);
      }
    });
    
    // Common command suggestions
    if (lowerInput.includes('search') || lowerInput.includes('find')) {
      suggestions.push('Search for React tutorials');
      suggestions.push('Find TypeScript documentation');
    }
    
    if (lowerInput.includes('email') || lowerInput.includes('mail')) {
      suggestions.push('Send email to manager asking for time off');
      suggestions.push('Email team about meeting');
    }
    
    if (lowerInput.includes('youtube') || lowerInput.includes('video')) {
      suggestions.push('YouTube React tutorial');
      suggestions.push('Video Logan Paul');
    }
    
    return suggestions.slice(0, 5);
  }

  public async executeCommandQueue(commands: string[]): Promise<CommandResult[]> {
    const results: CommandResult[] = [];
    
    for (const command of commands) {
      console.log(`🔄 Executing command in queue: "${command}"`);
      const result = await this.executeCommand(command);
      results.push(result);
      
      // Add small delay between commands
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  }
} 