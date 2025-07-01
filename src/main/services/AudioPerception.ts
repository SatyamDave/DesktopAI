import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { DatabaseManager } from './DatabaseManager';
import { PerformanceOptimizer } from './PerformanceOptimizer';

interface AudioSession {
  id: number;
  start_time: number;
  end_time: number;
  duration: number;
  transcript: string;
  confidence: number;
  audio_source: string;
  is_system_audio: boolean;
  is_microphone: boolean;
  metadata: string;
}

interface AudioFilter {
  source_name: string;
  is_whitelisted: boolean;
  is_blacklisted: boolean;
  volume_threshold: number;
  keywords: string[];
}

export class AudioPerception {
  private databaseManager: DatabaseManager;
  private performanceOptimizer: PerformanceOptimizer;
  private isActive = false;
  private isRecording = false;
  private currentSession: AudioSession | null = null;
  private audioFilters: Map<string, AudioFilter> = new Map();
  private dbName = 'audio_perception';
  private recordingInterval: NodeJS.Timeout | null = null;
  private whisperModel: any = null;
  private audioContext: any = null;
  private mediaRecorder: any = null;
  private audioChunks: Blob[] = [];
  private sessionStartTime = 0;
  private currentTranscript = '';
  private silenceThreshold = 2000; // 2 seconds of silence
  private lastAudioTime = 0;

  constructor() {
    this.databaseManager = DatabaseManager.getInstance();
    this.performanceOptimizer = PerformanceOptimizer.getInstance();
    
    // Register database with optimized settings
    this.databaseManager.registerDatabase({
      name: this.dbName,
      filePath: path.join(os.homedir(), '.doppel', 'audio_perception.sqlite'),
      autoSave: true,
      saveInterval: 300000, // 5 minutes
      maxConnections: 1
    });
    
    // Setup performance throttling
    this.performanceOptimizer.createThrottleConfig('audio_perception', 1000, 5000, 1.2);
    
    this.loadAudioFilters();
  }

  public async init() {
    try {
      await this.databaseManager.initialize();
      await this.initializeDatabase();
      await this.initializeWhisper();
      console.log('✅ AudioPerception initialized');
    } catch (error) {
      console.error('❌ Error initializing AudioPerception:', error);
      throw error;
    }
  }

  private async initializeDatabase() {
    const db = await this.databaseManager.getDatabase(this.dbName);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS audio_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration INTEGER,
        transcript TEXT,
        confidence REAL DEFAULT 0.0,
        audio_source TEXT NOT NULL,
        is_system_audio INTEGER DEFAULT 0,
        is_microphone INTEGER DEFAULT 0,
        metadata TEXT
      );
      CREATE TABLE IF NOT EXISTS audio_filters (
        source_name TEXT PRIMARY KEY,
        is_whitelisted INTEGER DEFAULT 0,
        is_blacklisted INTEGER DEFAULT 0,
        volume_threshold REAL DEFAULT 0.1,
        keywords TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_audio_timestamp ON audio_sessions(start_time DESC);
      CREATE INDEX IF NOT EXISTS idx_audio_source ON audio_sessions(audio_source);
    `);
  }

  private async initializeWhisper() {
    try {
      // Initialize Whisper model (base.en for performance)
      // In a real implementation, you would load the Whisper model here
      // For now, we'll simulate the initialization
      console.log('🎤 Whisper model initialization simulated');
      this.whisperModel = { type: 'simulated' };
    } catch (error) {
      console.error('Error initializing Whisper model:', error);
      // Continue without Whisper - will use fallback methods
    }
  }

  public async start() {
    if (this.isActive) return;
    
    this.isActive = true;
    await this.startAudioMonitoring();
    console.log('🎤 Audio perception started');
  }

  public stop() {
    this.isActive = false;
    this.stopAudioMonitoring();
    console.log('🎤 Audio perception stopped');
  }

  private async startAudioMonitoring() {
    try {
      // Start monitoring system audio and microphone
      await this.startSystemAudioCapture();
      await this.startMicrophoneCapture();
      
      // Start periodic processing
      const interval = this.performanceOptimizer.getThrottledInterval('audio_perception');
      this.recordingInterval = setInterval(() => this.processAudioChunks(), interval);
      
    } catch (error) {
      console.error('Error starting audio monitoring:', error);
    }
  }

  private async startSystemAudioCapture() {
    try {
      // Cross-platform system audio capture
      switch (process.platform) {
        case 'darwin':
          await this.startSystemAudioMacOS();
          break;
        case 'win32':
          await this.startSystemAudioWindows();
          break;
        case 'linux':
          await this.startSystemAudioLinux();
          break;
      }
    } catch (error) {
      console.error('Error starting system audio capture:', error);
    }
  }

  private async startSystemAudioMacOS() {
    try {
      // macOS system audio capture using BlackHole or similar
      // This would require additional setup with virtual audio devices
      console.log('🎤 macOS system audio capture simulated');
    } catch (error) {
      console.error('Error starting macOS system audio capture:', error);
    }
  }

  private async startSystemAudioWindows() {
    try {
      // Windows system audio capture using WASAPI loopback
      // This would require additional audio capture libraries
      console.log('🎤 Windows system audio capture simulated');
    } catch (error) {
      console.error('Error starting Windows system audio capture:', error);
    }
  }

  private async startSystemAudioLinux() {
    try {
      // Linux system audio capture using PulseAudio or ALSA
      // This would require additional audio capture libraries
      console.log('🎤 Linux system audio capture simulated');
    } catch (error) {
      console.error('Error starting Linux system audio capture:', error);
    }
  }

  private async startMicrophoneCapture() {
    try {
      // In main process, we can't access browser APIs directly
      // This functionality should be handled in the renderer process
      console.log('🎤 Microphone capture not available in main process - use renderer process for audio capture');
      
      // For now, simulate microphone capture
      this.simulateMicrophoneCapture();
      
    } catch (error) {
      console.error('Error starting microphone capture:', error);
    }
  }

  private simulateMicrophoneCapture() {
    // Simulate microphone capture for testing
    console.log('🎤 Simulating microphone capture in main process');
    
    // Set up a timer to simulate audio chunks
    this.recordingInterval = setInterval(async () => {
      if (this.isActive && !this.isRecording) {
        await this.simulateTranscription();
      }
    }, 3000); // Simulate audio every 3 seconds
  }

  private stopAudioMonitoring() {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Stop any active session
    if (this.isRecording) {
      this.stopRecording();
    }
  }

  private async processAudioChunks() {
    if (!this.isActive || this.audioChunks.length === 0) return;
    
    try {
      // Check for silence
      const now = Date.now();
      const silenceDuration = now - this.lastAudioTime;
      
      if (silenceDuration > this.silenceThreshold && this.isRecording) {
        await this.stopRecording();
        return;
      }
      
      // Process audio chunks
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
      this.audioChunks = [];
      
      if (audioBlob.size > 0) {
        await this.transcribeAudio(audioBlob);
      }
      
    } catch (error) {
      console.error('Error processing audio chunks:', error);
    }
  }

  private async transcribeAudio(audioBlob: Blob) {
    try {
      if (!this.whisperModel) {
        // Fallback to simulated transcription
        await this.simulateTranscription();
        return;
      }
      
      // Convert blob to audio data
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = new Float32Array(arrayBuffer);
      
      // Process with Whisper
      const transcript = await this.processWithWhisper(audioData);
      
      if (transcript.text && transcript.confidence > 0.5) {
        this.currentTranscript += ' ' + transcript.text;
        
        // Start recording session if not already recording
        if (!this.isRecording) {
          await this.startRecording();
        }
      }
      
    } catch (error) {
      console.error('Error transcribing audio:', error);
    }
  }

  private async processWithWhisper(audioData: Float32Array): Promise<{ text: string; confidence: number }> {
    try {
      // In a real implementation, you would:
      // 1. Preprocess audio data (normalize, resample, etc.)
      // 2. Run through Whisper model
      // 3. Return transcription with confidence
      
      // For now, simulate Whisper processing
      return this.simulateWhisperTranscription();
      
    } catch (error) {
      console.error('Error processing with Whisper:', error);
      return { text: '', confidence: 0 };
    }
  }

  private async simulateWhisperTranscription(): Promise<{ text: string; confidence: number }> {
    // Simulate Whisper transcription with realistic delays
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    const sampleTranscripts = [
      "Hello, this is a test of the audio perception system.",
      "I'm speaking to test the voice recognition capabilities.",
      "The system should be able to transcribe this speech.",
      "This is a simulated transcription for demonstration.",
      "Testing the audio monitoring and transcription features."
    ];
    
    const randomTranscript = sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];
    const confidence = 0.7 + Math.random() * 0.25; // 70-95% confidence
    
    return { text: randomTranscript, confidence };
  }

  private async simulateTranscription() {
    // Simulate receiving transcription without Whisper
    const transcript = await this.simulateWhisperTranscription();
    
    if (transcript.text && transcript.confidence > 0.5) {
      this.currentTranscript += ' ' + transcript.text;
      
      if (!this.isRecording) {
        await this.startRecording();
      }
    }
  }

  private async startRecording() {
    if (this.isRecording) return;
    
    this.isRecording = true;
    this.sessionStartTime = Date.now();
    this.currentTranscript = '';
    
    console.log('🎤 Audio recording session started');
  }

  private async stopRecording() {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    const endTime = Date.now();
    const duration = endTime - this.sessionStartTime;
    
    if (this.currentTranscript.trim()) {
      const session: AudioSession = {
        id: 0,
        start_time: this.sessionStartTime,
        end_time: endTime,
        duration,
        transcript: this.currentTranscript.trim(),
        confidence: 0.85,
        audio_source: 'microphone',
        is_system_audio: false,
        is_microphone: true,
        metadata: JSON.stringify({
          platform: process.platform,
          whisper_model: this.whisperModel?.type || 'none',
          silence_threshold: this.silenceThreshold
        })
      };
      
      await this.saveSession(session);
      console.log('🎤 Audio recording session ended:', session.transcript.substring(0, 50) + '...');
    }
    
    this.currentSession = null;
    this.currentTranscript = '';
  }

  private async saveSession(session: AudioSession) {
    try {
      await this.databaseManager.batchExecute(
        this.dbName,
        'INSERT INTO audio_sessions (start_time, end_time, duration, transcript, confidence, audio_source, is_system_audio, is_microphone, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [session.start_time, session.end_time, session.duration, session.transcript, session.confidence, session.audio_source, session.is_system_audio ? 1 : 0, session.is_microphone ? 1 : 0, session.metadata]
      );
    } catch (error) {
      console.error('Error saving audio session:', error);
    }
  }

  // Audio filtering methods
  public async addAudioFilter(filter: Omit<AudioFilter, 'source_name'> & { source_name: string }): Promise<void> {
    this.audioFilters.set(filter.source_name.toLowerCase(), filter);
    
    try {
      await this.databaseManager.batchExecute(
        this.dbName,
        'INSERT OR REPLACE INTO audio_filters (source_name, is_whitelisted, is_blacklisted, volume_threshold, keywords) VALUES (?, ?, ?, ?, ?)',
        [filter.source_name, filter.is_whitelisted ? 1 : 0, filter.is_blacklisted ? 1 : 0, filter.volume_threshold, JSON.stringify(filter.keywords)]
      );
    } catch (error) {
      console.error('Error saving audio filter:', error);
    }
  }

  private async loadAudioFilters(): Promise<void> {
    try {
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT * FROM audio_filters'
      );
      
      if (result[0] && result[0].values) {
        for (const row of result[0].values) {
          const filter: AudioFilter = {
            source_name: row[1],
            is_whitelisted: !!row[2],
            is_blacklisted: !!row[3],
            volume_threshold: row[4],
            keywords: JSON.parse(row[5] || '[]')
          };
          this.audioFilters.set(filter.source_name.toLowerCase(), filter);
        }
      }
    } catch (error) {
      console.error('Error loading audio filters:', error);
    }
  }

  public async getRecentSessions(limit = 20): Promise<AudioSession[]> {
    try {
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT * FROM audio_sessions ORDER BY start_time DESC LIMIT ?',
        [limit]
      );
      
      if (result[0] && result[0].values) {
        return result[0].values.map((row: any) => ({
          id: row[0],
          start_time: row[1],
          end_time: row[2],
          duration: row[3],
          transcript: row[4],
          confidence: row[5],
          audio_source: row[6],
          is_system_audio: !!row[7],
          is_microphone: !!row[8],
          metadata: row[9]
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting recent audio sessions:', error);
      return [];
    }
  }

  public async searchTranscripts(query: string): Promise<AudioSession[]> {
    try {
      const result = await this.databaseManager.executeQuery(
        this.dbName,
        'SELECT * FROM audio_sessions WHERE transcript LIKE ? ORDER BY start_time DESC LIMIT 50',
        [`%${query}%`]
      );
      
      if (result[0] && result[0].values) {
        return result[0].values.map((row: any) => ({
          id: row[0],
          start_time: row[1],
          end_time: row[2],
          duration: row[3],
          transcript: row[4],
          confidence: row[5],
          audio_source: row[6],
          is_system_audio: !!row[7],
          is_microphone: !!row[8],
          metadata: row[9]
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error searching transcripts:', error);
      return [];
    }
  }

  public getStatus(): { isActive: boolean; isRecording: boolean; currentTranscript: string; lastAudioTime: number } {
    return {
      isActive: this.isActive,
      isRecording: this.isRecording,
      currentTranscript: this.currentTranscript,
      lastAudioTime: this.lastAudioTime
    };
  }
} 