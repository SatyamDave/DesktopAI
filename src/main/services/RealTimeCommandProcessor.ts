import { Worker } from 'worker_threads';
import * as path from 'path';
import { localLLMService } from './LocalLLMService';
import { systemControlService } from './SystemControlService';
import { commandExecutor } from './CommandExecutor';
import { configManager } from './ConfigManager';

interface CommandContext {
  activeWindow?: any;
  systemInfo?: any;
  clipboardText?: string;
  mousePosition?: { x: number; y: number };
  timestamp: number;
}

interface ProcessedCommand {
  success: boolean;
  intent: string;
  confidence: number;
  action: string;
  parameters: Record<string, any>;
  response: string;
  latency: number;
  context: CommandContext;
}

interface ActionHandler {
  name: string;
  handler: (parameters: Record<string, any>, context: CommandContext) => Promise<string>;
  requiresConfirmation: boolean;
  description: string;
}

export class RealTimeCommandProcessor {
  private actionHandlers: Map<string, ActionHandler> = new Map();
  private isInitialized = false;
  private workerThreads: Map<string, Worker> = new Map();
  private maxWorkers = 4;
  private commandQueue: Array<{ input: string; resolve: (result: ProcessedCommand) => void; reject: (error: Error) => void }> = [];
  private isProcessing = false;
  private debug: boolean;

  constructor() {
    this.debug = configManager.isDebugMode();
    this.initializeActionHandlers();
  }

  private initializeActionHandlers(): void {
    // System control actions
    this.actionHandlers.set('open_app', {
      name: 'open_app',
      handler: this.handleOpenApp.bind(this),
      requiresConfirmation: false,
      description: 'Launch applications'
    });

    this.actionHandlers.set('system_control', {
      name: 'system_control',
      handler: this.handleSystemControl.bind(this),
      requiresConfirmation: true,
      description: 'Control system settings'
    });

    this.actionHandlers.set('file_operation', {
      name: 'file_operation',
      handler: this.handleFileOperation.bind(this),
      requiresConfirmation: true,
      description: 'File system operations'
    });

    this.actionHandlers.set('web_search', {
      name: 'web_search',
      handler: this.handleWebSearch.bind(this),
      requiresConfirmation: false,
      description: 'Search the web'
    });

    this.actionHandlers.set('browser_automation', {
      name: 'browser_automation',
      handler: this.handleBrowserAutomation.bind(this),
      requiresConfirmation: false,
      description: 'Control web browser'
    });

    this.actionHandlers.set('clipboard_operation', {
      name: 'clipboard_operation',
      handler: this.handleClipboardOperation.bind(this),
      requiresConfirmation: false,
      description: 'Clipboard operations'
    });

    this.actionHandlers.set('text_processing', {
      name: 'text_processing',
      handler: this.handleTextProcessing.bind(this),
      requiresConfirmation: false,
      description: 'Process and analyze text'
    });

    this.actionHandlers.set('mouse_control', {
      name: 'mouse_control',
      handler: this.handleMouseControl.bind(this),
      requiresConfirmation: true,
      description: 'Control mouse movements and clicks'
    });

    this.actionHandlers.set('keyboard_control', {
      name: 'keyboard_control',
      handler: this.handleKeyboardControl.bind(this),
      requiresConfirmation: true,
      description: 'Control keyboard input'
    });

    this.actionHandlers.set('screenshot', {
      name: 'screenshot',
      handler: this.handleScreenshot.bind(this),
      requiresConfirmation: false,
      description: 'Take screenshots and extract text'
    });
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('⚡ Initializing Real-time Command Processor...');
      
      // Initialize services
      await Promise.all([
        localLLMService.initialize(),
        systemControlService.initialize()
      ]);

      // Start processing queue
      this.startQueueProcessing();
      
      this.isInitialized = true;
      console.log('✅ Real-time Command Processor initialized');
    } catch (error) {
      console.error('❌ Error initializing Real-time Command Processor:', error);
      throw error;
    }
  }

  public async processCommand(input: string): Promise<ProcessedCommand> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      this.commandQueue.push({ input, resolve, reject });
    });
  }

  private async startQueueProcessing(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (this.commandQueue.length > 0) {
      const { input, resolve, reject } = this.commandQueue.shift()!;
      
      try {
        const result = await this.processCommandInternal(input);
        resolve(result);
      } catch (error) {
        reject(error as Error);
      }
    }
    
    this.isProcessing = false;
  }

  private async processCommandInternal(input: string): Promise<ProcessedCommand> {
    const startTime = Date.now();
    
    try {
      // Gather context
      const context = await this.gatherContext();
      
      // Process with local LLM
      const llmResult = await localLLMService.processCommand(input, context);
      
      // Execute action
      const actionResult = await this.executeAction(llmResult, context);
      
      const latency = Date.now() - startTime;
      
      const result: ProcessedCommand = {
        success: true,
        intent: llmResult.intent,
        confidence: llmResult.confidence,
        action: llmResult.action,
        parameters: llmResult.parameters,
        response: actionResult,
        latency,
        context
      };

      if (this.debug) {
        console.log(`⚡ Command processed in ${latency}ms:`, {
          input,
          intent: llmResult.intent,
          confidence: llmResult.confidence,
          action: llmResult.action
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Error processing command:', error);
      return {
        success: false,
        intent: 'error',
        confidence: 0,
        action: 'error',
        parameters: {},
        response: `Error: ${error}`,
        latency: Date.now() - startTime,
        context: { timestamp: Date.now() }
      };
    }
  }

  private async gatherContext(): Promise<CommandContext> {
    try {
      const [activeWindow, systemInfo, mousePosition] = await Promise.all([
        systemControlService.getActiveWindow(),
        systemControlService.getSystemInfo(),
        systemControlService.getMousePosition()
      ]);

      return {
        activeWindow,
        systemInfo,
        mousePosition,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Error gathering context:', error);
      return { timestamp: Date.now() };
    }
  }

  private async executeAction(llmResult: any, context: CommandContext): Promise<string> {
    const handler = this.actionHandlers.get(llmResult.intent);
    
    if (!handler) {
      // Fallback to command executor
      const result = await commandExecutor.executeCommand(llmResult.action);
      return typeof result === 'string' ? result : result.message || '';
    }

    try {
      return await handler.handler(llmResult.parameters, context);
    } catch (error) {
      console.error(`❌ Error executing action ${llmResult.intent}:`, error);
      return `Error executing ${llmResult.intent}: ${error}`;
    }
  }

  // Action Handlers
  private async handleOpenApp(parameters: Record<string, any>, context: CommandContext): Promise<string> {
    const appName = parameters.app || parameters.name;
    if (!appName) {
      return 'No application name specified';
    }

    const success = await systemControlService.launchApplication(appName);
    return success ? `✅ Launched ${appName}` : `❌ Failed to launch ${appName}`;
  }

  private async handleSystemControl(parameters: Record<string, any>, context: CommandContext): Promise<string> {
    const action = parameters.action;
    const target = parameters.target;

    switch (action) {
      case 'volume':
        // Implement volume control
        return `Volume control: ${target}`;
      case 'brightness':
        // Implement brightness control
        return `Brightness control: ${target}`;
      case 'lock':
        // Implement system lock
        return 'System locked';
      default:
        return `Unknown system control action: ${action}`;
    }
  }

  private async handleFileOperation(parameters: Record<string, any>, context: CommandContext): Promise<string> {
    const operation = parameters.operation;
    const path = parameters.path;
    const destination = parameters.destination;

    switch (operation) {
      case 'open':
        return (await commandExecutor.executeCommand(`open "${path}"`)).message || '';
      case 'create':
        return (await commandExecutor.executeCommand(`create "${path}"`)).message || '';
      case 'delete':
        return (await commandExecutor.executeCommand(`delete "${path}"`)).message || '';
      case 'move':
        return (await commandExecutor.executeCommand(`move "${path}" "${destination}"`)).message || '';
      case 'copy':
        return (await commandExecutor.executeCommand(`copy "${path}" "${destination}"`)).message || '';
      default:
        return `Unknown file operation: ${operation}`;
    }
  }

  private async handleWebSearch(parameters: Record<string, any>, context: CommandContext): Promise<string> {
    const query = parameters.query;
    if (!query) {
      return 'No search query specified';
    }

    const result = await commandExecutor.executeCommand(`search "${query}"`);
    return typeof result === 'string' ? result : result.message || '';
  }

  private async handleBrowserAutomation(parameters: Record<string, any>, context: CommandContext): Promise<string> {
    const action = parameters.action;
    const url = parameters.url;
    const selector = parameters.selector;

    switch (action) {
      case 'navigate':
        return (await commandExecutor.executeCommand(`browser navigate "${url}"`)).message || '';
      case 'click':
        return (await commandExecutor.executeCommand(`browser click "${selector}"`)).message || '';
      case 'type':
        return (await commandExecutor.executeCommand(`browser type "${selector}" "${parameters.text}"`)).message || '';
      default:
        return `Unknown browser action: ${action}`;
    }
  }

  private async handleClipboardOperation(parameters: Record<string, any>, context: CommandContext): Promise<string> {
    const operation = parameters.operation;
    const text = parameters.text;

    switch (operation) {
      case 'copy':
        await systemControlService.setClipboardText(text);
        return `✅ Copied to clipboard: ${text.substring(0, 50)}...`;
      case 'paste':
        const clipboardText = await systemControlService.getClipboardText();
        return `📋 Clipboard content: ${clipboardText}`;
      case 'clear':
        await systemControlService.setClipboardText('');
        return '🗑️ Clipboard cleared';
      default:
        return `Unknown clipboard operation: ${operation}`;
    }
  }

  private async handleTextProcessing(parameters: Record<string, any>, context: CommandContext): Promise<string> {
    const operation = parameters.operation;
    const text = parameters.text;

    switch (operation) {
      case 'summarize':
        // Use local LLM to summarize text
        const summary = await localLLMService.processCommand(`Summarize this text: ${text}`);
        return `📝 Summary: ${summary.intent}`;
      case 'translate':
        const translation = await localLLMService.processCommand(`Translate this text to English: ${text}`);
        return `🌐 Translation: ${translation.intent}`;
      case 'format':
        const formatted = await localLLMService.processCommand(`Format this text: ${text}`);
        return `✨ Formatted: ${formatted.intent}`;
      default:
        return `Unknown text processing operation: ${operation}`;
    }
  }

  private async handleMouseControl(parameters: Record<string, any>, context: CommandContext): Promise<string> {
    const action = parameters.action;
    const x = parameters.x;
    const y = parameters.y;

    try {
      await systemControlService.controlMouse(action as any, x, y);
      return `✅ Mouse ${action} at (${x}, ${y})`;
    } catch (error) {
      return `❌ Mouse control failed: ${error}`;
    }
  }

  private async handleKeyboardControl(parameters: Record<string, any>, context: CommandContext): Promise<string> {
    const action = parameters.action;
    const input = parameters.input;
    const key = parameters.key;

    try {
      await systemControlService.controlKeyboard(action as any, input, key);
      return `✅ Keyboard ${action} executed`;
    } catch (error) {
      return `❌ Keyboard control failed: ${error}`;
    }
  }

  private async handleScreenshot(parameters: Record<string, any>, context: CommandContext): Promise<string> {
    try {
      const region = parameters.region;
      const capture = await systemControlService.takeScreenshot(region);
      
      if (parameters.extractText) {
        const text = await systemControlService.extractTextFromScreenshot(capture);
        return `📸 Screenshot taken and text extracted: ${text.substring(0, 100)}...`;
      }
      
      return '📸 Screenshot taken';
    } catch (error) {
      return `❌ Screenshot failed: ${error}`;
    }
  }

  public getActionHandlers(): ActionHandler[] {
    return Array.from(this.actionHandlers.values());
  }

  public addActionHandler(handler: ActionHandler): void {
    this.actionHandlers.set(handler.name, handler);
    console.log(`➕ Added action handler: ${handler.name}`);
  }

  public removeActionHandler(name: string): boolean {
    const removed = this.actionHandlers.delete(name);
    if (removed) {
      console.log(`➖ Removed action handler: ${name}`);
    }
    return removed;
  }

  public getQueueStatus(): { queueLength: number; isProcessing: boolean } {
    return {
      queueLength: this.commandQueue.length,
      isProcessing: this.isProcessing
    };
  }

  public clearQueue(): void {
    this.commandQueue.length = 0;
    console.log('🗑️ Command queue cleared');
  }

  public async cleanup(): Promise<void> {
    // Cleanup worker threads
    for (const [name, worker] of this.workerThreads) {
      await worker.terminate();
    }
    this.workerThreads.clear();
    
    console.log('🧹 Real-time Command Processor cleaned up');
  }
}

export const realTimeCommandProcessor = new RealTimeCommandProcessor(); 