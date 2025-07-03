import { EventEmitter } from 'events';

export const voiceControlService: EventEmitter & {
  listening: boolean;
  wakeWordActive: boolean;
  startWakeWord: () => void;
  startPushToTalk: () => void;
  startSTT: () => Promise<string>;
  speak: (text: string) => Promise<void>;
  startListening: () => void;
  stopListening: () => void;
  getState: () => { listening: boolean; wakeWordActive: boolean };
  getConfig: () => { wakeWord: boolean; listening: boolean };
  updateConfig: (config: any) => void;
} = new (class extends EventEmitter {
  listening = false;
  wakeWordActive = false;

  startWakeWord() {
    this.wakeWordActive = true;
    setTimeout(() => {
      this.emit('wakeword', { detected: true, word: 'Jarvis' });
    }, 10000);
  }

  startPushToTalk() {
    this.listening = true;
    this.emit('listening', { active: true });
  }

  async startSTT(): Promise<string> {
    return new Promise(resolve => {
      setTimeout(() => resolve('Simulated speech-to-text result'), 3000);
    });
  }

  async speak(text: string): Promise<void> {
    console.log('TTS:', text);
  }

  async startListening() {
    this.listening = true;
    this.emit('listening', { active: true });
  }

  async stopListening() {
    this.listening = false;
    this.emit('listening', { active: false });
  }

  getState() {
    return {
      listening: this.listening,
      wakeWordActive: this.wakeWordActive
    };
  }

  getConfig() {
    // Return a dummy config object for now
    return {
      wakeWord: this.wakeWordActive,
      listening: this.listening
    };
  }

  updateConfig(config: any) {
    // Accepts a config object and updates internal state accordingly
    if (typeof config.wakeWord !== 'undefined') {
      this.wakeWordActive = config.wakeWord;
    }
    if (typeof config.listening !== 'undefined') {
      this.listening = config.listening;
    }
  }
})(); 