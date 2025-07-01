import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { DELOCommandSystem } from './DELOCommandSystem';
import { WorkflowManager } from './WorkflowManager';

export interface VoiceConfig {
  enabled: boolean;
  hotword: string;
  language: string;
  engine: 'whisper' | 'azure' | 'google' | 'browser';
  apiKey?: string;
  endpoint?: string;
  sensitivity: number;
  timeout: number;
}

export interface VoiceCommand {
  transcript: string;
  confidence: number;
  timestamp: number;
  processed: boolean;
  result?: any;
}

export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  lastCommand?: VoiceCommand;
  error?: string;
}

export class VoiceControlService extends EventEmitter {
  private deloSystem: DELOCommandSystem;
  private workflowManager: WorkflowManager;
  private config: VoiceConfig;
  private state: VoiceState;
  private mediaRecorder?: MediaRecorder;
  private audioContext?: AudioContext;
  private isInitialized = false;
  private recognition?: any; // SpeechRecognition for browser
  private hotwordDetection?: any;
  private configPath: string;
  private isAvailable = true; // Added for Electron main process check

  constructor(deloSystem: DELOCommandSystem, workflowManager: WorkflowManager) {
    super();
    this.deloSystem = deloSystem;
    this.workflowManager = workflowManager;
    this.configPath = path.join(os.homedir(), '.doppel', 'voice-config.json');
    
    this.config = {
      enabled: true,
      hotword: 'hey delo',
      language: 'en-US',
      engine: 'browser',
      sensitivity: 0.8,
      timeout: 5000
    };

    this.state = {
      isListening: false,
      isProcessing: false
    };

    this.loadConfig();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🎤 Initializing Voice Control Service...');
      
      // Ensure config directory exists
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Initialize speech recognition based on engine
      await this.initializeSpeechRecognition();
      
      // Initialize hotword detection
      await this.initializeHotwordDetection();
      
      this.isInitialized = true;
      console.log('✅ Voice Control Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Voice Control Service:', error);
      this.state.error = String(error);
      throw error;
    }
  }

  /**
   * Start listening for voice commands
   */
  public async startListening(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Voice control is disabled');
    }

    if (this.state.isListening) {
      console.log('Already listening for voice commands');
      return;
    }

    try {
      this.state.isListening = true;
      this.emit('listening', true);

      if (this.config.hotword) {
        // Start hotword detection
        await this.startHotwordDetection();
      } else {
        // Start continuous listening
        await this.startContinuousListening();
      }

      console.log('🎤 Voice listening started');
    } catch (error) {
      this.state.isListening = false;
      this.state.error = String(error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop listening for voice commands
   */
  public async stopListening(): Promise<void> {
    if (!this.state.isListening) return;

    try {
      this.state.isListening = false;
      this.emit('listening', false);

      if (this.recognition) {
        this.recognition.stop();
      }

      if (this.hotwordDetection) {
        this.hotwordDetection.stop();
      }

      console.log('🎤 Voice listening stopped');
    } catch (error) {
      console.error('Error stopping voice listening:', error);
    }
  }

  /**
   * Process a voice command
   */
  public async processVoiceCommand(audioData?: ArrayBuffer): Promise<VoiceCommand> {
    if (this.state.isProcessing) {
      throw new Error('Already processing a voice command');
    }

    this.state.isProcessing = true;
    this.emit('processing', true);

    try {
      let transcript = '';
      let confidence = 0;

      if (audioData) {
        // Process audio data directly
        const result = await this.transcribeAudio(audioData);
        transcript = result.transcript;
        confidence = result.confidence;
      } else {
        // Use browser speech recognition
        transcript = await this.recognizeSpeech();
        confidence = 0.9; // Browser doesn't always provide confidence
      }

      const command: VoiceCommand = {
        transcript,
        confidence,
        timestamp: Date.now(),
        processed: false
      };

      console.log(`🎤 Voice command: "${transcript}" (confidence: ${confidence})`);

      // Process the command through DELO
      const result = await this.executeVoiceCommand(transcript);
      command.result = result;
      command.processed = true;

      this.state.lastCommand = command;
      this.emit('command', command);

      return command;

    } catch (error) {
      const errorCommand: VoiceCommand = {
        transcript: '',
        confidence: 0,
        timestamp: Date.now(),
        processed: false,
        result: { error: String(error) }
      };

      this.state.lastCommand = errorCommand;
      this.emit('error', error);
      throw error;

    } finally {
      this.state.isProcessing = false;
      this.emit('processing', false);
    }
  }

  /**
   * Execute a voice command through DELO
   */
  private async executeVoiceCommand(transcript: string): Promise<any> {
    // First, try to match against workflows
    const workflows = this.workflowManager.getWorkflows();
    const workflowMatch = workflows.find(w => 
      transcript.toLowerCase().includes(w.trigger.toLowerCase())
    );

    if (workflowMatch) {
      console.log(`🔄 Executing workflow: ${workflowMatch.name}`);
      const context = await this.deloSystem['getCurrentContext']();
      return await this.workflowManager.executeWorkflow(workflowMatch.trigger, context);
    }

    // Otherwise, process as a regular DELO command
    return await this.deloSystem.processCommand(transcript);
  }

  /**
   * Initialize speech recognition based on configured engine
   */
  private async initializeSpeechRecognition(): Promise<void> {
    try {
      // In Electron main process, we can't use browser speech recognition
      // We'll use alternative methods or make it optional
      if (process.type === 'browser') {
        console.log('🎤 Running in Electron main process - using alternative speech recognition');
        await this.initializeAlternativeRecognition();
      } else {
        await this.initializeBrowserRecognition();
      }
    } catch (error) {
      console.warn('⚠️ Speech recognition initialization failed, continuing without voice control:', error);
      this.isInitialized = false;
    }
  }

  private async initializeAlternativeRecognition(): Promise<void> {
    // For Electron main process, we'll use a different approach
    // This could be node-speech-recognition or other alternatives
    console.log('🎤 Using alternative speech recognition for Electron main process');
    this.isInitialized = true;
    this.isAvailable = false; // Mark as not available in main process
  }

  /**
   * Initialize browser-based speech recognition
   */
  private async initializeBrowserRecognition(): Promise<void> {
    if (typeof window === 'undefined' || !(window as any).webkitSpeechRecognition) {
      throw new Error('Browser speech recognition not available');
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      this.processVoiceCommand().then(command => {
        console.log(`Voice command processed: ${command.transcript}`);
      });
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.emit('error', event.error);
    };

    this.recognition.onend = () => {
      if (this.state.isListening) {
        this.recognition?.start();
      }
    };
  }

  /**
   * Initialize Whisper-based recognition
   */
  private async initializeWhisperRecognition(): Promise<void> {
    // This would integrate with a local Whisper model
    // For now, we'll use a placeholder
    console.log('Whisper recognition initialized (placeholder)');
  }

  /**
   * Initialize Azure Speech Services
   */
  private async initializeAzureRecognition(): Promise<void> {
    if (!this.config.apiKey || !this.config.endpoint) {
      throw new Error('Azure Speech Services requires API key and endpoint');
    }
    
    // This would integrate with Azure Speech SDK
    console.log('Azure Speech Services initialized (placeholder)');
  }

  /**
   * Initialize Google Speech-to-Text
   */
  private async initializeGoogleRecognition(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Google Speech-to-Text requires API key');
    }
    
    // This would integrate with Google Speech-to-Text API
    console.log('Google Speech-to-Text initialized (placeholder)');
  }

  /**
   * Initialize hotword detection
   */
  private async initializeHotwordDetection(): Promise<void> {
    if (!this.config.hotword) return;

    // This would integrate with a hotword detection library
    // For now, we'll use a simple keyword-based approach
    console.log(`Hotword detection initialized for: "${this.config.hotword}"`);
  }

  /**
   * Start hotword detection
   */
  private async startHotwordDetection(): Promise<void> {
    if (!this.config.hotword) return;

    // In a real implementation, this would continuously listen for the hotword
    // For now, we'll simulate it
    console.log(`Listening for hotword: "${this.config.hotword}"`);
  }

  /**
   * Start continuous listening
   */
  private async startContinuousListening(): Promise<void> {
    if (this.recognition) {
      this.recognition.start();
    }
  }

  /**
   * Transcribe audio data
   */
  private async transcribeAudio(audioData: ArrayBuffer): Promise<{ transcript: string; confidence: number }> {
    // This would send audio data to the configured speech recognition service
    // For now, return a placeholder
    return {
      transcript: 'placeholder transcript',
      confidence: 0.8
    };
  }

  /**
   * Recognize speech using browser API
   */
  private async recognizeSpeech(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Speech recognition timeout'));
      }, this.config.timeout);

      this.recognition.onresult = (event: any) => {
        clearTimeout(timeout);
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      this.recognition.onerror = (event: any) => {
        clearTimeout(timeout);
        reject(new Error(event.error));
      };

      this.recognition.start();
    });
  }

  /**
   * Update voice configuration
   */
  public updateConfig(newConfig: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.emit('configUpdated', this.config);
  }

  /**
   * Get current voice configuration
   */
  public getConfig(): VoiceConfig {
    return { ...this.config };
  }

  /**
   * Get current voice state
   */
  public getState(): VoiceState {
    return { ...this.state };
  }

  /**
   * Get voice command history
   */
  public getCommandHistory(): VoiceCommand[] {
    // This would return recent voice commands
    return [];
  }

  /**
   * Test voice recognition
   */
  public async testRecognition(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.startListening();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.stopListening();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Save configuration to file
   */
  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving voice config:', error);
    }
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        this.config = { ...this.config, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Error loading voice config:', error);
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    await this.stopListening();
    this.removeAllListeners();
  }
} 