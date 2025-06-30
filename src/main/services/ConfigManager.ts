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
  performanceMode: boolean;
  behaviorTrackingEnabled: boolean;
  clipboardTrackingEnabled: boolean;
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
      globalShortcutsEnabled: true,
      performanceMode: false,
      behaviorTrackingEnabled: false,
      clipboardTrackingEnabled: false
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
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (err) {
      console.warn('[ConfigManager] Encryption failed, using plain config:', err instanceof Error ? err.message : String(err));
      return text;
    }
  }

  private decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) throw new Error('Invalid encrypted text format');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      console.warn('[ConfigManager] Decryption failed, using plain config:', err instanceof Error ? err.message : String(err));
      return encryptedText;
    }
  }

  private loadConfiguration() {
    try {
      // Load from environment variables first
      this.loadFromEnvironment();
      // Only load Gemini config
      if (fs.existsSync(this.configFile)) {
        const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        this.apiConfig = { ...this.apiConfig, ...config.api };
        this.appConfig = { ...this.appConfig, ...config.app };
      }
      this.validateConfiguration();
      this.saveConfiguration();
      console.log('✅ Configuration loaded successfully (Gemini only mode)');
    } catch (error) {
      console.error('❌ Error loading configuration:', error instanceof Error ? error.message : error);
      this.createDefaultConfiguration();
    }
  }

  private loadFromEnvironment() {
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

    // Only check for Gemini
    if (!process.env.GEMINI_API_KEY && (!this.apiConfig.google || !this.apiConfig.google.apiKey)) {
      errors.push('No Gemini API key configured. Please set GEMINI_API_KEY in your environment variables.');
    }

    if (errors.length > 0) {
      console.warn('Configuration validation warnings:', errors);
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
    return !!(this.apiConfig.google);
  }

  public getConfigurationStatus() {
    return {
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

export const configManager = new ConfigManager(); 