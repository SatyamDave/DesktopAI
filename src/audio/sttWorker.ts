import OpenAI from 'openai';
import { parentPort } from 'worker_threads';
import { Writable } from 'stream';
import wav from 'wav';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { RingBuffer } from './audioUtils';
import { TranscriptSnippet } from './types';
import { snippetStoreAppend } from './transcriptStore.js';
import { cfg } from '../settings/config';

const ai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!
});

const transcriptBuffer = new RingBuffer<TranscriptSnippet>(Math.ceil(120000 / 2000)); // 2 min window, 2s chunks

const TEXT_WAKE_PHRASES = [
  'are you listening',
  'are you hearing',
  'listen up',
  'start listening',
  'activate',
  'wake up',
  'delo listen',
  'delo are you there',
  // Add more as needed
];

function checkTextWake(transcript: string) {
  const lower = transcript.toLowerCase();
  return cfg.textWake && TEXT_WAKE_PHRASES.some(phrase => lower.includes(phrase));
}

let pcmChunks: Buffer[] = [];
const CHUNK_MS = 2000; // 2 seconds
const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
let lastFlush = Date.now();

function flushAndTranscribe() {
  if (pcmChunks.length === 0) return;
  const pcmBuffer = Buffer.concat(pcmChunks);
  pcmChunks = [];

  // Encode PCM to WAV
  const wavWriter = new wav.Writer({
    sampleRate: SAMPLE_RATE,
    channels: CHANNELS,
    bitDepth: BITS_PER_SAMPLE
  });
  let wavBuffer: Buffer[] = [];
  const writable = new Writable({
    write(chunk, _enc, cb) {
      wavBuffer.push(chunk);
      cb();
    }
  });
  wavWriter.pipe(writable);
  wavWriter.end(pcmBuffer);

  writable.on('finish', async () => {
    const finalWav = Buffer.concat(wavBuffer);
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `stt-${Date.now()}.wav`);
    fs.writeFileSync(tmpFile, finalWav);
    try {
      const fileStream = fs.createReadStream(tmpFile);
      const resp = await ai.audio.transcriptions.create({
        model: 'whisper-large-v3',
        file: fileStream,
        response_format: 'verbose_json',
        language: 'en',
      });
      if (resp.text) {
        const snippet: TranscriptSnippet = { text: resp.text, ts: Date.now() };
        transcriptBuffer.push(snippet);
        snippetStoreAppend(resp.text, snippet.ts);
        // Text-based wake detection
        if (checkTextWake(resp.text)) {
          parentPort?.postMessage({ type: 'wake', reason: 'text' });
          parentPort?.postMessage({ type: 'chat', text: 'Listening activated. Please say your request.' });
          console.log('[STTWorker] Text-based wake triggered!');
          return; // Suppress further processing for this transcript
        }
        parentPort?.postMessage({ type: 'transcript', text: resp.text });
        console.log('[STTWorker] Transcript:', resp.text);
      }
    } catch (err) {
      parentPort?.postMessage({ type: 'error', error: String(err) });
      console.error('[STTWorker] Error:', err);
    } finally {
      fs.unlink(tmpFile, () => {});
    }
  });
}

parentPort!.on('message', (pcm: Buffer) => {
  pcmChunks.push(pcm);
  const now = Date.now();
  if (now - lastFlush > CHUNK_MS) {
    lastFlush = now;
    flushAndTranscribe();
  }
});

setInterval(() => {
  if (pcmChunks.length > 0) {
    flushAndTranscribe();
    lastFlush = Date.now();
  }
}, CHUNK_MS); 