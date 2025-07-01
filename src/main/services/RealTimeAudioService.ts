import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { DELOCommandSystem } from './DELOCommandSystem';

export interface AudioContext {
  timestamp: number;
  transcript: string;
  confidence: number;
  source: 'microphone' | 'system' | 'mixed';
  duration: number;
  isFinal: boolean;
}

export interface AudioConfig {
  enabled: boolean;
  microphone: boolean;
  systemAudio: boolean;
  transcriptionEngine: 'whisper' | 'vosk' | 'openai' | 'browser';
  sampleRate: number;
  channels: number;
  bufferSize: number;
  maxBufferDuration: number; // seconds
  apiKey?: string;
  endpoint?: string;
  language: string;
  sensitivity: number;
  noiseReduction: boolean;
}

export interface AudioState {
  isRecording: boolean;
  isTranscribing: boolean;
  currentSource: string;
  bufferSize: number;
  lastTranscription: AudioContext | null;
  error?: string;
}

export class RealTimeAudioService extends EventEmitter {
  private deloSystem: DELOCommandSystem;
  private config: AudioConfig;
  private state: AudioState;
  private audioBuffer: Buffer[] = [];
  private transcriptionBuffer: AudioContext[] = [];
  private recordingProcess?: ChildProcess;
  private transcriptionProcess?: ChildProcess;
  private isInitialized = false;
  private configPath: string;
  private tempDir: string;

  constructor(deloSystem: DELOCommandSystem) {
    super();
    this.deloSystem = deloSystem;
    this.configPath = path.join(os.homedir(), '.doppel', 'audio-config.json');
    this.tempDir = path.join(os.tmpdir(), 'delo-audio');
    
    this.config = {
      enabled: true,
      microphone: true,
      systemAudio: false,
      transcriptionEngine: 'whisper',
      sampleRate: 16000,
      channels: 1,
      bufferSize: 4096,
      maxBufferDuration: 30,
      language: 'en',
      sensitivity: 0.8,
      noiseReduction: true
    };

    this.state = {
      isRecording: false,
      isTranscribing: false,
      currentSource: 'none',
      bufferSize: 0,
      lastTranscription: null
    };

    this.ensureTempDir();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🎤 Initializing Real-Time Audio Service...');
      
      // Ensure config directory exists
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.loadConfig();
      
      // Initialize audio capture based on platform
      await this.initializeAudioCapture();
      
      this.isInitialized = true;
      console.log('✅ Real-Time Audio Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Real-Time Audio Service:', error);
      this.state.error = String(error);
      throw error;
    }
  }

  /**
   * Start real-time audio capture and transcription
   */
  public async startRecording(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Audio capture is disabled');
    }

    if (this.state.isRecording) {
      console.log('Already recording audio');
      return;
    }

    try {
      this.state.isRecording = true;
      this.emit('recording', true);

      // Start audio capture
      await this.startAudioCapture();
      
      // Start transcription pipeline
      await this.startTranscriptionPipeline();

      console.log('🎤 Real-time audio recording started');
    } catch (error) {
      this.state.isRecording = false;
      this.state.error = String(error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop audio capture and transcription
   */
  public async stopRecording(): Promise<void> {
    if (!this.state.isRecording) return;

    try {
      this.state.isRecording = false;
      this.emit('recording', false);

      // Stop audio capture
      if (this.recordingProcess) {
        this.recordingProcess.kill();
        this.recordingProcess = undefined;
      }

      // Stop transcription
      if (this.transcriptionProcess) {
        this.transcriptionProcess.kill();
        this.transcriptionProcess = undefined;
      }

      // Clear buffers
      this.audioBuffer = [];
      this.transcriptionBuffer = [];

      console.log('🎤 Real-time audio recording stopped');
    } catch (error) {
      console.error('Error stopping audio recording:', error);
    }
  }

  /**
   * Get recent audio context for DELO intelligence
   */
  public getRecentAudioContext(duration: number = 30): AudioContext[] {
    const cutoffTime = Date.now() - (duration * 1000);
    return this.transcriptionBuffer.filter(context => context.timestamp > cutoffTime);
  }

  /**
   * Get current audio state
   */
  public getAudioState(): AudioState {
    return { ...this.state };
  }

  /**
   * Get audio configuration
   */
  public getAudioConfig(): AudioConfig {
    return { ...this.config };
  }

  /**
   * Update audio configuration
   */
  public updateAudioConfig(newConfig: Partial<AudioConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.emit('configUpdated', this.config);
  }

  /**
   * Process audio data for transcription
   */
  private async processAudioData(audioData: Buffer): Promise<void> {
    try {
      // Add to buffer
      this.audioBuffer.push(audioData);
      this.state.bufferSize = this.audioBuffer.length;

      // Check if we have enough data for transcription
      const totalSize = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
      const duration = totalSize / (this.config.sampleRate * this.config.channels * 2); // 16-bit audio

      if (duration >= 2.0) { // Transcribe every 2 seconds
        const combinedBuffer = Buffer.concat(this.audioBuffer);
        await this.transcribeAudio(combinedBuffer);
        
        // Keep only recent audio data
        this.audioBuffer = [];
        this.state.bufferSize = 0;
      }

      // Limit buffer size
      if (duration > this.config.maxBufferDuration) {
        this.audioBuffer.shift();
      }
    } catch (error) {
      console.error('Error processing audio data:', error);
    }
  }

  /**
   * Transcribe audio using configured engine
   */
  private async transcribeAudio(audioData: Buffer): Promise<void> {
    if (this.state.isTranscribing) return;

    try {
      this.state.isTranscribing = true;
      
      const transcript = await this.performTranscription(audioData);
      
      if (transcript && transcript.trim()) {
        const audioContext: AudioContext = {
          timestamp: Date.now(),
          transcript: transcript.trim(),
          confidence: 0.9, // Will be updated by transcription engine
          source: this.config.microphone ? 'microphone' : 'system',
          duration: audioData.length / (this.config.sampleRate * this.config.channels * 2),
          isFinal: true
        };

        // Add to transcription buffer
        this.transcriptionBuffer.push(audioContext);
        
        // Keep only recent transcriptions
        if (this.transcriptionBuffer.length > 50) {
          this.transcriptionBuffer.shift();
        }

        this.state.lastTranscription = audioContext;
        
        // Emit transcription event
        this.emit('transcription', audioContext);
        
        // Send to DELO for context analysis
        await this.analyzeAudioContext(audioContext);
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
    } finally {
      this.state.isTranscribing = false;
    }
  }

  /**
   * Perform transcription using configured engine
   */
  private async performTranscription(audioData: Buffer): Promise<string> {
    switch (this.config.transcriptionEngine) {
      case 'whisper':
        return await this.transcribeWithWhisper(audioData);
      case 'vosk':
        return await this.transcribeWithVosk(audioData);
      case 'openai':
        return await this.transcribeWithOpenAI(audioData);
      case 'browser':
        return await this.transcribeWithBrowser(audioData);
      default:
        throw new Error(`Unsupported transcription engine: ${this.config.transcriptionEngine}`);
    }
  }

  /**
   * Transcribe using Whisper (local)
   */
  private async transcribeWithWhisper(audioData: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const audioFile = path.join(this.tempDir, `audio_${Date.now()}.wav`);
      
      // Save audio data to temporary file
      fs.writeFileSync(audioFile, audioData);
      
      // Use whisper CLI (if available)
      const whisperProcess = spawn('whisper', [
        audioFile,
        '--language', this.config.language,
        '--output_format', 'txt',
        '--model', 'base'
      ]);

      let output = '';
      let error = '';

      whisperProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      whisperProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      whisperProcess.on('close', (code) => {
        // Clean up temp file
        try {
          fs.unlinkSync(audioFile);
        } catch (e) {
          // Ignore cleanup errors
        }

        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Whisper transcription failed: ${error}`));
        }
      });
    });
  }

  /**
   * Transcribe using Vosk (offline)
   */
  private async transcribeWithVosk(audioData: Buffer): Promise<string> {
    // Vosk implementation would go here
    // For now, return a placeholder
    return 'Vosk transcription placeholder';
  }

  /**
   * Transcribe using OpenAI Whisper API
   */
  private async transcribeWithOpenAI(audioData: Buffer): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key required for OpenAI transcription');
    }

    const audioFile = path.join(this.tempDir, `audio_${Date.now()}.wav`);
    fs.writeFileSync(audioFile, audioData);

    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', fs.createReadStream(audioFile));
      form.append('model', 'whisper-1');
      form.append('language', this.config.language);

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          ...form.getHeaders()
        },
        body: form
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.text;
    } finally {
      // Clean up temp file
      try {
        fs.unlinkSync(audioFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Transcribe using browser Web Speech API
   */
  private async transcribeWithBrowser(audioData: Buffer): Promise<string> {
    // This would require integration with the renderer process
    // For now, return a placeholder
    return 'Browser transcription placeholder';
  }

  /**
   * Analyze audio context for DELO intelligence
   */
  private async analyzeAudioContext(audioContext: AudioContext): Promise<void> {
    try {
      // Check for keywords that might trigger DELO actions
      const keywords = this.extractKeywords(audioContext.transcript);
      
      if (keywords.length > 0) {
        // Emit keyword detection event
        this.emit('keywords', {
          keywords,
          context: audioContext,
          timestamp: Date.now()
        });

        // Send to DELO for potential action
        await this.deloSystem['processAudioContext'](audioContext);
      }

      // Check for meeting context
      if (this.isMeetingContext(audioContext.transcript)) {
        this.emit('meeting', {
          context: audioContext,
          timestamp: Date.now()
        });
      }

      // Check for urgent context
      if (this.isUrgentContext(audioContext.transcript)) {
        this.emit('urgent', {
          context: audioContext,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error analyzing audio context:', error);
    }
  }

  /**
   * Extract keywords from transcript
   */
  private extractKeywords(transcript: string): string[] {
    const keywords = [
      'delo', 'assistant', 'help', 'automate', 'workflow',
      'meeting', 'email', 'summarize', 'schedule', 'reminder',
      'urgent', 'important', 'deadline', 'project', 'task'
    ];

    const lowerTranscript = transcript.toLowerCase();
    return keywords.filter(keyword => lowerTranscript.includes(keyword));
  }

  /**
   * Check if transcript indicates meeting context
   */
  private isMeetingContext(transcript: string): boolean {
    const meetingKeywords = [
      'meeting', 'call', 'zoom', 'teams', 'discussion',
      'agenda', 'minutes', 'participants', 'schedule'
    ];

    const lowerTranscript = transcript.toLowerCase();
    return meetingKeywords.some(keyword => lowerTranscript.includes(keyword));
  }

  /**
   * Check if transcript indicates urgent context
   */
  private isUrgentContext(transcript: string): boolean {
    const urgentKeywords = [
      'urgent', 'emergency', 'asap', 'immediately',
      'deadline', 'critical', 'important', 'priority'
    ];

    const lowerTranscript = transcript.toLowerCase();
    return urgentKeywords.some(keyword => lowerTranscript.includes(keyword));
  }

  /**
   * Initialize audio capture based on platform
   */
  private async initializeAudioCapture(): Promise<void> {
    // Platform-specific audio capture initialization
    if (process.platform === 'win32') {
      await this.initializeWindowsAudioCapture();
    } else if (process.platform === 'darwin') {
      await this.initializeMacAudioCapture();
    } else {
      await this.initializeLinuxAudioCapture();
    }
  }

  /**
   * Initialize Windows audio capture
   */
  private async initializeWindowsAudioCapture(): Promise<void> {
    // Windows-specific audio capture using PowerShell or native APIs
    console.log('🎤 Windows audio capture initialized');
  }

  /**
   * Initialize macOS audio capture
   */
  private async initializeMacAudioCapture(): Promise<void> {
    // macOS-specific audio capture using Core Audio
    console.log('🎤 macOS audio capture initialized');
  }

  /**
   * Initialize Linux audio capture
   */
  private async initializeLinuxAudioCapture(): Promise<void> {
    // Linux-specific audio capture using ALSA or PulseAudio
    console.log('🎤 Linux audio capture initialized');
  }

  /**
   * Start audio capture process
   */
  private async startAudioCapture(): Promise<void> {
    // Platform-specific audio capture start
    if (process.platform === 'win32') {
      await this.startWindowsAudioCapture();
    } else if (process.platform === 'darwin') {
      await this.startMacAudioCapture();
    } else {
      await this.startLinuxAudioCapture();
    }
  }

  /**
   * Start Windows audio capture
   */
  private async startWindowsAudioCapture(): Promise<void> {
    // Use PowerShell to capture audio
    const command = `powershell -Command "Add-Type -AssemblyName System.Speech; $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine; $recognizer.SetInputToDefaultAudioDevice(); $recognizer.RecognizeAsync()"`;
    
    this.recordingProcess = spawn('cmd', ['/c', command]);
    
    this.recordingProcess.stdout?.on('data', (data) => {
      // Process audio data
      this.processAudioData(data);
    });

    this.recordingProcess.stderr?.on('data', (data) => {
      console.error('Audio capture error:', data.toString());
    });
  }

  /**
   * Start macOS audio capture
   */
  private async startMacAudioCapture(): Promise<void> {
    // Use Core Audio or ffmpeg for audio capture
    const command = 'ffmpeg -f avfoundation -i ":0" -acodec pcm_s16le -ar 16000 -ac 1 -f wav -';
    
    this.recordingProcess = spawn('ffmpeg', command.split(' ').slice(1));
    
    this.recordingProcess.stdout?.on('data', (data) => {
      this.processAudioData(data);
    });
  }

  /**
   * Start Linux audio capture
   */
  private async startLinuxAudioCapture(): Promise<void> {
    // Use ALSA or PulseAudio for audio capture
    const command = 'arecord -f S16_LE -r 16000 -c 1 -t raw';
    
    this.recordingProcess = spawn('arecord', command.split(' ').slice(1));
    
    this.recordingProcess.stdout?.on('data', (data) => {
      this.processAudioData(data);
    });
  }

  /**
   * Start transcription pipeline
   */
  private async startTranscriptionPipeline(): Promise<void> {
    // Transcription pipeline is handled by processAudioData
    console.log('🔄 Transcription pipeline started');
  }

  /**
   * Ensure temporary directory exists
   */
  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Save configuration to file
   */
  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving audio config:', error);
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
      console.error('Error loading audio config:', error);
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    await this.stopRecording();
    this.removeAllListeners();
  }
} 