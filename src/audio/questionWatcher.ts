import { EventEmitter } from 'events';
import { TranscriptSnippet } from './types';
import OpenAI from 'openai';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!
});

class QuestionWatcher extends EventEmitter {
  constructor() { super(); }
  async onTranscript(snippet: TranscriptSnippet) {
    if (snippet.text.trim().endsWith('?')) {
      try {
        const completion = await openrouter.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a helpful meeting assistant. Give a short, actionable answer to the user question. No preamble.' },
            { role: 'user', content: snippet.text }
          ]
        });
        const answer = completion.choices?.[0]?.message?.content?.trim() || '';
        this.emit('suggestion', { question: snippet.text, answer });
        console.log('[QuestionWatcher] Q:', snippet.text, 'A:', answer);
      } catch (err) {
        console.error('[QuestionWatcher] LLM error:', err);
      }
    }
  }
}

export const questionWatcher = new QuestionWatcher(); 