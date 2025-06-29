import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

interface APIConfig {
  azureOpenAI?: {
    apiKey: string;
    endpoint: string;
    deploymentName: string;
    apiVersion: string;
  };
  openAI?: {
    apiKey: string;
  };
  google?: {
    apiKey: string;
    clientId: string;
    clientSecret: string;
  };
  slack?: {
    botToken: string;
    signingSecret: string;
  };
}

interface AppConfig {
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  maxClipboardHistory: number;
  maxCommandHistory: number;
  autoSaveInterval: number;
  whisperModeEnabled: boolean;
  globalShortcutsEnabled: boolean;
}

export class ConfigManager {
  private configDir: string;
  private configFile: string;
  private encryptedConfigFile: string;
  private apiConfig: APIConfig = {};
  private appConfig: AppConfig;
  private encryptionKey: string;

  constructor() {
    this.configDir = path.join(os.homedir(), '.doppel');
    this.configFile = path.join(this.configDir, 'config.json');
    this.encryptedConfigFile = path.join(this.configDir, 'config.encrypted');
    
    // Create config directory if it doesn't exist
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    // Generate or load encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey();
    
    // Default app configuration
    this.appConfig = {
      debugMode: process.env.DEBUG_MODE === 'true',
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      maxClipboardHistory: 100,
      maxCommandHistory: 50,
      autoSaveInterval: 30000, // 30 seconds
      whisperModeEnabled: true,
      globalShortcutsEnabled: true
    };

    this.loadConfiguration();
  }

  private getOrCreateEncryptionKey(): string {
    const keyFile = path.join(this.configDir, '.key');
    if (fs.existsSync(keyFile)) {
      return fs.readFileSync(keyFile, 'utf8');
    } else {
      const key = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(keyFile, key);
      return key;
    }
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private loadConfiguration() {
    try {
      // Load from environment variables first
      this.loadFromEnvironment();
      
      // Load from encrypted config file if it exists
      if (fs.existsSync(this.encryptedConfigFile)) {
        const encryptedData = fs.readFileSync(this.encryptedConfigFile, 'utf8');
        const decryptedData = this.decrypt(encryptedData);
        const config = JSON.parse(decryptedData);
        
        // Merge with environment variables (env vars take precedence)
        this.apiConfig = { ...config.api, ...this.apiConfig };
        this.appConfig = { ...this.appConfig, ...config.app };
      }
      
      // Load from plain config file if it exists (for development)
      if (fs.existsSync(this.configFile)) {
        const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        this.apiConfig = { ...this.apiConfig, ...config.api };
        this.appConfig = { ...this.appConfig, ...config.app };
      }

      this.validateConfiguration();
      this.saveConfiguration();
      
      console.log('✅ Configuration loaded successfully');
    } catch (error) {
      console.error('❌ Error loading configuration:', error);
      this.createDefaultConfiguration();
    }
  }

  private loadFromEnvironment() {
    // Azure OpenAI
    if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
      this.apiConfig.azureOpenAI = {
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-04-01-preview'
      };
    }

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.apiConfig.openAI = {
        apiKey: process.env.OPENAI_API_KEY
      };
    }

    // Google
    if (process.env.GOOGLE_API_KEY) {
      this.apiConfig.google = {
        apiKey: process.env.GOOGLE_API_KEY,
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
      };
    }

    // Slack
    if (process.env.SLACK_BOT_TOKEN) {
      this.apiConfig.slack = {
        botToken: process.env.SLACK_BOT_TOKEN,
        signingSecret: process.env.SLACK_SIGNING_SECRET || ''
      };
    }
  }

  private validateConfiguration() {
    const errors: string[] = [];

    // Check for at least one AI provider
    if (!this.apiConfig.azureOpenAI && !this.apiConfig.openAI) {
      errors.push('No AI provider configured. Please set up Azure OpenAI or OpenAI API keys.');
    }

    // Validate Azure OpenAI config if present
    if (this.apiConfig.azureOpenAI) {
      if (!this.apiConfig.azureOpenAI.apiKey || this.apiConfig.azureOpenAI.apiKey === 'your_azure_openai_api_key_here') {
        errors.push('Azure OpenAI API key is not properly configured.');
      }
      if (!this.apiConfig.azureOpenAI.endpoint || this.apiConfig.azureOpenAI.endpoint.includes('your-resource')) {
        errors.push('Azure OpenAI endpoint is not properly configured.');
      }
    }

    // Validate OpenAI config if present
    if (this.apiConfig.openAI) {
      if (!this.apiConfig.openAI.apiKey || this.apiConfig.openAI.apiKey === 'your_openai_api_key_here') {
        errors.push('OpenAI API key is not properly configured.');
      }
    }

    if (errors.length > 0) {
      console.warn('⚠️ Configuration validation warnings:');
      errors.forEach(error => console.warn(`   - ${error}`));
    }
  }

  private createDefaultConfiguration() {
    console.log('📝 Creating default configuration...');
    this.saveConfiguration();
  }

  private saveConfiguration() {
    try {
      const config = {
        api: this.apiConfig,
        app: this.appConfig,
        lastUpdated: new Date().toISOString()
      };

      // Save encrypted version
      const encryptedData = this.encrypt(JSON.stringify(config));
      fs.writeFileSync(this.encryptedConfigFile, encryptedData);

      // Save plain version for development (without sensitive data)
      const devConfig = {
        api: {
          azureOpenAI: this.apiConfig.azureOpenAI ? { configured: true } : undefined,
          openAI: this.apiConfig.openAI ? { configured: true } : undefined,
          google: this.apiConfig.google ? { configured: true } : undefined,
          slack: this.apiConfig.slack ? { configured: true } : undefined
        },
        app: this.appConfig,
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.configFile, JSON.stringify(devConfig, null, 2));

      console.log('💾 Configuration saved successfully');
    } catch (error) {
      console.error('❌ Error saving configuration:', error);
    }
  }

  // Public methods for accessing configuration
  public getAzureOpenAIConfig() {
    return this.apiConfig.azureOpenAI;
  }

  public getOpenAIConfig() {
    return this.apiConfig.openAI;
  }

  public getGoogleConfig() {
    return this.apiConfig.google;
  }

  public getSlackConfig() {
    return this.apiConfig.slack;
  }

  public getAppConfig(): AppConfig {
    return { ...this.appConfig };
  }

  public updateAppConfig(updates: Partial<AppConfig>) {
    this.appConfig = { ...this.appConfig, ...updates };
    this.saveConfiguration();
  }

  public isDebugMode(): boolean {
    return this.appConfig.debugMode;
  }

  public getLogLevel(): string {
    return this.appConfig.logLevel;
  }

  public hasAIConfiguration(): boolean {
    return !!(this.apiConfig.azureOpenAI || this.apiConfig.openAI);
  }

  public getConfigurationStatus() {
    return {
      azureOpenAI: !!this.apiConfig.azureOpenAI,
      openAI: !!this.apiConfig.openAI,
      google: !!this.apiConfig.google,
      slack: !!this.apiConfig.slack,
      debugMode: this.appConfig.debugMode,
      hasAI: this.hasAIConfiguration()
    };
  }

  public exportConfiguration(): string {
    const config = {
      api: this.apiConfig,
      app: this.appConfig,
      lastUpdated: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  public importConfiguration(configData: string) {
    try {
      const config = JSON.parse(configData);
      this.apiConfig = { ...this.apiConfig, ...config.api };
      this.appConfig = { ...this.appConfig, ...config.app };
      this.saveConfiguration();
      return true;
    } catch (error) {
      console.error('❌ Error importing configuration:', error);
      return false;
    }
  }
} 