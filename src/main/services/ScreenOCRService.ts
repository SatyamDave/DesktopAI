import screenshot from 'screenshot-desktop';
import { createWorker } from 'tesseract.js';
import * as path from 'path';

export class ScreenOCRService {
  private worker: any;
  private isInitialized = false;
  private lastText: string = '';
  private listeners: ((text: string) => void)[] = [];
  private interval: NodeJS.Timeout | null = null;
  private pollingMs: number = 2000;
  private trainingDataPath: string;

  constructor() {
    // Set the path to the training data
    this.trainingDataPath = path.join(process.cwd(), 'data', 'eng.traineddata');
    console.log('📁 Training data path:', this.trainingDataPath);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('🔄 Initializing Tesseract worker...');
      
      // Create worker
      this.worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'loading tesseract core') {
            console.log('📦 Loading Tesseract core...');
          } else if (m.status === 'loading language traineddata') {
            console.log('🌐 Loading language data...');
          } else if (m.status === 'initializing tesseract') {
            console.log('⚙️ Initializing Tesseract...');
          } else if (m.status === 'recognizing text') {
            console.log(`🔍 Recognizing text... ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      // Set OCR parameters for better accuracy
      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\ ',
        tessedit_pageseg_mode: '6', // Uniform block of text
        tessedit_ocr_engine_mode: '3' // Default, based on what is available
      });
      
      this.isInitialized = true;
      console.log('✅ Screen OCR Service initialized successfully');
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
      // Preprocess the image for better OCR results
      const preprocessedBuffer = await this.preprocessImage(imageBuffer);
      
      const { data: { text } } = await this.worker.recognize(preprocessedBuffer);
      return text.trim();
    } catch (error) {
      console.error('Error extracting text from image:', error);
      return '';
    }
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Simple preprocessing without sharp - just return the original buffer
      // Tesseract.js can handle most image formats directly
      return imageBuffer;
    } catch (error) {
      console.error('Error preprocessing image:', error);
      return imageBuffer; // Return original if preprocessing fails
    }
  }

  public start(): void {
    if (this.interval) return;
    
    console.log('🚀 Starting screen OCR monitoring...');
    this.interval = setInterval(() => this.captureAndOCR(), this.pollingMs);
    this.captureAndOCR(); // Initial capture
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('⏹️ Screen OCR monitoring stopped');
    }
  }

  private async captureAndOCR(): Promise<void> {
    try {
      const img = await screenshot();
      const text = await this.extractText(img);
      
      if (text && text !== this.lastText) {
        this.lastText = text;
        console.log('📖 New screen text detected:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        this.listeners.forEach(listener => listener(text));
      }
    } catch (error) {
      console.error('Error in captureAndOCR:', error);
    }
  }

  public onTextChange(listener: (text: string) => void): void {
    this.listeners.push(listener);
  }

  public removeListener(listener: (text: string) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public async terminate(): Promise<void> {
    this.stop();
    if (this.worker) {
      try {
        await this.worker.terminate();
        console.log('🧹 Tesseract worker terminated');
      } catch (error) {
        console.error('Error terminating worker:', error);
      }
    }
  }

  // Get the last captured text
  public getLastText(): string {
    return this.lastText;
  }

  // Force a new capture and OCR
  public async forceCapture(): Promise<string> {
    try {
      const img = await screenshot();
      const text = await this.extractText(img);
      this.lastText = text;
      return text;
    } catch (error) {
      console.error('Error in force capture:', error);
      return '';
    }
  }
}

export const screenOCRService = new ScreenOCRService(); 
