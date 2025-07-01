import { AggregatedContext } from './ContextAggregatorService';

export interface IntentResult {
  intent: string;
  actions: string[];
  confidence: number;
  raw: any;
}

export class IntentEngine {
  private apiKey: string;
  private endpoint: string;
  private lastCall: number = 0;
  private minInterval: number = 1500; // ms

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    if (!this.apiKey) throw new Error('GEMINI_API_KEY not set');
  }

  async classifyIntent(context: AggregatedContext, userInput: string): Promise<IntentResult> {
    const now = Date.now();
    if (now - this.lastCall < this.minInterval) {
      await new Promise(res => setTimeout(res, this.minInterval - (now - this.lastCall)));
    }
    this.lastCall = Date.now();
    const prompt = this.buildPrompt(context, userInput);
    try {
      const fetch = (await import('node-fetch')).default;
      const res = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: 256,
            temperature: 0.3
          }
        }),
      });
      const data = await res.json() as any;
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      let parsed: any = {};
      try { 
        // Extract JSON from Gemini response
        const jsonMatch = content?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = { intent: '', actions: [], confidence: 0, raw: content };
        }
      } catch { 
        parsed = { intent: '', actions: [], confidence: 0, raw: content }; 
      }
      return { ...parsed, raw: content };
    } catch (err) {
      console.error('[IntentEngine] Error:', err);
      return { intent: '', actions: [], confidence: 0, raw: err };
    }
  }

  private buildPrompt(context: AggregatedContext, userInput: string): string {
    return `You are a desktop AI assistant. Given the following context and user input, extract the user intent and decompose it into actions. Respond in JSON format: {"intent": "string", "actions": ["string"], "confidence": number}.

Context:
Clipboard: ${context.clipboard}
Active Window: ${context.activeWindow?.title} (${context.activeWindow?.app})
Recent Files: ${context.recentFiles.join(', ')}
OCR Text: ${context.ocrText}

User Input: ${userInput}

JSON Response:`;
  }
}

export const intentEngine = new IntentEngine(); 