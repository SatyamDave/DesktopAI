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

  private log(message: string, data?: any) {
    const logFile = path.join(os.homedir(), '.doppel', 'doppel.log');
    const logMsg = `[${new Date().toISOString()}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
    fs.appendFileSync(logFile, logMsg);
    console.log(message, data || '');
  }

  private loadCommandHistory() {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8');
        this.commandHistory = JSON.parse(data);
      }
    } catch (error) {
      this.log('Error loading command history', error);
      this.commandHistory = [];
    }
  }

  private saveCommandHistory() {
    try {
      if (this.commandHistory.length > this.maxHistorySize) {
        this.commandHistory = this.commandHistory.slice(-this.maxHistorySize);
      }
      fs.writeFileSync(this.historyFile, JSON.stringify(this.commandHistory, null, 2));
    } catch (error) {
      this.log('Error saving command history', error);
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
    this.log('Received command', { input });
    // Support multi-step/compound commands: split by 'and then', 'then', 'and'
    const steps = input.split(/\band then\b|\bthen\b|\band\b/i).map(s => s.trim()).filter(Boolean);
    if (steps.length > 1) {
      const results: CommandResult[] = [];
      for (const step of steps) {
        const result = await this.executeSingleCommand(step);
        results.push(result);
        // Show toast for each step
        this.log('Step result', { step, result });
      }
      // Return summary
      const allSuccess = results.every(r => r.success);
      const summary = results.map(r => r.message).join(' | ');
      return { success: allSuccess, message: summary, data: results };
    } else {
      return this.executeSingleCommand(input);
    }
  }

  private async executeSingleCommand(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase().trim();
    try {
      // Open app and go to URL (e.g., "Open Chrome and go to gmail.com")
      const openAppUrlMatch = lowerInput.match(/open (\w+)(?: and go to ([^ ]+))/i);
      if (openAppUrlMatch) {
        const appName = openAppUrlMatch[1];
        const url = openAppUrlMatch[2].startsWith('http') ? openAppUrlMatch[2] : `https://${openAppUrlMatch[2]}`;
        const appResult = await this.handleAppLaunch(`open ${appName}`);
        if (appResult.success) {
          await shell.openExternal(url);
          this.addToHistory(input, true, `Opened ${appName} and navigated to ${url}`);
          this.log('App+URL success', { appName, url });
          return { success: true, message: `Opened ${appName} and navigated to ${url}` };
        } else {
          this.addToHistory(input, false, appResult.message);
          this.log('App+URL failed', { appName, url, error: appResult.message });
          return { success: false, message: appResult.message };
        }
      }

      // App launch
      if (lowerInput.startsWith('open') || lowerInput.startsWith('launch') || lowerInput.startsWith('start')) {
        return await this.handleAppLaunch(input);
      }

      // Web search
      if (lowerInput.startsWith('search') || lowerInput.startsWith('find') || lowerInput.includes('google')) {
        return await this.handleWebSearch(input);
      }

      // YouTube search
      if (lowerInput.includes('youtube') || lowerInput.includes('video')) {
        return await this.handleYouTubeSearch(input);
      }

      // Email
      if (lowerInput.includes('email') || lowerInput.includes('mail') || lowerInput.includes('send')) {
        return await this.handleEmailDraft(input);
      }

      // Help
      if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
        return this.getHelpResponse();
      }

      // Fallback
      this.addToHistory(input, false, 'Unknown command');
      this.log('Unknown command', { input });
      return { success: false, message: 'Sorry, I did not understand that command.' };
    } catch (error) {
      this.addToHistory(input, false, String(error));
      this.log('Command execution error', { input, error });
      return { success: false, message: 'An error occurred while processing your command.', error: String(error) };
    }
  }

  private async handleAppLaunch(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    const app = this.appConfigs.find(config =>
      config.aliases.some(alias => lowerInput.includes(alias)) ||
      lowerInput.includes(config.name)
    );
    if (!app) {
      this.addToHistory(input, false, 'App not found');
      this.log('App not found', { input });
      return { success: false, message: 'App not found. Try "Open Chrome" or "Launch Notepad".' };
    }
    try {
      if (app.url) {
        await shell.openExternal(app.url);
        this.addToHistory(input, true, `Opened ${app.name} in browser`);
        this.log('App opened in browser', { app });
        return { success: true, message: `Opened ${app.name} in browser.` };
      } else {
        const appPath = this.getAppPath(app);
        if (!appPath) {
          this.addToHistory(input, false, `App path not found for ${app.name}`);
          this.log('App path not found', { app });
          return { success: false, message: `App path not found for ${app.name}.` };
        }
        await this.launchApp(appPath);
        this.addToHistory(input, true, `Launched ${app.name}`);
        this.log('App launched', { app });
        return { success: true, message: `Launched ${app.name}.` };
      }
    } catch (error) {
      this.addToHistory(input, false, `Failed to launch ${app.name}: ${error}`);
      this.log('App launch error', { app, error });
      return { success: false, message: `Failed to launch ${app.name}.`, error: String(error) };
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
      const expandedPath = appPath.replace(/%USERNAME%/g, os.userInfo().username);
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
      if (fs.existsSync(expandedPath)) {
        await execAsync(`"${expandedPath}"`);
      } else {
        await execAsync(appPath);
      }
    } else if (platform === 'darwin') {
      await execAsync(`open "${appPath}"`);
    } else {
      await execAsync(appPath);
    }
  }

  private async handleWebSearch(input: string): Promise<CommandResult> {
    const searchTerms = input.replace(/search|find|google/gi, '').trim();
    if (!searchTerms) {
      this.addToHistory(input, false, 'No search terms provided');
      this.log('No search terms', { input });
      return { success: false, message: 'What would you like me to search for?' };
    }
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerms)}`;
    try {
      await shell.openExternal(searchUrl);
      this.addToHistory(input, true, `Searched for "${searchTerms}"`);
      this.log('Web search success', { searchTerms });
      return { success: true, message: `Searched for "${searchTerms}".` };
    } catch (error) {
      this.addToHistory(input, false, `Failed to search: ${error}`);
      this.log('Web search error', { searchTerms, error });
      return { success: false, message: 'Failed to open search in browser.', error: String(error) };
    }
  }

  private async handleYouTubeSearch(input: string): Promise<CommandResult> {
    const searchTerms = input.replace(/youtube|video|search|find/gi, '').trim();
    if (!searchTerms) {
      this.addToHistory(input, false, 'No YouTube search terms');
      this.log('No YouTube search terms', { input });
      return { success: false, message: 'What would you like me to search for on YouTube?' };
    }
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerms)}`;
    try {
      await shell.openExternal(searchUrl);
      this.addToHistory(input, true, `YouTube searched for "${searchTerms}"`);
      this.log('YouTube search success', { searchTerms });
      return { success: true, message: `Searched YouTube for "${searchTerms}".` };
    } catch (error) {
      this.addToHistory(input, false, `Failed YouTube search: ${error}`);
      this.log('YouTube search error', { searchTerms, error });
      return { success: false, message: 'Failed to open YouTube search.', error: String(error) };
    }
  }

  private async handleEmailDraft(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    let subject = '';
    let body = '';
    let recipient = '';
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
    const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      await shell.openExternal(mailtoUrl);
      this.addToHistory(input, true, `Opened email client for ${recipient}`);
      this.log('Email draft success', { recipient, subject, body });
      return { success: true, message: `Opened email client${recipient ? ` to ${recipient}` : ''}.` };
    } catch (error) {
      this.addToHistory(input, false, `Failed to open email client: ${error}`);
      this.log('Email draft error', { recipient, subject, body, error });
      return { success: false, message: 'Failed to open email client. Please make sure you have a default email application configured.', error: String(error) };
    }
  }

  private getHelpResponse(): CommandResult {
    return {
      success: true,
      message: `I'm Doppel, your AI assistant!\n\n- Open apps: "Open Chrome"\n- Search: "Search for React"\n- YouTube: "YouTube Logan Paul"\n- Email: "Send email to manager"\n- Multi-step: "Open Chrome and go to gmail.com"\n- Queue: "Open Zoom and then Notion"\n\nJust type your request and I'll help you get things done!`,
      data: { type: 'help' }
    };
  }

  public getCommandHistory(limit = 10): CommandHistory[] {
    return this.commandHistory.slice(-limit);
  }

  public getCommandSuggestions(input: string): string[] {
    const lowerInput = input.toLowerCase();
    const suggestions: string[] = [];
    this.appConfigs.forEach(app => {
      if (app.name.includes(lowerInput) || app.aliases.some(alias => alias.includes(lowerInput))) {
        suggestions.push(`Open ${app.name}`);
      }
    });
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
      this.log('Queue executing', { command });
      const result = await this.executeSingleCommand(command);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return results;
  }
} 