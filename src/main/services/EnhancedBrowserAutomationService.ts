import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { shell } from 'electron';

const execAsync = promisify(exec);

// Optional puppeteer import
let puppeteer: any = null;
try {
  puppeteer = require('puppeteer');
} catch (error) {
  console.warn('⚠️ Puppeteer not available - advanced browser automation features will be disabled');
}

interface BrowserInfo {
  name: string;
  aliases: string[];
  executable: string;
  isInstalled: boolean;
  priority: number;
  fallbackUrl?: string;
  automationSupported: boolean;
}

interface AutomationTask {
  id: string;
  type: 'navigation' | 'search' | 'login' | 'form_fill' | 'click' | 'custom';
  target: string;
  parameters: Record<string, any>;
  requiresInteraction: boolean;
  fallbackStrategy: 'web_search' | 'manual' | 'alternative_browser';
}

interface TaskMemory {
  id: string;
  task: string;
  browser: string;
  success: boolean;
  timestamp: number;
  fallbackUsed?: string;
  userFeedback?: string;
}

export class EnhancedBrowserAutomationService {
  private browsers: Map<string, BrowserInfo> = new Map();
  private taskMemory: TaskMemory[] = [];
  private lastUsedBrowser: string | null = null;
  private lastUsedTabs: string[] = [];
  private automationLogs: any[] = [];
  private isInitialized: boolean = false;
  private debug: boolean;
  private logsPath: string;
  private memoryPath: string;

  constructor() {
    this.debug = process.env.NODE_ENV === 'development';
    
    // Setup paths
    const dataDir = path.join(os.homedir(), '.doppel', 'browser-automation');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.logsPath = path.join(dataDir, 'automation-logs.json');
    this.memoryPath = path.join(dataDir, 'task-memory.json');
    
    this.initializeBrowsers();
    this.loadMemory();
  }

  private initializeBrowsers() {
    const browserConfigs = [
      {
        name: 'chrome',
        aliases: ['google chrome', 'chromium', 'chrome browser'],
        executable: 'chrome.exe',
        priority: 1,
        fallbackUrl: 'https://www.google.com',
        automationSupported: true
      },
      {
        name: 'edge',
        aliases: ['microsoft edge', 'edge browser'],
        executable: 'msedge.exe',
        priority: 2,
        fallbackUrl: 'https://www.bing.com',
        automationSupported: true
      },
      {
        name: 'firefox',
        aliases: ['mozilla', 'firefox browser'],
        executable: 'firefox.exe',
        priority: 3,
        fallbackUrl: 'https://www.mozilla.org',
        automationSupported: true
      },
      {
        name: 'brave',
        aliases: ['brave browser'],
        executable: 'brave.exe',
        priority: 4,
        fallbackUrl: 'https://brave.com',
        automationSupported: true
      }
    ];

    browserConfigs.forEach(config => {
      this.browsers.set(config.name, {
        ...config,
        isInstalled: false // Will be checked dynamically
      });
    });
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🌐 Initializing Enhanced Browser Automation Service...');
      
      // Check browser installations
      await this.detectInstalledBrowsers();
      
      // Load memory and logs
      this.loadMemory();
      this.loadLogs();
      
      this.isInitialized = true;
      console.log('✅ Enhanced Browser Automation Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Enhanced Browser Automation Service:', error);
    }
  }

  private async detectInstalledBrowsers(): Promise<void> {
    const platform = os.platform();
    
    for (const [name, browser] of this.browsers) {
      try {
        let isInstalled = false;
        
        if (platform === 'win32') {
          // Windows: Check common installation paths
          const paths = [
            `C:\\Program Files\\Google\\Chrome\\Application\\${browser.executable}`,
            `C:\\Program Files (x86)\\Google\\Chrome\\Application\\${browser.executable}`,
            `C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\${browser.executable}`,
            `C:\\Program Files\\Microsoft\\Edge\\Application\\${browser.executable}`,
            `C:\\Program Files\\Mozilla Firefox\\${browser.executable}`,
            `C:\\Program Files (x86)\\Mozilla Firefox\\${browser.executable}`,
            `C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\${browser.executable}`,
            `C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\${browser.executable}`
          ];
          
          for (const path of paths) {
            if (fs.existsSync(path)) {
              isInstalled = true;
              break;
            }
          }
        } else if (platform === 'darwin') {
          // macOS: Check Applications folder
          const appPath = `/Applications/${browser.name.charAt(0).toUpperCase() + browser.name.slice(1)}.app`;
          isInstalled = fs.existsSync(appPath);
        } else {
          // Linux: Try which command
          try {
            await execAsync(`which ${browser.name}`);
            isInstalled = true;
          } catch {
            isInstalled = false;
          }
        }
        
        browser.isInstalled = isInstalled;
        if (isInstalled) {
          console.log(`✅ Detected ${browser.name} installation`);
        }
      } catch (error) {
        console.warn(`⚠️ Error checking ${browser.name} installation:`, error);
        browser.isInstalled = false;
      }
    }
  }

  public async processBrowserCommand(input: string, context?: any): Promise<{
    success: boolean;
    message: string;
    requiresUserChoice?: boolean;
    choices?: string[];
    fallbackStrategy?: string;
    automationTask?: AutomationTask;
  }> {
    const taskId = this.generateTaskId();
    console.log(`[EnhancedBrowserAutomation] Processing: "${input}"`);
    
    try {
      // Parse the command
      const parsedCommand = this.parseBrowserCommand(input);
      
      // Check if we have a suitable browser
      const availableBrowsers = this.getAvailableBrowsers();
      
      if (availableBrowsers.length === 0) {
        return {
          success: false,
          message: "No browsers are installed on your system. Please install a browser like Chrome, Edge, or Firefox.",
          fallbackStrategy: 'manual'
        };
      }

      // Check if the requested browser is available
      const requestedBrowser = parsedCommand.browser || this.lastUsedBrowser || availableBrowsers[0].name;
      const browser = this.browsers.get(requestedBrowser);
      
      if (!browser || !browser.isInstalled) {
        // Suggest fallback browsers
        const fallbackChoices = availableBrowsers
          .filter(b => b.name !== requestedBrowser)
          .map(b => b.name);
        
        return {
          success: false,
          message: `${requestedBrowser} isn't installed. Should I open ${fallbackChoices[0]} instead?`,
          requiresUserChoice: true,
          choices: fallbackChoices,
          fallbackStrategy: 'alternative_browser'
        };
      }

      // Create automation task
      const automationTask: AutomationTask = {
        id: taskId,
        type: parsedCommand.type,
        target: parsedCommand.target,
        parameters: parsedCommand.parameters,
        requiresInteraction: parsedCommand.requiresInteraction,
        fallbackStrategy: parsedCommand.fallbackStrategy
      };

      // Execute the task
      const result = await this.executeAutomationTask(automationTask, browser);
      
      // Update memory
      this.updateTaskMemory(taskId, input, browser.name, result.success);
      
      return {
        success: result.success,
        message: result.message,
        automationTask
      };

    } catch (error) {
      console.error('[EnhancedBrowserAutomation] Error processing command:', error);
      return {
        success: false,
        message: `Error processing browser command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fallbackStrategy: 'manual'
      };
    }
  }

  private parseBrowserCommand(input: string): {
    browser?: string;
    type: 'navigation' | 'search' | 'login' | 'form_fill' | 'click' | 'custom';
    target: string;
    parameters: Record<string, any>;
    requiresInteraction: boolean;
    fallbackStrategy: 'web_search' | 'manual' | 'alternative_browser';
  } {
    const lowerInput = input.toLowerCase();
    
    // Extract browser preference
    let browser: string | undefined;
    for (const [name, browserInfo] of this.browsers) {
      if (lowerInput.includes(name) || browserInfo.aliases.some(alias => lowerInput.includes(alias))) {
        browser = name;
        break;
      }
    }

    // Determine command type and target
    let type: 'navigation' | 'search' | 'login' | 'form_fill' | 'click' | 'custom' = 'navigation';
    let target = '';
    let parameters: Record<string, any> = {};
    let requiresInteraction = false;
    let fallbackStrategy: 'web_search' | 'manual' | 'alternative_browser' = 'web_search';

    // YouTube search
    if (lowerInput.includes('youtube') && (lowerInput.includes('search') || lowerInput.includes('video'))) {
      type = 'search';
      target = 'youtube';
      const searchMatch = input.match(/(?:search for|find|look for)\s+(.+?)(?:\s+on youtube|$)/i);
      if (searchMatch) {
        parameters.query = searchMatch[1].trim();
      }
    }
    // Gmail/Email
    else if (lowerInput.includes('gmail') || lowerInput.includes('email')) {
      type = 'navigation';
      target = 'gmail';
      if (lowerInput.includes('login') || lowerInput.includes('sign in')) {
        requiresInteraction = true;
      }
      if (lowerInput.includes('compose') || lowerInput.includes('draft') || lowerInput.includes('write')) {
        type = 'form_fill';
        requiresInteraction = true;
      }
    }
    // General web search
    else if (lowerInput.includes('search for') || lowerInput.includes('find')) {
      type = 'search';
      target = 'google';
      const searchMatch = input.match(/(?:search for|find)\s+(.+)/i);
      if (searchMatch) {
        parameters.query = searchMatch[1].trim();
      }
    }
    // Direct URL navigation
    else if (lowerInput.includes('open') && (lowerInput.includes('.com') || lowerInput.includes('http'))) {
      type = 'navigation';
      const urlMatch = input.match(/(?:open|go to|navigate to)\s+(https?:\/\/[^\s]+|[^\s]+\.(?:com|org|net|edu|gov))/i);
      if (urlMatch) {
        target = urlMatch[1];
      }
    }
    // Generic "open website"
    else if (lowerInput.includes('open') && lowerInput.includes('website')) {
      type = 'navigation';
      const websiteMatch = input.match(/open\s+(\w+)\s+website/i);
      if (websiteMatch) {
        target = websiteMatch[1];
        parameters.website = websiteMatch[1];
      }
    }

    return {
      browser,
      type,
      target,
      parameters,
      requiresInteraction,
      fallbackStrategy
    };
  }

  private async executeAutomationTask(task: AutomationTask, browser: BrowserInfo): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      switch (task.type) {
        case 'navigation':
          return await this.handleNavigation(task, browser);
        case 'search':
          return await this.handleSearch(task, browser);
        case 'form_fill':
          return await this.handleFormFill(task, browser);
        default:
          return await this.handleGenericNavigation(task, browser);
      }
    } catch (error) {
      console.error('[EnhancedBrowserAutomation] Task execution error:', error);
      return {
        success: false,
        message: `Failed to execute task: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async handleNavigation(task: AutomationTask, browser: BrowserInfo): Promise<{
    success: boolean;
    message: string;
  }> {
    let url = task.target;
    
    // Handle website names
    if (task.parameters.website) {
      url = `https://www.${task.parameters.website}.com`;
    }
    
    // Ensure URL has protocol
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }

    try {
      await shell.openExternal(url);
      this.lastUsedBrowser = browser.name;
      this.updateLastUsedTabs(url);
      
      return {
        success: true,
        message: `Opened ${url} in ${browser.name}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to open ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async handleSearch(task: AutomationTask, browser: BrowserInfo): Promise<{
    success: boolean;
    message: string;
  }> {
    let searchUrl = '';
    
    if (task.target === 'youtube') {
      searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(task.parameters.query)}`;
    } else if (task.target === 'google') {
      searchUrl = `https://www.google.com/search?q=${encodeURIComponent(task.parameters.query)}`;
    } else {
      searchUrl = `https://www.google.com/search?q=${encodeURIComponent(task.parameters.query)}`;
    }

    try {
      await shell.openExternal(searchUrl);
      this.lastUsedBrowser = browser.name;
      this.updateLastUsedTabs(searchUrl);
      
      return {
        success: true,
        message: `Searching for "${task.parameters.query}" on ${task.target}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to perform search: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async handleFormFill(task: AutomationTask, browser: BrowserInfo): Promise<{
    success: boolean;
    message: string;
  }> {
    // For form filling, we need more sophisticated automation
    if (task.requiresInteraction && puppeteer) {
      return await this.handlePuppeteerAutomation(task, browser);
    } else {
      // Fallback to simple navigation
      return await this.handleNavigation(task, browser);
    }
  }

  private async handlePuppeteerAutomation(task: AutomationTask, browser: BrowserInfo): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!puppeteer) {
      return {
        success: false,
        message: "Advanced automation not available. Opening browser for manual interaction."
      };
    }

    try {
      // Launch browser with puppeteer
      const browserInstance = await puppeteer.launch({
        headless: false, // Show browser for user interaction
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });

      const page = await browserInstance.newPage();
      
      // Navigate to target
      let url = task.target;
      if (task.target === 'gmail') {
        url = 'https://mail.google.com';
      }
      
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // For Gmail compose, click compose button
      if (task.target === 'gmail' && task.type === 'form_fill') {
        await page.waitForSelector('[data-tooltip="Compose"]', { timeout: 10000 });
        await page.click('[data-tooltip="Compose"]');
      }

      return {
        success: true,
        message: `Opened ${task.target} in ${browser.name} for interaction`
      };
    } catch (error) {
      return {
        success: false,
        message: `Automation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async handleGenericNavigation(task: AutomationTask, browser: BrowserInfo): Promise<{
    success: boolean;
    message: string;
  }> {
    return await this.handleNavigation(task, browser);
  }

  public async handleUserChoice(originalInput: string, choice: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Update memory with user choice
      this.updateTaskMemory(this.generateTaskId(), originalInput, choice, true);
      
      // Process the choice
      const browser = this.browsers.get(choice);
      if (!browser || !browser.isInstalled) {
        return {
          success: false,
          message: `${choice} is not available. Please try another browser.`
        };
      }

      // Re-process the original command with the chosen browser
      const parsedCommand = this.parseBrowserCommand(originalInput);
      parsedCommand.browser = choice;
      
      const automationTask: AutomationTask = {
        id: this.generateTaskId(),
        type: parsedCommand.type,
        target: parsedCommand.target,
        parameters: parsedCommand.parameters,
        requiresInteraction: parsedCommand.requiresInteraction,
        fallbackStrategy: parsedCommand.fallbackStrategy
      };

      return await this.executeAutomationTask(automationTask, browser);
    } catch (error) {
      return {
        success: false,
        message: `Error handling user choice: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  public generatePromptSuggestions(input: string, context?: any): {
    suggestions: string[];
    context: string;
  } {
    const lowerInput = input.toLowerCase();
    const suggestions: string[] = [];
    let contextInfo = '';

    // Email-related suggestions
    if (lowerInput.includes('email') || lowerInput.includes('mail')) {
      if (lowerInput.includes('write') || lowerInput.includes('compose')) {
        suggestions.push(
          'Would you like to schedule a follow-up email?',
          'Should I draft a meeting summary email?',
          'Do you want to compose a cold outreach email?'
        );
        contextInfo = 'email_composition';
      }
    }

    // Browser-related suggestions
    if (lowerInput.includes('open') && lowerInput.includes('browser')) {
      suggestions.push(
        'Should I open Chrome, Edge, or Firefox?',
        'Would you like me to open your default browser?',
        'Do you want to open a specific website?'
      );
      contextInfo = 'browser_selection';
    }

    // Search-related suggestions
    if (lowerInput.includes('search') || lowerInput.includes('find')) {
      suggestions.push(
        'Would you like to search on Google, YouTube, or another site?',
        'Should I search for recent results or all time?',
        'Do you want to search for images, videos, or web pages?'
      );
      contextInfo = 'search_refinement';
    }

    // Generic suggestions for incomplete commands
    if (input.trim().length < 10) {
      suggestions.push(
        'Could you provide more details about what you want to do?',
        'Are you looking to open an application, search the web, or perform a specific task?',
        'Would you like me to suggest some common commands?'
      );
      contextInfo = 'incomplete_command';
    }

    return { suggestions, context: contextInfo };
  }

  private getAvailableBrowsers(): BrowserInfo[] {
    return Array.from(this.browsers.values())
      .filter(browser => browser.isInstalled)
      .sort((a, b) => a.priority - b.priority);
  }

  private updateTaskMemory(taskId: string, task: string, browser: string, success: boolean): void {
    const memory: TaskMemory = {
      id: taskId,
      task,
      browser,
      success,
      timestamp: Date.now()
    };
    
    this.taskMemory.unshift(memory);
    
    // Keep only last 100 entries
    if (this.taskMemory.length > 100) {
      this.taskMemory = this.taskMemory.slice(0, 100);
    }
    
    this.saveMemory();
  }

  private updateLastUsedTabs(url: string): void {
    this.lastUsedTabs.unshift(url);
    this.lastUsedTabs = this.lastUsedTabs.slice(0, 10); // Keep last 10
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadMemory(): void {
    try {
      if (fs.existsSync(this.memoryPath)) {
        const data = fs.readFileSync(this.memoryPath, 'utf8');
        const parsed = JSON.parse(data);
        this.taskMemory = parsed.taskMemory || [];
        this.lastUsedBrowser = parsed.lastUsedBrowser || null;
        this.lastUsedTabs = parsed.lastUsedTabs || [];
      }
    } catch (error) {
      console.warn('Failed to load browser automation memory:', error);
    }
  }

  private saveMemory(): void {
    try {
      const data = {
        taskMemory: this.taskMemory,
        lastUsedBrowser: this.lastUsedBrowser,
        lastUsedTabs: this.lastUsedTabs,
        timestamp: Date.now()
      };
      fs.writeFileSync(this.memoryPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('Failed to save browser automation memory:', error);
    }
  }

  private loadLogs(): void {
    try {
      if (fs.existsSync(this.logsPath)) {
        const data = fs.readFileSync(this.logsPath, 'utf8');
        this.automationLogs = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load automation logs:', error);
    }
  }

  public getStatus(): {
    isInitialized: boolean;
    availableBrowsers: string[];
    lastUsedBrowser: string | null;
    taskMemoryCount: number;
    puppeteerAvailable: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      availableBrowsers: Array.from(this.browsers.values())
        .filter(b => b.isInstalled)
        .map(b => b.name),
      lastUsedBrowser: this.lastUsedBrowser,
      taskMemoryCount: this.taskMemory.length,
      puppeteerAvailable: puppeteer !== null
    };
  }

  public getTaskMemory(limit: number = 20): TaskMemory[] {
    return this.taskMemory.slice(0, limit);
  }

  public clearMemory(): void {
    this.taskMemory = [];
    this.saveMemory();
  }

  /**
   * Process natural language commands for browser automation
   */
  public async processNaturalLanguageCommand(command: string): Promise<{
    success: boolean;
    message: string;
    action?: string;
    target?: string;
    browser?: string;
  }> {
    try {
      const result = await this.processBrowserCommand(command);
      return {
        success: result.success,
        message: result.message,
        action: result.automationTask?.type,
        target: result.automationTask?.target,
        browser: this.lastUsedBrowser || 'default'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process browser command: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const enhancedBrowserAutomationService = new EnhancedBrowserAutomationService();
