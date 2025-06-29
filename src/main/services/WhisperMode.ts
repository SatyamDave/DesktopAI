import { globalShortcut, clipboard } from 'electron';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

interface WhisperSession {
  id: number;
  start_time: number;
  end_time: number;
  duration: number;
  transcript: string;
  confidence: number;
}

export class WhisperMode {
  private db: Database | null = null;
  private sqlJS: SqlJsStatic | null = null;
  private dbPath: string;
  private isActive = false;
  private isRecording = false;
  private sessionStartTime = 0;
  private currentTranscript = '';
  private mediaRecorder: any = null;
  private audioChunks: Blob[] = [];

  constructor() {
    const dbDir = path.join(os.homedir(), '.doppel');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.dbPath = path.join(dbDir, 'whisper.sqlite');
  }

  public async init() {
    this.sqlJS = await initSqlJs();
    if (fs.existsSync(this.dbPath)) {
      const filebuffer = fs.readFileSync(this.dbPath);
      this.db = new this.sqlJS.Database(filebuffer);
    } else {
      this.db = new this.sqlJS.Database();
      this.initializeDatabase();
      this.saveToDisk();
    }
  }

  private initializeDatabase() {
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS whisper_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration INTEGER,
        transcript TEXT,
        confidence REAL DEFAULT 0.0
      );
      CREATE INDEX IF NOT EXISTS idx_whisper_timestamp ON whisper_sessions(start_time DESC);
    `);
  }

  private saveToDisk() {
    if (this.db) {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    }
  }

  public async start() {
    if (!this.db) await this.init();
    if (this.isActive) return;
    this.isActive = true;
    this.registerHotkeys();
    console.log('Whisper mode enabled (performance optimized)');
  }

  public stop() {
    this.isActive = false;
    this.unregisterHotkeys();
    this.stopRecording();
    console.log('Whisper mode disabled');
  }

  private registerHotkeys() {
    try {
      // Register Ctrl+Shift+W for whisper mode toggle
      globalShortcut.register('CommandOrControl+Shift+W', () => {
        this.toggleRecording();
      });

      // Register Ctrl+Shift+V for voice paste
      globalShortcut.register('CommandOrControl+Shift+V', () => {
        this.voicePaste();
      });
    } catch (error) {
      console.error('Error registering hotkeys:', error);
    }
  }

  private unregisterHotkeys() {
    try {
      globalShortcut.unregisterAll();
    } catch (error) {
      console.error('Error unregistering hotkeys:', error);
    }
  }

  public async toggleRecording() {
    if (this.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  private async startRecording() {
    if (this.isRecording) return;

    try {
      this.isRecording = true;
      this.sessionStartTime = Date.now();
      this.currentTranscript = '';
      this.audioChunks = [];

      // In a real implementation, you would:
      // 1. Request microphone permissions
      // 2. Start recording audio
      // 3. Process audio in real-time
      // 4. Send to Whisper API or local model

      console.log('Whisper mode: Recording started');
      
      // For now, simulate recording
      setTimeout(() => {
        if (this.isRecording) {
          this.simulateTranscription();
        }
      }, 2000);

    } catch (error) {
      console.error('Error starting recording:', error);
      this.isRecording = false;
    }
  }

  private async stopRecording() {
    if (!this.isRecording) return;

    try {
      this.isRecording = false;
      const endTime = Date.now();
      const duration = endTime - this.sessionStartTime;

      // Save session to database
      await this.saveSession({
        id: 0,
        start_time: this.sessionStartTime,
        end_time: endTime,
        duration,
        transcript: this.currentTranscript,
        confidence: 0.85
      });

      console.log('Whisper mode: Recording stopped');
      console.log('Transcript:', this.currentTranscript);

      // Copy transcript to clipboard
      if (this.currentTranscript.trim()) {
        clipboard.writeText(this.currentTranscript.trim());
      }

    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }

  private simulateTranscription() {
    // Simulate receiving transcription
    const sampleTranscripts = [
      "Hello, this is a test of the whisper mode.",
      "I'm speaking into the microphone to test voice recognition.",
      "This is a simulated transcription for demonstration purposes.",
      "The whisper mode should convert speech to text automatically."
    ];

    const randomTranscript = sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];
    this.currentTranscript = randomTranscript;
  }

  private async voicePaste() {
    try {
      // Get the most recent transcript and paste it
      const recentSession = await this.getMostRecentSession();
      if (recentSession && recentSession.transcript) {
        clipboard.writeText(recentSession.transcript);
        console.log('Voice paste: Copied transcript to clipboard');
      } else {
        console.log('Voice paste: No recent transcript found');
      }
    } catch (error) {
      console.error('Error in voice paste:', error);
    }
  }

  private async saveSession(session: WhisperSession): Promise<void> {
    try {
      this.db!.run(
        'INSERT INTO whisper_sessions (start_time, end_time, duration, transcript, confidence) VALUES (?, ?, ?, ?, ?)',
        [session.start_time, session.end_time, session.duration, session.transcript, session.confidence]
      );
      this.saveToDisk();
    } catch (error) {
      console.error('Error saving whisper session:', error);
    }
  }

  public async getMostRecentSession(): Promise<WhisperSession | null> {
    try {
      const res = this.db!.exec('SELECT * FROM whisper_sessions ORDER BY start_time DESC LIMIT 1');
      if (res[0] && res[0].values && res[0].values.length > 0) {
        const row = res[0].values[0];
        return {
          id: row[0],
          start_time: row[1],
          end_time: row[2],
          duration: row[3],
          transcript: row[4],
          confidence: row[5]
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting most recent session:', error);
      return null;
    }
  }

  public async getSessionHistory(limit = 20): Promise<WhisperSession[]> {
    try {
      const res = this.db!.exec('SELECT * FROM whisper_sessions ORDER BY start_time DESC LIMIT ?', [limit]);
      if (res[0] && res[0].values) {
        return res[0].values.map((row: any) => ({
          id: row[0],
          start_time: row[1],
          end_time: row[2],
          duration: row[3],
          transcript: row[4],
          confidence: row[5]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting session history:', error);
      return [];
    }
  }

  public async searchTranscripts(query: string): Promise<WhisperSession[]> {
    try {
      const res = this.db!.exec('SELECT * FROM whisper_sessions WHERE transcript LIKE ? ORDER BY start_time DESC LIMIT 20', [`%${query}%`]);
      if (res[0] && res[0].values) {
        return res[0].values.map((row: any) => ({
          id: row[0],
          start_time: row[1],
          end_time: row[2],
          duration: row[3],
          transcript: row[4],
          confidence: row[5]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error searching transcripts:', error);
      return [];
    }
  }

  public async getStats(): Promise<{
    totalSessions: number;
    totalDuration: number;
    averageConfidence: number;
    mostCommonWords: string[];
  }> {
    try {
      // Get total sessions
      const totalRes = this.db!.exec('SELECT COUNT(*) as count FROM whisper_sessions');
      const totalSessions = totalRes[0]?.values?.[0]?.[0] || 0;

      // Get total duration
      const durationRes = this.db!.exec('SELECT SUM(duration) as total FROM whisper_sessions');
      const totalDuration = durationRes[0]?.values?.[0]?.[0] || 0;

      // Get average confidence
      const confidenceRes = this.db!.exec('SELECT AVG(confidence) as avg FROM whisper_sessions');
      const averageConfidence = confidenceRes[0]?.values?.[0]?.[0] || 0;

      // Get recent transcripts for word analysis
      const recentRes = this.db!.exec('SELECT transcript FROM whisper_sessions ORDER BY start_time DESC LIMIT 50');
      const recentSessions = recentRes[0]?.values?.map((row: any) => row[0]) || [];
      
      const words = recentSessions
        .flatMap(s => s.toLowerCase().split(/\s+/))
        .filter(word => word.length > 3);
      
      const wordCount = words.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostCommonWords = Object.entries(wordCount)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([word]) => word);

      return {
        totalSessions,
        totalDuration,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
        mostCommonWords
      };
    } catch (error) {
      console.error('Error getting whisper stats:', error);
      return {
        totalSessions: 0,
        totalDuration: 0,
        averageConfidence: 0,
        mostCommonWords: []
      };
    }
  }

  public async clearHistory(): Promise<void> {
    try {
      this.db!.run('DELETE FROM whisper_sessions');
      this.saveToDisk();
    } catch (error) {
      console.error('Error clearing whisper history:', error);
    }
  }

  public async exportData(): Promise<any> {
    try {
      const sessions = await this.getSessionHistory(1000);
      const stats = await this.getStats();
      
      return {
        sessions,
        stats,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting whisper data:', error);
      return null;
    }
  }

  public getStatus(): { isActive: boolean; isRecording: boolean } {
    return {
      isActive: this.isActive,
      isRecording: this.isRecording
    };
  }
} 