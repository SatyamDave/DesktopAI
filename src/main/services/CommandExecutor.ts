import { shell, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { planActions } from './AIPlanner';
import { ConfigManager } from './ConfigManager';

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
  private configManager: ConfigManager;
  private debug: boolean;

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
      name: 'edge',
      aliases: ['microsoft edge', 'edge browser'],
      windowsPath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      macPath: '/Applications/Microsoft Edge.app',
      linuxPath: 'microsoft-edge'
    },
    {
      name: 'firefox',
      aliases: ['mozilla', 'firefox browser'],
      windowsPath: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
      macPath: '/Applications/Firefox.app',
      linuxPath: 'firefox'
    },
    {
      name: 'brave',
      aliases: ['brave browser'],
      windowsPath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      macPath: '/Applications/Brave Browser.app',
      linuxPath: 'brave-browser'
    },
    {
      name: 'opera',
      aliases: ['opera browser'],
      windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Opera\\launcher.exe',
      macPath: '/Applications/Opera.app',
      linuxPath: 'opera'
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
      name: 'terminal',
      aliases: ['command prompt', 'cmd', 'powershell', 'terminal', 'shell'],
      windowsPath: 'cmd.exe',
      macPath: '/Applications/Utilities/Terminal.app',
      linuxPath: 'gnome-terminal'
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
      name: 'slack',
      aliases: ['slack app', 'team chat', 'work chat'],
      windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Local\\slack\\slack.exe',
      macPath: '/Applications/Slack.app',
      linuxPath: 'slack'
    },
    {
      name: 'teams',
      aliases: ['microsoft teams', 'teams app', 'work teams'],
      windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Local\\Microsoft\\Teams\\current\\Teams.exe',
      macPath: '/Applications/Microsoft Teams.app',
      linuxPath: 'teams'
    },
    {
      name: 'outlook',
      aliases: ['email', 'microsoft outlook', 'outlook app'],
      windowsPath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE',
      macPath: '/Applications/Microsoft Outlook.app',
      linuxPath: 'outlook',
      url: 'https://outlook.office.com'
    },
    {
      name: 'word',
      aliases: ['microsoft word', 'word processor', 'doc editor'],
      windowsPath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE',
      macPath: '/Applications/Microsoft Word.app',
      linuxPath: 'libreoffice --writer'
    },
    {
      name: 'excel',
      aliases: ['microsoft excel', 'spreadsheet', 'xls editor'],
      windowsPath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE',
      macPath: '/Applications/Microsoft Excel.app',
      linuxPath: 'libreoffice --calc'
    },
    {
      name: 'powerpoint',
      aliases: ['microsoft powerpoint', 'presentation', 'ppt editor'],
      windowsPath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
      macPath: '/Applications/Microsoft PowerPoint.app',
      linuxPath: 'libreoffice --impress'
    },
    {
      name: 'paint',
      aliases: ['mspaint', 'paint app', 'drawing'],
      windowsPath: 'mspaint.exe',
      macPath: '/Applications/Preview.app',
      linuxPath: 'pinta'
    },
    {
      name: 'calendar',
      aliases: ['calendar app', 'schedule', 'events'],
      windowsPath: 'outlookcal:',
      macPath: '/Applications/Calendar.app',
      linuxPath: 'gnome-calendar',
      url: 'https://calendar.google.com'
    },
    {
      name: 'filezilla',
      aliases: ['ftp', 'filezilla app'],
      windowsPath: 'C:\\Program Files\\FileZilla FTP Client\\filezilla.exe',
      macPath: '/Applications/FileZilla.app',
      linuxPath: 'filezilla'
    },
    {
      name: 'github desktop',
      aliases: ['github', 'git client', 'github app'],
      windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Local\\GitHubDesktop\\GitHubDesktop.exe',
      macPath: '/Applications/GitHub Desktop.app',
      linuxPath: 'github-desktop'
    },
    {
      name: 'steam',
      aliases: ['games', 'steam app'],
      windowsPath: 'C:\\Program Files (x86)\\Steam\\steam.exe',
      macPath: '/Applications/Steam.app',
      linuxPath: 'steam'
    },
    {
      name: 'whatsapp',
      aliases: ['whatsapp app', 'messenger', 'chat'],
      windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Local\\WhatsApp\\WhatsApp.exe',
      macPath: '/Applications/WhatsApp.app',
      linuxPath: 'whatsapp',
      url: 'https://web.whatsapp.com'
    },
    {
      name: 'telegram',
      aliases: ['telegram app', 'messenger', 'chat'],
      windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Roaming\\Telegram Desktop\\Telegram.exe',
      macPath: '/Applications/Telegram.app',
      linuxPath: 'telegram',
      url: 'https://web.telegram.org'
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
    this.configManager = new ConfigManager();
    this.debug = this.configManager.isDebugMode();
    const dbDir = path.join(os.homedir(), '.doppel');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.historyFile = path.join(dbDir, 'command-history.json');
    this.loadCommandHistory();
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[CommandExecutor] ${message}`, data || '');
    }
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
    this.log(`Executing command: "${input}"`);
    try {
      // Use AIPlanner to break down the command into steps
      const steps = await planActions(input);
      if (steps.length > 0) {
        const results: CommandResult[] = [];
        for (const step of steps) {
          const result = await this.executeSingleCommand(step);
          results.push(result);
          this.log('AI Step result', { step, result });
        }
        const allSuccess = results.every(r => r.success);
        const summary = results.map(r => r.message).join(' | ');
        this.log(`Command executed successfully: "${input}"`);
        return { success: allSuccess, message: summary, data: results };
      }
    } catch (e) {
      this.log('AIPlanner failed, falling back to legacy logic', { error: String(e) });
      // Fallback to legacy logic
      // Support multi-step/compound commands: split by 'and then', 'then', 'and'
      const steps = input.split(/\band then\b|\bthen\b|\band\b/i).map(s => s.trim()).filter(Boolean);
      if (steps.length > 1) {
        const results: CommandResult[] = [];
        for (const step of steps) {
          const result = await this.executeSingleCommand(step);
          results.push(result);
          this.log('Step result', { step, result });
        }
        const allSuccess = results.every(r => r.success);
        const summary = results.map(r => r.message).join(' | ');
        this.log(`Command executed successfully: "${input}"`);
        return { success: allSuccess, message: summary, data: results };
      } else {
        return this.executeSingleCommand(input);
      }
    }
    // If all else fails
    return this.executeSingleCommand(input);
  }

  private async executeSingleCommand(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase().trim();
    try {
      // Browser automation: "search X in Chrome", "open Y in Firefox"
      const browserMatch = lowerInput.match(/(search|open) (.+?) (in|on) (chrome|firefox|edge|brave|opera)/i);
      if (browserMatch) {
        const action = browserMatch[1];
        const target = browserMatch[2];
        const browser = browserMatch[4];
        return await this.handleBrowserAutomation(action, target, browser, input);
      }

      // File operations
      if (lowerInput.includes('file') || lowerInput.includes('folder') || lowerInput.includes('directory')) {
        return await this.handleFileOperations(input);
      }

      // System controls
      if (lowerInput.includes('volume') || lowerInput.includes('brightness') || lowerInput.includes('lock') || 
          lowerInput.includes('sleep') || lowerInput.includes('shutdown') || lowerInput.includes('restart')) {
        return await this.handleSystemControls(input);
      }

      // Clipboard operations
      if (lowerInput.includes('clipboard') || lowerInput.includes('copy') || lowerInput.includes('paste')) {
        return await this.handleClipboardOperations(input);
      }

      // Network operations
      if (lowerInput.includes('ping') || lowerInput.includes('internet') || lowerInput.includes('network') || 
          lowerInput.includes('download') || lowerInput.includes('upload')) {
        return await this.handleNetworkOperations(input);
      }

      // Process management
      if (lowerInput.includes('process') || lowerInput.includes('kill') || lowerInput.includes('task')) {
        return await this.handleProcessManagement(input);
      }

      // Automation operations
      if (lowerInput.includes('screenshot') || lowerInput.includes('record') || lowerInput.includes('schedule')) {
        return await this.handleAutomationOperations(input);
      }

      // Utility operations
      if (lowerInput.includes('system info') || lowerInput.includes('check system') || lowerInput.includes('status')) {
        return await this.handleUtilityOperations(input);
      }

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
    const helpText = `
🎯 **Doppel AI Assistant - Available Commands**

📱 **App Operations:**
• "Open Chrome" - Launch applications
• "Start Notepad" - Start system apps
• "Launch VSCode" - Open development tools
• "Open Figma" - Launch web apps

🌐 **Web & Search:**
• "Search React tutorial" - Google search
• "YouTube React tutorial" - YouTube search
• "Search React in Chrome" - Search in specific browser
• "Open gmail.com in Firefox" - Open URL in browser

📧 **Email & Communication:**
• "Email manager asking for time off" - Draft emails
• "Send email to team about meeting" - Compose messages

📁 **File Operations:**
• "Open file C:\\Documents\\report.txt" - Open files/folders
• "Create folder Projects" - Create new folders
• "Create file notes.txt" - Create new files
• "Delete file temp.txt" - Remove files/folders
• "Move file old.txt to backup\\" - Move files/folders
• "Copy file source.txt to destination\\" - Copy files/folders
• "Rename file old.txt to new.txt" - Rename files/folders

🎛️ **System Controls:**
• "Volume up/down/mute/50" - Control audio
• "Brightness up/down/80" - Adjust screen brightness
• "Lock system" - Lock computer
• "Sleep system" - Put to sleep
• "Shutdown system" - Turn off computer
• "Restart system" - Reboot computer

📋 **Clipboard Operations:**
• "Copy to clipboard Hello World" - Copy text
• "Clear clipboard" - Empty clipboard
• "Show clipboard history" - View clipboard history

🌐 **Network Operations:**
• "Ping google.com" - Test network connectivity
• "Check internet" - Verify internet connection
• "Network status" - Get network information
• "Download https://example.com/file.zip to C:\\Downloads" - Download files

⚙️ **Process Management:**
• "Kill process notepad.exe" - End specific process
• "List processes" - Show running processes
• "Task manager" - Open system task manager

📸 **Automation Operations:**
• "Take screenshot" - Capture screen
• "Record screen" - Start screen recording
• "Schedule task 'open Chrome' at 14:30" - Set scheduled tasks

💻 **Utility Operations:**
• "System info" - Get detailed system information
• "System status" - Check system performance
• "Memory usage" - View RAM usage
• "Disk usage" - Check storage space

🔗 **Sequential Commands:**
• "Open Chrome and then search React tutorial" - Multiple actions
• "Open Notepad and then create file notes.txt" - Chain operations

💡 **Tips:**
• Use natural language - "Open my browser" works
• Chain commands with "and then" or "then"
• All operations are logged and can be repeated
• Use "help" anytime to see this list

🚀 **Advanced Features:**
• AI-powered command interpretation
• Cross-platform support (Windows, Mac, Linux)
• Global keyboard shortcuts
• Voice recognition (Whisper Mode)
• Behavior tracking and suggestions
• Network diagnostics and file downloads
• Process management and system monitoring
• Screen capture and automation
• System utilities and performance monitoring
    `.trim();

    return { success: true, message: helpText };
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

  // --- File Operations Handler ---
  private async handleFileOperations(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // Open file/folder
    if (lowerInput.includes('open file') || lowerInput.includes('open folder')) {
      const pathMatch = input.match(/open (?:file|folder) (.+)/i);
      if (pathMatch) {
        const filePath = pathMatch[1].trim();
        return await this.openFileOrFolder(filePath, input);
      }
    }

    // Create file/folder
    if (lowerInput.includes('create file') || lowerInput.includes('create folder') || lowerInput.includes('new file') || lowerInput.includes('new folder')) {
      const pathMatch = input.match(/create (?:file|folder) (.+)/i) || input.match(/new (?:file|folder) (.+)/i);
      if (pathMatch) {
        const path = pathMatch[1].trim();
        const isFolder = lowerInput.includes('folder');
        return await this.createFileOrFolder(path, isFolder, input);
      }
    }

    // Delete file/folder
    if (lowerInput.includes('delete file') || lowerInput.includes('delete folder') || lowerInput.includes('remove file') || lowerInput.includes('remove folder')) {
      const pathMatch = input.match(/delete (?:file|folder) (.+)/i) || input.match(/remove (?:file|folder) (.+)/i);
      if (pathMatch) {
        const path = pathMatch[1].trim();
        return await this.deleteFileOrFolder(path, input);
      }
    }

    // Move file/folder
    if (lowerInput.includes('move file') || lowerInput.includes('move folder')) {
      const moveMatch = input.match(/move (?:file|folder) (.+?) to (.+)/i);
      if (moveMatch) {
        const source = moveMatch[1].trim();
        const destination = moveMatch[2].trim();
        return await this.moveFileOrFolder(source, destination, input);
      }
    }

    // Copy file/folder
    if (lowerInput.includes('copy file') || lowerInput.includes('copy folder')) {
      const copyMatch = input.match(/copy (?:file|folder) (.+?) to (.+)/i);
      if (copyMatch) {
        const source = copyMatch[1].trim();
        const destination = copyMatch[2].trim();
        return await this.copyFileOrFolder(source, destination, input);
      }
    }

    // Rename file/folder
    if (lowerInput.includes('rename file') || lowerInput.includes('rename folder')) {
      const renameMatch = input.match(/rename (?:file|folder) (.+?) to (.+)/i);
      if (renameMatch) {
        const oldName = renameMatch[1].trim();
        const newName = renameMatch[2].trim();
        return await this.renameFileOrFolder(oldName, newName, input);
      }
    }

    return { success: false, message: 'Please specify a file operation (open, create, delete, move, copy, rename).' };
  }

  private async openFileOrFolder(filePath: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync(`explorer "${filePath}"`);
      } else if (platform === 'darwin') {
        await execAsync(`open "${filePath}"`);
      } else {
        await execAsync(`xdg-open "${filePath}"`);
      }
      this.addToHistory(originalInput, true, `Opened ${filePath}`);
      return { success: true, message: `Opened ${filePath}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to open ${filePath}: ${error}`);
      return { success: false, message: `Failed to open ${filePath}.`, error: String(error) };
    }
  }

  private async createFileOrFolder(path: string, isFolder: boolean, originalInput: string): Promise<CommandResult> {
    try {
      if (isFolder) {
        fs.mkdirSync(path, { recursive: true });
      } else {
        fs.writeFileSync(path, '');
      }
      this.addToHistory(originalInput, true, `Created ${isFolder ? 'folder' : 'file'} ${path}`);
      return { success: true, message: `Created ${isFolder ? 'folder' : 'file'} ${path}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to create ${isFolder ? 'folder' : 'file'} ${path}: ${error}`);
      return { success: false, message: `Failed to create ${isFolder ? 'folder' : 'file'} ${path}.`, error: String(error) };
    }
  }

  private async deleteFileOrFolder(path: string, originalInput: string): Promise<CommandResult> {
    try {
      const stats = fs.statSync(path);
      if (stats.isDirectory()) {
        fs.rmdirSync(path, { recursive: true });
      } else {
        fs.unlinkSync(path);
      }
      this.addToHistory(originalInput, true, `Deleted ${path}`);
      return { success: true, message: `Deleted ${path}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to delete ${path}: ${error}`);
      return { success: false, message: `Failed to delete ${path}.`, error: String(error) };
    }
  }

  private async moveFileOrFolder(source: string, destination: string, originalInput: string): Promise<CommandResult> {
    try {
      fs.renameSync(source, destination);
      this.addToHistory(originalInput, true, `Moved ${source} to ${destination}`);
      return { success: true, message: `Moved ${source} to ${destination}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to move ${source} to ${destination}: ${error}`);
      return { success: false, message: `Failed to move ${source} to ${destination}.`, error: String(error) };
    }
  }

  private async copyFileOrFolder(source: string, destination: string, originalInput: string): Promise<CommandResult> {
    try {
      const stats = fs.statSync(source);
      if (stats.isDirectory()) {
        // Copy directory recursively
        this.copyDirectorySync(source, destination);
      } else {
        fs.copyFileSync(source, destination);
      }
      this.addToHistory(originalInput, true, `Copied ${source} to ${destination}`);
      return { success: true, message: `Copied ${source} to ${destination}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to copy ${source} to ${destination}: ${error}`);
      return { success: false, message: `Failed to copy ${source} to ${destination}.`, error: String(error) };
    }
  }

  private copyDirectorySync(source: string, destination: string): void {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    const files = fs.readdirSync(source);
    for (const file of files) {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);
      const stats = fs.statSync(sourcePath);
      if (stats.isDirectory()) {
        this.copyDirectorySync(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  private async renameFileOrFolder(oldName: string, newName: string, originalInput: string): Promise<CommandResult> {
    try {
      fs.renameSync(oldName, newName);
      this.addToHistory(originalInput, true, `Renamed ${oldName} to ${newName}`);
      return { success: true, message: `Renamed ${oldName} to ${newName}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to rename ${oldName} to ${newName}: ${error}`);
      return { success: false, message: `Failed to rename ${oldName} to ${newName}.`, error: String(error) };
    }
  }

  // --- System Controls Handler ---
  private async handleSystemControls(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // Volume control
    if (lowerInput.includes('volume')) {
      const volumeMatch = lowerInput.match(/volume (up|down|mute|(\d+))/i);
      if (volumeMatch) {
        const action = volumeMatch[1];
        return await this.controlVolume(action, input);
      }
    }

    // Brightness control
    if (lowerInput.includes('brightness')) {
      const brightnessMatch = lowerInput.match(/brightness (up|down|(\d+))/i);
      if (brightnessMatch) {
        const action = brightnessMatch[1];
        return await this.controlBrightness(action, input);
      }
    }

    // System actions
    if (lowerInput.includes('lock')) {
      return await this.lockSystem(input);
    }
    if (lowerInput.includes('sleep')) {
      return await this.sleepSystem(input);
    }
    if (lowerInput.includes('shutdown') || lowerInput.includes('turn off')) {
      return await this.shutdownSystem(input);
    }
    if (lowerInput.includes('restart') || lowerInput.includes('reboot')) {
      return await this.restartSystem(input);
    }

    return { success: false, message: 'Please specify a system control (volume, brightness, lock, sleep, shutdown, restart).' };
  }

  private async controlVolume(action: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        if (action === 'up') {
          await execAsync('powershell -command "(Get-AudioDevice -Playback).Volume += 10"');
        } else if (action === 'down') {
          await execAsync('powershell -command "(Get-AudioDevice -Playback).Volume -= 10"');
        } else if (action === 'mute') {
          await execAsync('powershell -command "Set-AudioDevice -Playback -Mute $true"');
        } else {
          await execAsync(`powershell -command "(Get-AudioDevice -Playback).Volume = ${action}"`);
        }
      } else if (platform === 'darwin') {
        if (action === 'up') {
          await execAsync('osascript -e "set volume output volume (output volume of (get volume settings) + 10)"');
        } else if (action === 'down') {
          await execAsync('osascript -e "set volume output volume (output volume of (get volume settings) - 10)"');
        } else if (action === 'mute') {
          await execAsync('osascript -e "set volume output muted true"');
        } else {
          await execAsync(`osascript -e "set volume output volume ${action}"`);
        }
      } else {
        // Linux - using amixer
        if (action === 'up') {
          await execAsync('amixer -D pulse sset Master 10%+');
        } else if (action === 'down') {
          await execAsync('amixer -D pulse sset Master 10%-');
        } else if (action === 'mute') {
          await execAsync('amixer -D pulse sset Master toggle');
        } else {
          await execAsync(`amixer -D pulse sset Master ${action}%`);
        }
      }
      this.addToHistory(originalInput, true, `Volume ${action}`);
      return { success: true, message: `Volume ${action}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to control volume: ${error}`);
      return { success: false, message: 'Failed to control volume.', error: String(error) };
    }
  }

  private async controlBrightness(action: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        // Windows brightness control (requires WMI)
        await execAsync(`powershell -command "Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods | ForEach-Object { $_.WmiSetBrightness(1, ${action}) }"`);
      } else if (platform === 'darwin') {
        if (action === 'up') {
          await execAsync('osascript -e "tell application \\"System Events\\" to key code 144"');
        } else if (action === 'down') {
          await execAsync('osascript -e "tell application \\"System Events\\" to key code 145"');
        } else {
          await execAsync(`osascript -e "tell application \\"System Events\\" to set brightness to ${parseInt(action) / 100}"`);
        }
      } else {
        // Linux brightness control
        const brightnessPath = '/sys/class/backlight/intel_backlight/brightness';
        const maxBrightnessPath = '/sys/class/backlight/intel_backlight/max_brightness';
        if (fs.existsSync(brightnessPath)) {
          const maxBrightness = parseInt(fs.readFileSync(maxBrightnessPath, 'utf8'));
          let newBrightness;
          if (action === 'up') {
            const current = parseInt(fs.readFileSync(brightnessPath, 'utf8'));
            newBrightness = Math.min(current + maxBrightness * 0.1, maxBrightness);
          } else if (action === 'down') {
            const current = parseInt(fs.readFileSync(brightnessPath, 'utf8'));
            newBrightness = Math.max(current - maxBrightness * 0.1, 0);
          } else {
            newBrightness = (parseInt(action) / 100) * maxBrightness;
          }
          fs.writeFileSync(brightnessPath, Math.round(newBrightness).toString());
        }
      }
      this.addToHistory(originalInput, true, `Brightness ${action}`);
      return { success: true, message: `Brightness ${action}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to control brightness: ${error}`);
      return { success: false, message: 'Failed to control brightness.', error: String(error) };
    }
  }

  private async lockSystem(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync('rundll32.exe user32.dll,LockWorkStation');
      } else if (platform === 'darwin') {
        await execAsync('pmset displaysleepnow');
      } else {
        await execAsync('gnome-screensaver-command --lock');
      }
      this.addToHistory(originalInput, true, 'System locked');
      return { success: true, message: 'System locked.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to lock system: ${error}`);
      return { success: false, message: 'Failed to lock system.', error: String(error) };
    }
  }

  private async sleepSystem(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync('powercfg /hibernate off && rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
      } else if (platform === 'darwin') {
        await execAsync('pmset sleepnow');
      } else {
        await execAsync('systemctl suspend');
      }
      this.addToHistory(originalInput, true, 'System sleeping');
      return { success: true, message: 'System sleeping.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to sleep system: ${error}`);
      return { success: false, message: 'Failed to sleep system.', error: String(error) };
    }
  }

  private async shutdownSystem(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync('shutdown /s /t 0');
      } else if (platform === 'darwin') {
        await execAsync('sudo shutdown -h now');
      } else {
        await execAsync('sudo shutdown -h now');
      }
      this.addToHistory(originalInput, true, 'System shutting down');
      return { success: true, message: 'System shutting down.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to shutdown system: ${error}`);
      return { success: false, message: 'Failed to shutdown system.', error: String(error) };
    }
  }

  private async restartSystem(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync('shutdown /r /t 0');
      } else if (platform === 'darwin') {
        await execAsync('sudo shutdown -r now');
      } else {
        await execAsync('sudo shutdown -r now');
      }
      this.addToHistory(originalInput, true, 'System restarting');
      return { success: true, message: 'System restarting.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to restart system: ${error}`);
      return { success: false, message: 'Failed to restart system.', error: String(error) };
    }
  }

  // --- Clipboard Operations Handler ---
  private async handleClipboardOperations(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // Copy to clipboard
    if (lowerInput.includes('copy to clipboard') || lowerInput.includes('copy text')) {
      const textMatch = input.match(/copy (?:to clipboard|text) (.+)/i);
      if (textMatch) {
        const text = textMatch[1].trim();
        return await this.copyToClipboard(text, input);
      }
    }

    // Clear clipboard
    if (lowerInput.includes('clear clipboard') || lowerInput.includes('empty clipboard')) {
      return await this.clearClipboard(input);
    }

    // Show clipboard history
    if (lowerInput.includes('clipboard history') || lowerInput.includes('show clipboard')) {
      return await this.showClipboardHistory(input);
    }

    return { success: false, message: 'Please specify a clipboard operation (copy, clear, history).' };
  }

  private async copyToClipboard(text: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync(`echo ${text} | clip`);
      } else if (platform === 'darwin') {
        await execAsync(`echo "${text}" | pbcopy`);
      } else {
        await execAsync(`echo "${text}" | xclip -selection clipboard`);
      }
      this.addToHistory(originalInput, true, `Copied "${text}" to clipboard`);
      return { success: true, message: `Copied "${text}" to clipboard.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to copy to clipboard: ${error}`);
      return { success: false, message: 'Failed to copy to clipboard.', error: String(error) };
    }
  }

  private async clearClipboard(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync('echo. | clip');
      } else if (platform === 'darwin') {
        await execAsync('pbcopy < /dev/null');
      } else {
        await execAsync('xclip -selection clipboard < /dev/null');
      }
      this.addToHistory(originalInput, true, 'Clipboard cleared');
      return { success: true, message: 'Clipboard cleared.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to clear clipboard: ${error}`);
      return { success: false, message: 'Failed to clear clipboard.', error: String(error) };
    }
  }

  private async showClipboardHistory(originalInput: string): Promise<CommandResult> {
    try {
      // This would integrate with the existing ClipboardManager service
      // For now, return a placeholder message
      this.addToHistory(originalInput, true, 'Clipboard history requested');
      return { success: true, message: 'Clipboard history feature is available. Use the clipboard manager interface to view history.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to show clipboard history: ${error}`);
      return { success: false, message: 'Failed to show clipboard history.', error: String(error) };
    }
  }

  // --- Browser Automation Handler ---
  private async handleBrowserAutomation(action: string, target: string, browser: string, originalInput: string): Promise<CommandResult> {
    // For now, just open/search in the specified browser (future: deep automation)
    let url = '';
    if (action === 'search') {
      url = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
    } else if (action === 'open') {
      url = target.startsWith('http') ? target : `https://${target}`;
    }
    // Find browser app config
    const app = this.appConfigs.find(cfg => cfg.name === browser || cfg.aliases.includes(browser));
    if (!app) {
      this.addToHistory(originalInput, false, `Browser ${browser} not found`);
      return { success: false, message: `Browser ${browser} not found.` };
    }
    try {
      // On Windows, launch browser with URL as argument
      const platform = os.platform();
      let browserPath = this.getAppPath(app);
      if (!browserPath) {
        this.addToHistory(originalInput, false, `Browser path not found for ${browser}`);
        return { success: false, message: `Browser path not found for ${browser}.` };
      }
      if (platform === 'win32') {
        browserPath = browserPath.replace(/%USERNAME%/g, os.userInfo().username);
        await execAsync(`"${browserPath}" "${url}"`);
      } else if (platform === 'darwin') {
        await execAsync(`open -a "${browserPath}" "${url}"`);
      } else {
        await execAsync(`${browserPath} "${url}"`);
      }
      this.addToHistory(originalInput, true, `Opened ${url} in ${browser}`);
      return { success: true, message: `Opened ${url} in ${browser}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to open in ${browser}: ${error}`);
      return { success: false, message: `Failed to open in ${browser}.`, error: String(error) };
    }
    // Future: add Puppeteer/Playwright automation for fill/click actions
  }

  // --- Network Operations Handler ---
  private async handleNetworkOperations(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // Ping
    if (lowerInput.includes('ping')) {
      const pingMatch = input.match(/ping (.+)/i);
      if (pingMatch) {
        const target = pingMatch[1].trim();
        return await this.pingHost(target, input);
      }
    }

    // Check internet
    if (lowerInput.includes('internet') || lowerInput.includes('check connection')) {
      return await this.checkInternetConnection(input);
    }

    // Network status
    if (lowerInput.includes('network status') || lowerInput.includes('network info')) {
      return await this.getNetworkStatus(input);
    }

    // Download file
    if (lowerInput.includes('download')) {
      const downloadMatch = input.match(/download (.+?) to (.+)/i);
      if (downloadMatch) {
        const url = downloadMatch[1].trim();
        const destination = downloadMatch[2].trim();
        return await this.downloadFile(url, destination, input);
      }
    }

    return { success: false, message: 'Please specify a network operation (ping, internet, network status, download).' };
  }

  private async pingHost(target: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      const pingCount = platform === 'win32' ? '-n 4' : '-c 4';
      const result = await execAsync(`ping ${pingCount} ${target}`);
      this.addToHistory(originalInput, true, `Pinged ${target}`);
      return { success: true, message: `Ping result for ${target}:\n${result.stdout}`, data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to ping ${target}: ${error}`);
      return { success: false, message: `Failed to ping ${target}.`, error: String(error) };
    }
  }

  private async checkInternetConnection(originalInput: string): Promise<CommandResult> {
    try {
      const result = await execAsync('ping -n 1 8.8.8.8');
      this.addToHistory(originalInput, true, 'Internet connection check');
      return { success: true, message: 'Internet connection is working.', data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, 'Internet connection failed');
      return { success: false, message: 'No internet connection detected.', error: String(error) };
    }
  }

  private async getNetworkStatus(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = 'ipconfig';
      } else if (platform === 'darwin') {
        command = 'ifconfig';
      } else {
        command = 'ip addr';
      }
      const result = await execAsync(command);
      this.addToHistory(originalInput, true, 'Network status retrieved');
      return { success: true, message: 'Network status retrieved.', data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to get network status: ${error}`);
      return { success: false, message: 'Failed to get network status.', error: String(error) };
    }
  }

  private async downloadFile(url: string, destination: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = `powershell -command "Invoke-WebRequest -Uri '${url}' -OutFile '${destination}'"`;
      } else {
        command = `curl -o "${destination}" "${url}"`;
      }
      await execAsync(command);
      this.addToHistory(originalInput, true, `Downloaded ${url} to ${destination}`);
      return { success: true, message: `Downloaded file to ${destination}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to download ${url}: ${error}`);
      return { success: false, message: 'Failed to download file.', error: String(error) };
    }
  }

  // --- Process Management Handler ---
  private async handleProcessManagement(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // Kill process
    if (lowerInput.includes('kill process') || lowerInput.includes('end process')) {
      const killMatch = input.match(/kill process (.+)/i) || input.match(/end process (.+)/i);
      if (killMatch) {
        const processName = killMatch[1].trim();
        return await this.killProcess(processName, input);
      }
    }

    // List processes
    if (lowerInput.includes('list processes') || lowerInput.includes('show processes') || lowerInput.includes('running processes')) {
      return await this.listProcesses(input);
    }

    // Task manager
    if (lowerInput.includes('task manager') || lowerInput.includes('process manager')) {
      return await this.openTaskManager(input);
    }

    return { success: false, message: 'Please specify a process operation (kill process, list processes, task manager).' };
  }

  private async killProcess(processName: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = `taskkill /IM "${processName}" /F`;
      } else if (platform === 'darwin') {
        command = `pkill -f "${processName}"`;
      } else {
        command = `pkill -f "${processName}"`;
      }
      await execAsync(command);
      this.addToHistory(originalInput, true, `Killed process ${processName}`);
      return { success: true, message: `Killed process ${processName}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to kill process ${processName}: ${error}`);
      return { success: false, message: `Failed to kill process ${processName}.`, error: String(error) };
    }
  }

  private async listProcesses(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = 'tasklist';
      } else if (platform === 'darwin') {
        command = 'ps aux';
      } else {
        command = 'ps aux';
      }
      const result = await execAsync(command);
      this.addToHistory(originalInput, true, 'Processes listed');
      return { success: true, message: 'Process list retrieved.', data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to list processes: ${error}`);
      return { success: false, message: 'Failed to list processes.', error: String(error) };
    }
  }

  private async openTaskManager(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync('taskmgr');
      } else if (platform === 'darwin') {
        await execAsync('open -a "Activity Monitor"');
      } else {
        await execAsync('gnome-system-monitor');
      }
      this.addToHistory(originalInput, true, 'Task manager opened');
      return { success: true, message: 'Task manager opened.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to open task manager: ${error}`);
      return { success: false, message: 'Failed to open task manager.', error: String(error) };
    }
  }

  // --- Automation Operations Handler ---
  private async handleAutomationOperations(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // Screenshot
    if (lowerInput.includes('screenshot') || lowerInput.includes('take screenshot')) {
      return await this.takeScreenshot(input);
    }

    // Record screen
    if (lowerInput.includes('record screen') || lowerInput.includes('start recording')) {
      return await this.recordScreen(input);
    }

    // Schedule task
    if (lowerInput.includes('schedule') || lowerInput.includes('set reminder')) {
      const scheduleMatch = input.match(/schedule (.+?) at (.+)/i);
      if (scheduleMatch) {
        const task = scheduleMatch[1].trim();
        const time = scheduleMatch[2].trim();
        return await this.scheduleTask(task, time, input);
      }
    }

    return { success: false, message: 'Please specify an automation operation (screenshot, record screen, schedule).' };
  }

  private async takeScreenshot(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;
      const desktopPath = path.join(os.homedir(), 'Desktop');
      const filepath = path.join(desktopPath, filename);

      if (platform === 'win32') {
        await execAsync(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{PrtSc}')"`);
      } else if (platform === 'darwin') {
        await execAsync(`screencapture "${filepath}"`);
      } else {
        await execAsync(`gnome-screenshot -f "${filepath}"`);
      }
      
      this.addToHistory(originalInput, true, `Screenshot saved as ${filename}`);
      return { success: true, message: `Screenshot saved as ${filename} on Desktop.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to take screenshot: ${error}`);
      return { success: false, message: 'Failed to take screenshot.', error: String(error) };
    }
  }

  private async recordScreen(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `recording-${timestamp}.mp4`;
      const desktopPath = path.join(os.homedir(), 'Desktop');
      const filepath = path.join(desktopPath, filename);

      if (platform === 'darwin') {
        await execAsync(`screencapture -v "${filepath}"`);
      } else {
        // For Windows and Linux, we'll use a placeholder for now
        // In a real implementation, you'd use ffmpeg or similar
        await execAsync(`echo "Recording started - press Ctrl+C to stop"`);
      }
      
      this.addToHistory(originalInput, true, `Screen recording started`);
      return { success: true, message: 'Screen recording started. Press Ctrl+C to stop.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to start recording: ${error}`);
      return { success: false, message: 'Failed to start screen recording.', error: String(error) };
    }
  }

  private async scheduleTask(task: string, time: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync(`schtasks /create /tn "Doppel_${Date.now()}" /tr "${task}" /sc once /st "${time}"`);
      } else if (platform === 'darwin') {
        await execAsync(`at ${time} <<< "${task}"`);
      } else {
        await execAsync(`at ${time} <<< "${task}"`);
      }
      
      this.addToHistory(originalInput, true, `Scheduled task: ${task} at ${time}`);
      return { success: true, message: `Scheduled task: ${task} at ${time}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to schedule task: ${error}`);
      return { success: false, message: 'Failed to schedule task.', error: String(error) };
    }
  }

  // --- Utility Operations Handler ---
  private async handleUtilityOperations(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // System info
    if (lowerInput.includes('system info') || lowerInput.includes('check system')) {
      return await this.getSystemInfo(input);
    }

    // System status
    if (lowerInput.includes('status') || lowerInput.includes('system status')) {
      return await this.getSystemStatus(input);
    }

    // Memory usage
    if (lowerInput.includes('memory') || lowerInput.includes('ram')) {
      return await this.getMemoryUsage(input);
    }

    // Disk usage
    if (lowerInput.includes('disk') || lowerInput.includes('storage')) {
      return await this.getDiskUsage(input);
    }

    return { success: false, message: 'Please specify a utility operation (system info, status, memory, disk).' };
  }

  private async getSystemInfo(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = 'systeminfo';
      } else if (platform === 'darwin') {
        command = 'system_profiler SPHardwareDataType';
      } else {
        command = 'lshw -short';
      }
      const result = await execAsync(command);
      this.addToHistory(originalInput, true, 'System info retrieved');
      return { success: true, message: 'System information retrieved.', data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to get system info: ${error}`);
      return { success: false, message: 'Failed to get system information.', error: String(error) };
    }
  }

  private async getSystemStatus(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = 'wmic cpu get loadpercentage';
      } else if (platform === 'darwin') {
        command = 'top -l 1 | head -10';
      } else {
        command = 'top -bn1 | head -10';
      }
      const result = await execAsync(command);
      this.addToHistory(originalInput, true, 'System status retrieved');
      return { success: true, message: 'System status retrieved.', data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to get system status: ${error}`);
      return { success: false, message: 'Failed to get system status.', error: String(error) };
    }
  }

  private async getMemoryUsage(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = 'wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /Value';
      } else if (platform === 'darwin') {
        command = 'vm_stat';
      } else {
        command = 'free -h';
      }
      const result = await execAsync(command);
      this.addToHistory(originalInput, true, 'Memory usage retrieved');
      return { success: true, message: 'Memory usage retrieved.', data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to get memory usage: ${error}`);
      return { success: false, message: 'Failed to get memory usage.', error: String(error) };
    }
  }

  private async getDiskUsage(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = 'wmic logicaldisk get size,freespace,caption';
      } else if (platform === 'darwin') {
        command = 'df -h';
      } else {
        command = 'df -h';
      }
      const result = await execAsync(command);
      this.addToHistory(originalInput, true, 'Disk usage retrieved');
      return { success: true, message: 'Disk usage retrieved.', data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to get disk usage: ${error}`);
      return { success: false, message: 'Failed to get disk usage.', error: String(error) };
    }
  }
} 