import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { shell } from 'electron';

const execAsync = promisify(exec);

interface AppConfig {
  name: string;
  aliases: string[];
  category: string;
  windowsPath?: string;
  macPath?: string;
  linuxPath?: string;
  url?: string;
  fallbacks?: string[];
  priority: number;
}

interface IntentMapping {
  intent: string;
  keywords: string[];
  categories: string[];
  fallbackStrategy: 'category' | 'specific' | 'web';
}

interface UserPreference {
  originalRequest: string;
  fallbackChoice: string;
  timestamp: number;
  success: boolean;
}

interface LaunchResult {
  success: boolean;
  message: string;
  launchedApp?: string;
  fallbackUsed?: boolean;
  error?: string;
}

export class AppLaunchService {
  private appConfigs: AppConfig[] = [];
  private intentMappings: IntentMapping[] = [];
  private preferencesFile: string;
  private userPreferences: UserPreference[] = [];
  private debug: boolean;

  constructor() {
    this.preferencesFile = path.join(os.homedir(), '.doppel', 'app-preferences.json');
    this.debug = process.env.DEBUG_MODE === 'true';
    this.initializeAppConfigs();
    this.initializeIntentMappings();
    this.loadUserPreferences();
  }

  private initializeAppConfigs() {
    this.appConfigs = [
      // Browsers
      {
        name: 'chrome',
        aliases: ['google chrome', 'chromium', 'chrome browser'],
        category: 'browser',
        windowsPath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        macPath: '/Applications/Google Chrome.app',
        linuxPath: 'google-chrome',
        fallbacks: ['edge', 'firefox', 'brave'],
        priority: 1
      },
      {
        name: 'edge',
        aliases: ['microsoft edge', 'edge browser'],
        category: 'browser',
        windowsPath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        macPath: '/Applications/Microsoft Edge.app',
        linuxPath: 'microsoft-edge',
        fallbacks: ['chrome', 'firefox', 'brave'],
        priority: 2
      },
      {
        name: 'firefox',
        aliases: ['mozilla', 'firefox browser'],
        category: 'browser',
        windowsPath: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
        macPath: '/Applications/Firefox.app',
        linuxPath: 'firefox',
        fallbacks: ['chrome', 'edge', 'brave'],
        priority: 3
      },
      {
        name: 'brave',
        aliases: ['brave browser'],
        category: 'browser',
        windowsPath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        macPath: '/Applications/Brave Browser.app',
        linuxPath: 'brave-browser',
        fallbacks: ['chrome', 'edge', 'firefox'],
        priority: 4
      },

      // Email Clients
      {
        name: 'outlook',
        aliases: ['microsoft outlook', 'outlook app'],
        category: 'email',
        windowsPath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE',
        macPath: '/Applications/Microsoft Outlook.app',
        linuxPath: 'outlook',
        url: 'https://outlook.office.com',
        fallbacks: ['gmail', 'thunderbird'],
        priority: 1
      },
      {
        name: 'gmail',
        aliases: ['google mail', 'gmail app'],
        category: 'email',
        url: 'https://mail.google.com',
        fallbacks: ['outlook', 'thunderbird'],
        priority: 2
      },
      {
        name: 'thunderbird',
        aliases: ['mozilla thunderbird'],
        category: 'email',
        windowsPath: 'C:\\Program Files\\Mozilla Thunderbird\\thunderbird.exe',
        macPath: '/Applications/Thunderbird.app',
        linuxPath: 'thunderbird',
        fallbacks: ['outlook', 'gmail'],
        priority: 3
      },

      // Terminals
      {
        name: 'windows terminal',
        aliases: ['terminal', 'windows terminal app'],
        category: 'terminal',
        windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Local\\Microsoft\\WindowsApps\\wt.exe',
        fallbacks: ['cmd', 'powershell'],
        priority: 1
      },
      {
        name: 'cmd',
        aliases: ['command prompt', 'cmd.exe'],
        category: 'terminal',
        windowsPath: 'cmd.exe',
        fallbacks: ['powershell', 'windows terminal'],
        priority: 2
      },
      {
        name: 'powershell',
        aliases: ['powershell.exe', 'ps'],
        category: 'terminal',
        windowsPath: 'powershell.exe',
        fallbacks: ['cmd', 'windows terminal'],
        priority: 3
      },

      // Text Editors
      {
        name: 'notepad',
        aliases: ['text editor', 'notes'],
        category: 'text-editor',
        windowsPath: 'notepad.exe',
        macPath: '/Applications/TextEdit.app',
        linuxPath: 'gedit',
        fallbacks: ['notepad++', 'vscode'],
        priority: 1
      },
      {
        name: 'notepad++',
        aliases: ['notepad plus plus'],
        category: 'text-editor',
        windowsPath: 'C:\\Program Files\\Notepad++\\notepad++.exe',
        fallbacks: ['notepad', 'vscode'],
        priority: 2
      },
      {
        name: 'vscode',
        aliases: ['visual studio code', 'code editor'],
        category: 'text-editor',
        windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',
        macPath: '/Applications/Visual Studio Code.app',
        linuxPath: 'code',
        fallbacks: ['notepad++', 'notepad'],
        priority: 3
      },

      // File Managers
      {
        name: 'explorer',
        aliases: ['file explorer', 'files', 'folder'],
        category: 'file-manager',
        windowsPath: 'explorer.exe',
        macPath: '/System/Library/CoreServices/Finder.app',
        linuxPath: 'nautilus',
        fallbacks: ['filezilla'],
        priority: 1
      },

      // Media Players
      {
        name: 'spotify',
        aliases: ['music', 'audio'],
        category: 'media',
        windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Roaming\\Spotify\\Spotify.exe',
        macPath: '/Applications/Spotify.app',
        linuxPath: 'spotify',
        fallbacks: ['youtube', 'vlc'],
        priority: 1
      },
      {
        name: 'vlc',
        aliases: ['video player', 'media player'],
        category: 'media',
        windowsPath: 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
        macPath: '/Applications/VLC.app',
        linuxPath: 'vlc',
        fallbacks: ['spotify', 'youtube'],
        priority: 2
      },

      // Communication
      {
        name: 'discord',
        aliases: ['chat', 'communication'],
        category: 'communication',
        windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Local\\Discord\\app-*\\Discord.exe',
        macPath: '/Applications/Discord.app',
        linuxPath: 'discord',
        fallbacks: ['slack', 'teams'],
        priority: 1
      },
      {
        name: 'slack',
        aliases: ['team chat', 'work chat'],
        category: 'communication',
        windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Local\\slack\\slack.exe',
        macPath: '/Applications/Slack.app',
        linuxPath: 'slack',
        fallbacks: ['discord', 'teams'],
        priority: 2
      },
      {
        name: 'teams',
        aliases: ['microsoft teams', 'work teams'],
        category: 'communication',
        windowsPath: 'C:\\Users\\%USERNAME%\\AppData\\Local\\Microsoft\\Teams\\current\\Teams.exe',
        macPath: '/Applications/Microsoft Teams.app',
        linuxPath: 'teams',
        fallbacks: ['slack', 'discord'],
        priority: 3
      }
    ];
  }

  private initializeIntentMappings() {
    this.intentMappings = [
      {
        intent: 'browser',
        keywords: ['browser', 'web', 'internet', 'surf', 'navigate'],
        categories: ['browser'],
        fallbackStrategy: 'category'
      },
      {
        intent: 'email',
        keywords: ['email', 'mail', 'outlook', 'gmail', 'thunderbird'],
        categories: ['email'],
        fallbackStrategy: 'web'
      },
      {
        intent: 'terminal',
        keywords: ['terminal', 'command', 'shell', 'cmd', 'powershell'],
        categories: ['terminal'],
        fallbackStrategy: 'category'
      },
      {
        intent: 'text-editor',
        keywords: ['editor', 'text', 'notepad', 'code', 'write'],
        categories: ['text-editor'],
        fallbackStrategy: 'category'
      },
      {
        intent: 'file-manager',
        keywords: ['files', 'folder', 'explorer', 'file manager'],
        categories: ['file-manager'],
        fallbackStrategy: 'category'
      },
      {
        intent: 'media',
        keywords: ['music', 'video', 'player', 'spotify', 'vlc'],
        categories: ['media'],
        fallbackStrategy: 'web'
      },
      {
        intent: 'communication',
        keywords: ['chat', 'message', 'discord', 'slack', 'teams'],
        categories: ['communication'],
        fallbackStrategy: 'web'
      }
    ];
  }

  private loadUserPreferences() {
    try {
      if (fs.existsSync(this.preferencesFile)) {
        const data = fs.readFileSync(this.preferencesFile, 'utf8');
        this.userPreferences = JSON.parse(data);
      }
    } catch (error) {
      this.log('Error loading user preferences', { error });
      this.userPreferences = [];
    }
  }

  private saveUserPreferences() {
    try {
      const dir = path.dirname(this.preferencesFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.preferencesFile, JSON.stringify(this.userPreferences, null, 2));
    } catch (error) {
      this.log('Error saving user preferences', { error });
    }
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[AppLaunchService] ${message}`, data || '');
    }
  }

  public async launchApp(input: string): Promise<LaunchResult> {
    this.log('Processing app launch request', { input });

    // Step 1: Intent Recognition
    const intent = this.recognizeIntent(input);
    this.log('Recognized intent', { intent, input });

    // Step 2: App Detection
    const detectedApps = this.detectApps(input, intent);
    this.log('Detected apps', { detectedApps });

    if (detectedApps.length === 0) {
      return {
        success: false,
        message: `I couldn't find any apps matching "${input}". Could you be more specific?`
      };
    }

    // Step 3: Handle multiple matches
    if (detectedApps.length > 1) {
      const clarification = this.generateClarification(detectedApps);
      return {
        success: false,
        message: clarification
      };
    }

    // Step 4: Try to launch the primary app
    const primaryApp = detectedApps[0];
    const launchResult = await this.tryLaunchApp(primaryApp);

    if (launchResult.success) {
      this.savePreference(input, primaryApp.name, true);
      return launchResult;
    }

    // Step 5: Fallback logic
    const fallbackResult = await this.handleFallback(input, primaryApp, intent);
    this.savePreference(input, fallbackResult.launchedApp || 'none', fallbackResult.success);
    
    return fallbackResult;
  }

  private recognizeIntent(input: string): string | null {
    const lowerInput = input.toLowerCase();
    
    for (const mapping of this.intentMappings) {
      if (mapping.keywords.some(keyword => lowerInput.includes(keyword))) {
        return mapping.intent;
      }
    }

    // Check if input contains app names directly
    for (const app of this.appConfigs) {
      if (lowerInput.includes(app.name) || app.aliases.some(alias => lowerInput.includes(alias))) {
        return app.category;
      }
    }

    return null;
  }

  private detectApps(input: string, intent: string | null): AppConfig[] {
    const lowerInput = input.toLowerCase();
    const detected: AppConfig[] = [];

    for (const app of this.appConfigs) {
      const matchesInput = lowerInput.includes(app.name) || 
                          app.aliases.some(alias => lowerInput.includes(alias));
      
      const matchesIntent = intent && app.category === intent;

      if (matchesInput || matchesIntent) {
        detected.push(app);
      }
    }

    // Sort by priority and relevance
    detected.sort((a, b) => {
      const aExactMatch = lowerInput.includes(a.name);
      const bExactMatch = lowerInput.includes(b.name);
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      return a.priority - b.priority;
    });

    return detected;
  }

  private generateClarification(apps: AppConfig[]): string {
    const appNames = apps.map(app => app.name).join(', ');
    return `I found multiple apps that might match your request: ${appNames}. Could you be more specific?`;
  }

  private async tryLaunchApp(app: AppConfig): Promise<LaunchResult> {
    this.log('Attempting to launch app', { app: app.name });

    try {
      if (app.url) {
        await shell.openExternal(app.url);
        return {
          success: true,
          message: `Opened ${app.name} in your browser.`,
          launchedApp: app.name
        };
      }

      const appPath = this.getAppPath(app);
      if (!appPath) {
        return {
          success: false,
          message: `Could not find the path for ${app.name}.`,
          error: 'App path not found'
        };
      }

      await this.executeApp(appPath);
      return {
        success: true,
        message: `Launched ${app.name}.`,
        launchedApp: app.name
      };

    } catch (error) {
      this.log('App launch failed', { app: app.name, error });
      return {
        success: false,
        message: `Failed to launch ${app.name}.`,
        error: String(error)
      };
    }
  }

  private async handleFallback(input: string, primaryApp: AppConfig, intent: string | null): Promise<LaunchResult> {
    this.log('Handling fallback', { primaryApp: primaryApp.name, intent });

    // Check user preferences first
    const preference = this.getUserPreference(input);
    if (preference && preference.fallbackChoice !== 'none') {
      const preferredApp = this.appConfigs.find(app => app.name === preference.fallbackChoice);
      if (preferredApp) {
        const result = await this.tryLaunchApp(preferredApp);
        if (result.success) {
          return {
            ...result,
            fallbackUsed: true,
            message: `${primaryApp.name} is not available. Launched ${preferredApp.name} instead (based on your previous preference).`
          };
        }
      }
    }

    // Generate fallback options
    const fallbackOptions = this.generateFallbackOptions(primaryApp, intent);
    
    if (fallbackOptions.length === 0) {
      return {
        success: false,
        message: `${primaryApp.name} is not available and I couldn't find any suitable alternatives.`,
        error: 'No fallback options available'
      };
    }

    // For now, return a message with fallback options
    // In a real implementation, this would trigger a UI dialog
    const optionsList = fallbackOptions.map(app => app.name).join(', ');
    return {
      success: false,
      message: `${primaryApp.name} is not available. Would you like me to open ${optionsList} instead?`,
      error: 'User choice required'
    };
  }

  private generateFallbackOptions(primaryApp: AppConfig, intent: string | null): AppConfig[] {
    const options: AppConfig[] = [];

    // Add app-specific fallbacks
    if (primaryApp.fallbacks) {
      for (const fallbackName of primaryApp.fallbacks) {
        const fallbackApp = this.appConfigs.find(app => app.name === fallbackName);
        if (fallbackApp) {
          options.push(fallbackApp);
        }
      }
    }

    // Add category-based fallbacks
    if (intent) {
      const categoryApps = this.appConfigs.filter(app => app.category === intent && app.name !== primaryApp.name);
      options.push(...categoryApps);
    }

    // Remove duplicates and sort by priority
    const uniqueOptions = options.filter((app, index, self) => 
      index === self.findIndex(a => a.name === app.name)
    );

    return uniqueOptions.slice(0, 3); // Limit to 3 options
  }

  private getAppPath(app: AppConfig): string | null {
    const platform = os.platform();
    let path: string | undefined;

    switch (platform) {
      case 'win32':
        path = app.windowsPath;
        break;
      case 'darwin':
        path = app.macPath;
        break;
      case 'linux':
        path = app.linuxPath;
        break;
      default:
        return null;
    }

    if (!path) return null;

    // Handle Windows path expansion
    if (platform === 'win32' && path.includes('%USERNAME%')) {
      path = path.replace(/%USERNAME%/g, os.userInfo().username);
    }

    return path;
  }

  private async executeApp(appPath: string): Promise<void> {
    const platform = os.platform();

    if (platform === 'win32') {
      // Handle wildcard paths (e.g., Discord app-*)
      if (appPath.includes('*')) {
        const basePath = appPath.substring(0, appPath.lastIndexOf('\\'));
        const pattern = appPath.substring(appPath.lastIndexOf('\\') + 1);
        
        if (fs.existsSync(basePath)) {
          const dirs = fs.readdirSync(basePath);
          const matchingDir = dirs.find(dir => dir.startsWith(pattern.replace('*', '')));
          if (matchingDir) {
            const fullPath = path.join(basePath, matchingDir, path.basename(appPath));
            if (fs.existsSync(fullPath)) {
              await execAsync(`"${fullPath}"`);
              return;
            }
          }
        }
      }

      // Check if file exists before executing
      if (fs.existsSync(appPath)) {
        await execAsync(`"${appPath}"`);
      } else {
        await execAsync(appPath);
      }
    } else if (platform === 'darwin') {
      await execAsync(`open "${appPath}"`);
    } else {
      await execAsync(appPath);
    }
  }

  private getUserPreference(input: string): UserPreference | null {
    // Find the most recent preference for similar requests
    const similarPreferences = this.userPreferences
      .filter(pref => pref.originalRequest.toLowerCase().includes(input.toLowerCase()) ||
                     input.toLowerCase().includes(pref.originalRequest.toLowerCase()))
      .sort((a, b) => b.timestamp - a.timestamp);

    return similarPreferences.length > 0 ? similarPreferences[0] : null;
  }

  private savePreference(originalRequest: string, fallbackChoice: string, success: boolean) {
    const preference: UserPreference = {
      originalRequest,
      fallbackChoice,
      timestamp: Date.now(),
      success
    };

    this.userPreferences.push(preference);
    
    // Keep only the last 100 preferences
    if (this.userPreferences.length > 100) {
      this.userPreferences = this.userPreferences.slice(-100);
    }

    this.saveUserPreferences();
  }

  public async handleUserChoice(input: string, choice: string): Promise<LaunchResult> {
    const app = this.appConfigs.find(a => a.name === choice);
    if (!app) {
      return {
        success: false,
        message: `Unknown app: ${choice}`,
        error: 'Invalid choice'
      };
    }

    const result = await this.tryLaunchApp(app);
    this.savePreference(input, choice, result.success);
    
    return result;
  }

  public getAppSuggestions(input: string): string[] {
    const lowerInput = input.toLowerCase();
    const suggestions: string[] = [];

    for (const app of this.appConfigs) {
      if (app.name.toLowerCase().includes(lowerInput) ||
          app.aliases.some(alias => alias.toLowerCase().includes(lowerInput))) {
        suggestions.push(app.name);
      }
    }

    return suggestions.slice(0, 5);
  }

  public getCategoryApps(category: string): AppConfig[] {
    return this.appConfigs.filter(app => app.category === category);
  }

  public getAllCategories(): string[] {
    return [...new Set(this.appConfigs.map(app => app.category))];
  }
}

export const appLaunchService = new AppLaunchService(); 