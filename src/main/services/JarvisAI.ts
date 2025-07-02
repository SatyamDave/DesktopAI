import { shell, app, clipboard } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { EventEmitter } from 'events';

// Import existing services
import { AIProcessor } from './AIProcessor';
import { AgenticCommandProcessor } from './AgenticCommandProcessor';
import { DELOCommandSystem } from './DELOCommandSystem';
import { DatabaseManager } from './DatabaseManager';
import { SessionMemoryManager } from './SessionMemoryManager';
import { LocalLLMService } from './LocalLLMService';
import { ScreenOCRService } from './ScreenOCRService';
import { ActiveWindowService } from './ActiveWindowService';
import { EmailService } from './EmailService';
import { AppLaunchService } from './AppLaunchService';
import { VoiceControlService } from './VoiceControlService';
import { SensoryIntelligenceService } from './SensoryIntelligenceService';
import { RealTimeAudioService } from './RealTimeAudioService';
import { RealTimeVisualService } from './RealTimeVisualService';
import { WorkflowManager } from './WorkflowManager';
import { configManager } from './ConfigManager';

const execAsync = promisify(exec);

// Function definitions for OpenAI function calling
interface JarvisFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

interface JarvisContext {
  clipboardContent: string;
  activeApp: string;
  windowTitle: string;
  screenText?: string;
  recentCommands: string[];
  sessionDuration: number;
  userIntent?: string;
  extractedArgs?: any;
  audioContext?: any;
  visualContext?: any;
}

interface JarvisResponse {
  success: boolean;
  message: string;
  action?: string;
  data?: any;
  requiresConfirmation?: boolean;
  nextAction?: string;
  confidence?: number;
}

export class JarvisAI extends EventEmitter {
  private aiProcessor: AIProcessor;
  private agenticProcessor: AgenticCommandProcessor;
  private deloSystem: DELOCommandSystem;
  private databaseManager: DatabaseManager;
  private sessionMemory: SessionMemoryManager | null = null;
  private localLLM: LocalLLMService | null = null;
  private screenOCR: ScreenOCRService | null = null;
  private activeWindow: ActiveWindowService | null = null;
  private emailService: EmailService | null = null;
  private appLaunch: AppLaunchService | null = null;
  private voiceControl: VoiceControlService | null = null;
  private sensoryIntelligence: SensoryIntelligenceService | null = null;
  private audioService: RealTimeAudioService | null = null;
  private visualService: RealTimeVisualService | null = null;
  private workflowManager: WorkflowManager | null = null;
  
  private _isInitialized = false;
  private debug = process.env.DEBUG_MODE === 'true';
  private openaiApiKey: string | null = null;
  private geminiApiKey: string | null = null;
  private azureOpenaiKey: string | null = null;
  private azureOpenaiEndpoint: string | null = null;
  private azureOpenaiDeployment: string | null = null;
  private azureOpenaiApiVersion: string | null = null;
  
  // Function definitions for OpenAI function calling
  private readonly jarvisFunctions: JarvisFunction[] = [
    {
      name: "open_application",
      description: "Open or launch an application on the system",
      parameters: {
        type: "object",
        properties: {
          appName: {
            type: "string",
            description: "Name of the application to open (e.g., 'chrome', 'spotify', 'notepad')"
          },
          fallbackToWeb: {
            type: "boolean",
            description: "Whether to fallback to web version if app is not found",
            default: true
          }
        },
        required: ["appName"]
      }
    },
    {
      name: "search_web",
      description: "Search the web for information",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query to look up on the web"
          },
          searchEngine: {
            type: "string",
            description: "Search engine to use (google, bing, duckduckgo)",
            default: "google"
          }
        },
        required: ["query"]
      }
    },
    {
      name: "search_youtube",
      description: "Search for videos on YouTube",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for YouTube videos"
          }
        },
        required: ["query"]
      }
    },
    {
      name: "compose_email",
      description: "Compose and send an email",
      parameters: {
        type: "object",
        properties: {
          recipient: {
            type: "string",
            description: "Email address of the recipient"
          },
          subject: {
            type: "string",
            description: "Subject line of the email"
          },
          body: {
            type: "string",
            description: "Body content of the email"
          },
          tone: {
            type: "string",
            description: "Tone of the email (professional, casual, formal, friendly)",
            default: "professional"
          }
        },
        required: ["recipient", "subject", "body"]
      }
    },
    {
      name: "file_operation",
      description: "Perform file system operations",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            description: "Type of operation (open, move, copy, delete, list)",
            enum: ["open", "move", "copy", "delete", "list"]
          },
          filePath: {
            type: "string",
            description: "Path to the file or directory"
          },
          destination: {
            type: "string",
            description: "Destination path for move/copy operations"
          },
          safeMode: {
            type: "boolean",
            description: "Use safe mode (move to trash instead of delete)",
            default: true
          }
        },
        required: ["operation", "filePath"]
      }
    },
    {
      name: "system_control",
      description: "Control system settings and operations",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "System action to perform",
            enum: ["volume_up", "volume_down", "mute", "brightness_up", "brightness_down", "sleep", "restart", "shutdown"]
          },
          value: {
            type: "number",
            description: "Numeric value for the action (e.g., volume level)"
          }
        },
        required: ["action"]
      }
    },
    {
      name: "take_screenshot",
      description: "Take a screenshot of the current screen",
      parameters: {
        type: "object",
        properties: {
          savePath: {
            type: "string",
            description: "Path where to save the screenshot (optional, will use default if not provided)"
          },
          includeCursor: {
            type: "boolean",
            description: "Whether to include cursor in screenshot",
            default: false
          }
        },
        required: []
      }
    },
    {
      name: "clipboard_operation",
      description: "Perform clipboard operations",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            description: "Clipboard operation to perform",
            enum: ["get", "set", "clear", "history"]
          },
          content: {
            type: "string",
            description: "Content to set in clipboard (for set operation)"
          }
        },
        required: ["operation"]
      }
    },
    {
      name: "get_weather",
      description: "Get weather information for a location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "Location to get weather for"
          },
          units: {
            type: "string",
            description: "Temperature units (celsius, fahrenheit)",
            default: "celsius"
          }
        },
        required: ["location"]
      }
    },
    {
      name: "create_task",
      description: "Create a task or reminder",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Title of the task"
          },
          description: {
            type: "string",
            description: "Description of the task"
          },
          dueDate: {
            type: "string",
            description: "Due date for the task (ISO format)"
          },
          priority: {
            type: "string",
            description: "Priority level (low, medium, high)",
            default: "medium"
          }
        },
        required: ["title"]
      }
    },
    {
      name: "summarize_content",
      description: "Summarize clipboard content or screen text",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "Content to summarize (if not provided, will use clipboard)"
          },
          length: {
            type: "string",
            description: "Length of summary (brief, detailed, concise)",
            default: "concise"
          }
        },
        required: []
      }
    },
    {
      name: "translate_text",
      description: "Translate text to another language",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Text to translate (if not provided, will use clipboard)"
          },
          targetLanguage: {
            type: "string",
            description: "Target language for translation"
          },
          sourceLanguage: {
            type: "string",
            description: "Source language (auto-detect if not provided)"
          }
        },
        required: ["targetLanguage"]
      }
    }
  ];

  constructor() {
    super();
    
    // Initialize existing services
    this.aiProcessor = new AIProcessor();
    this.agenticProcessor = new AgenticCommandProcessor();
    this.deloSystem = new DELOCommandSystem();
    this.databaseManager = DatabaseManager.getInstance();
    
    // Load API keys
    this.openaiApiKey = process.env.OPENAI_API_KEY || null;
    this.geminiApiKey = process.env.GEMINI_API_KEY || null;
    this.azureOpenaiKey = process.env.AZURE_OPENAI_API_KEY || null;
    this.azureOpenaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT || null;
    this.azureOpenaiDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || null;
    this.azureOpenaiApiVersion = process.env.AZURE_OPENAI_API_VERSION || null;
    
    if (this.debug) {
      console.log('[JarvisAI] API Configuration:', {
        hasOpenAIKey: !!this.openaiApiKey,
        hasGeminiKey: !!this.geminiApiKey,
        hasAzureOpenAIKey: !!this.azureOpenaiKey,
        hasAzureOpenAIEndpoint: !!this.azureOpenaiEndpoint,
        hasAzureOpenAIDeployment: !!this.azureOpenaiDeployment
      });
    }
  }

  public async initialize(): Promise<void> {
    if (this._isInitialized) return;

    try {
      console.log('🧠 Initializing Jarvis AI System...');
      
      // Initialize core services
      await Promise.all([
        this.aiProcessor.init(),
        this.deloSystem.initialize(),
        this.databaseManager.initialize()
      ]);

      // Initialize optional services
      await this.initializeOptionalServices();
      
      this._isInitialized = true;
      console.log('✅ Jarvis AI System initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Jarvis AI System:', error);
      throw error;
    }
  }

  private async initializeOptionalServices(): Promise<void> {
    try {
      // Initialize services that might not be available
      this.sessionMemory = new SessionMemoryManager();
      await this.sessionMemory.initialize();
      
      this.localLLM = new LocalLLMService();
      await this.localLLM.initialize();
      
      this.screenOCR = new ScreenOCRService();
      this.screenOCR.start();
      
      this.activeWindow = new ActiveWindowService();
      this.activeWindow.startPolling();
      
      this.emailService = new EmailService();
      this.appLaunch = new AppLaunchService();
      this.workflowManager = new WorkflowManager(this.deloSystem);
      this.audioService = new RealTimeAudioService(this.deloSystem);
      this.visualService = new RealTimeVisualService(this.deloSystem);
      this.voiceControl = new VoiceControlService(this.deloSystem, this.workflowManager);
      this.sensoryIntelligence = new SensoryIntelligenceService(this.deloSystem, this.audioService, this.visualService);
      
      console.log('✅ Optional services initialized');
    } catch (error) {
      console.warn('⚠️ Some optional services failed to initialize:', error);
    }
  }

  public async processCommand(input: string): Promise<JarvisResponse> {
    if (!this._isInitialized) {
      await this.initialize();
    }

    try {
      this.log(`Processing command: "${input}"`);
      
      // Get current context
      const context = await this.getCurrentContext();
      
      // Try OpenAI function calling first (if available)
      if (this.openaiApiKey || this.azureOpenaiKey) {
        const openaiResponse = await this.tryOpenAIFunctionCalling(input, context);
        if (openaiResponse.success) {
          return openaiResponse;
        }
      }
      
      // Fallback to Gemini (if available)
      if (this.geminiApiKey) {
        const geminiResponse = await this.tryGeminiProcessing(input, context);
        if (geminiResponse.success) {
          return geminiResponse;
        }
      }
      
      // Fallback to existing DELO system
      const deloResponse = await this.deloSystem.processCommand(input);
      return {
        success: deloResponse.success,
        message: deloResponse.message,
        action: deloResponse.action,
        data: deloResponse.data,
        requiresConfirmation: deloResponse.requiresConfirmation,
        nextAction: deloResponse.nextAction
      };
      
    } catch (error) {
      this.log('Error processing command', error);
      return {
        success: false,
        message: 'I encountered an error while processing your command.',
        data: { error: String(error) }
      };
    }
  }

  private async tryOpenAIFunctionCalling(input: string, context: JarvisContext): Promise<JarvisResponse> {
    try {
      const messages = [
        {
          role: "system",
          content: `You are Jarvis, an advanced AI assistant that can control the user's computer and perform various tasks. You have access to the following functions and should use them when appropriate.

Current context:
- Active app: ${context.activeApp}
- Window title: ${context.windowTitle}
- Clipboard content: ${context.clipboardContent.substring(0, 200)}${context.clipboardContent.length > 200 ? '...' : ''}
- Recent commands: ${context.recentCommands.slice(-3).join(', ')}

Always try to use the available functions to perform actions rather than just providing information. If the user asks for something that can be done with a function, use the function. Only provide conversational responses for general questions that don't require system actions.`
        },
        {
          role: "user",
          content: input
        }
      ];

      const requestBody: any = {
        model: this.azureOpenaiDeployment || "gpt-4",
        messages,
        functions: this.jarvisFunctions,
        function_call: "auto",
        temperature: 0.7,
        max_tokens: 1000
      };

      // Use Azure OpenAI if configured, otherwise OpenAI or OpenRouter
      const openaiApiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
      const apiUrl = this.azureOpenaiEndpoint 
        ? `${this.azureOpenaiEndpoint}/openai/deployments/${this.azureOpenaiDeployment}/chat/completions?api-version=${this.azureOpenaiApiVersion || '2023-12-01-preview'}`
        : `${openaiApiBase}/chat/completions`;
      
      const apiKey = this.azureOpenaiKey || this.openaiApiKey;

      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const choice = response.data.choices[0];
      const message = choice.message;

      // Check if function was called
      if (message.function_call) {
        return await this.executeFunction(message.function_call.name, JSON.parse(message.function_call.arguments), context);
      }

      // Return conversational response
      return {
        success: true,
        message: message.content,
        action: 'conversation'
      };

    } catch (error) {
      this.log('OpenAI function calling failed', error);
      return { success: false, message: 'OpenAI processing failed' };
    }
  }

  private async tryGeminiProcessing(input: string, context: JarvisContext): Promise<JarvisResponse> {
    try {
      const prompt = `You are Jarvis, an AI assistant. The user said: "${input}".

Context:
- Active app: ${context.activeApp}
- Window title: ${context.windowTitle}
- Clipboard: ${context.clipboardContent.substring(0, 100)}${context.clipboardContent.length > 100 ? '...' : ''}

Please provide a helpful response. If this is a command that should trigger an action, respond with "ACTION:" followed by the action type and parameters in JSON format. Otherwise, provide a conversational response.`;

      const response = await this.callGeminiAPI(prompt);
      
      // Check if response indicates an action
      if (response.includes('ACTION:')) {
        const actionMatch = response.match(/ACTION:\s*(\w+)\s*(\{.*\})/);
        if (actionMatch) {
          const actionType = actionMatch[1];
          const params = JSON.parse(actionMatch[2]);
          return await this.executeFunction(actionType, params, context);
        }
      }

      return {
        success: true,
        message: response,
        action: 'conversation'
      };

    } catch (error) {
      this.log('Gemini processing failed', error);
      return { success: false, message: 'Gemini processing failed' };
    }
  }

  private async executeFunction(functionName: string, args: any, context: JarvisContext): Promise<JarvisResponse> {
    this.log(`Executing function: ${functionName} with args:`, args);

    try {
      switch (functionName) {
        case 'open_application':
          return await this.openApplication(args.appName, args.fallbackToWeb);
        
        case 'search_web':
          return await this.searchWeb(args.query, args.searchEngine);
        
        case 'search_youtube':
          return await this.searchYouTube(args.query);
        
        case 'compose_email':
          return await this.composeEmail(args.recipient, args.subject, args.body, args.tone);
        
        case 'file_operation':
          return await this.performFileOperation(args.operation, args.filePath, args.destination, args.safeMode);
        
        case 'system_control':
          return await this.performSystemControl(args.action, args.value);
        
        case 'take_screenshot':
          return await this.takeScreenshot(args.savePath, args.includeCursor);
        
        case 'clipboard_operation':
          return await this.performClipboardOperation(args.operation, args.content);
        
        case 'get_weather':
          return await this.getWeather(args.location, args.units);
        
        case 'create_task':
          return await this.createTask(args.title, args.description, args.dueDate, args.priority);
        
        case 'summarize_content':
          return await this.summarizeContent(args.content, args.length);
        
        case 'translate_text':
          return await this.translateText(args.text, args.targetLanguage, args.sourceLanguage);
        
        default:
          return {
            success: false,
            message: `Unknown function: ${functionName}`
          };
      }
    } catch (error) {
      this.log(`Error executing function ${functionName}:`, error);
      return {
        success: false,
        message: `Error executing ${functionName}: ${error}`
      };
    }
  }

  // Function implementations
  private async openApplication(appName: string, fallbackToWeb: boolean = true): Promise<JarvisResponse> {
    try {
      const result = await this.agenticProcessor.processCommand(`open ${appName}`);
      return {
        success: result.success,
        message: result.message,
        action: 'app_launch',
        data: { appName, result: result.data }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to open ${appName}: ${error}`
      };
    }
  }

  private async searchWeb(query: string, searchEngine: string = 'google'): Promise<JarvisResponse> {
    try {
      const searchUrls = {
        google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
        duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
      };
      
      const url = searchUrls[searchEngine as keyof typeof searchUrls] || searchUrls.google;
      await shell.openExternal(url);
      
      return {
        success: true,
        message: `Searching for "${query}" on ${searchEngine}`,
        action: 'web_search',
        data: { query, searchEngine, url }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to search web: ${error}`
      };
    }
  }

  private async searchYouTube(query: string): Promise<JarvisResponse> {
    try {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      await shell.openExternal(url);
      
      return {
        success: true,
        message: `Searching YouTube for "${query}"`,
        action: 'youtube_search',
        data: { query, url }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to search YouTube: ${error}`
      };
    }
  }

  private async composeEmail(recipient: string, subject: string, body: string, tone: string = 'professional'): Promise<JarvisResponse> {
    try {
      const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      await shell.openExternal(mailtoUrl);
      
      return {
        success: true,
        message: `Opening email client to compose message to ${recipient}`,
        action: 'email_compose',
        data: { recipient, subject, tone }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to compose email: ${error}`
      };
    }
  }

  private async performFileOperation(operation: string, filePath: string, destination?: string, safeMode: boolean = true): Promise<JarvisResponse> {
    try {
      switch (operation) {
        case 'open':
          await shell.openPath(filePath);
          return {
            success: true,
            message: `Opening ${filePath}`,
            action: 'file_open'
          };
        
        case 'list':
          const files = fs.readdirSync(filePath);
          return {
            success: true,
            message: `Files in ${filePath}: ${files.join(', ')}`,
            action: 'file_list',
            data: { files }
          };
        
        case 'delete':
          if (safeMode) {
            // Move to trash instead of permanent delete
            const trashPath = path.join(os.homedir(), '.Trash', path.basename(filePath));
            fs.renameSync(filePath, trashPath);
            return {
              success: true,
              message: `Moved ${filePath} to trash`,
              action: 'file_delete_safe'
            };
          } else {
            fs.unlinkSync(filePath);
            return {
              success: true,
              message: `Deleted ${filePath}`,
              action: 'file_delete',
              requiresConfirmation: true
            };
          }
        
        default:
          return {
            success: false,
            message: `Unsupported file operation: ${operation}`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `File operation failed: ${error}`
      };
    }
  }

  private async performSystemControl(action: string, value?: number): Promise<JarvisResponse> {
    try {
      switch (action) {
        case 'volume_up':
          await execAsync(`osascript -e 'set volume output volume (output volume of (get volume settings) + 10)'`);
          return {
            success: true,
            message: 'Volume increased',
            action: 'volume_control'
          };
        
        case 'volume_down':
          await execAsync(`osascript -e 'set volume output volume (output volume of (get volume settings) - 10)'`);
          return {
            success: true,
            message: 'Volume decreased',
            action: 'volume_control'
          };
        
        case 'mute':
          await execAsync(`osascript -e 'set volume output muted true'`);
          return {
            success: true,
            message: 'Audio muted',
            action: 'volume_control'
          };
        
        default:
          return {
            success: false,
            message: `Unsupported system control: ${action}`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `System control failed: ${error}`
      };
    }
  }

  private async takeScreenshot(savePath?: string, includeCursor: boolean = false): Promise<JarvisResponse> {
    try {
      const screenshot = require('screenshot-desktop');
      const imgBuffer = await screenshot();
      
      const defaultPath = path.join(os.homedir(), 'Desktop', `screenshot-${Date.now()}.png`);
      const finalPath = savePath || defaultPath;
      
      fs.writeFileSync(finalPath, imgBuffer);
      
      return {
        success: true,
        message: `Screenshot saved to ${finalPath}`,
        action: 'screenshot',
        data: { path: finalPath }
      };
    } catch (error) {
      return {
        success: false,
        message: `Screenshot failed: ${error}`
      };
    }
  }

  private async performClipboardOperation(operation: string, content?: string): Promise<JarvisResponse> {
    try {
      switch (operation) {
        case 'get':
          const clipboardContent = clipboard.readText();
          return {
            success: true,
            message: `Clipboard content: ${clipboardContent}`,
            action: 'clipboard_get',
            data: { content: clipboardContent }
          };
        
        case 'set':
          if (content) {
            clipboard.writeText(content);
            return {
              success: true,
              message: `Content copied to clipboard`,
              action: 'clipboard_set'
            };
          }
          return {
            success: false,
            message: 'No content provided for clipboard set operation'
          };
        
        case 'clear':
          clipboard.clear();
          return {
            success: true,
            message: 'Clipboard cleared',
            action: 'clipboard_clear'
          };
        
        default:
          return {
            success: false,
            message: `Unsupported clipboard operation: ${operation}`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Clipboard operation failed: ${error}`
      };
    }
  }

  private async getWeather(location: string, units: string = 'celsius'): Promise<JarvisResponse> {
    try {
      // This would typically call a weather API
      // For now, we'll open a weather website
      const url = `https://www.google.com/search?q=weather+${encodeURIComponent(location)}`;
      await shell.openExternal(url);
      
      return {
        success: true,
        message: `Opening weather information for ${location}`,
        action: 'weather_check',
        data: { location, units }
      };
    } catch (error) {
      return {
        success: false,
        message: `Weather check failed: ${error}`
      };
    }
  }

  private async createTask(title: string, description?: string, dueDate?: string, priority: string = 'medium'): Promise<JarvisResponse> {
    try {
      // This would typically integrate with a task management system
      // For now, we'll create a simple text file
      const taskContent = `Task: ${title}\nDescription: ${description || 'No description'}\nDue: ${dueDate || 'No due date'}\nPriority: ${priority}\nCreated: ${new Date().toISOString()}`;
      const taskPath = path.join(os.homedir(), 'Desktop', `task-${Date.now()}.txt`);
      fs.writeFileSync(taskPath, taskContent);
      
      return {
        success: true,
        message: `Task "${title}" created and saved to desktop`,
        action: 'task_create',
        data: { title, path: taskPath }
      };
    } catch (error) {
      return {
        success: false,
        message: `Task creation failed: ${error}`
      };
    }
  }

  private async summarizeContent(content?: string, length: string = 'concise'): Promise<JarvisResponse> {
    try {
      const textToSummarize = content || clipboard.readText();
      if (!textToSummarize) {
        return {
          success: false,
          message: 'No content to summarize. Please provide content or copy text to clipboard.'
        };
      }

      const prompt = `Please provide a ${length} summary of the following text:\n\n${textToSummarize}`;
      const summary = await this.callGeminiAPI(prompt);
      
      return {
        success: true,
        message: `Summary: ${summary}`,
        action: 'summarize',
        data: { originalLength: textToSummarize.length, summaryLength: summary.length }
      };
    } catch (error) {
      return {
        success: false,
        message: `Summarization failed: ${error}`
      };
    }
  }

  private async translateText(targetLanguage: string, text?: string, sourceLanguage?: string): Promise<JarvisResponse> {
    try {
      const textToTranslate = text || clipboard.readText();
      if (!textToTranslate) {
        return {
          success: false,
          message: 'No text to translate. Please provide text or copy text to clipboard.'
        };
      }

      const prompt = `Translate the following text to ${targetLanguage}${sourceLanguage ? ` from ${sourceLanguage}` : ''}:\n\n${textToTranslate}`;
      const translation = await this.callGeminiAPI(prompt);
      
      return {
        success: true,
        message: `Translation: ${translation}`,
        action: 'translate',
        data: { targetLanguage, sourceLanguage }
      };
    } catch (error) {
      return {
        success: false,
        message: `Translation failed: ${error}`
      };
    }
  }

  private async getCurrentContext(): Promise<JarvisContext> {
    const clipboardContent = clipboard.readText() || '';
    const activeWindow = this.activeWindow ? await this.activeWindow.getActiveWindow() : null;
    
    return {
      clipboardContent,
      activeApp: activeWindow?.process || 'unknown',
      windowTitle: activeWindow?.title || 'unknown',
      screenText: undefined, // ScreenOCR method not available
      recentCommands: [], // SessionMemory method not available
      sessionDuration: 0, // SessionMemory method not available
      audioContext: undefined, // AudioService method not available
      visualContext: undefined // VisualService method not available
    };
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.geminiApiKey}`
          }
        }
      );

      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      throw new Error(`Gemini API call failed: ${error}`);
    }
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[JarvisAI] ${message}`, data || '');
    }
  }

  // Public methods for external access
  public async startVoiceControl(): Promise<void> {
    if (this.voiceControl) {
      await this.voiceControl.startListening();
    }
  }

  public async stopVoiceControl(): Promise<void> {
    if (this.voiceControl) {
      await this.voiceControl.stopListening();
    }
  }

  public getVoiceState(): any {
    return this.voiceControl?.getState() || { isActive: false };
  }

  public async getSuggestions(context: JarvisContext): Promise<string[]> {
    return this.deloSystem.getSuggestions(context);
  }

  public async getSessionInsights(): Promise<any> {
    return this.deloSystem.getSessionInsights();
  }

  public isInitialized(): boolean {
    return this._isInitialized;
  }

  public getAvailableFunctions(): JarvisFunction[] {
    return this.jarvisFunctions;
  }
}

// Export singleton instance
export const jarvisAI = new JarvisAI(); 