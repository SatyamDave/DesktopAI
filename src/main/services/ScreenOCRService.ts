import screenshot from 'screenshot-desktop';
import { createWorker } from 'tesseract.js';

export class ScreenOCRService {
  private worker: any;
  private isInitialized = false;
  private lastText: string = '';
  private listeners: ((text: string) => void)[] = [];
  private interval: NodeJS.Timeout | null = null;
  private pollingMs: number = 2000;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      this.worker = await createWorker('eng');
      this.isInitialized = true;
      console.log('✅ Screen OCR Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Screen OCR Service:', error);
      throw error;
    }
  }

  public async extractText(imageBuffer: Buffer): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const { data: { text } } = await this.worker.recognize(imageBuffer);
      return text;
    } catch (error) {
      console.error('Error extracting text from image:', error);
      return '';
    }
  }

  public start(): void {
    if (this.interval) return;
    this.interval = setInterval(() => this.captureAndOCR(), this.pollingMs);
    this.captureAndOCR();
  }

  public stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  private async captureAndOCR(): Promise<void> {
    try {
      const img = await screenshot();
      const text = await this.extractText(img);
      
      if (text !== this.lastText) {
        this.lastText = text;
        this.listeners.forEach(listener => listener(text));
      }
    } catch (error) {
      console.error('Error in captureAndOCR:', error);
    }
  }

  public onTextChange(listener: (text: string) => void): void {
    this.listeners.push(listener);
  }

  public async terminate(): Promise<void> {
    this.stop();
    if (this.worker) {
      await this.worker.terminate();
    }
  }
}

export const screenOCRService = new ScreenOCRService(); 
