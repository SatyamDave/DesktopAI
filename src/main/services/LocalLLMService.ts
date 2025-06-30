import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

interface LLMResponse {
  success: boolean;
  response: string;
  confidence: number;
  latency: number;
  model: string;
}

interface CommandIntent {
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
  action: string;
}

interface ModelConfig {
  name: string;
  type: 'ollama' | 'transformers' | 'local';
  endpoint?: string;
  modelPath?: string;
  maxTokens: number;
  temperature: number;
  contextWindow: number;
}

// Optional transformers import
let pipeline: any = null;
let env: any = null;
try {
  const transformers = require('@xenova/transformers');
  pipeline = transformers.pipeline;
  env = transformers.env;
} catch (error) {
  console.warn('⚠️ @xenova/transformers not available - local LLM features will be disabled');
}

export class LocalLLMService {
  private models: Map<string, ModelConfig> = new Map();
  private activeModel: string = 'phi';
  private cache: Map<string, LLMResponse> = new Map();
  private maxCacheSize = 1000;
  private isInitialized = false;
  private ollamaEndpoint = 'http://localhost:11434';
  private transformersPipeline: any = null;

  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    // Configure available models
    this.models.set('phi', {
      name: 'phi',
      type: 'ollama',
      endpoint: this.ollamaEndpoint,
      maxTokens: 2048,
      temperature: 0.7,
      contextWindow: 4096
    });

    this.models.set('mistral', {
      name: 'mistral',
      type: 'ollama',
      endpoint: this.ollamaEndpoint,
      maxTokens: 4096,
      temperature: 0.7,
      contextWindow: 8192
    });

    this.models.set('llama2', {
      name: 'llama2',
      type: 'ollama',
      endpoint: this.ollamaEndpoint,
      maxTokens: 4096,
      temperature: 0.7,
      contextWindow: 8192
    });

    this.models.set('local-transformers', {
      name: 'local-transformers',
      type: 'transformers',
      modelPath: path.join(os.homedir(), '.cache', 'huggingface', 'hub'),
      maxTokens: 512,
      temperature: 0.7,
      contextWindow: 2048
    });
  }

  public async initialize(): Promise<void> {
    if (!pipeline || !env) {
      console.warn('⚠️ Local LLM not available - @xenova/transformers not installed');
      return;
    }
    
    if (this.isInitialized) return;

    try {
      console.log('🤖 Initializing Local LLM Service...');
      
      // Set up transformers environment
      env.allowLocalModels = true;
      env.allowRemoteModels = false;
      
      // Initialize the pipeline
      this.transformersPipeline = await pipeline('text-generation', 'Xenova/phi-2');
      
      this.isInitialized = true;
      console.log('✅ Local LLM Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Local LLM Service:', error);
      // Don't throw error, just log it and continue without local LLM
    }
  }

  private async checkOllamaAvailability(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaEndpoint}/api/tags`, { timeout: 5000 });
      console.log('✅ Ollama is available');
      return true;
    } catch (error) {
      console.warn('⚠️ Ollama not available, will use local transformers only');
      return false;
    }
  }

  private async initializeTransformers(): Promise<void> {
    try {
      // Set up transformers environment
      env.cacheDir = path.join(os.homedir(), '.cache', 'huggingface');
      env.allowLocalModels = true;
      
      // Initialize a lightweight pipeline for local processing
      this.transformersPipeline = await pipeline('text-generation', 'microsoft/DialoGPT-small', {
        quantized: true,
        progress_callback: (progress: any) => {
          console.log(`📥 Loading model: ${Math.round(progress * 100)}%`);
        }
      });
      
      console.log('✅ Transformers pipeline initialized');
    } catch (error) {
      console.warn('⚠️ Transformers initialization failed:', error);
    }
  }

  public async processCommand(input: string, context?: any): Promise<CommandIntent> {
    await this.initialize();

    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(input, context);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      console.log(`⚡ Cache hit for command: "${input}"`);
      return this.parseResponse(cached.response, input);
    }

    try {
      const model = this.models.get(this.activeModel);
      if (!model) {
        throw new Error(`Model ${this.activeModel} not found`);
      }

      let response: string;
      
      switch (model.type) {
        case 'ollama':
          response = await this.callOllama(input, context, model);
          break;
        case 'transformers':
          response = await this.callTransformers(input, context, model);
          break;
        default:
          throw new Error(`Unsupported model type: ${model.type}`);
      }

      const latency = Date.now() - startTime;
      const llmResponse: LLMResponse = {
        success: true,
        response,
        confidence: 0.8, // Default confidence
        latency,
        model: this.activeModel
      };

      // Cache the response
      this.cacheResponse(cacheKey, llmResponse);

      console.log(`🤖 Processed command in ${latency}ms using ${this.activeModel}`);
      return this.parseResponse(response, input);

    } catch (error) {
      console.error('❌ Error processing command:', error);
      return {
        intent: 'error',
        confidence: 0,
        parameters: {},
        action: 'error'
      };
    }
  }

  private async callOllama(input: string, context?: any, model?: ModelConfig): Promise<string> {
    const prompt = this.buildPrompt(input, context);
    
    try {
      const response = await axios.post(`${this.ollamaEndpoint}/api/generate`, {
        model: model?.name || 'phi',
        prompt,
        stream: false,
        options: {
          temperature: model?.temperature || 0.7,
          num_predict: model?.maxTokens || 2048
        }
      }, { timeout: 10000 });

      return response.data.response;
    } catch (error) {
      console.error('❌ Ollama API error:', error);
      throw new Error('Failed to call Ollama API');
    }
  }

  private async callTransformers(input: string, context?: any, model?: ModelConfig): Promise<string> {
    if (!this.transformersPipeline) {
      throw new Error('Transformers pipeline not initialized');
    }

    const prompt = this.buildPrompt(input, context);
    
    try {
      const result = await this.transformersPipeline(prompt, {
        max_length: model?.maxTokens || 512,
        temperature: model?.temperature || 0.7,
        do_sample: true,
        pad_token_id: 50256
      });

      return result[0].generated_text;
    } catch (error) {
      console.error('❌ Transformers error:', error);
      throw new Error('Failed to process with transformers');
    }
  }

  private buildPrompt(input: string, context?: any): string {
    const systemPrompt = `You are a helpful AI assistant that interprets user commands and returns structured responses. 
    
Available actions:
- open_app: Launch applications
- file_operation: File system operations
- web_search: Search the web
- system_control: Control system settings
- email_compose: Compose emails
- browser_automation: Control web browser
- clipboard_operation: Clipboard operations
- text_processing: Process and analyze text

Context: ${context ? JSON.stringify(context) : 'No context provided'}

User command: "${input}"

Respond with a JSON object containing:
{
  "intent": "action_name",
  "confidence": 0.0-1.0,
  "parameters": {"key": "value"},
  "action": "specific_action"
}`;

    return systemPrompt;
  }

  private parseResponse(response: string, originalInput: string): CommandIntent {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: parsed.intent || 'unknown',
          confidence: parsed.confidence || 0.5,
          parameters: parsed.parameters || {},
          action: parsed.action || 'unknown'
        };
      }

      // Fallback: simple intent detection
      const lowerInput = originalInput.toLowerCase();
      if (lowerInput.includes('open') || lowerInput.includes('launch')) {
        return {
          intent: 'open_app',
          confidence: 0.7,
          parameters: { app: this.extractAppName(originalInput) },
          action: 'launch_application'
        };
      }

      if (lowerInput.includes('search') || lowerInput.includes('find')) {
        return {
          intent: 'web_search',
          confidence: 0.6,
          parameters: { query: originalInput },
          action: 'search_web'
        };
      }

      return {
        intent: 'unknown',
        confidence: 0.3,
        parameters: {},
        action: 'unknown'
      };

    } catch (error) {
      console.error('❌ Error parsing LLM response:', error);
      return {
        intent: 'error',
        confidence: 0,
        parameters: {},
        action: 'error'
      };
    }
  }

  private extractAppName(input: string): string {
    const appKeywords = ['chrome', 'firefox', 'vscode', 'terminal', 'notepad', 'calculator', 'explorer'];
    const lowerInput = input.toLowerCase();
    
    for (const app of appKeywords) {
      if (lowerInput.includes(app)) {
        return app;
      }
    }
    
    return 'unknown';
  }

  private generateCacheKey(input: string, context?: any): string {
    return `${input}:${context ? JSON.stringify(context) : 'no-context'}`;
  }

  private cacheResponse(key: string, response: LLMResponse): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entries
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, response);
  }

  public setActiveModel(modelName: string): boolean {
    if (this.models.has(modelName)) {
      this.activeModel = modelName;
      console.log(`🤖 Switched to model: ${modelName}`);
      return true;
    }
    return false;
  }

  public getAvailableModels(): string[] {
    return Array.from(this.models.keys());
  }

  public getModelInfo(modelName: string | undefined): ModelConfig | undefined {
    return this.models.get(modelName || '');
  }

  public async testModel(modelName: string): Promise<boolean> {
    try {
      const testInput = "Hello, how are you?";
      const result = await this.processCommand(testInput || "Test");
      return result.intent !== 'error';
    } catch (error) {
      console.error(`❌ Model test failed for ${modelName}:`, error);
      return false;
    }
  }

  public clearCache(): void {
    this.cache.clear();
    console.log('🗑️ LLM cache cleared');
  }

  public getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }

  public isAvailable(): boolean {
    return pipeline !== null && this.transformersPipeline !== null;
  }
}

export const localLLMService = new LocalLLMService(); 