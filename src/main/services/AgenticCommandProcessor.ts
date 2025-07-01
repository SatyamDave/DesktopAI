import { shell, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { configManager } from './ConfigManager';
import { browserAutomationService } from './BrowserAutomationService';
import { appLaunchService } from './AppLaunchService';

const execAsync = promisify(exec);

interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  fallback?: string;
}

interface AppInfo {
  name: string;
  paths: string[];
  browserFallback?: boolean;
  webFallback?: string;
}

export class AgenticCommandProcessor {
  private configManager: typeof configManager;
  private browserAutomationService: typeof browserAutomationService;
  private appLaunchService: typeof appLaunchService;
  private debug: boolean;
  private userPreferences: Map<string, string> = new Map();

  // Common apps with fallbacks
  private readonly commonApps: Map<string, AppInfo> = new Map([
    ['spotify', {
      name: 'Spotify',
      paths: [
        'C:\\Users\\%USERNAME%\\AppData\\Roaming\\Spotify\\Spotify.exe',
        'C:\\Program Files\\WindowsApps\\SpotifyAB.SpotifyMusic_*\\Spotify.exe',
        'C:\\Program Files (x86)\\Spotify\\Spotify.exe'
      ],
      webFallback: 'https://open.spotify.com'
    }],
    ['chrome', {
      name: 'Google Chrome',
      paths: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      ]
    }],
    ['firefox', {
      name: 'Mozilla Firefox',
      paths: [
        'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
        'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'
      ]
    }],
    ['edge', {
      name: 'Microsoft Edge',
      paths: [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      ]
    }],
    ['youtube', {
      name: 'YouTube',
      paths: [],
      webFallback: 'https://www.youtube.com'
    }],
    ['gmail', {
      name: 'Gmail',
      paths: [],
      webFallback: 'https://mail.google.com'
    }],
    ['outlook', {
      name: 'Outlook',
      paths: [
        'C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE',
        'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE'
      ],
      webFallback: 'https://outlook.live.com'
    }]
  ]);

  constructor() {
    this.configManager = configManager;
    this.browserAutomationService = browserAutomationService;
    this.appLaunchService = appLaunchService;
    this.debug = process.env.DEBUG_MODE === 'true';
    this.loadUserPreferences();
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[AgenticCommandProcessor] ${message}`, data || '');
    }
  }

  private loadUserPreferences() {
    try {
      const prefsPath = path.join(os.homedir(), '.doppel', 'user-preferences.json');
      if (fs.existsSync(prefsPath)) {
        const data = fs.readFileSync(prefsPath, 'utf8');
        const prefs = JSON.parse(data);
        this.userPreferences = new Map(Object.entries(prefs));
      }
    } catch (error) {
      this.log('Error loading user preferences', error);
    }
  }

  private saveUserPreferences() {
    try {
      const prefsPath = path.join(os.homedir(), '.doppel', 'user-preferences.json');
      const prefsDir = path.dirname(prefsPath);
      if (!fs.existsSync(prefsDir)) {
        fs.mkdirSync(prefsDir, { recursive: true });
      }
      const prefs = Object.fromEntries(this.userPreferences);
      fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
    } catch (error) {
      this.log('Error saving user preferences', error);
    }
  }

  public async processCommand(input: string): Promise<CommandResult> {
    this.log(`Processing command: "${input}"`);
    
    try {
      const intent = this.detectIntent(input);
      
      switch (intent.type) {
        case 'app_launch':
          return await this.handleAppLaunch(intent.data, input);
        
        case 'web_search':
          return await this.handleWebSearch(intent.data, input);
        
        case 'youtube_search':
          return await this.handleYouTubeSearch(intent.data, input);
        
        case 'email_composition':
          return await this.handleEmailComposition(intent.data, input);
        
        case 'weather_check':
          return await this.handleWeatherCheck(intent.data, input);
        
        case 'file_operation':
          return await this.handleFileOperation(intent.data, input);
        
        case 'system_control':
          return await this.handleSystemControl(intent.data, input);
        
        default:
          return await this.handleGenericCommand(input);
      }
    } catch (error) {
      this.log('Error processing command', error);
      return {
        success: false,
        message: 'I encountered an error while processing your command.',
        error: String(error),
        fallback: 'Try rephrasing your request or be more specific about what you want to do.'
      };
    }
  }

  private detectIntent(input: string): { type: string; data: any } {
    const lowerInput = input.toLowerCase();
    
    // App launch patterns
    if (lowerInput.includes('open ') || lowerInput.includes('launch ') || lowerInput.includes('start ')) {
      const appName = this.extractAppName(input);
      return { type: 'app_launch', data: { appName, originalInput: input } };
    }
    
    // Search patterns
    if (lowerInput.includes('search for ') || lowerInput.includes('find ')) {
      const query = this.extractSearchQuery(input);
      if (lowerInput.includes('youtube') || lowerInput.includes('video')) {
        return { type: 'youtube_search', data: { query, originalInput: input } };
      }
      return { type: 'web_search', data: { query, originalInput: input } };
    }
    
    // Email patterns
    if (lowerInput.includes('write an email') || lowerInput.includes('compose email') || 
        lowerInput.includes('send email') || lowerInput.includes('draft email')) {
      const recipient = this.extractEmailRecipient(input);
      return { type: 'email_composition', data: { recipient, originalInput: input } };
    }
    
    // Weather patterns
    if (lowerInput.includes('weather') || lowerInput.includes('temperature')) {
      const location = this.extractLocation(input);
      return { type: 'weather_check', data: { location, originalInput: input } };
    }
    
    // File operations
    if (lowerInput.includes('file ') || lowerInput.includes('folder ') || 
        lowerInput.includes('create ') || lowerInput.includes('delete ') || 
        lowerInput.includes('move ') || lowerInput.includes('copy ')) {
      return { type: 'file_operation', data: { originalInput: input } };
    }
    
    // System controls
    if (lowerInput.includes('volume ') || lowerInput.includes('brightness ') || 
        lowerInput.includes('lock ') || lowerInput.includes('sleep ') || 
        lowerInput.includes('shutdown ') || lowerInput.includes('restart ')) {
      return { type: 'system_control', data: { originalInput: input } };
    }
    
    // Generic command
    return { type: 'generic', data: { originalInput: input } };
  }

  private async handleAppLaunch(data: any, originalInput: string): Promise<CommandResult> {
    const { appName } = data;
    this.log(`Attempting to launch app: ${appName}`);
    
    // Check if we have a known app
    const appInfo = this.commonApps.get(appName.toLowerCase());
    
    if (appInfo) {
      // Try to launch the app
      const launchResult = await this.tryLaunchApp(appInfo);
      
      if (launchResult.success) {
        return launchResult;
      }
      
      // If app launch failed, try web fallback
      if (appInfo.webFallback) {
        this.log(`App launch failed, trying web fallback: ${appInfo.webFallback}`);
        return await this.openWebUrl(appInfo.webFallback, `Opened ${appInfo.name} in browser`);
      }
      
      // If no web fallback, suggest alternatives
      return {
        success: false,
        message: `${appInfo.name} couldn't be launched.`,
        fallback: `Would you like me to search for ${appInfo.name} alternatives or open it in a browser?`
      };
    }
    
    // For unknown apps, try to find and launch them
    return await this.tryLaunchUnknownApp(appName, originalInput);
  }

  private async tryLaunchApp(appInfo: AppInfo): Promise<CommandResult> {
    for (const appPath of appInfo.paths) {
      try {
        const expandedPath = appPath.replace('%USERNAME%', os.userInfo().username);
        
        // Handle wildcards in paths (for Windows Store apps)
        if (expandedPath.includes('*')) {
          const basePath = expandedPath.substring(0, expandedPath.lastIndexOf('\\'));
          if (fs.existsSync(basePath)) {
            const files = fs.readdirSync(basePath);
            const matchingFile = files.find(file => file.includes('Spotify.exe'));
            if (matchingFile) {
              const fullPath = path.join(basePath, matchingFile);
              await shell.openPath(fullPath);
              return {
                success: true,
                message: `Launched ${appInfo.name} successfully.`
              };
            }
          }
        } else if (fs.existsSync(expandedPath)) {
          await shell.openPath(expandedPath);
          return {
            success: true,
            message: `Launched ${appInfo.name} successfully.`
          };
        }
      } catch (error) {
        this.log(`Failed to launch ${appInfo.name} from ${appPath}`, error);
      }
    }
    
    return {
      success: false,
      message: `Could not find ${appInfo.name} in expected locations.`
    };
  }

  private async tryLaunchUnknownApp(appName: string, originalInput: string): Promise<CommandResult> {
    try {
      // Try using the app launch service
      const result = await this.appLaunchService.launchApp(appName);
      
      if (result.success) {
        return {
          success: true,
          message: `Launched ${appName} successfully.`
        };
      }
      
      // If that fails, try a web search
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(appName)}`;
      await this.openWebUrl(searchUrl, `Searching for ${appName}`);
      
      return {
        success: true,
        message: `I couldn't find ${appName} on your system, but I've opened a search for it.`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `I couldn't launch ${appName}.`,
        error: String(error),
        fallback: `Try being more specific about the app name, or I can search for alternatives.`
      };
    }
  }

  private async handleWebSearch(data: any, originalInput: string): Promise<CommandResult> {
    const { query } = data;
    this.log(`Performing web search for: ${query}`);
    
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    return await this.openWebUrl(searchUrl, `Searching for: ${query}`);
  }

  private async handleYouTubeSearch(data: any, originalInput: string): Promise<CommandResult> {
    const { query } = data;
    this.log(`Performing YouTube search for: ${query}`);
    
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    return await this.openWebUrl(searchUrl, `Searching YouTube for: ${query}`);
  }

  private async handleEmailComposition(data: any, originalInput: string): Promise<CommandResult> {
    const { recipient } = data;
    this.log(`Composing email to: ${recipient}`);
    
    let mailtoUrl = 'mailto:';
    if (recipient) {
      mailtoUrl += recipient;
    }
    
    try {
      await shell.openExternal(mailtoUrl);
      return {
        success: true,
        message: recipient ? `Opened email composer for ${recipient}` : 'Opened email composer'
      };
    } catch (error) {
      // Fallback to Gmail
      const gmailUrl = 'https://mail.google.com/mail/u/0/#compose';
      return await this.openWebUrl(gmailUrl, 'Opened Gmail compose window');
    }
  }

  private async handleWeatherCheck(data: any, originalInput: string): Promise<CommandResult> {
    const { location } = data;
    this.log(`Checking weather for: ${location}`);
    
    const weatherUrl = `https://www.google.com/search?q=weather+${encodeURIComponent(location)}`;
    return await this.openWebUrl(weatherUrl, `Checking weather for ${location}`);
  }

  private async handleFileOperation(data: any, originalInput: string): Promise<CommandResult> {
    // For now, just open file explorer
    try {
      await shell.openPath(os.homedir());
      return {
        success: true,
        message: 'Opened file explorer for you.'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Could not open file explorer.',
        error: String(error)
      };
    }
  }

  private async handleSystemControl(data: any, originalInput: string): Promise<CommandResult> {
    const lowerInput = originalInput.toLowerCase();
    
    try {
      if (lowerInput.includes('volume up')) {
        await execAsync('powershell -command "(Get-AudioDevice -Playback).Volume += 10"');
        return { success: true, message: 'Volume increased.' };
      } else if (lowerInput.includes('volume down')) {
        await execAsync('powershell -command "(Get-AudioDevice -Playback).Volume -= 10"');
        return { success: true, message: 'Volume decreased.' };
      } else if (lowerInput.includes('lock')) {
        await execAsync('rundll32.exe user32.dll,LockWorkStation');
        return { success: true, message: 'System locked.' };
      } else if (lowerInput.includes('sleep')) {
        await execAsync('powercfg /hibernate off && rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
        return { success: true, message: 'System going to sleep.' };
      } else {
        return {
          success: false,
          message: 'System control command not recognized.',
          fallback: 'Try commands like "volume up", "volume down", "lock system", or "sleep system".'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to execute system control command.',
        error: String(error)
      };
    }
  }

  private async handleGenericCommand(input: string): Promise<CommandResult> {
    // Try to interpret as a search query
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(input)}`;
    return await this.openWebUrl(searchUrl, `Searching for: ${input}`);
  }

  private async openWebUrl(url: string, message: string): Promise<CommandResult> {
    try {
      // Get preferred browser
      const preferredBrowser = this.userPreferences.get('default_browser') || 'chrome';
      const browserInfo = this.commonApps.get(preferredBrowser);
      
      if (browserInfo) {
        const launchResult = await this.tryLaunchApp(browserInfo);
        if (launchResult.success) {
          // Wait a moment for browser to start, then open URL
          setTimeout(async () => {
            try {
              await shell.openExternal(url);
            } catch (error) {
              this.log('Failed to open URL in browser', error);
            }
          }, 1000);
          
          return {
            success: true,
            message: `${message} in ${browserInfo.name}.`
          };
        }
      }
      
      // Fallback to default browser
      await shell.openExternal(url);
      return {
        success: true,
        message: `${message} in your default browser.`
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Failed to open browser.',
        error: String(error),
        fallback: 'Try opening your browser manually and navigating to the URL.'
      };
    }
  }

  private extractAppName(input: string): string {
    const openKeywords = ['open', 'launch', 'start'];
    const words = input.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      if (openKeywords.includes(words[i].toLowerCase()) && i + 1 < words.length) {
        return words[i + 1];
      }
    }
    
    return 'application';
  }

  private extractSearchQuery(input: string): string {
    const searchKeywords = ['search for', 'find', 'look for'];
    
    for (const keyword of searchKeywords) {
      if (input.toLowerCase().includes(keyword)) {
        const index = input.toLowerCase().indexOf(keyword);
        return input.substring(index + keyword.length).trim();
      }
    }
    
    return input;
  }

  private extractEmailRecipient(input: string): string {
    // Simple extraction - look for "to [name]" pattern
    const toMatch = input.match(/to\s+(\w+)/i);
    return toMatch ? toMatch[1] : '';
  }

  private extractLocation(input: string): string {
    // Simple extraction - look for "in [location]" pattern
    const inMatch = input.match(/in\s+([^,]+)/i);
    return inMatch ? inMatch[1].trim() : 'current location';
  }

  public setUserPreference(key: string, value: string) {
    this.userPreferences.set(key, value);
    this.saveUserPreferences();
  }

  public getUserPreference(key: string): string | undefined {
    return this.userPreferences.get(key);
  }
}

// Export singleton instance
export const agenticCommandProcessor = new AgenticCommandProcessor();
